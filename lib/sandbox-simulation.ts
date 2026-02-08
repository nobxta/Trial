/**
 * Sandbox outcome simulation.
 * When payment mode is sandbox, NOWPayments may send IPN to our webhook, but if the
 * app runs on localhost the webhook is unreachable. This module applies the admin-
 * chosen sandbox case (success/failed/expired/partially_paid) to the order when the
 * order is fetched, so the order page shows the simulated outcome without needing
 * a real webhook.
 *
 * Automate sandbox completion: If an order is in PAYMENT_CONFIRMED or PROCESSING_BY_PROVIDER,
 * after a random delay (7–20 min from updatedAt), automatically update status to DONE.
 */

import {
  processWebhookStatusUpdateAtomic,
  type Order,
} from '@/lib/db-orders';
import {
  mapProviderStatusToInternal,
  getUserFacingStatus,
  type InternalStatus,
} from '@/lib/status-mapping';

/** Delay in seconds after order creation before applying sandbox outcome (so user sees "waiting" briefly). */
const SANDBOX_SIMULATION_DELAY_SECONDS = 8;

/** Min/max delay in minutes before auto-completing sandbox orders in PAYMENT_CONFIRMED or PROCESSING_BY_PROVIDER. */
const SANDBOX_AUTO_DONE_DELAY_MIN_MINUTES = 7;
const SANDBOX_AUTO_DONE_DELAY_MAX_MINUTES = 20;

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
 * Deterministic delay in minutes (7–20) from orderId so the same order always gets the same delay.
 */
function getSandboxAutoDoneDelayMinutes(orderId: string): number {
  const hash = orderId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const range = SANDBOX_AUTO_DONE_DELAY_MAX_MINUTES - SANDBOX_AUTO_DONE_DELAY_MIN_MINUTES;
  return SANDBOX_AUTO_DONE_DELAY_MIN_MINUTES + (hash % (range + 1));
}

/**
 * STRICT LIVE WALL: Live orders must NEVER trigger sandbox auto-complete or mock progress.
 * Only orders with paymentMode === 'sandbox' and sandboxCase set are eligible.
 *
 * Apply sandbox outcome to an order if eligible.
 * Called when fetching an order: if the order is sandbox, has sandbox_case set,
 * is still in early state, and was created more than SANDBOX_SIMULATION_DELAY_SECONDS ago,
 * updates the order to the simulated status (same path as webhook).
 * If the order is in PAYMENT_CONFIRMED or PROCESSING_BY_PROVIDER, after 7–20 min from updatedAt
 * (deterministic per orderId), automatically updates to DONE — no admin click required.
 * Returns the updated order, or the original order if no simulation was applied.
 */
export async function maybeApplySandboxSimulation(
  order: Order
): Promise<Order> {
  // Hard-coded wall: Live orders never get sandbox simulation or auto-complete.
  if (order.paymentMode === 'live') return order;
  if (order.paymentMode !== 'sandbox' || !order.sandboxCase) {
    return order;
  }

  const finalStates = ['DONE', 'FAILED', 'EXPIRED'];
  if (finalStates.includes(order.internalStatus)) {
    return order;
  }

  const now = Date.now();
  const updatedAtMs = new Date(order.updatedAt).getTime();

  // Auto-complete: PAYMENT_CONFIRMED or PROCESSING_BY_PROVIDER -> DONE after 7–20 min from updatedAt
  const paidNotDoneStatuses: InternalStatus[] = ['PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER'];
  if (paidNotDoneStatuses.includes(order.internalStatus as InternalStatus)) {
    const delayMinutes = getSandboxAutoDoneDelayMinutes(order.orderId);
    const delayMs = delayMinutes * 60 * 1000;
    if (now >= updatedAtMs + delayMs) {
      const paymentId = order.paymentId || order.orderId;
      try {
        const result = await processWebhookStatusUpdateAtomic({
          paymentId,
          paymentStatus: 'finished',
          orderId: order.orderId,
          internalStatus: 'DONE',
          userStatus: getUserFacingStatus('DONE'),
          providerStatus: 'finished',
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
        console.warn('[sandbox-simulation] Auto DONE failed:', err);
        return order;
      }
    }
    return order;
  }

  // Early state: apply sandbox_case (success/failed/expired/partially_paid) after brief delay
  const createdAt = new Date(order.createdAt).getTime();
  if (now - createdAt < SANDBOX_SIMULATION_DELAY_SECONDS * 1000) {
    return order;
  }

  const providerStatus = SANDBOX_CASE_TO_PROVIDER_STATUS[order.sandboxCase];
  const mappedStatus = mapProviderStatusToInternal(providerStatus) as InternalStatus;
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
