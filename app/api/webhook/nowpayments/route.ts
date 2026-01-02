import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  getOrderByPaymentId, 
  updateOrderStatus,
  checkWebhookIdempotency,
  recordWebhookIdempotency
} from '@/lib/db-orders';
import { notifyOrderStatus } from '@/lib/notifications';
import { webhookLogger } from '@/lib/webhook-logger';
import { getPayoutMode } from '@/lib/payout-mode';
import { mapProviderStatusToInternal, type InternalStatus } from '@/lib/status-mapping';
import { recordOrderCompletion } from '@/lib/ledger';
import { getNowPaymentsConfig } from '@/lib/nowpayments-config';

/**
 * Verify NOWPayments webhook signature
 * NOWPayments uses HMAC SHA-512 for signature verification
 * PRIORITY 4: Security hardening - validates signature format before processing
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    // PRIORITY 4: Validate signature format (must be hex string)
    // HMAC SHA-512 produces 128 hex characters (512 bits / 4 bits per hex char)
    if (!/^[0-9a-f]{128}$/i.test(signature)) {
      webhookLogger.error('Invalid webhook signature format: expected 128-character hex string');
      return false;
    }

    // Calculate HMAC SHA-512 hash
    const hmac = crypto.createHmac('sha512', secret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('hex');

    // PRIORITY 4: Ensure calculated signature is also valid hex before comparison
    if (calculatedSignature.length !== 128) {
      webhookLogger.error('Invalid calculated signature length');
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(calculatedSignature, 'hex')
    );
  } catch (error) {
    webhookLogger.error('Webhook signature verification error', error);
    return false;
  }
}

/**
 * NOWPayments webhook endpoint
 * Receives payment status updates via IPN (Instant Payment Notifications)
 * 
 * Webhook URL: POST /api/webhook/nowpayments
 * 
 * Environment variables required:
 * - NOWPAYMENTS_IPN_SECRET: IPN secret key from NOWPayments dashboard
 */
