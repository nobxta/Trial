import { getUserWithPreferences } from './db';
import { getOrderByOrderId } from './db-orders';
import { sendGenericEmail } from './email';
import { getOrderStatusEmailTemplate, type OrderDetailsForEmail } from './email-template';
import { getEmailSetting } from './email-settings';
import { tryClaimIdempotency } from './idempotency';
import { paymentLogger } from './payment-logger';
import { getAssetSymbol, getAssetIconUrl } from './asset-normalize';
import { NextRequest } from 'next/server';

export type NotificationType =
  | 'order_status'
  | 'promotion'
  | 'affiliate_earnings'
  | 'order_completed'
  | 'order_failed';

interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  /** For order_status (DONE/EXPIRED): swap summary for email template */
  orderDetails?: OrderDetailsForEmail | null;
}

/**
 * Send notification to user if notifications are enabled
 */
export async function sendNotification(
  userId: string,
  notification: NotificationData,
  request?: NextRequest
): Promise<boolean> {
  try {
    const user = await getUserWithPreferences(userId);
    
    if (!user) {
      console.log('📧 Order status email skipped: user not found');
      return false;
    }

    // Order status emails are transactional (user placed the order, expects completion notice).
    // Only check notificationsEnabled for promotional/marketing emails.
    if (!user.notificationsEnabled && notification.type !== 'order_status') {
      console.log('📧 Email skipped: user notifications disabled');
      return false;
    }

    if (!user.emailVerified) {
      console.log('📧 Order status email skipped: email not verified');
      return false;
    }

    if (notification.type === 'order_status') {
      const orderNotificationsEnabled = await getEmailSetting('order_notifications_enabled', 'true');
      if (orderNotificationsEnabled !== 'true') {
        console.log('📧 Order status email skipped: order_notifications_enabled is false (Admin → Settings → Email)');
        return true;
      }
    }

    // Send email immediately via SMTP (no queue)
    if (notification.type === 'order_status' && notification.link) {
      const orderIdMatch = notification.title.match(/Order\s+([A-Z0-9-]+)\s+-/i);
      const orderId = orderIdMatch ? orderIdMatch[1] : 'N/A';
      const statusMatch = notification.title.match(/-\s+(.+)$/);
      const status = statusMatch ? statusMatch[1].trim() : 'unknown';
      const { text, html } = getOrderStatusEmailTemplate(
        orderId,
        status,
        notification.link,
        notification.orderDetails
      );
      const emailSubject = status.toLowerCase() === 'done' || status.toLowerCase() === 'completed'
        ? `Swap completed – ${orderId}`
        : status.toLowerCase() === 'expired'
        ? `Order expired – ${orderId}`
        : `Order ${orderId} - Status Update`;
      const ok = await sendGenericEmail(user.email, emailSubject, html, text, 'TRANSACTIONAL', request);
      return ok;
    } else {
      const emailSubject = notification.title;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #1f2937;">${notification.title}</h2>
          <p style="color: #4b5563; line-height: 1.6;">${notification.message.replace(/\n/g, '<br>')}</p>
          ${notification.link ? `<p><a href="${notification.link}" style="color: #3b82f6; text-decoration: none;">View details →</a></p>` : ''}
          <p style="color: #9ca3af; margin-top: 30px;">— MintMove Team</p>
        </div>
      `;
      const emailText = `${notification.title}\n\n${notification.message}${notification.link ? `\n\nView details: ${notification.link}` : ''}\n\n— MintMove Team`;
      return await sendGenericEmail(user.email, emailSubject, emailHtml, emailText, 'GENERIC', request);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Send order status email to a specific address (guest order notification_email).
 * Respects order_notifications_enabled admin setting.
 */
async function sendOrderStatusEmailTo(
  toEmail: string,
  orderId: string,
  status: string,
  orderLink: string,
  request?: NextRequest,
  orderDetails?: OrderDetailsForEmail | null
): Promise<boolean> {
  const orderNotificationsEnabled = await getEmailSetting('order_notifications_enabled', 'true');
  if (orderNotificationsEnabled !== 'true') {
    console.log('📧 Order status email skipped: order_notifications_enabled is false (Admin → Settings → Email)');
    return true;
  }
  const { text, html } = getOrderStatusEmailTemplate(orderId, status, orderLink, orderDetails);
  const emailSubject =
    status.toLowerCase() === 'done' || status.toLowerCase() === 'completed'
      ? `Swap completed – ${orderId}`
      : status.toLowerCase() === 'expired'
      ? `Order expired – ${orderId}`
      : `Order ${orderId} - Status Update`;
  return sendGenericEmail(toEmail, emailSubject, html, text, 'TRANSACTIONAL', request);
}

/** Only these statuses trigger email. No confirming/confirmed — only final outcome. */
const EMAIL_STATUSES = ['DONE', 'EXPIRED'] as const;

function buildOrderDetailsForEmail(order: {
  fromCurrency: string;
  fromAmount: number;
  fromNetwork: string | null;
  toCurrency: string;
  toAmount: number;
  toNetwork: string | null;
}): OrderDetailsForEmail {
  return {
    fromAmount: order.fromAmount,
    fromSymbol: getAssetSymbol(order.fromCurrency),
    fromNetwork: order.fromNetwork,
    toAmount: order.toAmount,
    toSymbol: getAssetSymbol(order.toCurrency),
    toNetwork: order.toNetwork,
    fromIconUrl: getAssetIconUrl(order.fromCurrency, order.fromNetwork),
    toIconUrl: getAssetIconUrl(order.toCurrency, order.toNetwork),
  };
}

/**
 * Send order status notification.
 * Emails are sent only for DONE and EXPIRED (no confirming/confirmed).
 * Idempotency: only the caller that claims may run side effects.
 */
export async function notifyOrderStatus(
  userId: string | null,
  orderId: string,
  status: string,
  request?: NextRequest
): Promise<boolean> {
  const normalizedStatus = status.toUpperCase();
  if (!EMAIL_STATUSES.includes(normalizedStatus as any)) {
    return true;
  }

  const idempotencyKey = `order:${orderId}:status:${normalizedStatus}`;
  const scope = 'order_status_email';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orderLink = `${baseUrl}/order/${orderId}`;

  const order = await getOrderByOrderId(orderId);
  const orderDetails = order ? buildOrderDetailsForEmail(order) : null;

  // Logged-in user: send to user account
  if (userId != null && userId !== '') {
    const claimed = await tryClaimIdempotency(scope, idempotencyKey);
    if (!claimed) {
      console.log(`⏭️  Order status email skipped (idempotency): ${orderId} - ${normalizedStatus}`);
      return true;
    }
    console.log(`📧 Sending order status email (claimed): ${orderId} - ${normalizedStatus}`);
    paymentLogger.emailTriggeredForOrder({ order_id: orderId, status: normalizedStatus });
    try {
      const ok = await sendNotification(
        userId,
        {
          type: 'order_status',
          title: `Order ${orderId} - ${status}`,
          message: normalizedStatus === 'DONE' ? 'Your swap is complete.' : 'Your order has expired.',
          link: orderLink,
          orderDetails,
        },
        request
      );
      paymentLogger.emailAttempt({ order_id: orderId, status: normalizedStatus, success: ok });
      return ok;
    } catch (err: any) {
      paymentLogger.emailAttempt({
        order_id: orderId,
        status: normalizedStatus,
        success: false,
        error: err?.message ?? String(err),
      });
      throw err;
    }
  }

  // Guest order: send to order.notification_email if set
  const notificationEmail = order?.notificationEmail?.trim();
  if (!notificationEmail) {
    console.log('📧 Order status email skipped: guest order (no userId, no notification_email)');
    return true;
  }

  const claimed = await tryClaimIdempotency(scope, idempotencyKey);
  if (!claimed) {
    console.log(`⏭️  Order status email skipped (idempotency): ${orderId} - ${normalizedStatus}`);
    return true;
  }
  console.log(`📧 Sending order status email to notification_email (claimed): ${orderId} - ${normalizedStatus}`);
  paymentLogger.emailTriggeredForOrder({ order_id: orderId, status: normalizedStatus });
  try {
    const ok = await sendOrderStatusEmailTo(
      notificationEmail,
      orderId,
      status,
      orderLink,
      request,
      orderDetails
    );
    paymentLogger.emailAttempt({ order_id: orderId, status: normalizedStatus, success: ok });
    return ok;
  } catch (err: any) {
    paymentLogger.emailAttempt({
      order_id: orderId,
      status: normalizedStatus,
      success: false,
      error: err?.message ?? String(err),
    });
    throw err;
  }
}

/**
 * Send promotion notification
 */
export async function notifyPromotion(
  userId: string,
  title: string,
  message: string,
  link?: string,
  request?: NextRequest
): Promise<boolean> {
  return sendNotification(
    userId,
    {
      type: 'promotion',
      title,
      message,
      link,
    },
    request
  );
}

/**
 * Send affiliate earnings notification
 */
export async function notifyAffiliateEarnings(
  userId: string,
  amount: number,
  request?: NextRequest
): Promise<boolean> {
  return sendNotification(
    userId,
    {
      type: 'affiliate_earnings',
      title: 'New Affiliate Earnings',
      message: `You've earned $${amount.toFixed(2)} from your referrals!`,
      link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account/affiliate`,
    },
    request
  );
}







