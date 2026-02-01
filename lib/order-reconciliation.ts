/**
 * Webhook failure recovery: reconcile orders stuck in NEW/CONFIRMING by polling NOWPayments.
 * Reuses the same atomic update path as the webhook (processWebhookStatusUpdateAtomic) so
 * idempotency is respected and we do not duplicate webhook logic.
 */

import { getPaymentStatus } from '@/lib/nowpayments';
import { findStaleOrders, findStalePaidOrders, processWebhookStatusUpdateAtomic, type Order } from '@/lib/db-orders';
import { mapProviderStatusToInternal, getUserFacingStatus, type InternalStatus } from '@/lib/status-mapping';
import { getPayoutMode } from '@/lib/payout-mode';

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
 * Apply the same manual-payout override as the webhook handler.
 * Centralized so webhook and reconciliation stay in sync.
 */
function applyManualPayoutOverride(
  order: Order,
  paymentStatus: string,
  mappedStatus: InternalStatus
): InternalStatus {
  if (mappedStatus !== 'DONE' && paymentStatus?.toLowerCase() !== 'finished' && paymentStatus?.toLowerCase() !== 'success') {
    return mappedStatus;
  }
  const currentInternalStatus = order.internalStatus || order.status;
  if (currentInternalStatus === 'PROCESSING_BY_PROVIDER') {
    return 'MANUAL_REVIEW';
  }
  return 'PAYMENT_CONFIRMED';
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

  const orders = await findStaleOrders({ olderThanMinutes, limit });
  if (orders.length === 0) {
    return result;
  }

  const payoutMode = await getPayoutMode();

  for (const order of orders) {
    const paymentId = order.paymentId;
    if (!paymentId) {
      result.skipped += 1;
      continue;
    }

    let providerStatus: string;
    let payinHash: string | undefined;
    let payoutHash: string | undefined;
    let fromAddress: string | undefined;
    const mode = order.paymentMode ?? undefined;
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
    } catch (apiError: any) {
      console.error(`[Reconcile] getPaymentStatus failed for order ${order.orderId}:`, apiError?.message ?? apiError);
      result.errors += 1;
      result.errorOrderIds.push(order.orderId);
      continue;
    }

    if (!providerStatus) {
      result.skipped += 1;
      continue;
    }

    let mappedStatus = mapProviderStatusToInternal(providerStatus) as InternalStatus;
    if (payoutMode === 'manual') {
      mappedStatus = applyManualPayoutOverride(order, providerStatus, mappedStatus);
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
    } catch (txError: any) {
      console.error(`[Reconcile] processWebhookStatusUpdateAtomic failed for order ${order.orderId}:`, txError?.message ?? txError);
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
    let providerStatus: string;
    let payinHash: string | undefined;
    let payoutHash: string | undefined;
    let fromAddress: string | undefined;
    const mode = order.paymentMode ?? undefined;
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
    } catch (apiError: any) {
      result.errors += 1;
      result.errorOrderIds.push(order.orderId);
      continue;
    }
    const finished = providerStatus?.toLowerCase() === 'finished' || providerStatus?.toLowerCase() === 'success';
    if (!finished) {
      result.skipped += 1;
      continue;
    }
    // Stale-order override: set DONE so cron can complete without admin; idempotency still applies.
    const mappedStatus: InternalStatus = 'DONE';
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
    } catch (txError: any) {
      result.errors += 1;
      result.errorOrderIds.push(order.orderId);
    }
  }

  return result;
}