export async function POST(request: NextRequest) {
  // ============================================================================
  // CRITICAL DEBUGGING: VERY LOUD LOGS AT TOP OF HANDLER
  // ============================================================================
  console.log('🔵🔵🔵 NOWPAYMENTS WEBHOOK HANDLER HIT 🔵🔵🔵');
  console.log('🔵 Request Method:', request.method);
  console.log('🔵 Request URL:', request.url);
  console.log('🔵 Request Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  
  try {
    // PRIORITY 5: Log webhook receipt
    webhookLogger.info('Webhook received', { event: 'webhook_received' });
    console.log('🔵 Webhook received - starting processing');

    // Get raw body for signature verification
    // In Next.js App Router, request.text() consumes the stream, so we need to get it first
    const rawBody = await request.text();
    console.log('🔵 Raw body length:', rawBody.length);
    console.log('🔵 Raw body (first 500 chars):', rawBody.substring(0, 500));
    
    // Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
      console.log('🔵 JSON parsed successfully');
      console.log('🔵 Payload keys:', Object.keys(payload));
      console.log('🔵 payment_id:', payload.payment_id);
      console.log('🔵 payment_status:', payload.payment_status);
      console.log('🔵 Full payload:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('🔴 JSON parse error:', error);
      webhookLogger.error('Invalid JSON payload in webhook', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Extract payment information from payload (needed to determine mode)
    const paymentId = payload.payment_id;
    console.log('🔵 Extracted payment_id:', paymentId);
    
    if (!paymentId) {
      console.error('🔴 payment_id missing from payload');
      webhookLogger.error('Webhook payload missing payment_id', undefined, { event: 'validation_error' });
      return NextResponse.json(
        { error: 'payment_id required' },
        { status: 400 }
      );
    }
    
    // Find order by payment_id to determine payment mode
    // We need the mode to select the correct IPN secret
    console.log('🔵 Looking up order by payment_id:', paymentId);
    let order = await getOrderByPaymentId(paymentId);
    let paymentMode: 'live' | 'sandbox' = 'live';
    
    if (order) {
      console.log('🔵 Order found:', order.orderId);
      console.log('🔵 Order payment_mode:', order.paymentMode);
      console.log('🔵 Order current internal_status:', order.internalStatus);
      console.log('🔵 Order current provider_status:', order.providerStatus);
      if (order.paymentMode) {
        paymentMode = order.paymentMode;
      }
    } else {
      console.warn('🔴 Order NOT found for payment_id:', paymentId);
      // If order not found, try to determine mode from environment
      // Default to live if we can't determine
      webhookLogger.warn('Order not found for payment_id, defaulting to live mode for signature verification', {
        event: 'order_not_found_before_verification',
        payment_id: paymentId,
      });
    }
    console.log('🔵 Determined payment_mode:', paymentMode);
    
    // Get IPN secret based on payment mode
    let ipnSecret: string | undefined;
    
    if (paymentMode === 'sandbox') {
      ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET_SANDBOX;
      console.log('🔵 Using SANDBOX IPN secret (configured:', !!ipnSecret, ')');
    } else {
      // Live mode (default)
      ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET_LIVE || process.env.NOWPAYMENTS_IPN_SECRET;
      console.log('🔵 Using LIVE IPN secret (LIVE configured:', !!process.env.NOWPAYMENTS_IPN_SECRET_LIVE, ', LEGACY configured:', !!process.env.NOWPAYMENTS_IPN_SECRET, ')');
    }
    console.log('🔵 IPN secret length:', ipnSecret?.length || 0);
    
    // Get webhook signature from headers
    // NOWPayments IPN uses x-nowpayments-sig header for signature (HMAC SHA-512)
    const signature = request.headers.get('x-nowpayments-sig') || 
                     request.headers.get('x-nowpayments-signature') ||
                     request.headers.get('signature');
    console.log('🔵 Signature header (x-nowpayments-sig):', request.headers.get('x-nowpayments-sig') ? 'PRESENT' : 'MISSING');
    console.log('🔵 Signature header (x-nowpayments-signature):', request.headers.get('x-nowpayments-signature') ? 'PRESENT' : 'MISSING');
    console.log('🔵 Signature header (signature):', request.headers.get('signature') ? 'PRESENT' : 'MISSING');
    console.log('🔵 Resolved signature:', signature ? `${signature.substring(0, 20)}...` : 'NULL');
    
    // Verify signature if secret is configured
    if (ipnSecret) {
      if (!signature) {
        console.error('🔴 Signature missing - returning 401');
        webhookLogger.error('Webhook signature missing', undefined, { 
          event: 'signature_missing',
          payment_mode: paymentMode,
        });
        return NextResponse.json(
          { error: 'Signature required' },
          { status: 401 }
        );
      }

      console.log('🔵 Verifying signature...');
      console.log('🔵 Raw body length for signature:', rawBody.length);
      console.log('🔵 Signature length:', signature.length);
      console.log('🔵 Secret length:', ipnSecret.length);
      
      // Calculate expected signature for debugging
      const hmac = crypto.createHmac('sha512', ipnSecret);
      hmac.update(rawBody);
      const calculatedSignature = hmac.digest('hex');
      console.log('🔵 Calculated signature (first 20 chars):', calculatedSignature.substring(0, 20));
      console.log('🔵 Received signature (first 20 chars):', signature.substring(0, 20));
      
      const isValid = verifyWebhookSignature(rawBody, signature, ipnSecret);
      console.log('🔵 Signature validation result:', isValid ? '✅ VALID' : '❌ INVALID');
      
      if (!isValid) {
        console.error('🔴 Invalid signature - returning 401');
        console.error('🔴 Expected signature:', calculatedSignature);
        console.error('🔴 Received signature:', signature);
        console.error('🔴 Secret used:', ipnSecret.substring(0, 10) + '...');
        webhookLogger.error('Invalid webhook signature', undefined, { 
          event: 'signature_invalid',
          payment_mode: paymentMode,
        });
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      // PRIORITY 5: Log successful signature verification
      console.log('✅ Signature verified successfully');
      webhookLogger.info('Webhook signature verified', { 
        event: 'signature_verified',
        payment_mode: paymentMode,
      });
    } else {
      // In development, allow webhooks without signature verification (with warning)
      if (process.env.NODE_ENV === 'production') {
        webhookLogger.error('IPN secret not configured for payment mode', undefined, {
          event: 'config_error',
          payment_mode: paymentMode,
        });
        return NextResponse.json(
          { error: `Webhook secret not configured for ${paymentMode} mode` },
          { status: 500 }
        );
      } else {
        webhookLogger.warn('IPN secret not set - webhook signature verification skipped', {
          event: 'signature_verification_skipped',
          environment: 'development',
          payment_mode: paymentMode,
        });
      }
    }

    // Extract payment information from payload
    const paymentStatus = payload.payment_status;
    const orderId = payload.order_id;
    console.log('🔵 Extracted payment_status:', paymentStatus);
    console.log('🔵 Extracted order_id from payload:', orderId);

    if (!paymentStatus) {
      console.error('🔴 payment_status missing from payload');
      webhookLogger.error('Webhook payload missing payment_status', undefined, {
        event: 'validation_error',
        payment_id: paymentId,
      });
      return NextResponse.json(
        { error: 'payment_status required' },
        { status: 400 }
      );
    }
    
    // Update payment mode from order if found (order was already fetched above)
    if (order && order.paymentMode) {
      paymentMode = order.paymentMode;
      console.log('🔵 Updated payment_mode from order:', paymentMode);
    }

    // PRIORITY 5: Log webhook processing start
    console.log('🔵 Starting webhook processing...');
    webhookLogger.info('Processing webhook', {
      event: 'webhook_processing',
      payment_id: paymentId,
      payment_status: paymentStatus,
      payment_mode: paymentMode,
    });
    
    if (!order) {
      console.error('🔴 Order not found - returning 200 to prevent retries');
      webhookLogger.warn('Order not found for payment_id', {
        event: 'order_not_found',
        payment_id: paymentId,
      });
      // Return 200 to prevent NOWPayments from retrying
      // Order might not exist in our DB yet, or payment_id mismatch
      return NextResponse.json(
        { received: true, message: 'Order not found' },
        { status: 200 }
      );
    }
    
    console.log('✅ Order found, proceeding with status update');

    // PRIORITY 1: Check idempotency - prevent duplicate webhook processing
    console.log('🔵 Checking idempotency...');
    const alreadyProcessed = await checkWebhookIdempotency(paymentId, paymentStatus);
    console.log('🔵 Idempotency check result:', alreadyProcessed ? 'ALREADY PROCESSED' : 'NEW');
    
    if (alreadyProcessed) {
      console.log('✅ Webhook already processed - returning 200');
      webhookLogger.info('Webhook already processed (idempotent)', {
        event: 'webhook_idempotent',
        payment_id: paymentId,
        payment_status: paymentStatus,
        order_id: order.orderId,
      });
      // Return success - webhook was already processed, no action needed
      return NextResponse.json(
        { 
          received: true,
          order_id: order.orderId,
          status: order.status,
          message: 'Webhook already processed (idempotent)' 
        },
        { status: 200 }
      );
    }

    // Map NOWPayments status to internal order status using new mapping function
    console.log('🔵 Mapping provider status to internal status...');
    console.log('🔵 Provider status:', paymentStatus);
    let mappedStatus = mapProviderStatusToInternal(paymentStatus) as InternalStatus;
    console.log('🔵 Mapped internal status:', mappedStatus);

    // CRITICAL: In manual payout mode, prevent automatic DONE status
    // Orders must stop at PAYMENT_CONFIRMED and wait for admin manual completion
    console.log('🔵 Checking payout mode...');
    const payoutMode = await getPayoutMode();
    console.log('🔵 Payout mode:', payoutMode);
    
    if (payoutMode === 'manual' && (mappedStatus === 'DONE' || paymentStatus?.toLowerCase() === 'finished' || paymentStatus?.toLowerCase() === 'success')) {
      // In manual mode, NOWPayments may have sent payout, but we don't auto-complete
      // Stop at PAYMENT_CONFIRMED and move to MANUAL_REVIEW for admin action
      const currentInternalStatus = order.internalStatus || order.status;
      console.log('🔵 Manual payout mode - intercepting DONE status');
      console.log('🔵 Current internal status:', currentInternalStatus);
      
      if (currentInternalStatus === 'PROCESSING_BY_PROVIDER') {
        mappedStatus = 'MANUAL_REVIEW'; // Move to manual review queue
      } else {
        mappedStatus = 'PAYMENT_CONFIRMED'; // Stop at payment confirmed
      }
      
      console.log('🔵 Mapped status changed to:', mappedStatus);
      webhookLogger.info('Manual payout mode: preventing automatic DONE status', {
        event: 'manual_payout_mode_intercept',
        payment_id: paymentId,
        order_id: order.orderId,
        payment_status: paymentStatus,
        would_have_been: 'DONE',
        set_to: mappedStatus,
      });
    }

    // Update order status in database
    // Status transition protection is handled in updateOrderStatus
    console.log('🔵 Calling updateOrderStatus...');
    console.log('🔵 Order ID:', order.orderId);
    console.log('🔵 Mapped status:', mappedStatus);
    console.log('🔵 Provider status to save:', paymentStatus);
    
    const updatedOrder = await updateOrderStatus(
      order.orderId,
      mappedStatus,
      {
        fromAddress: payload.pay_address || undefined,
        payinHash: payload.payin_hash || undefined,
        payoutHash: payload.payout_hash || undefined,
        providerStatus: paymentStatus, // Store raw provider status
      },
      {
        source: 'webhook', // Track source for history
        paymentStatus: paymentStatus, // Pass original payment_status for history
      }
    );

    console.log('🔵 updateOrderStatus returned:', updatedOrder ? 'SUCCESS' : 'NULL');
    
    if (!updatedOrder) {
      console.error('🔴 updateOrderStatus returned NULL - database update failed');
      webhookLogger.error('Failed to update order status', undefined, {
        event: 'status_update_failed',
        payment_id: paymentId,
        order_id: order.orderId,
        payment_status: paymentStatus,
        mapped_status: mappedStatus,
      });
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }
    
    console.log('✅ Order updated successfully');
    console.log('🔵 Updated order internal_status:', updatedOrder.internalStatus);
    console.log('🔵 Updated order provider_status:', updatedOrder.providerStatus);
    console.log('🔵 Updated order user_status:', updatedOrder.userStatus);

    // PRIORITY 1: Record idempotency AFTER successful processing
    // This ensures we only mark as processed if the update succeeded
    await recordWebhookIdempotency(paymentId, paymentStatus, order.orderId);

    // Log successful status update
    const oldStatus = order.internalStatus || order.status;
    const newStatus = updatedOrder.internalStatus || updatedOrder.status;
    const statusChanged = oldStatus !== newStatus;
    
    if (statusChanged) {
      webhookLogger.info('Order status updated', {
        event: 'status_updated',
        payment_id: paymentId,
        order_id: order.orderId,
        payment_status: paymentStatus,
        old_status: oldStatus,
        new_status: newStatus,
        source: 'webhook',
      });
    } else {
      // Status didn't change - either invalid transition or idempotent retry
      webhookLogger.info('Order status unchanged', {
        event: 'status_unchanged',
        payment_id: paymentId,
        order_id: order.orderId,
        payment_status: paymentStatus,
        current_status: oldStatus,
        attempted_status: mappedStatus,
        source: 'webhook',
      });
    }

    // Record order completion in ledger when status changes to DONE (idempotent, non-blocking)
    if (statusChanged && newStatus === 'DONE') {
      try {
        await recordOrderCompletion(
          updatedOrder.orderId,
          updatedOrder.userId,
          updatedOrder.toAmount,
          updatedOrder.toCurrency,
          updatedOrder.fromAmount,
          updatedOrder.fromCurrency,
          0.01 // 1% platform fee (TODO: make configurable)
        );
        webhookLogger.info('Ledger entry recorded', {
          event: 'ledger_recorded',
          order_id: updatedOrder.orderId,
        });
      } catch (ledgerError) {
        // Log but don't fail webhook processing if ledger recording fails
        webhookLogger.error('Failed to record ledger entry', ledgerError, {
          event: 'ledger_failed',
          order_id: updatedOrder.orderId,
        });
      }
    }

    // Send notification to user if status actually changed to important states
    // Only send if status changed (handles invalid transitions gracefully)
    const importantStatuses: InternalStatus[] = ['DONE', 'EXPIRED', 'PROCESSING_BY_PROVIDER'];
    if (statusChanged && importantStatuses.includes(newStatus as InternalStatus)) {
      try {
        await notifyOrderStatus(order.userId, order.orderId, newStatus.toLowerCase(), request);
        webhookLogger.info('Notification sent', {
          event: 'notification_sent',
          order_id: order.orderId,
          status: newStatus,
        });
      } catch (notifyError) {
        // Log but don't fail webhook processing if notification fails
        webhookLogger.error('Failed to send notification', notifyError, {
          event: 'notification_failed',
          order_id: order.orderId,
          status: newStatus,
        });
      }
    }

    // PRIORITY 5: Log successful webhook completion
    console.log('✅✅✅ NOWPAYMENTS IPN PROCESSED SUCCESSFULLY ✅✅✅');
    webhookLogger.info('Webhook processed successfully', {
      event: 'webhook_completed',
      payment_id: paymentId,
      order_id: order.orderId,
      status: mappedStatus,
    });

    // Return success to NOWPayments
    console.log('🔵 Returning HTTP 200 to NOWPayments');
    const response = NextResponse.json(
      { 
        received: true,
        order_id: order.orderId,
        status: mappedStatus,
        message: 'Webhook processed successfully'
      },
      { status: 200 }
    );
    console.log('🔵 Response status:', response.status);
    return response;

  } catch (error: any) {
    // PRIORITY 5: Log webhook processing error
    console.error('🔴🔴🔴 WEBHOOK ERROR 🔴🔴🔴');
    console.error('🔴 Error message:', error.message);
    console.error('🔴 Error stack:', error.stack);
    console.error('🔴 Full error:', error);
    webhookLogger.error('Webhook processing error', error, {
      event: 'webhook_error',
    });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * TEMPORARY GET handler for testing webhook reachability
 * Remove this after confirming webhooks work
 */
export async function GET() {
  console.log('🔥 WEBHOOK GET HIT');
  return new Response('WEBHOOK OK', { status: 200 });
}

