import { supabaseAdmin } from './supabase';

export interface CryptoPrice {
  coinId: string; // CoinGecko ID
  symbol: string;
  priceUsd: number;
  priceChange24h?: number | null;
  updatedAt: string; // Renamed from lastUpdated to match database column
  createdAt: string;
}

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

/**
 * Upsert (insert or update) crypto prices in batch
 * This is used by the cron job to update all prices at once
 */
export async function upsertCryptoPrices(
  prices: Array<{
    coinId: string;
    symbol: string;
    priceUsd: number;
    priceChange24h?: number | null;
  }>
): Promise<void> {
  checkSupabase();

  // Transform to database format
  // Note: Don't set updated_at manually - the database trigger will handle it on UPDATE
  // For INSERT, the DEFAULT NOW() will set it
  const records = prices.map(price => ({
    coin_id: price.coinId,
    symbol: price.symbol.toUpperCase(),
    price_usd: price.priceUsd,
    price_change_24h: price.priceChange24h ?? null,
    // updated_at is set by database trigger automatically (on UPDATE) or DEFAULT NOW() (on INSERT)
  }));

  // Use upsert (insert + update on conflict)
  const { error } = await supabaseAdmin!
    .from('crypto_prices')
    .upsert(records, {
      onConflict: 'coin_id',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Failed to upsert crypto prices: ${error.message}`);
  }
}

/**
 * Get all crypto prices from cache
 * Returns prices indexed by coin_id (CoinGecko ID)
 */
export async function getAllCryptoPrices(): Promise<Record<string, CryptoPrice>> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('crypto_prices')
    .select('*')
    .gt('price_usd', 0) // Only return prices > 0
    .order('symbol', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch crypto prices: ${error.message}`);
  }

  // Transform to indexed object
  const prices: Record<string, CryptoPrice> = {};
  for (const row of data || []) {
    prices[row.coin_id] = {
      coinId: row.coin_id,
      symbol: row.symbol,
      priceUsd: parseFloat(row.price_usd),
      priceChange24h: row.price_change_24h ? parseFloat(row.price_change_24h) : null,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  }

  return prices;
}

/**
 * Get crypto prices by coin IDs (CoinGecko IDs)
 */
export async function getCryptoPricesByIds(coinIds: string[]): Promise<Record<string, CryptoPrice>> {
  checkSupabase();

  if (coinIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseAdmin!
    .from('crypto_prices')
    .select('*')
    .in('coin_id', coinIds)
    .gt('price_usd', 0); // Only return prices > 0

  if (error) {
    throw new Error(`Failed to fetch crypto prices: ${error.message}`);
  }

  // Transform to indexed object
  const prices: Record<string, CryptoPrice> = {};
  for (const row of data || []) {
    prices[row.coin_id] = {
      coinId: row.coin_id,
      symbol: row.symbol,
      priceUsd: parseFloat(row.price_usd),
      priceChange24h: row.price_change_24h ? parseFloat(row.price_change_24h) : null,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  }

  return prices;
}

/**
 * Get the last updated timestamp of the cache
 * Returns null if no prices exist
 */
export async function getCryptoPricesLastUpdated(): Promise<Date | null> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('crypto_prices')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.updated_at);
}

/**
 * Check if prices are stale (older than threshold)
 */
export async function arePricesStale(staleThresholdMinutes: number = 10): Promise<boolean> {
  const lastUpdated = await getCryptoPricesLastUpdated();
  
  if (!lastUpdated) {
    return true; // No prices = stale
  }

  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes > staleThresholdMinutes;
}

