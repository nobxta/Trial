import { getUserWithPreferences } from './db';
import { sendVerificationEmail, sendGenericEmail } from './email';
import { getOrderStatusEmailTemplate } from './email-template';
import { getEmailSetting } from './email-settings';
import { checkAndMark } from './idempotency';
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

    // Send email notification using generic email sender
    // For order status notifications, use the dedicated template
    if (notification.type === 'order_status' && notification.link) {
      // Extract orderId from link or title (format: "Order ORDER_ID - status")
      const orderIdMatch = notification.title.match(/Order\s+([A-Z0-9-]+)\s+-/i);
      const orderId = orderIdMatch ? orderIdMatch[1] : 'N/A';
      const statusMatch = notification.title.match(/-\s+(.+)$/);
      const status = statusMatch ? statusMatch[1].trim() : 'unknown';
      
      const { text, html } = getOrderStatusEmailTemplate(orderId, status, notification.link);
      const emailSubject = `Order ${orderId} - Status Update`;
      
      return await sendGenericEmail(user.email, emailSubject, html, text, request);
    } else {
      // Generic notification email (for promotions, affiliate, etc.)
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
      
      return await sendGenericEmail(user.email, emailSubject, emailHtml, emailText, request);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Send order status notification
 * Status can be internal status (DONE, EXPIRED, etc.) or lowercase version (done, expired, etc.)
 * 
 * Idempotency: Uses idempotency key to prevent duplicate emails for same order+status combination
 */
export async function notifyOrderStatus(
  userId: string,
  orderId: string,
  status: string,
  request?: NextRequest
): Promise<boolean> {
  // Normalize status to uppercase for consistent idempotency keys
  // This ensures 'DONE' and 'done' map to the same key
  const normalizedStatus = status.toUpperCase();
  
  // Construct idempotency key: order:{orderId}:status:{normalizedStatus}
  // This ensures we only send one email per order status change
  const idempotencyKey = `order:${orderId}:status:${normalizedStatus}`;
  const scope = 'order_status_email';

  // Check if this notification has already been sent
  const isFirstExecution = await checkAndMark(scope, idempotencyKey);
  
  if (!isFirstExecution) {
    console.log(`⏭️  Order status email skipped (idempotency): ${orderId} - ${normalizedStatus}`);
    return true; // Return true to indicate "handled" (even though skipped)
  }

  console.log(`📧 Sending order status email (first time): ${orderId} - ${normalizedStatus}`);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orderLink = `${baseUrl}/order/${orderId}`;

  // Queue email notification
  // Note: Idempotency is marked BEFORE queuing to prevent duplicate queue entries
  // If queueing fails, idempotency is already marked (at-most-once semantics)
  return sendNotification(
    userId,
    {
      type: 'order_status',
      title: `Order ${orderId} - ${status}`, // Use original status for display
      message: `Your order status has been updated.`, // Message is in template
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







