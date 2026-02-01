/**
 * Email sender address mapping system
 * 
 * Maps email categories to environment variables for sender addresses.
 * This allows switching SMTP providers without code changes - just update .env
 * 
 * All sender addresses should be MintMove-branded (e.g., @mintmove.io)
 * but can temporarily point to test SMTP providers during development.
 */

export type EmailCategory =
  | 'AUTH'
  | 'TRANSACTIONAL'
  | 'ADMIN'
  | 'ALERT'
  | 'MARKETING'
  | 'SUPPORT'
  | 'GENERIC';

/**
 * Maps email categories to their corresponding environment variable names
 */
const CATEGORY_TO_ENV_MAP: Record<EmailCategory, string> = {
  AUTH: 'EMAIL_FROM_NOREPLY',
  TRANSACTIONAL: 'EMAIL_FROM_RECEIPTS',
  ADMIN: 'EMAIL_FROM_ADMIN',
  ALERT: 'EMAIL_FROM_ALERT',
  MARKETING: 'EMAIL_FROM_NEWS',
  SUPPORT: 'EMAIL_FROM_SUPPORT',
  GENERIC: 'EMAIL_FROM_HELLO',
};

/**
 * Get the sender email address for a given category
 * 
 * @param category - The email category
 * @returns The sender email address from environment variables
 * @throws Error if the required environment variable is not set
 */
export function getSenderEmail(category: EmailCategory): string {
  const envVarName = CATEGORY_TO_ENV_MAP[category];
  const email = process.env[envVarName]?.trim();

  if (email) return email;
  // Fallback: use SMTP_USER so emails work with only SMTP_USER/SMTP_PASS set (e.g. on Vercel)
  const smtpUser = process.env.SMTP_USER?.trim();
  if (smtpUser) return smtpUser;
  throw new Error(
    `Set ${envVarName} or SMTP_USER for ${category} emails (e.g. in Vercel Environment Variables).`
  );
}

/**
 * Get the sender name for all emails
 * Defaults to "MintMove" if not set
 * 
 * @returns The sender name from environment variables
 */
export function getSenderName(): string {
  return process.env.EMAIL_FROM_NAME || 'MintMove';
}

/**
 * Get the full "From" header value (e.g., "MintMove <no-reply@mintmove.io>")
 * 
 * @param category - The email category
 * @returns The formatted "From" header value
 */
export function getFromHeader(category: EmailCategory): string {
  const email = getSenderEmail(category);
  const name = getSenderName();
  return `"${name}" <${email}>`;
}




