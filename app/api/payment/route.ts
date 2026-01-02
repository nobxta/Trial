import { NextRequest, NextResponse } from 'next/server';
import { createPayment, getPaymentStatus, getExchangeLimits } from '@/lib/nowpayments';
import { isValidAssetNetworkId, getAssetNetworkById } from '@/lib/supportedAssets';
import { getAuthUser } from '@/lib/auth';
import { createOrder } from '@/lib/db-orders';
import { validateExchangeRequest, validatePaymentRequest } from '@/lib/validation';
import { getPaymentMode } from '@/lib/payment-mode';
import { getSandboxCaseFromEnv, type SandboxCase } from '@/lib/sandbox-case';

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

      // Calculate price_amount from expected_receive or use provided value
      const priceAmount = body.price_amount || body.expected_receive || 0;
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

      // Fetch real limits from NOWPayments API
      try {
        const isFixedRate = body.rate_type === 'fixed';
        const limits = await getExchangeLimits(sendAsset.id, receiveAsset.id, isFixedRate);

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
        if (limits.max_amount && sendAmount > limits.max_amount) {
          return NextResponse.json(
            {
              error: `Amount exceeds maximum. Maximum amount is ${limits.max_amount} ${sendAsset.symbol.toUpperCase()}`,
              max_amount: limits.max_amount,
              currency: sendAsset.symbol.toUpperCase(),
            },
            { status: 400 }
          );
        }
      } catch (limitsError: any) {
        // If limits API fails, log but don't block the order
        // NOWPayments will reject it anyway if amount is invalid
        console.warn('Failed to fetch exchange limits, proceeding with order creation:', limitsError.message);
        // Continue - NOWPayments will validate on their end
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
        resolvedSandboxCase = getSandboxCaseFromEnv();
        paymentParams.case = resolvedSandboxCase;
      }

      // CRITICAL: IPN callback URL MUST use PUBLIC_BASE_URL (no fallbacks, no localhost)
      // This is the ONLY source of truth for webhook URLs
      const publicBaseUrl = process.env.PUBLIC_BASE_URL;
      
      if (!publicBaseUrl) {
        console.error('🔴 CRITICAL: PUBLIC_BASE_URL environment variable is missing');
        throw new Error('PUBLIC_BASE_URL environment variable is required. Set it to your public ngrok URL (e.g., https://abc123.ngrok-free.app)');
      }
      
      if (publicBaseUrl.includes('localhost') || publicBaseUrl.includes('127.0.0.1')) {
        console.error('🔴 CRITICAL: PUBLIC_BASE_URL contains localhost:', publicBaseUrl);
        throw new Error('PUBLIC_BASE_URL cannot contain localhost. It must be a publicly accessible URL (e.g., ngrok URL)');
      }
      
      // Build IPN callback URL - NEVER allow frontend to override this
      const ipnCallbackUrl = `${publicBaseUrl}/api/webhook/nowpayments`;
      paymentParams.ipn_callback_url = ipnCallbackUrl;
      
      // CRITICAL LOG: Always log the final callback URL used
      console.log('🔥 IPN CALLBACK URL USED:', ipnCallbackUrl);

      const payment = await createPayment(paymentParams);

      // Get authenticated user ID (null for anonymous orders)
      const authUser = await getAuthUser();
      const userId = authUser ? authUser.userId : null;

      // Calculate rate for validation (if possible)
      const expectedReceive = parseFloat(body.expected_receive || '0');
      let providerRate: number | null = null;
      let rateDeviationPercent: number | null = null;
      
      if (sendAmount > 0 && expectedReceive > 0) {
        providerRate = expectedReceive / sendAmount;
        // TODO: Compare with market rate for sanity check
        // For now, just store the rate
      }

      // Save order to database (NON-NEGOTIABLE: Database is source of truth)
      try {
        await createOrder(userId, {
          orderId: body.order_id || payment.order_id,
          paymentId: payment.payment_id,
          purchaseId: payment.purchase_id || null,
          paymentMode: currentPaymentMode,
          sandboxCase: resolvedSandboxCase, // Save resolved sandbox case from env variable
          internalStatus: 'NEW', // New order starts at NEW
          fromCurrency: body.send_asset.toUpperCase(),
          fromAmount: sendAmount,
          fromNetwork: body.send_network || null,
          fromAddress: payment.pay_address || null,
          toCurrency: body.receive_asset.toUpperCase(),
          toAmount: expectedReceive,
          toNetwork: body.receive_network || null,
          toAddress: body.destination || null,
          providerRate: providerRate,
          expectedReceive: expectedReceive,
          rateTimestamp: new Date().toISOString(),
          rateDeviationPercent: rateDeviationPercent,
        });
      } catch (dbError: any) {
        // Log error but don't fail the payment creation
        // Order is still created in NOWPayments, but DB save failed
        console.error('Failed to save order to database:', dbError);
        // Continue - payment is still valid, just not tracked in our DB
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
        resolvedSandboxCase = getSandboxCaseFromEnv();
        paymentParams.case = resolvedSandboxCase;
      }

      // CRITICAL: IPN callback URL MUST use PUBLIC_BASE_URL (no fallbacks, no localhost)
      // This is the ONLY source of truth for webhook URLs
      const publicBaseUrl = process.env.PUBLIC_BASE_URL;
      
      if (!publicBaseUrl) {
        console.error('🔴 CRITICAL: PUBLIC_BASE_URL environment variable is missing');
        throw new Error('PUBLIC_BASE_URL environment variable is required. Set it to your public ngrok URL (e.g., https://abc123.ngrok-free.app)');
      }
      
      if (publicBaseUrl.includes('localhost') || publicBaseUrl.includes('127.0.0.1')) {
        console.error('🔴 CRITICAL: PUBLIC_BASE_URL contains localhost:', publicBaseUrl);
        throw new Error('PUBLIC_BASE_URL cannot contain localhost. It must be a publicly accessible URL (e.g., ngrok URL)');
      }
      
      // Build IPN callback URL - NEVER allow frontend to override this
      const ipnCallbackUrl = `${publicBaseUrl}/api/webhook/nowpayments`;
      paymentParams.ipn_callback_url = ipnCallbackUrl;
      
      // CRITICAL LOG: Always log the final callback URL used
      console.log('🔥 IPN CALLBACK URL USED:', ipnCallbackUrl);

      const payment = await createPayment(paymentParams);

      // Get authenticated user ID (null for anonymous orders)
      const authUser = await getAuthUser();
      const userId = authUser ? authUser.userId : null;

      // Save order to database (NON-NEGOTIABLE: Database is source of truth)
      try {
        await createOrder(userId, {
          orderId: body.order_id || payment.order_id,
          paymentId: payment.payment_id,
          purchaseId: payment.purchase_id || null,
          paymentMode: currentPaymentMode,
          sandboxCase: resolvedSandboxCase, // Save resolved sandbox case from env variable
          status: 'pending',
          fromCurrency: payCurrency.toUpperCase(),
          fromAmount: parseFloat(body.expected_amount || '0'),
          fromNetwork: null,
          fromAddress: payment.pay_address || null,
          toCurrency: payCurrency.toUpperCase(), // Payment orders: same currency
          toAmount: parseFloat(body.expected_amount || '0'),
          toNetwork: null,
          toAddress: null,
        });
      } catch (dbError: any) {
        console.error('Failed to save order to database:', dbError);
        // Continue - payment is still valid
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
        { error: 'API key not configured. Please check your .env.local file.' },
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
    
    return NextResponse.json(
      { error: errorMessage },
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

