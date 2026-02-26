import { supabaseAdmin } from './supabase';
import { DbError, wrapDbError, isNotFoundError, isUniqueViolation } from './db-errors';
import {
  getUserFacingStatus,
  getCurrentStep,
  isValidStatusTransition,
  type InternalStatus,
  type UserStatus,
  type StatusSource,
} from './status-mapping';
import { canTransition } from './order-state';

export interface Order {
  id: string;
  userId: string;
  orderId: string;
  paymentId: string | null;
  // Payment mode fields
  paymentMode: 'live' | 'sandbox' | null; // Payment mode when order was created
  payoutMode: 'manual' | 'automatic' | null; // Payout mode at creation: manual = funds to balance, admin pays; automatic = NOWPayments sends to user
  purchaseId: string | null; // NOWPayments purchase_id
  sandboxCase: 'success' | 'failed' | 'expired' | 'partially_paid' | null; // Sandbox test case
  // Status fields (new system)
  internalStatus: string; // Admin-only technical status
  userStatus: string; // User-facing simplified status
  providerStatus: string | null; // Raw provider status (admin-only)
  statusSource: string | null; // Who/what changed status
  // Legacy status field (kept for backward compatibility)
  status: string; // DEPRECATED: Use internalStatus
  // Order details
  fromCurrency: string;
  fromAmount: number;
  fromNetwork: string | null;
  fromAddress: string | null;
  toCurrency: string;
  toAmount: number;
  toNetwork: string | null;
  toAddress: string | null;
  // Rate fields
  providerRate: number | null;
  expectedReceive: number | null;
  rateTimestamp: string | null;
  rateDeviationPercent: number | null;
  // Rate mode (fixed vs floating) and provider amounts
  rateMode: 'fixed' | 'floating' | null;
  providerRateLocked: boolean;
  providerPayAmount: number | null;
  finalReceiveAmount: number | null;
  // Transaction hashes
  payinHash: string | null;
  payoutHash: string | null;
  // Manual review
  manualReviewRequired: boolean;
  manualReviewReason: string | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  // Expiration
  expiresAt: string | null;
  /** When to auto-complete this manual order (set once at PAYMENT_CONFIRMED; random 3–15 min). NULL if not scheduled. */
  manualAutoCompleteAt: string | null;
  /** Optional email for order status notifications (order-page subscribe). Used for guest orders. */
  notificationEmail: string | null;
}

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

/**
 * Helper function to map database row to Order interface
 * Handles both new schema (internal_status/user_status) and legacy (status)
 */
function mapOrderRow(row: any): Order {
  // Use new status fields if available, fallback to legacy status
  const internalStatus = row.internal_status || row.status || 'NEW';
  const userStatus = row.user_status || getUserFacingStatus(internalStatus);
  
  return {
    id: row.id,
    userId: row.user_id,
    orderId: row.order_id,
    paymentId: row.payment_id,
    paymentMode: row.payment_mode || null,
    payoutMode: row.payout_mode === 'manual' || row.payout_mode === 'automatic' ? row.payout_mode : null,
    purchaseId: row.purchase_id || null,
    sandboxCase: row.sandbox_case || null,
    internalStatus,
    userStatus,
    providerStatus: row.provider_status || null,
    statusSource: row.status_source || null,
    status: row.status || internalStatus, // Legacy field
    fromCurrency: row.from_currency,
    fromAmount: parseFloat(row.from_amount),
    fromNetwork: row.from_network,
    fromAddress: row.from_address,
    toCurrency: row.to_currency,
    toAmount: parseFloat(row.to_amount),
    toNetwork: row.to_network,
    toAddress: row.to_address,
    providerRate: row.provider_rate ? parseFloat(row.provider_rate) : null,
    expectedReceive: row.expected_receive ? parseFloat(row.expected_receive) : null,
    rateTimestamp: row.rate_timestamp || null,
    rateDeviationPercent: row.rate_deviation_percent ? parseFloat(row.rate_deviation_percent) : null,
    rateMode: row.rate_mode === 'fixed' || row.rate_mode === 'floating' ? row.rate_mode : null,
    providerRateLocked: Boolean(row.provider_rate_locked),
    providerPayAmount: row.provider_pay_amount != null ? parseFloat(row.provider_pay_amount) : null,
    finalReceiveAmount: row.final_receive_amount != null ? parseFloat(row.final_receive_amount) : null,
    payinHash: row.payin_hash || null,
    payoutHash: row.payout_hash || null,
    manualReviewRequired: row.manual_review_required || false,
    manualReviewReason: row.manual_review_reason || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at || null,
    manualAutoCompleteAt: row.manual_auto_complete_at ?? null,
    notificationEmail: row.notification_email ?? null,
  };
}

