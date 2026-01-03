import nodemailer from 'nodemailer';
import { NextRequest } from 'next/server';
import { getBaseUrl } from './email-utils';
import { getVerificationEmailTemplate } from './email-template';
import { getEmailSetting } from './email-settings';
import { getFromHeader, type EmailCategory } from './email-from';

let transporter: nodemailer.Transporter | null = null;

/**
 * @deprecated Queue system removed - emails now send instantly
 * This function is kept for reference but should not be called.
 * Use sendEmailViaSMTP() directly instead.
 */
export async function queueEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  console.error('❌ queueEmail() is deprecated - emails now send instantly. This should not be called.');
  throw new Error('queueEmail() is deprecated. Use direct SMTP sending instead.');
}

/**
 * Send email via nodemailer SMTP (instant synchronous send)
 * This is the main function that sends emails directly via SMTP
 * 
 * @param category - Email category (AUTH, TRANSACTIONAL, etc.) - determines sender address
 */
export async function sendEmailViaSMTP({
  to,
  subject,
  html,
  text,
  category,
  headers,
  messageId,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category: EmailCategory;
  headers?: Record<string, string>;
  messageId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!transporter) {
    const error = 'SMTP transporter not configured. Please set SMTP_USER and SMTP_PASS environment variables.';
    console.error(`❌ [MintMove] Email failed to ${to} (${category}): ${error}`);
    return { success: false, error };
  }

  // Get sender address from category mapping
  const fromHeader = getFromHeader(category);
  const fromEmail = fromHeader.match(/<(.+)>/)?.[1] || '';

  console.log(`📧 [MintMove] Sending ${category} email`);
  console.log(`   From: ${fromEmail}`);
  console.log(`   To: ${to}`);

  const mailOptions = {
    from: fromHeader,
    to: to,
    subject: subject,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
    html: html,
    headers: headers || {},
    messageId: messageId,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ [MintMove] Email sent to ${to} (${category}): ${subject}`);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error(`❌ [MintMove] Email failed to ${to} (${category}): ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// Initialize transporter only if SMTP credentials are provided
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = port === 465 || process.env.SMTP_SECURE === 'true';
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: secure, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Add connection timeout
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

export async function sendVerificationEmail(
  email: string, 
  token: string, 
  request?: NextRequest
): Promise<boolean> {
  // Check if verification emails are enabled
  const verificationEnabled = await getEmailSetting('verification_enabled', 'true');
  if (verificationEnabled !== 'true') {
    console.log(`📧 Verification email disabled for ${email} (verification_enabled = false)`);
    return true; // Return true silently so signup doesn't fail
  }

  // Get the correct base URL (from request or env)
  const baseUrl = getBaseUrl(request);
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  
  // Get professional email template
  const { text, html } = getVerificationEmailTemplate(verificationUrl, email);
  
  // Check if SMTP is configured
  if (!transporter) {
    const error = 'SMTP transporter not configured. Please set SMTP_USER and SMTP_PASS environment variables.';
    console.error(`❌ Email failed to ${email}: ${error}`);
    throw new Error(error);
  }

  // Send email immediately via SMTP (same behavior in dev and production)
  const result = await sendEmailViaSMTP({
    to: email,
    subject: 'Verify your MintMove account',
    html: html,
    text: text,
    category: 'AUTH',
  });

  if (!result.success) {
    throw new Error(`Failed to send verification email: ${result.error}`);
  }

  return true;
}

/**
 * Generic email sender function
 * Sends email immediately via SMTP (same behavior in dev and production)
 * 
 * @param category - Email category (AUTH, TRANSACTIONAL, ADMIN, etc.) - determines sender address
 * 
 * Note: order_notifications_enabled setting is checked in notifications.ts
 * where sendGenericEmail is called for order notifications
 */
export async function sendGenericEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  category: EmailCategory = 'GENERIC',
  request?: NextRequest
): Promise<boolean> {
  // Check if SMTP is configured
  if (!transporter) {
    const error = 'SMTP transporter not configured. Please set SMTP_USER and SMTP_PASS environment variables.';
    console.error(`❌ Email failed to ${to}: ${error}`);
    throw new Error(error);
  }

  // Send email immediately via SMTP
  const result = await sendEmailViaSMTP({
    to: to,
    subject: subject,
    html: html,
    text: text,
    category: category,
  });

  if (!result.success) {
    throw new Error(`Failed to send email: ${result.error}`);
  }

  return true;
}

