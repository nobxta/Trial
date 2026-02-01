import nodemailer from 'nodemailer';
import { NextRequest } from 'next/server';
import { getBaseUrl } from './email-utils';
import { getVerificationEmailTemplate } from './email-template';
import { getEmailSetting } from './email-settings';
import { getFromHeader, type EmailCategory } from './email-from';
import { getSmptConfig } from './env';
import { supabaseAdmin } from './supabase';

/** SMTP connection timeout (ms). */
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
/** SMTP socket/send timeout (ms). Prevents hung sends. */
const SMTP_SOCKET_TIMEOUT_MS = 30_000;
/** Max time for a single sendMail call (ms). */
const SMTP_SEND_TIMEOUT_MS = 25_000;
/** Retry only for connection-level errors; one retry after this delay (ms). No retry on success or after DATA accepted. */
const SMTP_RETRY_DELAY_MS = 2_000;

const CONNECTION_ERROR_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND']);

let transporter: nodemailer.Transporter | null = null;

/** Lazy transporter: create from env at first send (serverless-safe). */
function getTransporter(): nodemailer.Transporter | null {
  if (typeof window !== 'undefined') return null;
  if (transporter) return transporter;
  const smtp = getSmptConfig();
  if (!smtp) return null;
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });
  return transporter;
}

/**
 * Insert an email into email_queue for async delivery by cron.
 * Does not block on SMTP. Returns true if inserted, false on failure (graceful).
 */
export async function enqueueEmail({
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
  if (typeof window !== 'undefined') return false;
  if (!supabaseAdmin) {
    console.error('❌ [MintMove] Cannot enqueue email: Supabase not configured');
    return false;
  }
  try {
    const { error } = await supabaseAdmin.from('email_queue').insert({
      to_email: to,
      subject,
      html,
      text: text ?? null,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    });
    if (error) {
      console.error('❌ [MintMove] Failed to enqueue email:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('❌ [MintMove] Failed to enqueue email:', err?.message ?? err);
    return false;
  }
}

/**
 * Queue verification email (non-blocking). Uses same template as sendVerificationEmail.
 * Returns true if queued or verification disabled, false if queue insert failed.
 */
export async function enqueueVerificationEmail(
  email: string,
  token: string,
  request?: NextRequest
): Promise<boolean> {
  try {
    const verificationEnabled = await getEmailSetting('verification_enabled', 'true');
    if (verificationEnabled !== 'true') {
      return true;
    }
    const baseUrl = getBaseUrl(request);
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    const { text, html } = getVerificationEmailTemplate(verificationUrl, email);
    return enqueueEmail({
      to: email,
      subject: 'Verify your MintMove account',
      html,
      text,
    });
  } catch (err: any) {
    console.error('❌ [MintMove] enqueueVerificationEmail failed:', err?.message ?? err);
    return false;
  }
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
  const transport = getTransporter();
  if (!transport) {
    const error =
      'SMTP transporter not configured. Set SMTP_USER and SMTP_PASS in your environment (e.g. Vercel → Settings → Environment Variables).';
    console.error(`❌ [MintMove] Email failed to ${to} (${category}): ${error}`);
    return { success: false, error };
  }

  // Get sender address from category mapping (falls back to SMTP_USER if EMAIL_FROM_* unset)
  let fromHeader: string;
  try {
    fromHeader = getFromHeader(category);
  } catch (e: any) {
    console.error(`❌ [MintMove] Sender config: ${e?.message}`);
    return { success: false, error: e?.message ?? 'Missing sender email config' };
  }
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

  const sendWithTimeout = (): Promise<{ success: true; messageId?: string }> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`SMTP send timeout after ${SMTP_SEND_TIMEOUT_MS}ms`));
      }, SMTP_SEND_TIMEOUT_MS);
      transport
        .sendMail(mailOptions)
        .then((result) => {
          clearTimeout(timer);
          resolve({ success: true, messageId: result.messageId });
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });

  try {
    const result = await sendWithTimeout();
    console.log(`✅ [MintMove] Email sent to ${to} (${category}): ${subject}`);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    const isConnectionError = CONNECTION_ERROR_CODES.has(error?.code);
    if (isConnectionError) {
      await new Promise((r) => setTimeout(r, SMTP_RETRY_DELAY_MS));
      try {
        const retryResult = await sendWithTimeout();
        console.log(`✅ [MintMove] Email sent to ${to} (${category}) on retry: ${subject}`);
        return { success: true, messageId: retryResult.messageId };
      } catch (retryErr: any) {
        const retryMsg = retryErr?.message || String(retryErr);
        console.error(`❌ [MintMove] Email failed to ${to} (${category}) after retry: ${retryMsg}`);
        return { success: false, error: retryMsg };
      }
    }
    console.error(`❌ [MintMove] Email failed to ${to} (${category}): ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
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
  
  // Check if SMTP is configured (lazy transporter)
  if (!getTransporter()) {
    const error =
      'SMTP transporter not configured. Set SMTP_USER and SMTP_PASS in your environment.';
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
  // Check if SMTP is configured (lazy transporter)
  if (!getTransporter()) {
    const error =
      'SMTP transporter not configured. Set SMTP_USER and SMTP_PASS in your environment.';
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