export async function getUserOrders(
  userId: string,
  filters?: { status?: string; limit?: number; offset?: number }
): Promise<Order[]> {
  checkSupabase();

  let query = supabaseAdmin!
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw wrapDbError(error, 'getUserOrders');
  }

  if (!data) {
    return [];
  }

  return data.map(mapOrderRow);
}

export async function getOrderById(orderId: string, userId: string): Promise<Order | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'getOrderById');
  }
  if (!data) return null;

  return mapOrderRow(data);
}

// Get order by orderId only (for anonymous order tracking)
export async function getOrderByOrderId(orderId: string): Promise<Order | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'getOrderByOrderId');
  }
  if (!data) return null;

  return mapOrderRow(data);
}

/**
 * Set notification email for an order (order-page subscribe).
 * Allowed for any order by order_id (order ID acts as secret for tracking).
 */
export async function updateOrderNotificationEmail(orderId: string, email: string): Promise<Order | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .update({ notification_email: email.trim().toLowerCase(), updated_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'updateOrderNotificationEmail');
  }
  if (!data) return null;

  return mapOrderRow(data);
}

export async function createOrder(userId: string | null, orderData: {
  orderId: string;
  paymentId?: string;
  purchaseId?: string;
  paymentMode?: 'live' | 'sandbox';
  payoutMode?: 'manual' | 'automatic';
  sandboxCase?: 'success' | 'failed' | 'expired' | 'partially_paid';
  internalStatus?: InternalStatus;
  fromCurrency: string;
  fromAmount: number;
  fromNetwork?: string;
  fromAddress?: string;
  toCurrency: string;
  toAmount: number;
  toNetwork?: string;
  toAddress?: string;
  providerRate?: number;
  expectedReceive?: number;
  rateTimestamp?: string;
  rateDeviationPercent?: number;
}): Promise<Order> {
  checkSupabase();

  // Use new status system
  const internalStatus: InternalStatus = orderData.internalStatus || 'NEW';
  const userStatus = getUserFacingStatus(internalStatus);

  // Helper to convert undefined to null for database (DB uses null, TS uses undefined)
  const toDbNull = <T>(value: T | undefined): T | null => value === undefined ? null : value;
  
  const { data, error } = await supabaseAdmin!
    .from('orders')
    .insert({
      user_id: userId || null,
      order_id: orderData.orderId,
      payment_id: toDbNull(orderData.paymentId),
      purchase_id: toDbNull(orderData.purchaseId),
      payment_mode: toDbNull(orderData.paymentMode),
      payout_mode: toDbNull(orderData.payoutMode),
      sandbox_case: toDbNull(orderData.sandboxCase),
      // New status fields
      internal_status: internalStatus,
      user_status: userStatus,
      status: internalStatus, // Legacy field for backward compatibility
      status_source: 'system',
      // Order details
      from_currency: orderData.fromCurrency,
      from_amount: orderData.fromAmount,
      from_network: toDbNull(orderData.fromNetwork),
      from_address: toDbNull(orderData.fromAddress),
      to_currency: orderData.toCurrency,
      to_amount: orderData.toAmount,
      to_network: toDbNull(orderData.toNetwork),
      to_address: toDbNull(orderData.toAddress),
      // Rate fields
      provider_rate: toDbNull(orderData.providerRate),
      expected_receive: toDbNull(orderData.expectedReceive),
      rate_timestamp: toDbNull(orderData.rateTimestamp),
      rate_deviation_percent: toDbNull(orderData.rateDeviationPercent),
    })
    .select()
    .single();

  if (error) {
    throw wrapDbError(error, 'createOrder');
  }

  return mapOrderRow(data);
}

/**
 * Create order and initial status history in a single DB transaction (RPC).
 * Use from payment route so that either both succeed or both fail—no orphan payments.
 * Throws if the transaction fails.
 */
