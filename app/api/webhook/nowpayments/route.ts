import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getOrderByPaymentId,
  processWebhookStatusUpdateAtomic,
  type Order,
} from '@/lib/db-orders';
import { notifyOrderStatus } from '@/lib/notifications';
import { webhookLogger } from '@/lib/webhook-logger';
import { mapProviderStatusToInternal, getUserFacingStatus, isStatusDowngrade, type InternalStatus } from '@/lib/status-mapping';
import { recordOrderCompletion } from '@/lib/ledger';
import { sendTelegramNotification } from '@/lib/telegram';
import { getNowPaymentsConfig } from '@/lib/nowpayments-config';
import {
  getNowPaymentsLiveIpnSecret,
  getNowPaymentsSandboxIpnSecret,
  isProductionEnv,
} from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase';
import { paymentLogger } from '@/lib/payment-logger';

/**
 * Recursively sort object keys for canonical JSON (per NOWPayments IPN docs).
 * Nested objects are sorted; arrays are preserved and their elements processed recursively.
 */
function sortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  const record = obj as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce(
      (result, key) => {
        result[key] = sortObject(record[key]);
        return result;
      },
      {} as Record<string, unknown>
    );
}

/**
 * Build the canonical body string for NOWPayments signature verification.
 * NOWPayments signs the JSON body with keys sorted alphabetically at every level (per their IPN docs).
 * We must hash this string, not the raw request body.
 */
function buildCanonicalBodyForSignature(payload: Record<string, unknown>): string {
  return JSON.stringify(sortObject(payload));
}

/** Compute HMAC SHA-512 hex of body (for logging on mismatch). */
function computeHmacSha512Hex(body: string, secret: string): string {
  const hmac = crypto.createHmac('sha512', secret);
  hmac.update(body);
  return hmac.digest('hex');
}

/**
 * Verify NOWPayments webhook signature
 * NOWPayments uses HMAC SHA-512 over the JSON body with keys sorted alphabetically.
 * PRIORITY 4: Security hardening - validates signature format before processing
 */
