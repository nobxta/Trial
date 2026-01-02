import nodemailer from 'nodemailer';
import { NextRequest } from 'next/server';
import { getBaseUrl } from './email-utils';
import { getVerificationEmailTemplate } from './email-template';
import { supabaseAdmin } from './supabase';
import { getEmailSetting } from './email-settings';

let transporter: nodemailer.Transporter | null = null;

/**
 * Queue email for sending (database-backed queue)
 * Inserts email into email_queue table for processing by cron job
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
  if (!supabaseAdmin) {
    console.error('❌ Cannot queue email: Supabase not configured');
    return false;
  }

  try {
    const { error } = await supabaseAdmin.from('email_queue').insert({
      to_email: to,
      subject: subject,
      html: html,
      text: text || null,
      status: 'pending',
      attempts: 0,
      scheduled_at: new Date().toISOString(),
    });

    if (error) {
      console.error('❌ Failed to queue email:', error);
      return false;
    }

    console.log(`📬 Email queued for ${to}: ${subject}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error queueing email:', error);
    return false;
  }
}

/**
 * Actually send email via nodemailer (used by email worker)
 * This is the internal function that does the actual SMTP sending
 */
export async function sendEmailViaSMTP({
  to,
  subject,
  html,
  text,
  headers,
  messageId,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  messageId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!transporter) {
    return { success: false, error: 'SMTP transporter not configured' };
  }

  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@mintmove.com';
  const fromName = process.env.SMTP_FROM_NAME || 'MintMove';

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: to,
    subject: subject,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
    html: html,
    headers: headers || {},
    messageId: messageId,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
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
) {
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
  
  // Development fallback: log the verification link if SMTP is not configured
  if (!transporter) {
    console.log('\n=== EMAIL VERIFICATION (Development Mode) ===');
    console.log(`To: ${email}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('==========================================\n');
    return true;
  }

  // In development, send immediately for faster testing
  // In production, use the queue system for better reliability
  if (process.env.NODE_ENV === 'development') {
    try {
      const result = await sendEmailViaSMTP({
        to: email,
        subject: 'Verify your MintMove account',
        html: html,
        text: text,
      });

      if (result.success) {
        console.log(`✅ Verification email sent to ${email}`);
        return true;
      } else {
        console.error(`❌ Failed to send verification email to ${email}:`, result.error);
        // Fallback: log the link if sending fails
        console.log('\n=== EMAIL VERIFICATION (Send Failed - Fallback) ===');
        console.log(`To: ${email}`);
        console.log(`Verification URL: ${verificationUrl}`);
        console.log('==================================================\n');
        return true; // Still return true so signup doesn't fail
      }
    } catch (error: any) {
      console.error(`❌ Error sending verification email to ${email}:`, error);
      // Fallback: log the link if sending fails
      console.log('\n=== EMAIL VERIFICATION (Send Error - Fallback) ===');
      console.log(`To: ${email}`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log('==================================================\n');
      return true; // Still return true so signup doesn't fail
    }
  }

  // Production: Queue email for processing by cron job
  const queued = await queueEmail({
    to: email,
    subject: 'Verify your MintMove account',
    html: html,
    text: text,
  });

  if (!queued) {
    // Fallback: log the link if queueing fails
    console.log('\n=== EMAIL VERIFICATION (Queue Failed - Fallback) ===');
    console.log(`To: ${email}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('==================================================\n');
  }

  // Always return true so signup doesn't fail
  return true;
}

/**
 * Generic email sender function
 * Queues email for processing by cron job
 * 
 * Note: order_notifications_enabled setting is checked in notifications.ts
 * where sendGenericEmail is called for order notifications
 */
export async function sendGenericEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  request?: NextRequest
): Promise<boolean> {
  // Development fallback: log if SMTP is not configured
  if (!transporter) {
    console.log('\n=== EMAIL (Development Mode) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || '(HTML only)'}`);
    console.log('================================\n');
    return true;
  }

  // Queue email instead of sending immediately
  const queued = await queueEmail({
    to: to,
    subject: subject,
    html: html,
    text: text,
  });

  return queued;
}