export async function createOrderWithHistoryTransaction(
  userId: string | null,
  orderData: {
    orderId: string;
    paymentId?: string;
    purchaseId?: string;
    paymentMode?: 'live' | 'sandbox';
    payoutMode?: 'manual' | 'automatic';
    sandboxCase?: 'success' | 'failed' | 'expired' | 'partially_paid';
    internalStatus?: InternalStatus;
    fromCurrency: string;
    fromAmount: number;
    fromNetwork?: string;
    fromAddress?: string;
    toCurrency: string;
    toAmount: number;
    toNetwork?: string;
    toAddress?: string;
    providerRate?: number;
    expectedReceive?: number;
    rateTimestamp?: string;
    rateDeviationPercent?: number;
    rateMode?: 'fixed' | 'floating';
    providerRateLocked?: boolean;
    providerPayAmount?: number | null;
    finalReceiveAmount?: number | null;
  }
): Promise<Order> {
  checkSupabase();

  const internalStatus: InternalStatus = orderData.internalStatus || 'NEW';
  const userStatus = getUserFacingStatus(internalStatus);

  const toStr = (v: string | undefined) => (v != null ? String(v) : null);
  const p_order = {
    user_id: userId ?? null,
    order_id: orderData.orderId,
    payment_id: toStr(orderData.paymentId ?? undefined),
    purchase_id: toStr(orderData.purchaseId ?? undefined),
    payment_mode: toStr(orderData.paymentMode ?? undefined),
    payout_mode: toStr(orderData.payoutMode ?? undefined),
    sandbox_case: toStr(orderData.sandboxCase ?? undefined),
    internal_status: internalStatus,
    user_status: userStatus,
    status: internalStatus,
    status_source: 'system',
    from_currency: orderData.fromCurrency,
    from_amount: orderData.fromAmount,
    from_network: toStr(orderData.fromNetwork ?? undefined),
    from_address: toStr(orderData.fromAddress ?? undefined),
    to_currency: orderData.toCurrency,
    to_amount: orderData.toAmount,
    to_network: toStr(orderData.toNetwork ?? undefined),
    to_address: toStr(orderData.toAddress ?? undefined),
    provider_rate: orderData.providerRate ?? null,
    expected_receive: orderData.expectedReceive ?? null,
    rate_timestamp: orderData.rateTimestamp ?? null,
    rate_deviation_percent: orderData.rateDeviationPercent ?? null,
    rate_mode: toStr(orderData.rateMode ?? undefined),
    provider_rate_locked: orderData.providerRateLocked ?? false,
    provider_pay_amount: orderData.providerPayAmount ?? null,
    final_receive_amount: orderData.finalReceiveAmount ?? null,
  };

  const { data, error } = await supabaseAdmin!.rpc('create_order_with_history', {
    p_order: p_order,
  });

  if (error) {
    throw wrapDbError(error, 'createOrderWithHistoryTransaction');
  }

  if (!data) {
    throw new DbError('Create order transaction returned no row', { context: 'createOrderWithHistoryTransaction' });
  }

  return mapOrderRow(data);
}

/**
 * Find orders stuck in NEW, AWAITING_DEPOSIT, or CONFIRMING for longer than the given minutes.
 * Used by webhook failure recovery (cron) to poll NOWPayments and reconcile.
 * AWAITING_DEPOSIT included so orders that received only "waiting" and then missed later webhooks are reconciled.
 */
export async function findStaleOrders(options: {
  olderThanMinutes: number;
  limit?: number;
}): Promise<Order[]> {
  checkSupabase();

  const limit = Math.min(options.limit ?? 50, 100);
  const cutoff = new Date(Date.now() - options.olderThanMinutes * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*')
    .in('internal_status', ['NEW', 'AWAITING_DEPOSIT', 'CONFIRMING'])
    .not('payment_id', 'is', null)
    .lt('updated_at', cutoffIso)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw wrapDbError(error, 'findStaleOrders');
  }

  return (data ?? []).map(mapOrderRow);
}

/**
 * Find orders eligible for expiry-by-time (for a future cron).
 * RULE: Only orders still in NEW or AWAITING_DEPOSIT may be marked EXPIRED by time.
 * If status is CONFIRMING, PAYMENT_CONFIRMED, or PROCESSING_BY_PROVIDER, the expiry job must ignore the order
 * (payment was detected; do not expire based on expires_at).
 */
