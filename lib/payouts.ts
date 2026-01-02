import { supabaseAdmin } from './supabase';
import { getBalance, debit } from './ledger';
import { checkAndMark } from './idempotency';
import { canTransitionPayout, isTerminalPayoutStatus, type PayoutStatus } from './payout-state';

/**
 * PAYOUT ENGINE
 * 
 * Safe payout management system with:
 * - Balance verification (no overdraft)
 * - Idempotency protection
 * - State machine enforcement
 * - Ledger integration
 */

export interface Payout {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

/**
 * Request a payout for a user
 * 
 * Rules:
 * - Checks balance via ledger (no overdraft)
 * - Idempotent (same request won't create duplicate)
 * - Creates payout record in 'pending' status
 * 
 * @param userId - User ID requesting payout
 * @param amount - Amount to payout (must be positive)
 * @param currency - Currency code
 * @param idempotencyKey - Optional idempotency key (if not provided, will be generated)
 * @returns Payout object if successful, null if insufficient balance or error
 */
export async function requestPayout(
  userId: string,
  amount: number,
  currency: string,
  idempotencyKey?: string
): Promise<Payout | null> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot request payout: Supabase not configured');
    return null;
  }

  if (amount <= 0) {
    console.error('❌ Payout amount must be positive:', amount);
    return null;
  }

  // Generate idempotency key if not provided
  // Format: payout:{userId}:{amount}:{currency}:{timestamp}
  // Using timestamp ensures uniqueness, but caller can provide custom key for true idempotency
  const payoutKey = idempotencyKey || `payout:${userId}:${amount}:${currency}:${Date.now()}`;
  const scope = 'payout_request';

  // Check idempotency (if custom key provided, prevents duplicate requests)
  if (idempotencyKey) {
    const alreadyRequested = !(await checkAndMark(scope, payoutKey));
    if (alreadyRequested) {
      console.log(`⏭️  Payout request skipped (idempotency): ${userId} - ${amount} ${currency}`);
      return null; // Already requested with this key
    }
  } else {
    // For non-idempotent requests, mark immediately to prevent duplicates
    await checkAndMark(scope, payoutKey);
  }

  // Check balance via ledger (CRITICAL: no overdraft)
  const balance = await getBalance(userId, currency);
  if (balance < amount) {
    console.error(`❌ Insufficient balance for payout: User ${userId} has ${balance} ${currency}, requested ${amount} ${currency}`);
    return null;
  }

  try {
    // Create payout record in 'pending' status
    const { data, error } = await supabaseAdmin
      .from('payouts')
      .insert({
        user_id: userId,
        amount: amount,
        currency: currency.toUpperCase(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create payout request:', error);
      return null;
    }

    console.log(`✅ Payout request created: ${data.id} - ${amount} ${currency} for user ${userId}`);

    return {
      id: data.id,
      userId: data.user_id,
      amount: parseFloat(data.amount),
      currency: data.currency,
      status: data.status as PayoutStatus,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('❌ Error creating payout request:', error);
    return null;
  }
}

/**
 * Update payout status (with state machine validation)
 * 
 * @param payoutId - Payout ID
 * @param newStatus - New status
 * @returns Updated payout if successful, null otherwise
 */
export async function updatePayoutStatus(
  payoutId: string,
  newStatus: PayoutStatus
): Promise<Payout | null> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot update payout: Supabase not configured');
    return null;
  }

  // Get current payout
  const { data: currentPayout, error: fetchError } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .single();

  if (fetchError || !currentPayout) {
    console.error('❌ Failed to fetch payout:', fetchError);
    return null;
  }

  const currentStatus = currentPayout.status as PayoutStatus;

  // Validate state transition
  if (!canTransitionPayout(currentStatus, newStatus)) {
    console.error(`🚫 Invalid payout status transition: ${payoutId} cannot transition from ${currentStatus} to ${newStatus}`);
    return null;
  }

  // Prepare update data
  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  // Set completed_at if reaching terminal state
  if (isTerminalPayoutStatus(newStatus) && !currentPayout.completed_at) {
    updateData.completed_at = new Date().toISOString();
  }

  // Update payout status
  const { data: updatedPayout, error: updateError } = await supabaseAdmin
    .from('payouts')
    .update(updateData)
    .eq('id', payoutId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Failed to update payout status:', updateError);
    return null;
  }

  return {
    id: updatedPayout.id,
    userId: updatedPayout.user_id,
    amount: parseFloat(updatedPayout.amount),
    currency: updatedPayout.currency,
    status: updatedPayout.status as PayoutStatus,
    createdAt: updatedPayout.created_at,
    completedAt: updatedPayout.completed_at,
    updatedAt: updatedPayout.updated_at,
  };
}

