/**
 * Sandbox outcome simulation.
 * When payment mode is sandbox, NOWPayments may send IPN to our webhook, but if the
 * app runs on localhost the webhook is unreachable. This module applies the admin-
 * chosen sandbox case (success/failed/expired/partially_paid) to the order when the
 * order is fetched, so the order page shows the simulated outcome without needing
 * a real webhook.
 */

import {
  getOrderByOrderId,
  processWebhookStatusUpdateAtomic,
  type Order,
} from '@/lib/db-orders';
import {
  mapProviderStatusToInternal,
  getUserFacingStatus,
  type InternalStatus,
} from '@/lib/status-mapping';
import { getPayoutMode } from '@/lib/payout-mode';

/** Delay in seconds after order creation before applying sandbox outcome (so user sees "waiting" briefly). */
const SANDBOX_SIMULATION_DELAY_SECONDS = 8;

/** Map sandbox_case to NOWPayments provider status. */
const SANDBOX_CASE_TO_PROVIDER_STATUS: Record<
  'success' | 'failed' | 'expired' | 'partially_paid',
  string
> = {
  success: 'finished',
  failed: 'failed',
  expired: 'expired',
  partially_paid: 'partially_paid',
};

/**
 * Apply sandbox outcome to an order if eligible.
 * Called when fetching an order: if the order is sandbox, has sandbox_case set,
 * is still in early state, and was created more than SANDBOX_SIMULATION_DELAY_SECONDS ago,
 * updates the order to the simulated status (same path as webhook).
 * Returns the updated order, or the original order if no simulation was applied.
 */
export async function maybeApplySandboxSimulation(
  order: Order
): Promise<Order> {
  if (order.paymentMode !== 'sandbox' || !order.sandboxCase) {
    return order;
  }

  const finalStates = ['DONE', 'FAILED', 'EXPIRED'];
  if (finalStates.includes(order.internalStatus)) {
    return order;
  }

  const createdAt = new Date(order.createdAt).getTime();
  const now = Date.now();
  if (now - createdAt < SANDBOX_SIMULATION_DELAY_SECONDS * 1000) {
    return order;
  }

  const providerStatus = SANDBOX_CASE_TO_PROVIDER_STATUS[order.sandboxCase];
  let mappedStatus = mapProviderStatusToInternal(providerStatus) as InternalStatus;

  const payoutMode = await getPayoutMode();
  if (
    payoutMode === 'manual' &&
    (mappedStatus === 'DONE' || providerStatus === 'finished' || providerStatus === 'success')
  ) {
    const currentInternalStatus = order.internalStatus || order.status;
    if (currentInternalStatus === 'PROCESSING_BY_PROVIDER') {
      mappedStatus = 'MANUAL_REVIEW';
    } else {
      mappedStatus = 'PAYMENT_CONFIRMED';
    }
  }

  const paymentId = order.paymentId || order.orderId;

  try {
    const result = await processWebhookStatusUpdateAtomic({
      paymentId,
      paymentStatus: providerStatus,
      orderId: order.orderId,
      internalStatus: mappedStatus,
      userStatus: getUserFacingStatus(mappedStatus),
      providerStatus,
      statusSource: 'system',
      fromAddress: order.fromAddress || undefined,
      payinHash: order.payinHash || undefined,
      payoutHash: order.payoutHash || undefined,
    });

    if (result.alreadyProcessed) {
      return order;
    }
    return result.order;
  } catch (err) {
    console.warn('[sandbox-simulation] Failed to apply sandbox outcome:', err);
    return order;
  }
}