export async function findOrdersEligibleForExpiryByTime(options: { limit?: number }): Promise<Order[]> {
  checkSupabase();

  const limit = Math.min(options.limit ?? 100, 200);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*')
    .in('internal_status', ['NEW', 'AWAITING_DEPOSIT'])
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)
    .order('expires_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw wrapDbError(error, 'findOrdersEligibleForExpiryByTime');
  }

  return (data ?? []).map(mapOrderRow);
}

/** Paid-but-not-DONE statuses: payment confirmed by provider but order not yet DONE. */
const PAID_NOT_DONE_STATUSES = ['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'PROCESSING_BY_PROVIDER'] as const;

/**
 * Find orders stuck in PAYMENT_CONFIRMED, MANUAL_REVIEW, or PROCESSING_BY_PROVIDER for longer than the given minutes.
 * Used by reconciliation to poll provider and set DONE when provider says finished (funds-release guarantee).
 */
export async function findStalePaidOrders(options: {
  olderThanMinutes: number;
  limit?: number;
}): Promise<Order[]> {
  checkSupabase();

  const limit = Math.min(options.limit ?? 50, 100);
  const cutoff = new Date(Date.now() - options.olderThanMinutes * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*')
    .in('internal_status', [...PAID_NOT_DONE_STATUSES])
    .not('payment_id', 'is', null)
    .lt('updated_at', cutoffIso)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw wrapDbError(error, 'findStalePaidOrders');
  }

  return (data ?? []).map(mapOrderRow);
}

/** Statuses that are "paid but not DONE" for manual auto-complete (same set as reconciliation second pass). */
const MANUAL_AUTOCOMPLETE_STATUSES = ['PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'MANUAL_REVIEW'] as const;

/**
 * Find orders eligible for auto-complete: status in paid-but-not-DONE and manual_auto_complete_at <= now().
 * Each order gets a random 2–10 min scheduled time when it first reaches PAYMENT_CONFIRMED (set in
 * process_webhook_status_update). Applies to all orders (no verification/hash needed). Idempotent.
 */
export async function findStaleManualOrdersForAutoComplete(options: {
  limit?: number;
}): Promise<Order[]> {
  checkSupabase();

  const limit = Math.min(options.limit ?? 50, 100);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*')
    .in('internal_status', [...MANUAL_AUTOCOMPLETE_STATUSES])
    .not('manual_auto_complete_at', 'is', null)
    .lte('manual_auto_complete_at', nowIso)
    .order('manual_auto_complete_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw wrapDbError(error, 'findStaleManualOrdersForAutoComplete');
  }

  return (data ?? []).map(mapOrderRow);
}

// Get order by payment_id (needed for webhook processing)
export async function getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*')
    .eq('payment_id', paymentId)
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'getOrderByPaymentId');
  }
  if (!data) return null;

  return mapOrderRow(data);
}

/**
 * Check if a webhook has already been processed (idempotency check)
 * Returns true if webhook was already processed, false if new
 */
export async function checkWebhookIdempotency(
  paymentId: string,
  paymentStatus: string
): Promise<boolean> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('webhook_idempotency')
    .select('id')
    .eq('payment_id', paymentId)
    .eq('payment_status', paymentStatus)
    .maybeSingle();

  if (error) {
    throw wrapDbError(error, 'checkWebhookIdempotency');
  }

  return !!data;
}

/**
 * Record that a webhook has been processed (idempotency tracking)
 * Returns true if successfully recorded, false if already exists or error
 */
export async function recordWebhookIdempotency(
  paymentId: string,
  paymentStatus: string,
  orderId: string
): Promise<boolean> {
  checkSupabase();

  const { error } = await supabaseAdmin!
    .from('webhook_idempotency')
    .insert({
      payment_id: paymentId,
      payment_status: paymentStatus,
      order_id: orderId,
    });

  if (error) {
    if (isUniqueViolation(error.code)) {
      return false; // Already exists (business result, not failure)
    }
    throw wrapDbError(error, 'recordWebhookIdempotency');
  }

  return true;
}

