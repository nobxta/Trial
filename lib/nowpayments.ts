// NOWPayments API client
// Uses getNowPaymentsConfig() to automatically switch between LIVE and SANDBOX modes

import { getNowPaymentsConfig, getNowPaymentsConfigSync } from './nowpayments-config';

interface PaymentRequest {
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  ipn_callback_url?: string;
  order_id?: string;
  order_description?: string;
  payout_address?: string;
  payout_currency?: string;
  // Sandbox-specific: case parameter for testing scenarios
  case?: 'success' | 'failed' | 'expired' | 'partially_paid';
}

interface PaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  order_id: string;
  order_description: string;
  ipn_callback_url: string;
  created_at: string;
  updated_at: string;
  payin_extra_id?: string;
  smart_contract?: string;
  network?: string;
  network_precision?: number;
  time_limit?: string;
  expiration_estimate_date?: string;
  payout_currency?: string;
  payout_address?: string;
  payout_extra_id?: string;
  payout_hash?: string;
  payin_hash?: string;
  amount_received?: number;
  payin_payment_id?: string;
  smart_contract_currency?: string;
  purchase_id?: string;
  amount_paid?: number;
  payin_address?: string;
}

interface QRCodeResponse {
  qr_code_url: string;
}

// Create a payment and get deposit address
export async function createPayment(params: PaymentRequest): Promise<PaymentResponse> {
  // Get configuration based on current payment mode (LIVE or SANDBOX)
  const config = await getNowPaymentsConfig();

  // Build request payload
  const payload: any = {
    price_amount: params.price_amount,
    price_currency: params.price_currency,
    pay_currency: params.pay_currency,
  };

  if (params.order_id) payload.order_id = params.order_id;
  if (params.order_description) payload.order_description = params.order_description;
  if (params.ipn_callback_url) payload.ipn_callback_url = params.ipn_callback_url;
  if (params.payout_address) payload.payout_address = params.payout_address;
  if (params.payout_currency) payload.payout_currency = params.payout_currency;
  
  // Sandbox-specific: add case parameter for testing scenarios
  if (config.mode === 'sandbox' && params.case) {
    payload.case = params.case;
  }

  const response = await fetch(`${config.baseUrl}/payment`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to create payment';
    let errorDetails: any = {};
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
      errorDetails = errorJson;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'nowpayments.ts:86',message:'NOWPayments createPayment error',data:{status:response.status,errorMessage,errorDetails,payload:JSON.stringify(payload),price_amount:payload.price_amount,pay_currency:payload.pay_currency},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Log detailed error in development
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('NOWPayments payment API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        details: errorDetails,
        payload: payload,
      });
    }
    
    // Provide more helpful error messages
    if (errorMessage.includes('validate address') || errorMessage.includes('address')) {
      throw new Error(`Invalid wallet address. Please check that the ${params.payout_currency || 'payout'} address is correct and valid.`);
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

// Get payment status
// NOTE: This function needs to know which mode the payment was created in
// For webhook/polling, we should use the payment mode from the order record
// For now, we use the current payment mode (which may not match if mode was changed)
export async function getPaymentStatus(paymentId: string, mode?: 'live' | 'sandbox'): Promise<PaymentResponse> {
  let config;
  
  if (mode) {
    // Use provided mode (from order record)
    if (mode === 'sandbox') {
      const apiKey = process.env.NOWPAYMENTS_API_KEY_SANDBOX || '';
      const baseUrl = 'https://api-sandbox.nowpayments.io/v1';
      if (!apiKey) {
        throw new Error('NOWPAYMENTS_API_KEY_SANDBOX is required for sandbox mode');
      }
      config = { apiKey, baseUrl, mode: 'sandbox' as const };
    } else {
      const apiKey = process.env.NOWPAYMENTS_API_KEY_LIVE || process.env.NOWPAYMENTS_API_KEY || '';
      const baseUrl = process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1';
      if (!apiKey) {
        throw new Error('NOWPAYMENTS_API_KEY_LIVE is required for live mode');
      }
      config = { apiKey, baseUrl, mode: 'live' as const };
    }
  } else {
    // Use current payment mode (fallback)
    config = await getNowPaymentsConfig();
  }

  const response = await fetch(`${config.baseUrl}/payment/${paymentId}`, {
    method: 'GET',
    headers: {
      'x-api-key': config.apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NOWPayments API error: ${error}`);
  }

  return response.json();
}

// Get available currencies
export async function getAvailableCurrencies(): Promise<string[]> {
  try {
    const config = await getNowPaymentsConfig();
    const headers: HeadersInit = {
      'x-api-key': config.apiKey,
    };

    const response = await fetch(`${config.baseUrl}/currencies`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to fetch available currencies';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      // Log detailed error in development
      if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('NOWPayments currencies API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.currencies || data || [];
  } catch (error: any) {
    // Do NOT provide fallback currencies - only return what NOWPayments supports
    // If API fails, throw error - let caller handle it
    throw error;
  }
}

// Get estimated price
export async function getEstimatedPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const config = await getNowPaymentsConfig();
  
  const response = await fetch(
    `${config.baseUrl}/estimate?amount=${amount}&currency_from=${fromCurrency}&currency_to=${toCurrency}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': config.apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get estimated price');
  }

  const data = await response.json();
  return data.estimated_amount || 0;
}

// Get QR code URL (NOWPayments provides this in the payment response)
export function getQRCodeURL(address: string, amount?: number, currency?: string): string {
  if (amount && currency) {
    // Generate QR code with amount using crypto URI scheme
    return `${currency.toLowerCase()}:${address}?amount=${amount}`;
  }
  return address;
}

export interface ExchangeLimits {
  min_amount: number;
  min_amount_fiat?: number;
  max_amount?: number;
  max_amount_fiat?: number;
}

/**
 * Get minimum and maximum exchange limits for a currency pair
 * @param currencyFrom - Currency code to send (e.g., 'btc', 'eth')
 * @param currencyTo - Currency code to receive (e.g., 'usdttrc20', 'eth')
 * @param isFixedRate - Whether to check limits for fixed-rate payments (default: false)
 * @returns Exchange limits including min/max amounts
 */
export async function getExchangeLimits(
  currencyFrom: string,
  currencyTo: string,
  isFixedRate: boolean = false
): Promise<ExchangeLimits> {
  const config = await getNowPaymentsConfig();

  try {
    // Build query parameters
    const params = new URLSearchParams({
      currency_from: currencyFrom.toLowerCase(),
      currency_to: currencyTo.toLowerCase(),
      is_fixed_rate: isFixedRate.toString(),
    });

    const response = await fetch(`${config.baseUrl}/min-amount?${params.toString()}`, {
      method: 'GET',
      headers: {
        'x-api-key': config.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to fetch exchange limits';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      // Log detailed error in development
      if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('NOWPayments min-amount API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          currencyFrom,
          currencyTo,
        });
      }

      // Create error with status code preserved
      const error: any = new Error(errorMessage);
      error.statusCode = response.status;
      error.isUnsupportedPair = response.status === 400 && 
        (errorMessage.toLowerCase().includes('not convertable') || 
         errorMessage.toLowerCase().includes('not supported'));
      throw error;
    }

    const data = await response.json();
    
    // NOWPayments returns min_amount and optionally min_amount_fiat
    // Max amounts may not be available via API, so we return what we get
    return {
      min_amount: data.min_amount || 0,
      min_amount_fiat: data.min_amount_fiat,
      max_amount: data.max_amount, // May be undefined if not provided by API
      max_amount_fiat: data.max_amount_fiat, // May be undefined
    };
  } catch (error: any) {
    // Re-throw with more context
    if (error.message) {
      throw error;
    }
    throw new Error(`Failed to fetch exchange limits: ${error.message || 'Unknown error'}`);
  }
}

