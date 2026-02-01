import { getPaymentMode } from './payment-mode';
import {
  getNowPaymentsLiveApiKey,
  getNowPaymentsLiveIpnSecret,
  getNowPaymentsSandboxApiKey,
  getNowPaymentsSandboxIpnSecret,
  getNowPaymentsApiUrl,
} from './env';

export type PaymentMode = 'live' | 'sandbox';

export interface NowPaymentsConfig {
  apiKey: string;
  baseUrl: string;
  ipnSecret: string;
  mode: PaymentMode;
}

/**
 * Get NOWPayments configuration based on current payment mode.
 * Uses centralized env (no defaults for secrets in production).
 */
export async function getNowPaymentsConfig(): Promise<NowPaymentsConfig> {
  const mode = await getPaymentMode();

  if (mode === 'sandbox') {
    const apiKey = getNowPaymentsSandboxApiKey();
    if (!apiKey) {
      throw new Error(
        'NOWPAYMENTS_API_KEY_SANDBOX is required for sandbox mode. Set it in your environment.'
      );
    }
    return {
      apiKey,
      baseUrl: 'https://api-sandbox.nowpayments.io/v1',
      ipnSecret: getNowPaymentsSandboxIpnSecret(),
      mode: 'sandbox',
    };
  }

  const apiKey = getNowPaymentsLiveApiKey();
  if (!apiKey) {
    throw new Error(
      'NOWPAYMENTS_API_KEY or NOWPAYMENTS_API_KEY_LIVE is required for live mode. Set it in your environment.'
    );
  }
  return {
    apiKey,
    baseUrl: getNowPaymentsApiUrl(),
    ipnSecret: getNowPaymentsLiveIpnSecret(),
    mode: 'live',
  };
}

/**
 * Get NOWPayments configuration synchronously (for cases where async is not possible)
 * WARNING: This uses cached payment mode or defaults to 'live'
 * Prefer getNowPaymentsConfig() when possible
 */
let cachedPaymentMode: PaymentMode | null = null;

export function getNowPaymentsConfigSync(): NowPaymentsConfig {
  const mode = cachedPaymentMode || 'live';

  if (mode === 'sandbox') {
    const apiKey = getNowPaymentsSandboxApiKey();
    if (!apiKey) {
      throw new Error(
        'NOWPAYMENTS_API_KEY_SANDBOX is required for sandbox mode. Set it in your environment.'
      );
    }
    return {
      apiKey,
      baseUrl: 'https://api-sandbox.nowpayments.io/v1',
      ipnSecret: getNowPaymentsSandboxIpnSecret(),
      mode: 'sandbox',
    };
  }

  const apiKey = getNowPaymentsLiveApiKey();
  if (!apiKey) {
    throw new Error(
      'NOWPAYMENTS_API_KEY or NOWPAYMENTS_API_KEY_LIVE is required for live mode. Set it in your environment.'
    );
  }
  return {
    apiKey: apiKey,
    baseUrl: getNowPaymentsApiUrl(),
    ipnSecret: getNowPaymentsLiveIpnSecret(),
    mode: 'live',
  };
}

/**
 * Update cached payment mode (called when mode changes)
 */
export function updateCachedPaymentMode(mode: PaymentMode): void {
  cachedPaymentMode = mode;
}

