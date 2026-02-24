import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPaymentStatus, getEstimatedPrice } from '@/lib/nowpayments';
import { getExchangeLimitsWithFallback, MIN_AMOUNT_BUFFER } from '@/lib/db-exchange-limits';
import { getExchangeFeeSettings } from '@/lib/db-exchange-fees';
import { applyFee } from '@/lib/pricing';
import { isValidAssetNetworkId, getAssetNetworkById } from '@/lib/supportedAssets';
import { getAuthUser } from '@/lib/auth';
import { createOrderWithHistoryTransaction } from '@/lib/db-orders';
import { validateExchangeRequest, validatePaymentRequest } from '@/lib/validation';
import { getPaymentMode } from '@/lib/payment-mode';
import { getSandboxCase } from '@/lib/payment-mode';
import { getPayoutMode } from '@/lib/payout-mode';
import type { SandboxCase } from '@/lib/sandbox-case';
import { getPublicBaseUrl } from '@/lib/env';
import { paymentLogger } from '@/lib/payment-logger';

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

      // rate_type is required; must be exactly 'fixed' or 'floating' (accept 'float' as alias for 'floating')
      const rateTypeRaw = body.rate_type;
      if (rateTypeRaw !== 'fixed' && rateTypeRaw !== 'floating' && rateTypeRaw !== 'float') {
        return NextResponse.json(
          { error: 'rate_type is required and must be "fixed" or "floating"' },
          { status: 400 }
        );
      }
      const resolvedRateMode: 'fixed' | 'floating' = rateTypeRaw === 'fixed' ? 'fixed' : 'floating';
      const isFixedRate = resolvedRateMode === 'fixed';

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

      // Use same limits source as UI (cache + API fallback) and apply buffer so provider accepts the amount
      let limits: { min_amount: number; max_amount?: number };
      try {
        limits = await getExchangeLimitsWithFallback(sendAsset.id, receiveAsset.id, isFixedRate);
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

      const effectiveMin = limits.min_amount * (1 + MIN_AMOUNT_BUFFER);
      if (sendAmount < effectiveMin) {
        return NextResponse.json(
          {
            error: `Amount is below minimum. Minimum amount is ${effectiveMin.toFixed(8).replace(/\.?0+$/, '')} ${sendAsset.symbol.toUpperCase()}`,
            min_amount: effectiveMin,
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

      // Get current payment mode (LIVE or SANDBOX) and payout mode (manual = funds to balance, automatic = NOWPayments sends to user)
      const currentPaymentMode = await getPaymentMode();
      const payoutMode = await getPayoutMode();

      // Backend fee % from DB (applied to receive amount)
      const feeSettings = await getExchangeFeeSettings();
      const feePercent = isFixedRate ? feeSettings.fixedFeePercent : feeSettings.floatingFeePercent;
      // Backend-calculated expected receive: provider estimate then apply our fee (fee is deducted from output)
      let expectedReceiveBackend: number;
      try {
        const estimatedFromProvider = await getEstimatedPrice(sendAmount, sendAsset.id, receiveAsset.id);
        expectedReceiveBackend = applyFee(estimatedFromProvider, feePercent);
      } catch (estimateErr: any) {
        console.warn('Estimated price failed, using client expected_receive:', estimateErr?.message);
        expectedReceiveBackend = parseFloat(body.expected_receive || '0') || 0;
      }

      const paymentParams: any = {
        price_amount: parseFloat(priceAmount),
        price_currency: (body.price_currency || 'usd').toLowerCase(),
        pay_currency: body.send_asset.toLowerCase(),
        order_id: body.order_id,
        order_description: body.order_description || `Exchange ${body.send_amount} ${body.send_asset} to ${body.receive_asset}`,
        is_fixed_rate: isFixedRate,
      };
      // Automatic payout: include payout_address and payout_currency so NOWPayments sends converted funds to user.
      // Manual payout: omit so funds remain in NOWPayments balance; admin pays user manually and marks order completed.
      if (payoutMode === 'automatic') {
        paymentParams.payout_address = body.destination;
        paymentParams.payout_currency = body.receive_asset.toLowerCase();
      }

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

      paymentLogger.paymentCreated({
        order_id: body.order_id || payment.order_id,
        payment_id_suffix: paymentLogger.maskPaymentId(payment.payment_id),
        ipn_callback_url_set: !!paymentParams.ipn_callback_url,
        ipn_callback_url_used: paymentParams.ipn_callback_url ?? '',
        mode: currentPaymentMode,
      });

      const authUser = await getAuthUser();
      const userId = authUser ? authUser.userId : null;

      // Canonical amount to send: from provider (pay_amount) when present, else client send_amount
      const providerPayAmount = payment.pay_amount != null ? Number(payment.pay_amount) : null;
      const fromAmount = providerPayAmount ?? sendAmount;

      let providerRate: number | undefined =
        payment.pay_amount != null && payment.outcome_amount != null && payment.pay_amount > 0
          ? Number(payment.outcome_amount) / Number(payment.pay_amount)
          : fromAmount > 0 && expectedReceiveBackend > 0
            ? expectedReceiveBackend / fromAmount
            : undefined;

      const rateMode: 'fixed' | 'floating' = resolvedRateMode;

      // Save order + status history in one DB transaction (no payment without order)
      const orderData = {
        orderId: body.order_id || payment.order_id,
        paymentId: payment.payment_id,
        paymentMode: currentPaymentMode,
        payoutMode,
        sandboxCase: resolvedSandboxCase,
        internalStatus: 'NEW' as const,
        fromCurrency: body.send_asset.toUpperCase(),
        fromAmount,
        toCurrency: body.receive_asset.toUpperCase(),
        toAmount: expectedReceiveBackend,
        rateTimestamp: new Date().toISOString(),
        providerRate: providerRate ?? undefined,
        expectedReceive: expectedReceiveBackend,
        rateMode,
        providerRateLocked: isFixedRate,
        providerPayAmount: providerPayAmount ?? undefined,
        ...(payment.purchase_id && { purchaseId: payment.purchase_id }),
        ...(body.send_network && { fromNetwork: body.send_network }),
        ...(payment.pay_address && { fromAddress: payment.pay_address }),
        ...(body.receive_network && { toNetwork: body.receive_network }),
        ...(body.destination && { toAddress: body.destination }),
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

      // Add exchange-specific metadata (use backend/provider values)
      const exchangeOrder = {
        ...payment,
        type: "exchange",
        send_asset: body.send_asset,
        send_network: body.send_network,
        send_amount: fromAmount,
        receive_asset: body.receive_asset,
        receive_network: body.receive_network,
        expected_receive: expectedReceiveBackend,
        rate_type: rateMode,
        rate_mode: rateMode,
        fee_percent: feePercent,
        provider_pay_amount: providerPayAmount,
        provider_rate_locked: isFixedRate,
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

      paymentLogger.paymentCreated({
        order_id: body.order_id || payment.order_id,
        payment_id_suffix: paymentLogger.maskPaymentId(payment.payment_id),
        ipn_callback_url_set: !!paymentParams.ipn_callback_url,
        ipn_callback_url_used: paymentParams.ipn_callback_url ?? '',
        mode: currentPaymentMode,
      });

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

    // NOWPayments: amount above maximum or limit exceeded (e.g. very large orders)
    if (
      errorMessage.toLowerCase().includes('maximum') ||
      errorMessage.toLowerCase().includes('exceed') ||
      errorMessage.toLowerCase().includes('limit') ||
      errorMessage.toLowerCase().includes('too large')
    ) {
      return NextResponse.json(
        {
          error: errorMessage || 'Amount exceeds the maximum allowed for this currency pair. Please try a smaller amount.',
          code: 'AMOUNT_MAX_ERROR',
        },
        { status: 400 }
      );
    }

    // Pair not available / not convertible
    if (
      errorMessage.toLowerCase().includes('not convertable') ||
      errorMessage.toLowerCase().includes('not supported') ||
      errorMessage.toLowerCase().includes('not available')
    ) {
      return NextResponse.json(
        { error: errorMessage || 'This currency pair is not available for exchange.' },
        { status: 400 }
      );
    }

    // Forward other provider/user-facing errors so the user sees the real reason (no stack traces or secrets)
    const looksSafe =
      errorMessage.length > 0 &&
      errorMessage.length < 400 &&
      !/api[_\s]?key|secret|token|password|env/i.test(errorMessage);
    if (looksSafe) {
      return NextResponse.json(
        { error: errorMessage },
        { status: typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
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

    paymentLogger.paymentStatusPoll({
      payment_id_suffix: paymentLogger.maskPaymentId(paymentId),
      mode: paymentMode,
      response_status: payment.payment_status ?? 'unknown',
      ok: true,
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    paymentLogger.paymentStatusPoll({
      payment_id_suffix: paymentLogger.maskPaymentId(searchParams.get('payment_id') ?? undefined),
      mode: searchParams.get('mode') ?? 'current',
      response_status: 'error',
      ok: false,
    });
    console.error('Payment status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get payment status' },
      { status: 500 }
    );
  }
}

