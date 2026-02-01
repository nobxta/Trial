import { NextRequest, NextResponse } from 'next/server';
import { getUniqueCoinGeckoIds, getEnabledCryptos } from '@/lib/supported-cryptos';
import { upsertCryptoPrices } from '@/lib/db-crypto-prices';

/**
 * Vercel Cron Job: Update crypto prices daily (runs at 2 AM UTC)
 * 
 * This endpoint should be called by Vercel Cron (configured in vercel.json)
 * It fetches prices for ALL supported cryptocurrencies from CoinGecko
 * and updates the crypto_prices table.
 * 
 * Note: Vercel Hobby plan limits cron jobs to once per day.
 * For more frequent updates, consider upgrading to Pro plan or using an external cron service.
 * 
 * Security: Protected by Vercel Cron secret (automatically verified by Vercel)
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET?.trim();
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !cronSecret) {
      console.error('[Cron] CRON_SECRET missing in production');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 [Cron] Starting price update...');

    // Get all unique CoinGecko IDs from supported cryptos
    const coinIds = getUniqueCoinGeckoIds();
    
    if (coinIds.length === 0) {
      console.warn('⚠️  [Cron] No coin IDs found');
      return NextResponse.json({
        success: false,
        error: 'No supported cryptocurrencies found',
      });
    }

    console.log(`📊 [Cron] Fetching prices for ${coinIds.length} coins from CoinGecko...`);

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

    console.log(`💾 [Cron] Upserting ${validPrices.length} prices to database...`);

    // Upsert to database
    await upsertCryptoPrices(validPrices);

    console.log(`✅ [Cron] Successfully updated ${validPrices.length} prices`);

    return NextResponse.json({
      success: true,
      updated: validPrices.length,
      total: coinIds.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [Cron] Price update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update prices',
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers (e.g., testing)
export async function POST(request: NextRequest) {
  return GET(request);
}