/**
 * Atomic webhook processing: idempotency + order update + history in one DB transaction.
 * Use from webhook route to ensure all three succeed or fail together; prevents double-processing on retry.
 *
 * Returns { alreadyProcessed: true } if this (payment_id, payment_status) was already handled.
 * Returns { alreadyProcessed: false, order } on success. Throws on DB/transaction failure.
 */
export async function processWebhookStatusUpdateAtomic(params: {
  paymentId: string;
  paymentStatus: string;
  orderId: string;
  internalStatus: InternalStatus;
  userStatus: string;
  providerStatus?: string;
  statusSource?: string;
  fromAddress?: string;
  payinHash?: string;
  payoutHash?: string;
  /** Actual receive amount from provider (e.g. outcome_amount in IPN). Updates final_receive_amount and to_amount. */
  finalReceiveAmount?: number | null;
  /** Outcome amount to store as to_amount when provider confirms (e.g. floating rate final amount). */
  toAmount?: number | null;
}): Promise<{ alreadyProcessed: true } | { alreadyProcessed: false; order: Order }> {
  checkSupabase();

  const p_params: Record<string, unknown> = {
    payment_id: params.paymentId,
    payment_status: params.paymentStatus,
    order_id: params.orderId,
    internal_status: params.internalStatus,
    user_status: params.userStatus,
    status_source: params.statusSource ?? 'webhook',
    provider_status: params.providerStatus ?? null,
    from_address: params.fromAddress ?? null,
    payin_hash: params.payinHash ?? null,
    payout_hash: params.payoutHash ?? null,
  };
  if (params.finalReceiveAmount != null) p_params.final_receive_amount = params.finalReceiveAmount;
  if (params.toAmount != null) p_params.to_amount = params.toAmount;

  const { data, error } = await supabaseAdmin!
    .rpc('process_webhook_status_update', { p_params });

  if (error) {
    throw wrapDbError(error, 'processWebhookStatusUpdateAtomic');
  }

  if (data?.already_processed === true) {
    return { alreadyProcessed: true };
  }

  if (data?.order) {
    return { alreadyProcessed: false, order: mapOrderRow(data.order) };
  }

  throw new Error('process_webhook_status_update returned unexpected result');
}

/**
 * PRIORITY 3: Record status change in history
 * Appends a history entry when order status changes
 */
async function addOrderStatusHistory(
  orderId: string,
  status: string,
  source: 'webhook' | 'polling' | 'manual' | 'system' = 'system',
  paymentStatus?: string,
  metadata?: Record<string, any>
): Promise<void> {
  checkSupabase();

  const historyData: any = {
    order_id: orderId,
    status,
    source,
  };

  if (paymentStatus) {
    historyData.payment_status = paymentStatus;
  }

  if (metadata) {
    historyData.metadata = metadata;
  }

  const { error } = await supabaseAdmin!
    .from('order_status_history')
    .insert(historyData);

  if (error) {
    throw wrapDbError(error, 'addOrderStatusHistory');
  }
}

