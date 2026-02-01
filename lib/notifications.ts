import { getUserWithPreferences } from './db';
import { sendGenericEmail } from './email';
import { getOrderStatusEmailTemplate } from './email-template';
import { getEmailSetting } from './email-settings';
import { tryClaimIdempotency } from './idempotency';
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
      return false;
    }

    // Check if notifications are enabled
    if (!user.notificationsEnabled) {
      return false;
    }

    // Check if email is verified (required for notifications)
    if (!user.emailVerified) {
      return false;
    }

    // Check if order notifications are enabled (for order_status type)
    if (notification.type === 'order_status') {
      const orderNotificationsEnabled = await getEmailSetting('order_notifications_enabled', 'true');
      if (orderNotificationsEnabled !== 'true') {
        console.log(`📧 Order notification disabled for user ${userId} (order_notifications_enabled = false)`);
        return true; // Return true silently
      }
    }

    // Send email immediately via SMTP (no queue)
    if (notification.type === 'order_status' && notification.link) {
      const orderIdMatch = notification.title.match(/Order\s+([A-Z0-9-]+)\s+-/i);
      const orderId = orderIdMatch ? orderIdMatch[1] : 'N/A';
      const statusMatch = notification.title.match(/-\s+(.+)$/);
      const status = statusMatch ? statusMatch[1].trim() : 'unknown';
      const { text, html } = getOrderStatusEmailTemplate(orderId, status, notification.link);
      const emailSubject = `Order ${orderId} - Status Update`;
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
 * Send order status notification
 * Idempotency: Atomic tryClaimIdempotency — only the caller that claims may run side effects.
 * Guard: Anonymous orders (null userId) skip notification without querying DB.
 */
export async function notifyOrderStatus(
  userId: string | null,
  orderId: string,
  status: string,
  request?: NextRequest
): Promise<boolean> {
  // Guard: do not query DB with null IDs; skip notification safely for anonymous orders
  if (userId == null || userId === '') {
    return true;
  }

  const normalizedStatus = status.toUpperCase();
  const idempotencyKey = `order:${orderId}:status:${normalizedStatus}`;
  const scope = 'order_status_email';

  // Atomic claim: only one concurrent caller gets true; others exit immediately
  const claimed = await tryClaimIdempotency(scope, idempotencyKey);
  if (!claimed) {
    console.log(`⏭️  Order status email skipped (idempotency): ${orderId} - ${normalizedStatus}`);
    return true;
  }

  console.log(`📧 Sending order status email (claimed): ${orderId} - ${normalizedStatus}`);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orderLink = `${baseUrl}/order/${orderId}`;

  return sendNotification(
    userId,
    {
      type: 'order_status',
      title: `Order ${orderId} - ${status}`,
      message: `Your order status has been updated.`,
      link: orderLink,
    },
    request
  );
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







