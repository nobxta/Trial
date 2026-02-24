import { NextRequest, NextResponse } from 'next/server';
import { getOrderByOrderId, processWebhookStatusUpdateAtomic, updateOrderStatus } from '@/lib/db-orders';
import { getCurrentStep, mapProviderStatusToInternal, getUserFacingStatus, type InternalStatus } from '@/lib/status-mapping';
import { maybeApplySandboxSimulation } from '@/lib/sandbox-simulation';
import { getPaymentStatus } from '@/lib/nowpayments';
import { notifyOrderStatus } from '@/lib/notifications';
import { paymentLogger } from '@/lib/payment-logger';
import { getNowPaymentsApiUrl } from '@/lib/env';

const POLL_SYNC_THROTTLE_MS = 15_000;
const POLL_SYNC_STATUSES: InternalStatus[] = ['NEW', 'AWAITING_DEPOSIT', 'CONFIRMING'];
const POLL_SYNC_NOTIFY_STATUSES: InternalStatus[] = ['CONFIRMING', 'PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'DONE', 'EXPIRED'];
/** Only these statuses may be marked EXPIRED by time (payment window closed). */
const EXPIRY_BY_TIME_STATUSES: InternalStatus[] = ['NEW', 'AWAITING_DEPOSIT'];

function orderPollLog(event: string, orderId: string, details?: Record<string, unknown>) {
  console.log(JSON.stringify({
    level: 'info',
    message: event,
    timestamp: new Date().toISOString(),
    source: 'order_get_poll',
    order_id: orderId,
    ...details,
  }));
}

/**
 * GET /api/order/[id]
 *
 * Returns user-facing status from database. For orders awaiting payment (NEW/AWAITING_DEPOSIT/CONFIRMING),
 * optionally syncs from provider when last update was >15s ago so payment detection works even if webhook fails.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    let order = await getOrderByOrderId(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Expired-by-time: if payment window has passed and still awaiting deposit, mark EXPIRED and skip provider poll.
    const expiresAt = order.expiresAt ? new Date(order.expiresAt).getTime() : null;
    const isExpiredByTime = expiresAt !== null && Date.now() > expiresAt;
    const canExpireByTime = EXPIRY_BY_TIME_STATUSES.includes(order.internalStatus as InternalStatus);
    if (isExpiredByTime && canExpireByTime) {
      const updated = await updateOrderStatus(orderId, 'EXPIRED', undefined, { source: 'system' });
      if (updated) {
        order = updated;
        orderPollLog('order_expired_by_time', orderId, { reason: 'expires_at_passed' });
      }
    }

    // Polling-based detection: for non-final orders, sync from provider if throttle allows (once per 15s).
    // Skip polling when payment window has passed (expiresAt in past) or order is in a final state — never hit provider after expiry.
    const paymentWindowClosed = order.expiresAt != null && Date.now() > new Date(order.expiresAt).getTime();
    if (order.paymentId && POLL_SYNC_STATUSES.includes(order.internalStatus as InternalStatus) && !paymentWindowClosed) {
      const updatedAtMs = new Date(order.updatedAt).getTime();
      if (Date.now() - updatedAtMs >= POLL_SYNC_THROTTLE_MS) {
        paymentLogger.pollJobStarted({
          job_type: 'order_get_poll',
          timestamp: new Date().toISOString(),
        });
        try {
          const storedPaymentId = String(order.paymentId);
          const pollingPaymentIdUsed = storedPaymentId;
          const mode = order.paymentMode ?? undefined;
          const baseUrl =
            mode === 'sandbox'
              ? 'https://api-sandbox.nowpayments.io/v1'
              : getNowPaymentsApiUrl();
          const rejected = storedPaymentId !== pollingPaymentIdUsed;
          paymentLogger.pollingConsistencyCheck({
            order_id: orderId,
            stored_payment_id: storedPaymentId,
            polling_payment_id_used: pollingPaymentIdUsed,
            polling_base_url: baseUrl,
            payment_creation_base_url: baseUrl,
            mode: mode ?? 'legacy_dual',
            rejected,
            ...(rejected && { reject_reason: 'stored_payment_id !== polling_payment_id_used' }),
          });
          if (rejected) {
            orderPollLog('order_poll_sync_rejected', orderId, { reason: 'payment_id_mismatch' });
          } else {
          const paymentId = storedPaymentId;
          paymentLogger.paymentIdChecked({
            payment_id_suffix: paymentLogger.maskPaymentId(paymentId),
            order_id: orderId,
            mode: mode ?? 'legacy_dual',
          });
          let payment: { payment_status?: string; pay_address?: string; payin_address?: string; payin_hash?: string; payout_hash?: string };
          if (mode) {
            payment = await getPaymentStatus(paymentId, mode);
          } else {
            try {
              payment = await getPaymentStatus(paymentId, 'sandbox');
            } catch {
              payment = await getPaymentStatus(paymentId, 'live');
            }
          }
          const providerStatus = payment.payment_status ?? '';
          paymentLogger.providerStatusReturned({
            payment_id_suffix: paymentLogger.maskPaymentId(paymentId),
            order_id: orderId,
            provider_status_returned: providerStatus || null,
          });
          if (providerStatus) {
            let mappedStatus = mapProviderStatusToInternal(providerStatus) as InternalStatus;
            if (order.payoutMode === 'manual' && mappedStatus === 'DONE') {
              mappedStatus = 'PAYMENT_CONFIRMED';
            }
            const result = await processWebhookStatusUpdateAtomic({
              paymentId,
              paymentStatus: providerStatus,
              orderId: order.orderId,
              internalStatus: mappedStatus,
              userStatus: getUserFacingStatus(mappedStatus),
              providerStatus,
              statusSource: 'polling',
              fromAddress: payment.pay_address ?? payment.payin_address,
              payinHash: payment.payin_hash,
              payoutHash: payment.payout_hash,
            });
            if (!result.alreadyProcessed) {
              paymentLogger.dbStatusUpdated({
                order_id: orderId,
                internal_status: mappedStatus,
                source: 'order_get_poll',
              });
              orderPollLog('order_poll_sync_updated', orderId, {
                provider_status: providerStatus,
                internal_status: mappedStatus,
              });
              if (POLL_SYNC_NOTIFY_STATUSES.includes(mappedStatus)) {
                notifyOrderStatus(order.userId, order.orderId, mappedStatus.toLowerCase(), request).catch((err) => {
                  console.error('[Order GET] notifyOrderStatus failed:', err?.message ?? err);
                });
              }
              order = await getOrderByOrderId(orderId) ?? order;
            }
          }
          }
        } catch (pollErr: any) {
          orderPollLog('order_poll_sync_error', orderId, { error: pollErr?.message ?? String(pollErr) });
        }
      }
    }

    // Sandbox only: apply simulated outcome when applicable.
    order = await maybeApplySandboxSimulation(order);

    // Amount to send: prefer provider's exact amount (provider_pay_amount), else from_amount
    const payAmount = order.providerPayAmount ?? order.fromAmount;
    // Outcome: use final_receive_amount when set (e.g. after webhook for floating), else to_amount
    const outcomeAmount = order.finalReceiveAmount ?? order.toAmount;

    // Return user-facing data ONLY
    // Database status is the source of truth, NOT provider status
    // CRITICAL: Use clear field names with proper semantics
    const response = {
      success: true,
      order: {
        id: order.id,
        orderId: order.orderId,
        paymentId: order.paymentId,
        // User-facing status (from database)
        status: order.userStatus, // User-friendly status
        internalStatus: order.internalStatus, // Internal status for expiration check
        currentStep: getCurrentStep(order.internalStatus), // Progress step from backend
        // CRITICAL: Clear field names with proper semantics
        // Crypto amounts (what user sends/receives) — provider_pay_amount is canonical "amount to send"
        payAmount, // Exact amount to send (from provider when available)
        payCurrency: order.fromCurrency, // Crypto currency user sends
        payNetwork: order.fromNetwork,
        payAddress: order.fromAddress,
        outcomeAmount, // Amount user receives (final_receive_amount after completion, else to_amount)
        outcomeCurrency: order.toCurrency,
        outcomeNetwork: order.toNetwork,
        outcomeAddress: order.toAddress,
        // Rate mode (fixed vs floating) and provider state
        rateMode: order.rateMode ?? null,
        providerRateLocked: order.providerRateLocked ?? false,
        providerPayAmount: order.providerPayAmount ?? null,
        finalReceiveAmount: order.finalReceiveAmount ?? null,
        // Legacy fields for backward compatibility (but clearly named)
        fromCurrency: order.fromCurrency,
        fromAmount: order.fromAmount,
        fromNetwork: order.fromNetwork,
        fromAddress: order.fromAddress,
        toCurrency: order.toCurrency,
        toAmount: order.toAmount,
        toNetwork: order.toNetwork,
        toAddress: order.toAddress,
        // Timestamps
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        expiresAt: order.expiresAt || null, // Expiration timestamp
        // Transaction hashes (only if available)
        payinHash: order.payinHash || null,
        payoutHash: order.payoutHash || null,
        // Notification subscription (order-page subscribe)
        notificationEmail: order.notificationEmail || null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

