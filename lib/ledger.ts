import { supabaseAdmin } from './supabase';
import { checkAndMark } from './idempotency';

/**
 * FINANCIAL LEDGER SYSTEM
 * 
 * Immutable append-only ledger for all financial transactions.
 * This is the source of truth for balances - balances are always calculated,
 * never stored.
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
 * Record order completion in ledger (idempotent)
 * Creates entries for user credit and platform fee
 * 
 * @param orderId - Order ID
 * @param userId - User ID
 * @param toAmount - Amount user receives (credit)
 * @param toCurrency - Currency user receives
 * @param fromAmount - Amount user sent (for fee calculation)
 * @param fromCurrency - Currency user sent
 * @param feePercent - Platform fee percentage (e.g., 0.01 for 1%)
 * @returns true if successful, false otherwise
 */
export async function recordOrderCompletion(
  orderId: string,
  userId: string,
  toAmount: number,
  toCurrency: string,
  fromAmount: number,
  fromCurrency: string,
  feePercent: number = 0.01 // Default 1% fee
): Promise<boolean> {
  // Idempotency key: ensure we only record this order once
  const idempotencyKey = `order:${orderId}:ledger`;
  const scope = 'ledger_entry';

  // Check if already recorded
  const isFirstExecution = await checkAndMark(scope, idempotencyKey);
  if (!isFirstExecution) {
    console.log(`⏭️  Ledger entry skipped (idempotency): Order ${orderId}`);
    return true; // Already recorded
  }

  console.log(`📝 Recording ledger entries for order ${orderId}`);

  // Calculate fee (fee is in the source currency)
  const feeAmount = fromAmount * feePercent;

  // Credit user with the converted amount (what they receive)
  const userCreditSuccess = await credit({
    order_id: orderId,
    user_id: userId,
    type: 'credit',
    category: 'payout',
    amount: toAmount,
    currency: toCurrency,
  });

  if (!userCreditSuccess) {
    console.error(`❌ Failed to credit user for order ${orderId}`);
    return false;
  }

  // Credit platform fee (if fee is in different currency, this would need adjustment)
  // For now, assuming fee is in source currency
  if (feeAmount > 0) {
    const feeCreditSuccess = await credit({
      order_id: orderId,
      user_id: undefined, // System/platform account (no user_id for fees)
      type: 'credit',
      category: 'fee',
      amount: feeAmount,
      currency: fromCurrency,
    });

    if (!feeCreditSuccess) {
      console.error(`❌ Failed to record fee for order ${orderId}`);
      // User credit already recorded, so return true
      // Fee recording failure is logged but doesn't block
    }
  }

  console.log(`✅ Ledger entries recorded for order ${orderId}`);
  return true;
}

