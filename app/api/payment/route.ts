import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPaymentStatus, getExchangeLimits } from '@/lib/nowpayments';
import { isValidAssetNetworkId, getAssetNetworkById } from '@/lib/supportedAssets';
import { getAuthUser } from '@/lib/auth';
import { createOrderWithHistoryTransaction } from '@/lib/db-orders';
import { validateExchangeRequest, validatePaymentRequest } from '@/lib/validation';
import { getPaymentMode } from '@/lib/payment-mode';
import { getSandboxCase } from '@/lib/payment-mode';
import type { SandboxCase } from '@/lib/sandbox-case';
import { getPublicBaseUrl } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle both exchange and payment orders
    const isExchange = body.type === "exchange" || body.send_asset;
    
    if (isExchange) {
      // SERVER-SIDE VALIDATION: Validate exchange request (rejects garbage payloads)
      const validation = validateExchangeRequest(body);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid exchange request' },
          { status: 400 }
        );
      }

      // price_amount must be USD value of send amount (what user pays) — NOT receive amount
      const priceAmount = body.price_amount ?? body.expected_receive ?? 0;
      if (isNaN(priceAmount) || priceAmount <= 0) {
        return NextResponse.json(
          { error: 'price_amount or expected_receive must be a positive number' },
          { status: 400 }
        );
      }

      // SERVER-SIDE VALIDATION: Check min/max limits from NOWPayments
      const sendAmount = parseFloat(body.send_amount);

      if (isNaN(sendAmount) || sendAmount <= 0) {
        return NextResponse.json(
          { error: 'send_amount must be a positive number' },
          { status: 400 }
        );
      }

      // Get asset network objects to extract NOWPayments IDs
      const sendAsset = getAssetNetworkById(body.send_asset);
      const receiveAsset = getAssetNetworkById(body.receive_asset);

      if (!sendAsset || !receiveAsset) {
        return NextResponse.json(
          { error: 'Invalid asset IDs' },
          { status: 400 }
        );
      }

      // Fetch real limits from NOWPayments API (required so we validate before calling createPayment)
      const isFixedRate = body.rate_type === 'fixed';
      let limits: { min_amount: number; max_amount?: number };
      try {
        limits = await getExchangeLimits(sendAsset.id, receiveAsset.id, isFixedRate);
      } catch (limitsError: any) {
        console.warn('Failed to fetch exchange limits:', limitsError.message);
        return NextResponse.json(
          {
            error: 'Unable to verify minimum amount for this pair. Please try again in a moment.',
            code: 'LIMITS_UNAVAILABLE',
          },
          { status: 503 }
        );
      }

      // Validate against min amount
      if (sendAmount < limits.min_amount) {
        return NextResponse.json(
          {
            error: `Amount is below minimum. Minimum amount is ${limits.min_amount} ${sendAsset.symbol.toUpperCase()}`,
            min_amount: limits.min_amount,
            currency: sendAsset.symbol.toUpperCase(),
          },
          { status: 400 }
        );
      }

      // Validate against max amount (if provided by API)
      if (limits.max_amount != null && sendAmount > limits.max_amount) {
        return NextResponse.json(
          {
            error: `Amount exceeds maximum. Maximum amount is ${limits.max_amount} ${sendAsset.symbol.toUpperCase()}`,
            max_amount: limits.max_amount,
            currency: sendAsset.symbol.toUpperCase(),
          },
          { status: 400 }
        );
      }

      // Get current payment mode (LIVE or SANDBOX)
      const currentPaymentMode = await getPaymentMode();
      
      const paymentParams: any = {
        price_amount: parseFloat(priceAmount),
        price_currency: (body.price_currency || 'usd').toLowerCase(),
        pay_currency: body.send_asset.toLowerCase(),
        order_id: body.order_id,
        order_description: body.order_description || `Exchange ${body.send_amount} ${body.send_asset} to ${body.receive_asset}`,
        payout_address: body.destination,
        payout_currency: body.receive_asset.toLowerCase(),
      };

      // Sandbox-specific: add case parameter from environment variable (ONLY in sandbox mode)
      let resolvedSandboxCase: SandboxCase | undefined;
      if (currentPaymentMode === 'sandbox') {
        resolvedSandboxCase = await getSandboxCase();
        paymentParams.case = resolvedSandboxCase;
      }

      // CRITICAL: IPN callback URL from centralized env (validated at startup)
      const publicBaseUrl = getPublicBaseUrl();
      if (!publicBaseUrl) {
        console.error('🔴 CRITICAL: PUBLIC_BASE_URL is not set');
        throw new Error(
          'PUBLIC_BASE_URL is required. Set it in your environment (e.g. deployment env vars).'
        );
      }
      if (
        publicBaseUrl.includes('localhost') ||
        publicBaseUrl.includes('127.0.0.1')
      ) {
        console.error('🔴 CRITICAL: PUBLIC_BASE_URL contains localhost:', publicBaseUrl);
        throw new Error(
          'PUBLIC_BASE_URL cannot be localhost in production. Use a publicly accessible URL.'
        );
      }
      paymentParams.ipn_callback_url = `${publicBaseUrl}/api/webhook/nowpayments`;

      const payment = await createPayment(paymentParams);

      const authUser = await getAuthUser();
      const userId = authUser ? authUser.userId : null;

      // Calculate rate for validation (if possible)
      const expectedReceive = parseFloat(body.expected_receive || '0');
      let providerRate: number | undefined = undefined;
      let rateDeviationPercent: number | undefined = undefined;
      
      if (sendAmount > 0 && expectedReceive > 0) {
        providerRate = expectedReceive / sendAmount;
        // TODO: Compare with market rate for sanity check
        // For now, just store the rate
      }

      // Save order + status history in one DB transaction (no payment without order)
      const orderData = {
        orderId: body.order_id || payment.order_id,
        paymentId: payment.payment_id,
        paymentMode: currentPaymentMode,
        sandboxCase: resolvedSandboxCase,
        internalStatus: 'NEW' as const,
        fromCurrency: body.send_asset.toUpperCase(),
        fromAmount: sendAmount,
        toCurrency: body.receive_asset.toUpperCase(),
        toAmount: expectedReceive,
        rateTimestamp: new Date().toISOString(),
        ...(payment.purchase_id && { purchaseId: payment.purchase_id }),
        ...(body.send_network && { fromNetwork: body.send_network }),
        ...(payment.pay_address && { fromAddress: payment.pay_address }),
        ...(body.receive_network && { toNetwork: body.receive_network }),
        ...(body.destination && { toAddress: body.destination }),
        ...(providerRate !== undefined && { providerRate }),
        ...(expectedReceive !== undefined && { expectedReceive }),
        ...(rateDeviationPercent !== undefined && { rateDeviationPercent }),
      };
      try {
        await createOrderWithHistoryTransaction(userId, orderData);
      } catch (dbError: any) {
        // Orphan: payment exists in NOWPayments but no order in DB — do not return payment
        console.error('Orphan payment: DB transaction failed', dbError?.message ?? dbError);
        return NextResponse.json(
          { error: 'Order could not be saved. Please try again.' },
          { status: 500 }
        );
      }

      // Add exchange-specific metadata
      const exchangeOrder = {
        ...payment,
        type: "exchange",
        send_asset: body.send_asset,
        send_network: body.send_network,
        send_amount: body.send_amount,
        receive_asset: body.receive_asset,
        receive_network: body.receive_network,
        expected_receive: body.expected_receive,
        rate_type: body.rate_type || "fixed",
        fee_percent: body.fee_percent,
        destination: body.destination,
        status: "awaiting_payment",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes for exchanges
      };

      return NextResponse.json(exchangeOrder);
    } else {
      // Payment order: user pays, we receive (legacy support)
      // SERVER-SIDE VALIDATION: Validate payment request
      const validation = validatePaymentRequest(body);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid payment request' },
          { status: 400 }
        );
      }

      const priceAmount = body.price_amount || body.target_value || 0;
      if (isNaN(priceAmount) || priceAmount <= 0) {
        return NextResponse.json(
          { error: 'price_amount must be a positive number' },
          { status: 400 }
        );
      }

      const payCurrency = (body.asset || '').toLowerCase().trim();

      // Get current payment mode (LIVE or SANDBOX)
      const currentPaymentMode = await getPaymentMode();

      const paymentParams: any = {
        price_amount: parseFloat(priceAmount),
        price_currency: (body.price_currency || 'usd').toLowerCase(),
        pay_currency: payCurrency,
        order_id: body.order_id,
        order_description: body.order_description || `Payment: ${body.expected_amount} ${body.asset}`,
      };

      // Sandbox-specific: add case parameter from environment variable (ONLY in sandbox mode)
      let resolvedSandboxCase: SandboxCase | undefined;
      if (currentPaymentMode === 'sandbox') {
        resolvedSandboxCase = await getSandboxCase();
        paymentParams.case = resolvedSandboxCase;
      }

      // CRITICAL: IPN callback URL from centralized env (validated at startup)
      const publicBaseUrlPayment = getPublicBaseUrl();
      if (!publicBaseUrlPayment) {
        console.error('🔴 CRITICAL: PUBLIC_BASE_URL is not set');
        throw new Error(
          'PUBLIC_BASE_URL is required. Set it in your environment (e.g. deployment env vars).'
        );
      }
      if (
        publicBaseUrlPayment.includes('localhost') ||
        publicBaseUrlPayment.includes('127.0.0.1')
      ) {
        console.error('🔴 CRITICAL: PUBLIC_BASE_URL contains localhost:', publicBaseUrlPayment);
        throw new Error(
          'PUBLIC_BASE_URL cannot be localhost in production. Use a publicly accessible URL.'
        );
      }
      paymentParams.ipn_callback_url = `${publicBaseUrlPayment}/api/webhook/nowpayments`;

      const payment = await createPayment(paymentParams);

      const authUser = await getAuthUser();
      const userId = authUser ? authUser.userId : null;

      // Save order + status history in one DB transaction (no payment without order)
      const orderDataPayment = {
        orderId: body.order_id || payment.order_id,
        paymentId: payment.payment_id,
        paymentMode: currentPaymentMode,
        sandboxCase: resolvedSandboxCase,
        internalStatus: 'NEW' as const,
        fromCurrency: payCurrency.toUpperCase(),
        fromAmount: parseFloat(body.expected_amount || '0'),
        toCurrency: payCurrency.toUpperCase(),
        toAmount: parseFloat(body.expected_amount || '0'),
        ...(payment.purchase_id && { purchaseId: payment.purchase_id }),
        ...(payment.pay_address && { fromAddress: payment.pay_address }),
      };
      try {
        await createOrderWithHistoryTransaction(userId, orderDataPayment);
      } catch (dbError: any) {
        // Orphan: payment exists in NOWPayments but no order in DB — do not return payment
        console.error('Orphan payment: DB transaction failed', dbError?.message ?? dbError);
        return NextResponse.json(
          { error: 'Order could not be saved. Please try again.' },
          { status: 500 }
        );
      }

      const paymentOrder = {
        ...payment,
        type: "payment",
        asset: body.asset,
        expected_amount: body.expected_amount,
        pricing_mode: body.pricing_mode || "float",
        price_reference: body.price_reference || "USDT",
        target_value: body.target_value,
        status: "awaiting_payment",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      return NextResponse.json(paymentOrder);
    }
  } catch (error: any) {
    console.error('Payment creation error:', error);
    
    // Return more detailed error information
    const errorMessage = error.message || 'Failed to create payment order';
    
    // Check if it's an API key error
    if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
      return NextResponse.json(
        {
          error:
            'Payment API is not configured. Set NOWPAYMENTS_API_KEY (or LIVE/SANDBOX keys) in your environment.',
        },
        { status: 500 }
      );
    }
    
    // Check if it's an address validation error
    if (errorMessage.includes('address') || errorMessage.includes('Invalid wallet') || errorMessage.includes('validate')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          hint: 'Please ensure the cryptocurrency code is correct and supported by NOWPayments'
        },
        { status: 400 }
      );
    }

    // NOWPayments: amount below minimum for this currency
    if (errorMessage.includes('less than minimal') || errorMessage.includes('AMOUNT_MINIMAL_ERROR')) {
      return NextResponse.json(
        {
          error: 'Amount is below the minimum for this currency. Please increase the amount and try again.',
          code: 'AMOUNT_MINIMAL_ERROR',
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('payment_id');
    const mode = searchParams.get('mode') as 'live' | 'sandbox' | null;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'payment_id is required' },
        { status: 400 }
      );
    }

    // Use provided mode or get current mode
    const paymentMode = mode || await getPaymentMode();
    const payment = await getPaymentStatus(paymentId, paymentMode);

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get payment status' },
      { status: 500 }
    );
  }
}

