import { supabaseAdmin } from './supabase';
import { ExchangeLimits } from './nowpayments';

export interface ExchangeLimitRecord {
  currencyFrom: string;
  currencyTo: string;
  isFixedRate: boolean;
  minAmount: number;
  maxAmount?: number | null;
  minAmountFiat?: number | null;
  maxAmountFiat?: number | null;
  updatedAt: string;
  createdAt: string;
}

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

/**
 * Upsert exchange limits for a currency pair
 */
export async function upsertExchangeLimits(
  currencyFrom: string,
  currencyTo: string,
  isFixedRate: boolean,
  limits: ExchangeLimits
): Promise<void> {
  checkSupabase();

  const record = {
    currency_from: currencyFrom.toLowerCase(),
    currency_to: currencyTo.toLowerCase(),
    is_fixed_rate: isFixedRate,
    min_amount: limits.min_amount,
    max_amount: limits.max_amount ?? null,
    min_amount_fiat: limits.min_amount_fiat ?? null,
    max_amount_fiat: limits.max_amount_fiat ?? null,
  };

  const { error } = await supabaseAdmin!
    .from('exchange_limits')
    .upsert(record, {
      onConflict: 'currency_from,currency_to,is_fixed_rate',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Failed to upsert exchange limits: ${error.message}`);
  }
}

/**
 * Get exchange limits from cache
 * Returns null if not found
 */
export async function getExchangeLimitsFromCache(
  currencyFrom: string,
  currencyTo: string,
  isFixedRate: boolean
): Promise<ExchangeLimitRecord | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('exchange_limits')
    .select('*')
    .eq('currency_from', currencyFrom.toLowerCase())
    .eq('currency_to', currencyTo.toLowerCase())
    .eq('is_fixed_rate', isFixedRate)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch exchange limits: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    currencyFrom: data.currency_from,
    currencyTo: data.currency_to,
    isFixedRate: data.is_fixed_rate,
    minAmount: parseFloat(data.min_amount),
    maxAmount: data.max_amount ? parseFloat(data.max_amount) : null,
    minAmountFiat: data.min_amount_fiat ? parseFloat(data.min_amount_fiat) : null,
    maxAmountFiat: data.max_amount_fiat ? parseFloat(data.max_amount_fiat) : null,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
  };
}

/**
 * Check if limits are stale (older than threshold in minutes)
 */
export async function areLimitsStale(
  currencyFrom: string,
  currencyTo: string,
  isFixedRate: boolean,
  staleThresholdMinutes: number = 10
): Promise<boolean> {
  const cached = await getExchangeLimitsFromCache(currencyFrom, currencyTo, isFixedRate);
  
  if (!cached) {
    return true; // No cache = stale
  }

  const now = new Date();
  const updatedAt = new Date(cached.updatedAt);
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes > staleThresholdMinutes;
}

/**
 * Get all exchange limits (for cron job bulk updates)
 */
export async function getAllExchangeLimits(): Promise<ExchangeLimitRecord[]> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('exchange_limits')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch all exchange limits: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map(row => ({
    currencyFrom: row.currency_from,
    currencyTo: row.currency_to,
    isFixedRate: row.is_fixed_rate,
    minAmount: parseFloat(row.min_amount),
    maxAmount: row.max_amount ? parseFloat(row.max_amount) : null,
    minAmountFiat: row.min_amount_fiat ? parseFloat(row.min_amount_fiat) : null,
    maxAmountFiat: row.max_amount_fiat ? parseFloat(row.max_amount_fiat) : null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }));
}

/**
 * Get all unique currency pairs from cache (for cron job)
 */
export async function getUniqueCurrencyPairs(): Promise<Array<{ from: string; to: string; isFixedRate: boolean }>> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('exchange_limits')
    .select('currency_from, currency_to, is_fixed_rate')
    .order('updated_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch currency pairs: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Use Set to ensure uniqueness
  const pairs = new Set<string>();
  const result: Array<{ from: string; to: string; isFixedRate: boolean }> = [];

  for (const row of data) {
    const key = `${row.currency_from}:${row.currency_to}:${row.is_fixed_rate}`;
    if (!pairs.has(key)) {
      pairs.add(key);
      result.push({
        from: row.currency_from,
        to: row.currency_to,
        isFixedRate: row.is_fixed_rate,
      });
    }
  }

  return result;
}

