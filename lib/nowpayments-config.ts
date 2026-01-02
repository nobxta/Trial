import { getPaymentMode } from './payment-mode';

export type PaymentMode = 'live' | 'sandbox';

export interface NowPaymentsConfig {
  apiKey: string;
  baseUrl: string;
  ipnSecret: string;
  mode: PaymentMode;
}

/**
 * Get NOWPayments configuration based on current payment mode
 * This is the single source of truth for NOWPayments API configuration
 * 
 * Environment variables:
 * - LIVE: NOWPAYMENTS_API_KEY_LIVE, NOWPAYMENTS_IPN_SECRET_LIVE
 * - SANDBOX: NOWPAYMENTS_API_KEY_SANDBOX, NOWPAYMENTS_IPN_SECRET_SANDBOX
 * 
 * URLs:
 * - LIVE: https://api.nowpayments.io/v1
 * - SANDBOX: https://api-sandbox.nowpayments.io/v1
 */
export async function getNowPaymentsConfig(): Promise<NowPaymentsConfig> {
  const mode = await getPaymentMode();
  
  if (mode === 'sandbox') {
    const apiKey = process.env.NOWPAYMENTS_API_KEY_SANDBOX || '';
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET_SANDBOX || '';
    const baseUrl = 'https://api-sandbox.nowpayments.io/v1';
    
    if (!apiKey) {
      throw new Error('NOWPAYMENTS_API_KEY_SANDBOX is required for sandbox mode. Set it in your .env.local file.');
    }
    
    return {
      apiKey,
      baseUrl,
      ipnSecret,
      mode: 'sandbox',
    };
  } else {
    // Live mode (default)
    const apiKey = process.env.NOWPAYMENTS_API_KEY_LIVE || process.env.NOWPAYMENTS_API_KEY || '';
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET_LIVE || process.env.NOWPAYMENTS_IPN_SECRET || '';
    const baseUrl = process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1';
    
    if (!apiKey) {
      throw new Error('NOWPAYMENTS_API_KEY_LIVE (or NOWPAYMENTS_API_KEY) is required for live mode. Set it in your .env.local file.');
    }
    
    return {
      apiKey,
      baseUrl,
      ipnSecret,
      mode: 'live',
    };
  }
}

/**
 * Get NOWPayments configuration synchronously (for cases where async is not possible)
 * WARNING: This uses cached payment mode or defaults to 'live'
 * Prefer getNowPaymentsConfig() when possible
 */
let cachedPaymentMode: PaymentMode | null = null;

export function getNowPaymentsConfigSync(): NowPaymentsConfig {
  // Try to use cached mode, default to live
  const mode = cachedPaymentMode || 'live';
  
  if (mode === 'sandbox') {
    const apiKey = process.env.NOWPAYMENTS_API_KEY_SANDBOX || '';
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET_SANDBOX || '';
    const baseUrl = 'https://api-sandbox.nowpayments.io/v1';
    
    if (!apiKey) {
      throw new Error('NOWPAYMENTS_API_KEY_SANDBOX is required for sandbox mode.');
    }
    
    return {
      apiKey,
      baseUrl,
      ipnSecret,
      mode: 'sandbox',
    };
  } else {
    const apiKey = process.env.NOWPAYMENTS_API_KEY_LIVE || process.env.NOWPAYMENTS_API_KEY || '';
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET_LIVE || process.env.NOWPAYMENTS_IPN_SECRET || '';
    const baseUrl = process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1';
    
    if (!apiKey) {
      throw new Error('NOWPAYMENTS_API_KEY_LIVE (or NOWPAYMENTS_API_KEY) is required for live mode.');
    }
    
    return {
      apiKey,
      baseUrl,
      ipnSecret,
      mode: 'live',
    };
  }
}

/**
 * Update cached payment mode (called when mode changes)
 */
export function updateCachedPaymentMode(mode: PaymentMode): void {
  cachedPaymentMode = mode;
}

