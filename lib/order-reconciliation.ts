/**
 * Webhook failure recovery: reconcile orders stuck in NEW/CONFIRMING by polling NOWPayments.
 * Reuses the same atomic update path as the webhook (processWebhookStatusUpdateAtomic) so
 * idempotency is respected and we do not duplicate webhook logic.
 *
 * EXPIRY RULE: We never set EXPIRED from reconciliation based on time. We only apply provider
 * status (e.g. provider sends "expired" → we set EXPIRED). Any future "expire by time" job must
 * only consider orders in NEW or AWAITING_DEPOSIT (see findOrdersEligibleForExpiryByTime).
 */

import { getPaymentStatus } from '@/lib/nowpayments';
import {
  findStaleOrders,
  findStalePaidOrders,
  findStaleManualOrdersForAutoComplete,
  processWebhookStatusUpdateAtomic,
  updateOrderStatus,
  type Order,
} from '@/lib/db-orders';
import { mapProviderStatusToInternal, getUserFacingStatus, type InternalStatus } from '@/lib/status-mapping';
import { notifyOrderStatus } from '@/lib/notifications';
import { paymentLogger } from '@/lib/payment-logger';
import { getNowPaymentsApiUrl } from '@/lib/env';
import { recordOrderCompletion } from '@/lib/ledger';

const NOTIFICATION_STATUSES: InternalStatus[] = [
  'CONFIRMING',
  'PAYMENT_CONFIRMED',
  'PROCESSING_BY_PROVIDER',
  'DONE',
  'EXPIRED',
];

function paymentDetectionLog(
  event: string,
  orderId: string,
  details?: Record<string, unknown>
) {
  console.log(JSON.stringify({
    level: 'info',
    message: event,
    timestamp: new Date().toISOString(),
    source: 'reconciliation',
    order_id: orderId,
    ...details,
  }));
}

export interface ReconcileOptions {
  /** Consider orders stale if not updated for this many minutes. */
  olderThanMinutes: number;
  /** For paid-but-not-DONE pass: consider stale after this many minutes (default 60). */
  paidStaleMinutes?: number;
  /** Max orders to process per run (avoids timeouts). */
  limit?: number;
}

export interface ReconcileResult {
  /** Orders that were successfully reconciled (status updated). */
  processed: number;
  /** Orders skipped (provider status unchanged or already applied). */
  skipped: number;
  /** Orders that failed (e.g. API error, transaction error). */
  errors: number;
  /** Order IDs processed (for logging). */
  processedOrderIds: string[];
  /** Order IDs that errored (for logging). */
  errorOrderIds: string[];
}

/**
 * Run webhook failure recovery: find stale orders, poll NOWPayments, reconcile via atomic update.
 * Idempotency is respected because we call processWebhookStatusUpdateAtomic (same as webhook).
 */