// Update order status in database
export async function updateOrderStatus(
  orderId: string,
  internalStatus: InternalStatus,
  paymentData?: {
    fromAddress?: string;
    payinHash?: string;
    payoutHash?: string;
    providerStatus?: string;
  },
  options?: {
    source?: StatusSource;
    skipTransitionCheck?: boolean; // Internal flag to skip check if needed
    paymentStatus?: string; // Original payment status (for history tracking)
    updatedBy?: string; // Admin user ID if manual update
  }
): Promise<Order | null> {
  checkSupabase();

  const { data: currentOrder, error: fetchError } = await supabaseAdmin!
    .from('orders')
    .select('internal_status, status, status_source')
    .eq('order_id', orderId)
    .single();

  if (fetchError) {
    if (isNotFoundError(fetchError.code)) return null;
    throw wrapDbError(fetchError, 'updateOrderStatus(fetch)');
  }
  if (!currentOrder) return null;

  // Use internal_status if available, fallback to legacy status
  const currentInternalStatus = (currentOrder.internal_status || currentOrder.status) as InternalStatus;
  const currentStatusSource = currentOrder.status_source;

  // CRITICAL: Webhook updates are AUTHORITATIVE - they bypass ALL state machine validation
  // Webhooks represent external truth from NOWPayments (signature-verified)
  // State machine rules apply ONLY to: user actions, admin actions, system actions (non-webhook)
  const isWebhookUpdate = options?.source === 'webhook';

  // WEBHOOK AUTHORITATIVE RULE: If source is webhook, bypass ALL validation
  if (isWebhookUpdate) {
    // Webhooks are authoritative - skip ALL transition validation
    // Directly proceed to database update
  } else {
    // Non-webhook updates: Apply state machine rules and admin protection
    
    // CRITICAL: Prevent non-admin updates from overriding admin decisions
    // If status was set by admin, only another admin action can change it (e.g. mark_completed)
    const finalStates: InternalStatus[] = ['DONE', 'FAILED', 'EXPIRED'];
    const isFinalState = finalStates.includes(currentInternalStatus);
    const isAdminDecision = currentStatusSource === 'admin' && !isFinalState;
    const isCurrentUpdateFromAdmin = options?.source === 'admin';

    if (isAdminDecision && !isCurrentUpdateFromAdmin) {
      // Return current order to indicate "no change" (not an error)
      const { data: existingOrder, error: fetchErr } = await supabaseAdmin!
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
      
      if (fetchErr) {
        if (isNotFoundError(fetchErr.code)) return null;
        throw wrapDbError(fetchErr, 'updateOrderStatus(admin-protection fetch)');
      }
      if (!existingOrder) return null;
      
      return mapOrderRow(existingOrder);
    }

    if (!options?.skipTransitionCheck) {
      const canTransitionResult = canTransition(currentInternalStatus, internalStatus);

      if (!canTransitionResult) {
        // Return current order instead of null to indicate "no change" (not an error)
        const { data: existingOrder, error: fetchErr } = await supabaseAdmin!
          .from('orders')
          .select('*')
          .eq('order_id', orderId)
          .single();
        
        if (fetchErr) {
          if (isNotFoundError(fetchErr.code)) return null;
          throw wrapDbError(fetchErr, 'updateOrderStatus(transition fetch)');
        }
        if (!existingOrder) return null;
        
        return mapOrderRow(existingOrder);
      }
    }
  }

  // Calculate user-facing status from internal status
  const userStatus = getUserFacingStatus(internalStatus);
  const statusSource: StatusSource = options?.source || 'system';

  const updateData: any = {
    internal_status: internalStatus,
    user_status: userStatus,
    status: internalStatus, // Legacy field for backward compatibility
    status_source: statusSource,
    updated_at: new Date().toISOString(),
  };

  // Set status_updated_by if admin action
  if (options?.updatedBy) {
    updateData.status_updated_by = options.updatedBy;
  }

  if (paymentData?.providerStatus) {
    updateData.provider_status = paymentData.providerStatus;
  }

  // Optionally update address if provided and not already set
  if (paymentData?.fromAddress) {
    updateData.from_address = paymentData.fromAddress;
  }

  // Update transaction hashes
  if (paymentData?.payinHash) {
    updateData.payin_hash = paymentData.payinHash;
  }
  if (paymentData?.payoutHash) {
    updateData.payout_hash = paymentData.payoutHash;
    updateData.payout_hash_entered_at = new Date().toISOString();
    if (options?.updatedBy) {
      updateData.payout_hash_entered_by = options.updatedBy;
    }
  }

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .update(updateData)
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return null;
    throw wrapDbError(error, 'updateOrderStatus(update)');
  }

  if (!data) return null;

  // Record status change in history (only if status actually changed)
  if (currentInternalStatus !== internalStatus) {
    // Map StatusSource to addOrderStatusHistory source type
    // StatusSource: 'webhook' | 'admin' | 'system'
    // addOrderStatusHistory expects: 'webhook' | 'polling' | 'manual' | 'system'
    const historySource = statusSource === 'admin' ? 'manual' : statusSource;
    // Record history asynchronously (don't await to avoid blocking the response)
    addOrderStatusHistory(
      orderId,
      internalStatus,
      historySource as 'webhook' | 'polling' | 'manual' | 'system',
      options?.paymentStatus, // Pass original payment_status if available
      paymentData ? { payinHash: paymentData.payinHash, payoutHash: paymentData.payoutHash } : undefined
    ).catch(err => {
      // Already logged in addOrderStatusHistory, just prevent unhandled rejection
      console.error('Failed to record status history (non-blocking):', err);
    });
  }

  return mapOrderRow(data);
}

