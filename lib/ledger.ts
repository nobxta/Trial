import { supabaseAdmin } from './supabase';

/**
 * FINANCIAL LEDGER SYSTEM
 * Order completion is recorded via record_order_completion_atomic RPC so that
 * idempotency claim and ledger writes are in one transaction. If idempotency exists, ledger MUST exist.
 */

export interface LedgerEntry {
  order_id?: string;
  user_id?: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  currency: string;
}

/**
 * Create a credit entry (money added)
 * 
 * @param entry - Ledger entry data
 * @returns true if successful, false otherwise
 */
export async function credit(entry: LedgerEntry): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot create ledger entry: Supabase not configured');
    return false;
  }

  if (entry.amount <= 0) {
    console.error('❌ Credit amount must be positive:', entry.amount);
    return false;
  }

  try {
    const { error } = await supabaseAdmin.from('ledger_entries').insert({
      order_id: entry.order_id || null,
      user_id: entry.user_id || null,
      type: 'credit',
      category: entry.category,
      amount: entry.amount,
      currency: entry.currency.toUpperCase(),
    });

    if (error) {
      console.error('❌ Failed to create credit entry:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error creating credit entry:', error);
    return false;
  }
}

/**
 * Create a debit entry (money removed)
 * 
 * @param entry - Ledger entry data
 * @returns true if successful, false otherwise
 */
export async function debit(entry: LedgerEntry): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot create ledger entry: Supabase not configured');
    return false;
  }

  if (entry.amount <= 0) {
    console.error('❌ Debit amount must be positive:', entry.amount);
    return false;
  }

  try {
    const { error } = await supabaseAdmin.from('ledger_entries').insert({
      order_id: entry.order_id || null,
      user_id: entry.user_id || null,
      type: 'debit',
      category: entry.category,
      amount: entry.amount,
      currency: entry.currency.toUpperCase(),
    });

    if (error) {
      console.error('❌ Failed to create debit entry:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error creating debit entry:', error);
    return false;
  }
}

/**
 * Get user balance for a specific currency
 * Calculated from ledger entries (never stored)
 * 
 * @param userId - User ID
 * @param currency - Currency code (e.g., 'USD', 'BTC')
 * @returns Balance (positive = credit balance, negative = debit balance)
 */
export async function getBalance(userId: string, currency: string): Promise<number> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot get balance: Supabase not configured');
    return 0;
  }

  try {
    const { data: entries, error } = await supabaseAdmin
      .from('ledger_entries')
      .select('type, amount')
      .eq('user_id', userId)
      .eq('currency', currency.toUpperCase());

    if (error) {
      console.error('❌ Failed to get balance:', error);
      return 0;
    }

    if (!entries || entries.length === 0) {
      return 0;
    }

    // Calculate balance: credits add, debits subtract
    const balance = entries.reduce((sum, entry) => {
      if (entry.type === 'credit') {
        return sum + parseFloat(entry.amount);
      } else {
        return sum - parseFloat(entry.amount);
      }
    }, 0);

    return balance;
  } catch (error) {
    console.error('❌ Error calculating balance:', error);
    return 0;
  }
}

/**
 * Record order completion in ledger (idempotent).
 * Uses record_order_completion_atomic RPC: claim + ledger in one transaction.
 * Hard rule: if idempotency exists, ledger entry MUST exist.
 */
export async function recordOrderCompletion(
  orderId: string,
  userId: string | null,
  toAmount: number,
  toCurrency: string,
  fromAmount: number,
  fromCurrency: string,
  feePercent: number = 0.01
): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('❌ Cannot record order completion: Supabase not configured');
    return false;
  }
  const { data, error } = await supabaseAdmin.rpc('record_order_completion_atomic', {
    p_order_id: orderId,
    p_user_id: userId ?? null,
    p_to_amount: toAmount,
    p_to_currency: toCurrency,
    p_from_amount: fromAmount,
    p_from_currency: fromCurrency,
    p_fee_percent: feePercent,
  });
  if (error) {
    console.error(`❌ record_order_completion_atomic failed for order ${orderId}:`, error);
    return false;
  }
  if (data === true) {
    console.log(`✅ Ledger recorded for order ${orderId}`);
  } else {
    console.log(`⏭️  Ledger skipped (idempotent): Order ${orderId}`);
  }
  return true;
}

