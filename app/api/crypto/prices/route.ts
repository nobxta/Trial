import { NextRequest, NextResponse } from 'next/server';
import { getUniqueCoinGeckoIds, getEnabledCryptos } from '@/lib/supported-cryptos';
import { 
  getAllCryptoPrices, 
  getCryptoPricesByIds, 
  arePricesStale, 
  upsertCryptoPrices 
} from '@/lib/db-crypto-prices';

/**
 * Fetch live prices from CoinGecko simple/price endpoint
 * This endpoint is FREE and requires no API key
 */
async function fetchPricesFromCoinGecko(coinIds: string[]): Promise<Record<string, any>> {
  const idsParam = coinIds.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Refresh prices from CoinGecko and update database cache
 * This is called on-demand when prices are stale
 */
async function refreshPricesInBackground(): Promise<void> {
  try {
    // Get all unique CoinGecko IDs from supported cryptos
    const coinIds = getUniqueCoinGeckoIds();
    
    if (coinIds.length === 0) {
      return;
    }

    // Fetch prices from CoinGecko
    const priceData = await fetchPricesFromCoinGecko(coinIds);

    // Get all enabled cryptos to map CoinGecko IDs to symbols
    const allCryptos = getEnabledCryptos();
    const coinIdToSymbol: Record<string, string> = {};
    
    // Create mapping from CoinGecko ID to symbol
    for (const crypto of allCryptos) {
      if (crypto.coingeckoId && !coinIdToSymbol[crypto.coingeckoId]) {
        coinIdToSymbol[crypto.coingeckoId] = crypto.symbol;
      }
    }

    // Transform CoinGecko response to our format
    const pricesToUpdate = Object.entries(priceData).map(([coinId, data]: [string, any]) => ({
      coinId,
      symbol: coinIdToSymbol[coinId] || coinId.toUpperCase(),
      priceUsd: data.usd || 0,
      priceChange24h: data.usd_24h_change ?? null,
    }));

    // Filter out prices that are 0 or invalid
    const validPrices = pricesToUpdate.filter(p => p.priceUsd > 0);

    // Upsert to database
    await upsertCryptoPrices(validPrices);
  } catch (error) {
    // Log error but don't throw - we'll return cached data
    console.error('Background price refresh error:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedIds = searchParams.get('ids');
    let coinIds: string[] = [];
    
    if (requestedIds) {
      // Use requested IDs (for fetching only displayed cryptos)
      coinIds = requestedIds.split(',').filter(id => id.trim().length > 0);
    } else {
      // Get all unique CoinGecko IDs from supported cryptos
      coinIds = getUniqueCoinGeckoIds();
    }
    
    // Get prices from database cache first
    let cachedPrices;
    if (requestedIds && coinIds.length > 0) {
      cachedPrices = await getCryptoPricesByIds(coinIds);
    } else {
      cachedPrices = await getAllCryptoPrices();
    }

    // Check if prices are stale (> 10 minutes old)
    const stale = await arePricesStale(10);
    
    // If stale, refresh in background (don't wait for it)
    // This ensures fresh prices for the next request while returning cached data instantly
    if (stale) {
      // Refresh asynchronously (fire and forget)
      refreshPricesInBackground().catch(err => {
        console.error('Background refresh failed:', err);
      });
    }
    
    // Transform database format to API response format
    const prices: Record<string, { usd: number; usd_24h_change?: number }> = {};
    let lastUpdated: Date | null = null;

    for (const [coinId, price] of Object.entries(cachedPrices)) {
      // Skip prices that are 0 or invalid (never return 0 values)
      if (price.priceUsd <= 0) continue;
      
      prices[coinId] = {
        usd: price.priceUsd,
        usd_24h_change: price.priceChange24h ?? undefined,
      };
      
      // Track the most recent updated_at timestamp
      const updated = new Date(price.updatedAt);
      if (!lastUpdated || updated > lastUpdated) {
        lastUpdated = updated;
      }
    }

    // If we have no prices, return empty (they'll be populated by cron job or background refresh)
    if (Object.keys(prices).length === 0) {
      return NextResponse.json({
        prices: {},
        cached: true,
        timestamp: lastUpdated ? lastUpdated.getTime() : Date.now(),
        warning: stale 
          ? 'Prices are being refreshed. Please try again in a moment.'
          : 'No prices available. Prices will be updated by the background job.',
      });
    }

    return NextResponse.json({
      prices,
      cached: true,
      timestamp: lastUpdated ? lastUpdated.getTime() : Date.now(),
      last_updated: lastUpdated ? lastUpdated.toISOString() : null,
    });
  } catch (error: any) {
    console.error('Failed to fetch prices from cache:', error);
    
    // Return empty prices instead of error to prevent retry loops
    return NextResponse.json({
      prices: {},
      cached: false,
      timestamp: Date.now(),
      error: 'Price service temporarily unavailable',
    });
  }
}