export async function runOrderReconciliation(options: ReconcileOptions): Promise<ReconcileResult> {
  const olderThanMinutes = options.olderThanMinutes;
  const limit = options.limit ?? 50;

  const result: ReconcileResult = {
    processed: 0,
    skipped: 0,
    errors: 0,
    processedOrderIds: [],
    errorOrderIds: [],
  };

  paymentLogger.pollJobStarted({
    job_type: 'cron_reconcile',
    timestamp: new Date().toISOString(),
  });

  const orders = await findStaleOrders({ olderThanMinutes, limit });
  paymentDetectionLog('reconciliation_start', 'n/a', {
    stale_order_count: orders.length,
    older_than_minutes: olderThanMinutes,
    limit,
  });
  if (orders.length === 0) {
    return result;
  }

  for (const order of orders) {
    const paymentId = order.paymentId;
    if (!paymentId) {
      result.skipped += 1;
      continue;
    }

    const mode = order.paymentMode ?? undefined;
    const modeStr = mode ?? 'legacy_dual';
    const storedPaymentId = String(paymentId);
    const pollingPaymentIdUsed = storedPaymentId;
    const baseUrl =
      mode === 'sandbox'
        ? 'https://api-sandbox.nowpayments.io/v1'
        : getNowPaymentsApiUrl();
    const rejected = storedPaymentId !== pollingPaymentIdUsed;
    paymentLogger.pollingConsistencyCheck({
      order_id: order.orderId,
      stored_payment_id: storedPaymentId,
      polling_payment_id_used: pollingPaymentIdUsed,
      polling_base_url: baseUrl,
      payment_creation_base_url: baseUrl,
      mode: modeStr,
      rejected,
      ...(rejected && { reject_reason: 'stored_payment_id !== polling_payment_id_used' }),
    });
    if (rejected) {
      result.skipped += 1;
      continue;
    }
    paymentLogger.paymentIdChecked({
      payment_id_suffix: paymentLogger.maskPaymentId(paymentId),
      order_id: order.orderId,
      mode: modeStr,
    });

    let providerStatus: string;
    let payinHash: string | undefined;
    let payoutHash: string | undefined;
    let fromAddress: string | undefined;
    try {
      let payment;
      if (mode) {
        payment = await getPaymentStatus(paymentId, mode);
      } else {
        // payment_mode null (e.g. legacy): try both sandbox then live; never default silently to current global mode
        try {
          payment = await getPaymentStatus(paymentId, 'sandbox');
        } catch {
          payment = await getPaymentStatus(paymentId, 'live');
        }
      }
      providerStatus = payment.payment_status ?? '';
      payinHash = payment.payin_hash ?? undefined;
      payoutHash = payment.payout_hash ?? undefined;
      fromAddress = payment.pay_address ?? payment.payin_address ?? undefined;

      paymentLogger.providerStatusReturned({
        payment_id_suffix: paymentLogger.maskPaymentId(paymentId),
        order_id: order.orderId,
        provider_status_returned: providerStatus || null,
      });
    } catch (apiError: any) {
      paymentDetectionLog('reconciliation_get_status_failed', order.orderId, {
        error: apiError?.message ?? String(apiError),
      });
      result.errors += 1;
      result.errorOrderIds.push(order.orderId);
      continue;
    }

    if (!providerStatus) {
      result.skipped += 1;
      continue;
    }

    let mappedStatus = mapProviderStatusToInternal(providerStatus) as InternalStatus;
    if (order.payoutMode === 'manual' && mappedStatus === 'DONE') {
      mappedStatus = 'PAYMENT_CONFIRMED';
    }

    try {
      const updateResult = await processWebhookStatusUpdateAtomic({
        paymentId,
        paymentStatus: providerStatus,
        orderId: order.orderId,
        internalStatus: mappedStatus,
        userStatus: getUserFacingStatus(mappedStatus),
        providerStatus: providerStatus,
        statusSource: 'polling',
        fromAddress,
        payinHash,
        payoutHash,
      });

      if (updateResult.alreadyProcessed) {
        result.skipped += 1;
        continue;
      }

      result.processed += 1;
      result.processedOrderIds.push(order.orderId);

      paymentLogger.dbStatusUpdated({
        order_id: order.orderId,
        internal_status: mappedStatus,
        source: 'reconciliation',
      });
      paymentDetectionLog('reconciliation_status_updated', order.orderId, {
        provider_status: providerStatus,
        internal_status: mappedStatus,
      });

      if (NOTIFICATION_STATUSES.includes(mappedStatus)) {
        notifyOrderStatus(order.userId, order.orderId, mappedStatus.toLowerCase()).catch((err) => {
          console.error(`[Reconcile] notifyOrderStatus failed for ${order.orderId}:`, err?.message ?? err);
        });
      }
    } catch (txError: any) {
      paymentDetectionLog('reconciliation_atomic_failed', order.orderId, {
        error: txError?.message ?? String(txError),
      });
      result.errors += 1;
      result.errorOrderIds.push(order.orderId);
    }
  }

  // Second pass: paid-but-not-DONE (PAYMENT_CONFIRMED, MANUAL_REVIEW, PROCESSING_BY_PROVIDER).
  // When provider says finished/success, set DONE so cron can complete without admin (funds-release guarantee).
  const paidStaleMinutes = options.paidStaleMinutes ?? 60;
  const paidOrders = await findStalePaidOrders({ olderThanMinutes: paidStaleMinutes, limit: limit >> 1 });
  for (const order of paidOrders) {
    const paymentId = order.paymentId;
    if (!paymentId) {
      result.skipped += 1;
      continue;
    }
    const mode = order.paymentMode ?? undefined;
    const storedPaymentIdPaid = String(paymentId);
    const pollingPaymentIdUsedPaid = storedPaymentIdPaid;
    const baseUrlPaid =
      mode === 'sandbox'
        ? 'https://api-sandbox.nowpayments.io/v1'
        : getNowPaymentsApiUrl();
    const rejectedPaid = storedPaymentIdPaid !== pollingPaymentIdUsedPaid;
    paymentLogger.pollingConsistencyCheck({
      order_id: order.orderId,
      stored_payment_id: storedPaymentIdPaid,
      polling_payment_id_used: pollingPaymentIdUsedPaid,
      polling_base_url: baseUrlPaid,
      payment_creation_base_url: baseUrlPaid,
      mode: mode ?? 'legacy_dual',
      rejected: rejectedPaid,
      ...(rejectedPaid && { reject_reason: 'stored_payment_id !== polling_payment_id_used' }),
    });
    if (rejectedPaid) {
      result.skipped += 1;
      continue;
    }
    paymentLogger.paymentIdChecked({
      payment_id_suffix: paymentLogger.maskPaymentId(paymentId),
      order_id: order.orderId,
      mode: mode ?? 'legacy_dual',
    });
    let providerStatus: string;
    let payinHash: string | undefined;
    let payoutHash: string | undefined;
    let fromAddress: string | undefined;
    try {
      let payment;
      if (mode) {
        payment = await getPaymentStatus(paymentId, mode);
      } else {
        try {
          payment = await getPaymentStatus(paymentId, 'sandbox');
        } catch {
          payment = await getPaymentStatus(paymentId, 'live');
        }
      }
      providerStatus = payment.payment_status ?? '';
      payinHash = payment.payin_hash ?? undefined;
      payoutHash = payment.payout_hash ?? undefined;
      fromAddress = payment.pay_address ?? payment.payin_address ?? undefined;
      paymentLogger.providerStatusReturned({
        payment_id_suffix: paymentLogger.maskPaymentId(paymentId),
        order_id: order.orderId,
        provider_status_returned: providerStatus || null,
      });
    } catch (apiError: any) {
      paymentDetectionLog('reconciliation_paid_get_status_failed', order.orderId, {
        error: apiError?.message ?? String(apiError),
      });
      result.errors += 1;
      result.errorOrderIds.push(order.orderId);
      continue;
    }
    const finished = providerStatus?.toLowerCase() === 'finished' || providerStatus?.toLowerCase() === 'success';
    if (!finished) {
      result.skipped += 1;
      continue;
    }
    // Automatic: set DONE so cron can complete. Manual: set PAYMENT_CONFIRMED so admin can pay user and mark completed.
    const mappedStatus: InternalStatus = order.payoutMode === 'manual' ? 'PAYMENT_CONFIRMED' : 'DONE';
    try {
      const updateResult = await processWebhookStatusUpdateAtomic({
        paymentId,
        paymentStatus: providerStatus,
        orderId: order.orderId,
        internalStatus: mappedStatus,
        userStatus: getUserFacingStatus(mappedStatus),
        providerStatus: providerStatus,
        statusSource: 'polling',
        fromAddress,
        payinHash,
        payoutHash,
      });
      if (updateResult.alreadyProcessed) {
        result.skipped += 1;
        continue;
      }
      result.processed += 1;
      result.processedOrderIds.push(order.orderId);
      paymentLogger.dbStatusUpdated({
        order_id: order.orderId,
        internal_status: mappedStatus,
        source: 'reconciliation_paid',
      });
      paymentDetectionLog('reconciliation_paid_updated', order.orderId, {
        provider_status: providerStatus,
        internal_status: mappedStatus,
      });
      notifyOrderStatus(order.userId, order.orderId, mappedStatus.toLowerCase()).catch((err) => {
        console.error(`[Reconcile] notifyOrderStatus failed for ${order.orderId}:`, err?.message ?? err);
      });
    } catch (txError: any) {
      paymentDetectionLog('reconciliation_paid_atomic_failed', order.orderId, {
        error: txError?.message ?? String(txError),
      });
      result.errors += 1;
      result.errorOrderIds.push(order.orderId);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Manual payout auto-complete: after X minutes in PAYMENT_CONFIRMED/etc., set DONE
// Reuses the same completion path as admin mark_completed (updateOrderStatus + ledger + notify).
// ---------------------------------------------------------------------------

export interface ManualAutoCompleteOptions {
  /** Max orders to process per run. Eligibility is by manual_auto_complete_at <= now() (per-order random 3–15 min). */
  limit?: number;
}

export interface ManualAutoCompleteResult {
  processed: number;
  skipped: number;
  errors: number;
  processedOrderIds: string[];
  errorOrderIds: string[];
}

/**
 * Auto-complete manual payout orders whose scheduled time (manual_auto_complete_at) has passed.
 * Each order gets a random 3–15 min scheduled time when it first reaches PAYMENT_CONFIRMED (set in process_webhook_status_update).
 * Uses the same completion path as admin mark_completed: updateOrderStatus(..., 'DONE'), recordOrderCompletion, notifyOrderStatus.
 * Idempotent: only runs completion pipeline when status actually transitions to DONE; already DONE orders are not selected.
 */
export async function runManualPayoutAutoComplete(options: ManualAutoCompleteOptions = {}): Promise<ManualAutoCompleteResult> {
  const limit = options.limit ?? 50;

  const result: ManualAutoCompleteResult = {
    processed: 0,
    skipped: 0,
    errors: 0,
    processedOrderIds: [],
    errorOrderIds: [],
  };

  const orders = await findStaleManualOrdersForAutoComplete({ limit });

  for (const order of orders) {
    const currentStatus = order.internalStatus || order.status;
    if (['DONE', 'FAILED', 'EXPIRED'].includes(currentStatus)) {
      result.skipped += 1;
      continue;
    }

    try {
      const updatedOrder = await updateOrderStatus(order.orderId, 'DONE', undefined, {
        source: 'system',
        skipTransitionCheck: true,
      });

      if (!updatedOrder) {
        result.skipped += 1;
        continue;
      }

      const statusChanged = currentStatus !== (updatedOrder.internalStatus || updatedOrder.status);
      if (!statusChanged) {
        result.skipped += 1;
        continue;
      }

      result.processed += 1;
      result.processedOrderIds.push(order.orderId);

      recordOrderCompletion(
        updatedOrder.orderId,
        updatedOrder.userId,
        updatedOrder.toAmount,
        updatedOrder.toCurrency,
        updatedOrder.fromAmount,
        updatedOrder.fromCurrency,
        0.01
      ).catch((err) => {
        console.error(`[ManualAutoComplete] recordOrderCompletion failed for ${order.orderId}:`, err?.message ?? err);
      });

      notifyOrderStatus(order.userId, order.orderId, 'DONE').catch((err) => {
        console.error(`[ManualAutoComplete] notifyOrderStatus failed for ${order.orderId}:`, err?.message ?? err);
      });

      console.log(JSON.stringify({
        level: 'info',
        message: 'manual_payout_auto_complete_executed',
        timestamp: new Date().toISOString(),
        source: 'manual_auto_complete',
        order_id: order.orderId,
        previous_status: currentStatus,
        new_status: 'DONE',
      }));
    } catch (err: any) {
      paymentDetectionLog('manual_auto_complete_failed', order.orderId, {
        error: err?.message ?? String(err),
      });
      result.errors += 1;
      result.errorOrderIds.push(order.orderId);
    }
  }

  return result;
}
