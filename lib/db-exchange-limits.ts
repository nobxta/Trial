import { supabaseAdmin } from './supabase';
import { ExchangeLimits, getExchangeLimits as fetchExchangeLimitsFromAPI } from './nowpayments';
import { getEnabledAssetNetworks } from './supportedAssets';

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

/**
 * Get exchange limits - checks database first, then fetches from NowPayments API if not found
 * This is the main function to use when you need limits for a specific currency pair
 * 
 * @param currencyFrom - Currency code to send (e.g., 'btc', 'usdttrc20')
 * @param currencyTo - Currency code to receive (e.g., 'eth', 'usdterc20')
 * @param isFixedRate - Whether to check limits for fixed-rate payments (default: false)
 * @returns Exchange limits from database or API
 */
export async function getExchangeLimitsWithFallback(
  currencyFrom: string,
  currencyTo: string,
  isFixedRate: boolean = false
): Promise<ExchangeLimits> {
  // First, try to get from database cache
  const cached = await getExchangeLimitsFromCache(currencyFrom, currencyTo, isFixedRate);
  
  if (cached) {
    // Return cached limits
    return {
      min_amount: cached.minAmount,
      max_amount: cached.maxAmount ?? undefined,
      min_amount_fiat: cached.minAmountFiat ?? undefined,
      max_amount_fiat: cached.maxAmountFiat ?? undefined,
    };
  }
  
  // Not in database - fetch from NowPayments API
  const limits = await fetchExchangeLimitsFromAPI(currencyFrom, currencyTo, isFixedRate);
  
  // Save to database for future use (async, don't wait)
  upsertExchangeLimits(currencyFrom, currencyTo, isFixedRate, limits).catch(err => {
    console.error(`Failed to save limits for ${currencyFrom}->${currencyTo}:`, err);
  });
  
  return limits;
}

/**
 * Fetch and save all exchange limits for all enabled currency pairs
 * This function generates all possible pairs from enabled assets and fetches limits from NowPayments API
 * 
 * @param isFixedRate - Whether to fetch fixed-rate limits (default: false)
 * @param options - Options for the bulk fetch operation
 * @returns Statistics about the operation
 */
export interface FetchAllLimitsResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ currencyFrom: string; currencyTo: string; error: string }>;
}

export async function fetchAndSaveAllExchangeLimits(
  isFixedRate: boolean = false,
  options: {
    delayBetweenRequests?: number; // Delay in milliseconds between API requests (default: 100ms)
    skipSameSymbol?: boolean; // Skip pairs where from and to have the same symbol (default: true)
  } = {}
): Promise<FetchAllLimitsResult> {
  const {
    delayBetweenRequests = 100,
    skipSameSymbol = true,
  } = options;

  // Get all enabled asset networks
  const assets = getEnabledAssetNetworks();
  
  const result: FetchAllLimitsResult = {
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  };
  
  // Generate all possible pairs
  const pairs: Array<{ from: string; to: string; fromSymbol: string; toSymbol: string }> = [];
  
  for (const fromAsset of assets) {
    for (const toAsset of assets) {
      // Skip same currency pair
      if (fromAsset.id === toAsset.id) {
        continue;
      }
      
      // Skip pairs with same symbol if option is enabled
      if (skipSameSymbol && fromAsset.symbol === toAsset.symbol) {
        continue;
      }
      
      pairs.push({
        from: fromAsset.id,
        to: toAsset.id,
        fromSymbol: fromAsset.symbol,
        toSymbol: toAsset.symbol,
      });
    }
  }
  
  result.total = pairs.length;
  
  console.log(`📊 Fetching exchange limits for ${pairs.length} currency pairs (isFixedRate: ${isFixedRate})...`);
  
  // Fetch limits for each pair with delay to avoid rate limiting
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    
    try {
      // Fetch limits from NowPayments API
      const limits = await fetchExchangeLimitsFromAPI(pair.from, pair.to, isFixedRate);
      
      // Save to database
      await upsertExchangeLimits(pair.from, pair.to, isFixedRate, limits);
      
      result.success++;
      
      // Log progress every 50 pairs
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${pairs.length} (${Math.round((i + 1) / pairs.length * 100)}%)`);
      }
    } catch (error: any) {
      result.failed++;
      
      // Check if this is an unsupported pair (400 error) - these are expected and not logged as errors
      const isUnsupportedPair = error.statusCode === 400 || error.isUnsupportedPair;
      
      if (isUnsupportedPair) {
        // Unsupported pairs are expected, just count them
        // Don't add to errors array to avoid clutter
      } else {
        // Actual error - log it
        const errorMessage = error.message || 'Unknown error';
        result.errors.push({
          currencyFrom: pair.from,
          currencyTo: pair.to,
          error: errorMessage,
        });
        
        console.error(`  ❌ Failed to fetch limits for ${pair.from}->${pair.to}: ${errorMessage}`);
      }
    }
    
    // Delay between requests to avoid rate limiting (except for last request)
    if (i < pairs.length - 1 && delayBetweenRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
  }
  
  console.log(`✅ Completed: ${result.success} success, ${result.failed} failed (${result.errors.length} errors)`);
  
  return result;
}

/**
 * Fetch and save exchange limits for a specific cryptocurrency pair
 * This is a convenience function that wraps getExchangeLimitsWithFallback
 * 
 * @param currencyFrom - Currency code to send
 * @param currencyTo - Currency code to receive
 * @param isFixedRate - Whether to check limits for fixed-rate payments (default: false)
 * @returns Exchange limits
 */
export async function fetchAndSaveExchangeLimits(
  currencyFrom: string,
  currencyTo: string,
  isFixedRate: boolean = false
): Promise<ExchangeLimits> {
  return getExchangeLimitsWithFallback(currencyFrom, currencyTo, isFixedRate);
}

