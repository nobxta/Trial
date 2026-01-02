import { supabaseAdmin } from './supabase';
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
    payinHash: row.payin_hash || null,
    payoutHash: row.payout_hash || null,
    manualReviewRequired: row.manual_review_required || false,
    manualReviewReason: row.manual_review_reason || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at || null,
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

  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/db-orders.ts:getUserOrders',message:'Database query result',data:{userId,hasError:!!error,error:error?.message,dataCount:data?.length||0,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('Database error fetching orders:', error);
    return [];
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

  if (error || !data) return null;

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

  if (error || !data) return null;

  return mapOrderRow(data);
}

export async function createOrder(userId: string | null, orderData: {
  orderId: string;
  paymentId?: string;
  purchaseId?: string;
  paymentMode?: 'live' | 'sandbox';
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

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .insert({
      user_id: userId || null,
      order_id: orderData.orderId,
      payment_id: orderData.paymentId || null,
      purchase_id: orderData.purchaseId || null,
      payment_mode: orderData.paymentMode || null,
      sandbox_case: orderData.sandboxCase || null,
      // New status fields
      internal_status: internalStatus,
      user_status: userStatus,
      status: internalStatus, // Legacy field for backward compatibility
      status_source: 'system',
      // Order details
      from_currency: orderData.fromCurrency,
      from_amount: orderData.fromAmount,
      from_network: orderData.fromNetwork || null,
      from_address: orderData.fromAddress || null,
      to_currency: orderData.toCurrency,
      to_amount: orderData.toAmount,
      to_network: orderData.toNetwork || null,
      to_address: orderData.toAddress || null,
      // Rate fields
      provider_rate: orderData.providerRate || null,
      expected_receive: orderData.expectedReceive || null,
      rate_timestamp: orderData.rateTimestamp || null,
      rate_deviation_percent: orderData.rateDeviationPercent || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }

  return mapOrderRow(data);
}

// Get order by payment_id (needed for webhook processing)
export async function getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .select('*')
    .eq('payment_id', paymentId)
    .single();

  if (error || !data) return null;

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
    console.error('Failed to check webhook idempotency:', error);
    // On error, assume not processed to allow retry (fail open)
    return false;
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
    // If unique constraint violation, webhook was already processed
    if (error.code === '23505') {
      return false; // Already exists
    }
    console.error('Failed to record webhook idempotency:', error);
    return false;
  }

  return true;
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
    // Log but don't fail the update if history recording fails
    console.error('Failed to record order status history:', error);
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

  // Get current order status for transition validation
  console.log('🔵 [updateOrderStatus] Fetching current order status for:', orderId);
  const { data: currentOrder, error: fetchError } = await supabaseAdmin!
    .from('orders')
    .select('internal_status, status, status_source')
    .eq('order_id', orderId)
    .single();

  if (fetchError || !currentOrder) {
    console.error('🔴 [updateOrderStatus] Failed to fetch current order status:', fetchError);
    return null;
  }

  // Use internal_status if available, fallback to legacy status
  const currentInternalStatus = (currentOrder.internal_status || currentOrder.status) as InternalStatus;
  const currentStatusSource = currentOrder.status_source;
  console.log('🔵 [updateOrderStatus] Current internal_status:', currentInternalStatus);
  console.log('🔵 [updateOrderStatus] Current status_source:', currentStatusSource);
  console.log('🔵 [updateOrderStatus] Target internal_status:', internalStatus);
  console.log('🔵 [updateOrderStatus] Update source:', options?.source);

  // CRITICAL: Webhook updates are AUTHORITATIVE - they bypass ALL state machine validation
  // Webhooks represent external truth from NOWPayments (signature-verified)
  // State machine rules apply ONLY to: user actions, admin actions, system actions (non-webhook)
  const isWebhookUpdate = options?.source === 'webhook';
  
  console.log('🔵 [updateOrderStatus] Update source:', options?.source);
  console.log('🔵 [updateOrderStatus] isWebhookUpdate:', isWebhookUpdate);
  console.log('🔵 [updateOrderStatus] Current internal_status:', currentInternalStatus);
  console.log('🔵 [updateOrderStatus] Target internal_status:', internalStatus);

  // WEBHOOK AUTHORITATIVE RULE: If source is webhook, bypass ALL validation
  if (isWebhookUpdate) {
    console.log('🟢 Webhook override: bypassing state machine');
    // Webhooks are authoritative - skip ALL transition validation
    // Directly proceed to database update
  } else {
    // Non-webhook updates: Apply state machine rules and admin protection
    
    // CRITICAL: Prevent non-webhook updates from overriding admin decisions
    // If status was set by admin, only admin can change it (unless it's a final state)
    const finalStates: InternalStatus[] = ['DONE', 'FAILED', 'EXPIRED'];
    const isFinalState = finalStates.includes(currentInternalStatus);
    const isAdminDecision = currentStatusSource === 'admin' && !isFinalState;

    if (isAdminDecision) {
      console.warn(
        `⚠️  [updateOrderStatus] Admin override protection: Order ${orderId} status was set by admin (${currentInternalStatus}). Update blocked to preserve admin decision.`
      );
      // Return current order to indicate "no change" (not an error)
      const { data: existingOrder } = await supabaseAdmin!
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
      
      if (!existingOrder) return null;
      
      return mapOrderRow(existingOrder);
    }

    // Validate status transition using strict state machine (only for non-webhook updates)
    if (!options?.skipTransitionCheck) {
      const canTransitionResult = canTransition(currentInternalStatus, internalStatus);
      console.log('🔵 [updateOrderStatus] canTransition check:', canTransitionResult);
      console.log('🔵 [updateOrderStatus] From:', currentInternalStatus, 'To:', internalStatus);
      
      if (!canTransitionResult) {
        const source = options?.source || 'system';
        console.error(
          `🚫 [updateOrderStatus] Invalid status transition blocked: Order ${orderId} cannot transition from ${currentInternalStatus} to ${internalStatus} (source: ${source})`
        );
        // Return current order instead of null to indicate "no change" (not an error)
        const { data: existingOrder } = await supabaseAdmin!
          .from('orders')
          .select('*')
          .eq('order_id', orderId)
          .single();
        
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

  // Update provider status if provided
  if (paymentData?.providerStatus) {
    updateData.provider_status = paymentData.providerStatus;
    console.log('🔵 [updateOrderStatus] Setting provider_status:', paymentData.providerStatus);
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

  console.log('🔵 [updateOrderStatus] Update data:', JSON.stringify(updateData, null, 2));
  console.log('🔵 [updateOrderStatus] Executing database update...');

  const { data, error } = await supabaseAdmin!
    .from('orders')
    .update(updateData)
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) {
    console.error('🔴 [updateOrderStatus] Database update error:', error);
    console.error('🔴 [updateOrderStatus] Error details:', JSON.stringify(error, null, 2));
    return null;
  }

  if (!data) {
    console.error('🔴 [updateOrderStatus] Database update returned no data');
    return null;
  }

  console.log('✅ [updateOrderStatus] Database update successful');
  console.log('🔵 [updateOrderStatus] Updated order internal_status:', data.internal_status);
  console.log('🔵 [updateOrderStatus] Updated order provider_status:', data.provider_status);
  console.log('🔵 [updateOrderStatus] Updated order user_status:', data.user_status);

  // Defensive log for webhook-driven updates
  if (isWebhookUpdate) {
    console.log('🟢 Webhook-driven order update persisted', {
      order_id: orderId,
      internal_status: data.internal_status,
      provider_status: data.provider_status,
    });
  }

  // Record status change in history (only if status actually changed)
  if (currentInternalStatus !== internalStatus) {
    // Record history asynchronously (don't await to avoid blocking the response)
    addOrderStatusHistory(
      orderId,
      internalStatus,
      statusSource,
      options?.paymentStatus, // Pass original payment_status if available
      paymentData ? { payinHash: paymentData.payinHash, payoutHash: paymentData.payoutHash } : undefined
    ).catch(err => {
      // Already logged in addOrderStatusHistory, just prevent unhandled rejection
      console.error('Failed to record status history (non-blocking):', err);
    });
  }

  return mapOrderRow(data);
}