/**
 * Approve payout (transition to processing and create ledger debit)
 * 
 * Rules:
 * - Transitions payout from 'pending' to 'processing'
 * - Creates ledger debit entry (idempotent)
 * - Only pending payouts can be approved
 * 
 * @param payoutId - Payout ID
 * @returns Updated payout if successful, null otherwise
 */
export async function approvePayout(payoutId: string): Promise<Payout | null> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot approve payout: Supabase not configured');
    return null;
  }

  // Get current payout
  const { data: currentPayout, error: fetchError } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .single();

  if (fetchError || !currentPayout) {
    console.error('❌ Failed to fetch payout:', fetchError);
    return null;
  }

  if (currentPayout.status !== 'pending') {
    console.error(`❌ Cannot approve payout ${payoutId}: status is ${currentPayout.status}, must be 'pending'`);
    return null;
  }

  // Verify balance again (double-check before debiting)
  const balance = await getBalance(currentPayout.user_id, currentPayout.currency);
  if (balance < parseFloat(currentPayout.amount)) {
    console.error(`❌ Insufficient balance to approve payout ${payoutId}: User has ${balance}, payout is ${currentPayout.amount}`);
    // Optionally: Update payout to 'failed' status
    return null;
  }

  // Create ledger debit entry (idempotent)
  // Idempotency key ensures same payout cannot debit twice
  const ledgerIdempotencyKey = `payout:${payoutId}:ledger`;
  const ledgerScope = 'ledger_entry';

  const isFirstExecution = await checkAndMark(ledgerScope, ledgerIdempotencyKey);
  if (!isFirstExecution) {
    console.log(`⏭️  Ledger debit skipped (idempotency): Payout ${payoutId}`);
    // Ledger already debited, but still update status if needed
  } else {
    // Create ledger debit entry
    const debitSuccess = await debit({
      order_id: undefined, // Payouts don't have order_id
      user_id: currentPayout.user_id,
      type: 'debit',
      category: 'payout',
      amount: parseFloat(currentPayout.amount),
      currency: currentPayout.currency,
    });

    if (!debitSuccess) {
      console.error(`❌ Failed to create ledger debit for payout ${payoutId}`);
      return null;
    }

    console.log(`📝 Ledger debit recorded for payout ${payoutId}`);
  }

  // Update payout status to 'processing'
  return updatePayoutStatus(payoutId, 'processing');
}

/**
 * Complete payout (transition to completed)
 * 
 * @param payoutId - Payout ID
 * @returns Updated payout if successful, null otherwise
 */
export async function completePayout(payoutId: string): Promise<Payout | null> {
  return updatePayoutStatus(payoutId, 'completed');
}

/**
 * Fail payout (transition to failed)
 * 
 * Note: Failed payouts do NOT debit the ledger (ledger debit only happens on approve)
 * If payout fails after approval, you may need to reverse the debit with a credit entry
 * 
 * @param payoutId - Payout ID
 * @returns Updated payout if successful, null otherwise
 */
export async function failPayout(payoutId: string): Promise<Payout | null> {
  return updatePayoutStatus(payoutId, 'failed');
}

/**
 * Get payout by ID
 */
export async function getPayoutById(payoutId: string): Promise<Payout | null> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot get payout: Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      amount: parseFloat(data.amount),
      currency: data.currency,
      status: data.status as PayoutStatus,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('❌ Error getting payout:', error);
    return null;
  }
}

/**
 * Get user payouts
 */
export async function getUserPayouts(
  userId: string,
  filters?: { status?: PayoutStatus; limit?: number; offset?: number }
): Promise<Payout[]> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot get payouts: Supabase not configured');
    return [];
  }

  try {
    let query = supabaseAdmin
      .from('payouts')
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
      console.error('❌ Failed to get user payouts:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status as PayoutStatus,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('❌ Error getting user payouts:', error);
    return [];
  }
}