function verifyWebhookSignature(
  bodyToHash: string,
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

    const calculatedSignature = computeHmacSha512Hex(bodyToHash, secret);

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
  const timestamp = new Date().toISOString();
  const remoteIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  paymentLogger.webhookRequestReceived({ remote_ip: remoteIp, timestamp });
  webhookLogger.info('Webhook received', { event: 'webhook_received' });

  try {
    // Get raw body: read as text first so Next.js does not parse it (we need to parse ourselves).
    // Signature verification uses the canonical body (JSON with keys sorted alphabetically), not rawBody.
    const rawBody = await request.text();

    // Parse JSON payload (do not log full payload or payment_id — may contain PII / sensitive data)
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      webhookLogger.error('Invalid JSON payload in webhook', error);
      paymentLogger.webhookResponse({ status: 400, event: 'invalid_json' });
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Extract payment information from payload (needed to determine mode)
    // NowPayments may send payment_id as number or string; normalize to string for DB lookup
    const paymentIdRaw = payload.payment_id;
    if (paymentIdRaw === undefined || paymentIdRaw === null || paymentIdRaw === '') {
      webhookLogger.error('Webhook payload missing payment_id', undefined, { event: 'validation_error' });
      return NextResponse.json(
        { error: 'payment_id required' },
        { status: 400 }
      );
    }
    const paymentId = String(paymentIdRaw);

    // Find order by payment_id to determine payment mode (select correct IPN secret)
    let order = await getOrderByPaymentId(paymentId);
    let paymentMode: 'live' | 'sandbox' = 'live';

    if (order && order.paymentMode) {
      paymentMode = order.paymentMode;
    } else if (!order) {
      webhookLogger.warn('Order not found for payment_id, defaulting to live mode for signature verification', {
        event: 'order_not_found_before_verification',
      });
    }

    // Get IPN secret from centralized env (no direct process.env for secrets)
    let ipnSecret: string | undefined;
    if (paymentMode === 'sandbox') {
      ipnSecret = getNowPaymentsSandboxIpnSecret() || undefined;
    } else {
      ipnSecret = getNowPaymentsLiveIpnSecret() || undefined;
    }

    // Get webhook signature from headers
    // NOWPayments IPN uses x-nowpayments-sig header for signature (HMAC SHA-512)
    const signature = request.headers.get('x-nowpayments-sig') ||
                     request.headers.get('x-nowpayments-signature') ||
                     request.headers.get('signature');

    // Verify signature if secret is configured.
    // NowPayments may sign either the raw request body or canonical (alphabetically sorted keys) body.
    // Try both so webhooks work regardless of which format their server uses.
    if (ipnSecret) {
      if (!signature) {
        webhookLogger.error('Webhook signature missing', undefined, { 
          event: 'signature_missing',
          payment_mode: paymentMode,
        });
        paymentLogger.webhookResponse({ status: 401, event: 'signature_missing' });
        return NextResponse.json(
          { error: 'Signature required' },
          { status: 401 }
        );
      }

      const canonicalBody = buildCanonicalBodyForSignature(payload);
      const isValidRaw = verifyWebhookSignature(rawBody, signature, ipnSecret);
      const isValidCanonical = verifyWebhookSignature(canonicalBody, signature, ipnSecret);
      const isValid = isValidRaw || isValidCanonical;

      if (!isValid) {
        const calculatedRaw = computeHmacSha512Hex(rawBody, ipnSecret);
        const calculatedCanonical = computeHmacSha512Hex(canonicalBody, ipnSecret);
        const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
        paymentLogger.webhookSignatureMismatch({
          received_signature: signature,
          calculated_signature_raw: calculatedRaw,
          calculated_signature_canonical: calculatedCanonical,
          payload_hash_sha256: payloadHash,
          payment_mode: paymentMode,
        });
        webhookLogger.error('Invalid webhook signature (tried raw and canonical body)', undefined, {
          event: 'signature_invalid',
          payment_mode: paymentMode,
        });
        paymentLogger.webhookResponse({ status: 401, event: 'signature_invalid' });
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      webhookLogger.info('Webhook signature verified', { 
        event: 'signature_verified',
        payment_mode: paymentMode,
        used: isValidRaw ? 'raw_body' : 'canonical_body',
      });
    } else {
      // In development, allow webhooks without signature verification (with warning)
      if (isProductionEnv()) {
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

    const paymentStatus = payload.payment_status;
    const orderId = payload.order_id;

    if (!paymentStatus) {
      webhookLogger.error('Webhook payload missing payment_status', undefined, {
        event: 'validation_error',
        payment_id: paymentId,
      });
      return NextResponse.json(
        { error: 'payment_status required' },
        { status: 400 }
      );
    }
    
    if (order && order.paymentMode) {
      paymentMode = order.paymentMode;
    }

    webhookLogger.info('Processing webhook', {
      event: 'webhook_processing',
      payment_id: paymentId,
      payment_status: paymentStatus,
      payment_mode: paymentMode,
    });
    
    if (!order) {
      // Persist orphan so recovery path and alerting can run; do not silently swallow
      if (supabaseAdmin) {
        const { error: orphanError } = await supabaseAdmin.from('webhook_orphans').upsert(
          {
            payment_id: paymentId,
            payload_snapshot: { payment_status: paymentStatus, order_id: orderId ?? null, at: new Date().toISOString() },
            created_at: new Date().toISOString(),
          },
          { onConflict: 'payment_id' }
        );
        if (orphanError) webhookLogger.error('Failed to persist webhook orphan', orphanError);
      }
      webhookLogger.warn('Order not found for payment_id', {
        event: 'order_not_found',
      });
      paymentLogger.webhookResponse({ status: 503, event: 'order_not_found' });
      // Return 503 so transient "order not found" (e.g. replica lag) does not permanently drop webhook events
      return NextResponse.json(
        { error: 'Order not found; retry later' },
        { status: 503 }
      );
    }
    
    // Map NOWPayments status to internal order status
    let mappedStatus = mapProviderStatusToInternal(paymentStatus) as InternalStatus;
    // Manual payout: when provider reports finished/success, do not set DONE; stop at PAYMENT_CONFIRMED so admin can pay user and mark completed.
    if (order.payoutMode === 'manual' && mappedStatus === 'DONE') {
      mappedStatus = 'PAYMENT_CONFIRMED';
    }

    const currentInternal = (order.internalStatus || order.status) as InternalStatus;
    if (isStatusDowngrade(currentInternal, mappedStatus)) {
      webhookLogger.info('Webhook would downgrade status; RPC will skip update (idempotency still claimed)', {
        event: 'status_downgrade_blocked',
        order_id: order.orderId,
        payment_id: paymentId,
        current_internal_status: currentInternal,
        payment_status: paymentStatus,
        attempted_internal_status: mappedStatus,
        source: 'webhook',
      });
      paymentLogger.statusDowngradeBlocked({
        order_id: order.orderId,
        source: 'webhook',
        current_internal_status: currentInternal,
        attempted_internal_status: mappedStatus,
        provider_status: paymentStatus,
      });
    }

    // When provider sends outcome_amount (e.g. finished/confirming), store as final_receive_amount and to_amount (floating rate or fixed final)
    const outcomeAmount =
      typeof payload.outcome_amount === 'number'
        ? payload.outcome_amount
        : payload.outcome_amount != null
          ? Number(payload.outcome_amount)
          : undefined;

    // Atomic DB transaction: idempotency + order update + history. All succeed or all roll back.
    let updatedOrder: Order;
    try {
      const result = await processWebhookStatusUpdateAtomic({
        paymentId,
        paymentStatus,
        orderId: order.orderId,
        internalStatus: mappedStatus,
        userStatus: getUserFacingStatus(mappedStatus),
        providerStatus: paymentStatus,
        statusSource: 'webhook',
        fromAddress: payload.pay_address || undefined,
        payinHash: payload.payin_hash || undefined,
        payoutHash: payload.payout_hash || undefined,
        ...(outcomeAmount != null && !Number.isNaN(outcomeAmount) && {
          finalReceiveAmount: outcomeAmount,
          toAmount: outcomeAmount,
        }),
      });

      if (result.alreadyProcessed) {
        webhookLogger.info('Webhook already processed (idempotent)', {
          event: 'webhook_idempotent',
          payment_id: paymentId,
          payment_status: paymentStatus,
          order_id: order.orderId,
        });
        return NextResponse.json(
          {
            received: true,
            order_id: order.orderId,
            status: order.status,
            message: 'Webhook already processed (idempotent)',
          },
          { status: 200 }
        );
      }

      updatedOrder = result.order;
    } catch (txError: any) {
      webhookLogger.error('Webhook atomic processing failed', txError, {
        event: 'webhook_transaction_failed',
        payment_id: paymentId,
        order_id: order.orderId,
        payment_status: paymentStatus,
      });
      return NextResponse.json(
        { error: 'Failed to process webhook; please retry.' },
        { status: 500 }
      );
    }

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

    // Telegram: CONFIRMING (Swap Hit) and PAYMENT_CONFIRMED (Payment confirmed). Live only; no Telegram for expired/failed.
    if (statusChanged && order.paymentMode !== 'sandbox') {
      const sendForStatuses: InternalStatus[] = ['CONFIRMING', 'PAYMENT_CONFIRMED'];
      if (sendForStatuses.includes(newStatus as InternalStatus)) {
        try {
          const sent = await sendTelegramNotification({
            orderId: updatedOrder.orderId,
            fromCurrency: updatedOrder.fromCurrency,
            fromAmount: updatedOrder.fromAmount,
            toCurrency: updatedOrder.toCurrency,
            toAmount: updatedOrder.toAmount,
            payinHash: payload.payin_hash ?? updatedOrder.payinHash ?? null,
            fromNetwork: updatedOrder.fromNetwork ?? null,
            priceAmountUsd: typeof payload.price_amount === 'number' ? payload.price_amount : undefined,
            detectedAt: updatedOrder.updatedAt ?? new Date().toISOString(),
            messageKind: newStatus === 'PAYMENT_CONFIRMED' ? 'confirmed' : 'confirming',
          });
          if (sent) {
            webhookLogger.info('Telegram notification sent', {
              event: 'telegram_sent',
              order_id: updatedOrder.orderId,
              new_status: newStatus,
            });
          }
        } catch (telegramErr: any) {
          webhookLogger.error('Telegram notification failed', telegramErr, {
            event: 'telegram_failed',
            order_id: updatedOrder.orderId,
          });
        }
      }
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

    // Send email for status changes at all meaningful stages (CONFIRMING → DONE / EXPIRED)
    const notificationStatuses: InternalStatus[] = [
      'CONFIRMING',
      'PAYMENT_CONFIRMED',
      'PROCESSING_BY_PROVIDER',
      'DONE',
      'EXPIRED',
    ];
    if (statusChanged && notificationStatuses.includes(newStatus as InternalStatus)) {
      try {
        await notifyOrderStatus(order.userId, order.orderId, newStatus.toLowerCase(), request);
        webhookLogger.info('Notification sent', { event: 'notification_sent', status: newStatus });
      } catch (notifyError) {
        webhookLogger.error('Failed to send notification', notifyError, {
          event: 'notification_failed',
          status: newStatus,
        });
      }
    }

    webhookLogger.info('Webhook processed successfully', {
      event: 'webhook_completed',
    });

    paymentLogger.webhookResponse({ status: 200, event: 'webhook_completed' });

    const response = NextResponse.json(
      { 
        received: true,
        order_id: order.orderId,
        status: mappedStatus,
        message: 'Webhook processed successfully'
      },
      { status: 200 }
    );
    return response;

  } catch (error: any) {
    webhookLogger.error('Webhook processing error', error, {
      event: 'webhook_error',
    });
    paymentLogger.webhookResponse({ status: 500, event: 'webhook_error' });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/** GET handler for webhook reachability check (no sensitive data). */
export async function GET() {
  return new Response('WEBHOOK OK', { status: 200 });
}

