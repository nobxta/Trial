/**
 * Sandbox case types and validation.
 * Admin-controlled sandbox case is stored in exchange_settings (key: sandbox_case)
 * and read via getSandboxCase() from @/lib/payment-mode. Env fallback below is
 * deprecated in favor of admin settings.
 */

export const ALLOWED_SANDBOX_CASES = ['success', 'failed', 'expired', 'partially_paid'] as const;
export type SandboxCase = (typeof ALLOWED_SANDBOX_CASES)[number];

/**
 * Get validated sandbox case from environment variable
 * @returns Valid sandbox case, defaults to 'success' if missing or invalid
 */
export function getSandboxCaseFromEnv(): SandboxCase {
  const envValue = process.env.NOWPAYMENTS_SANDBOX_CASE;
  
  if (!envValue) {
    return 'success'; // Default
  }
  
  const normalizedValue = envValue.toLowerCase().trim();
  
  // Strict validation against allowed values
  if (ALLOWED_SANDBOX_CASES.includes(normalizedValue as SandboxCase)) {
    return normalizedValue as SandboxCase;
  }
  
  // Invalid value - default to 'success'
  return 'success';
}

