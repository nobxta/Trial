import { NextRequest, NextResponse } from 'next/server';
import { getExchangeLimits } from '@/lib/nowpayments';
import { getEnabledCryptos } from '@/lib/supported-cryptos';
import { upsertExchangeLimits, getUniqueCurrencyPairs, areLimitsStale } from '@/lib/db-exchange-limits';

/**
 * Vercel Cron Job: Update exchange limits daily (runs at 3 AM UTC)
 * 
 * This endpoint should be called by Vercel Cron (configured in vercel.json)
 * It fetches limits for all supported currency pairs from NOWPayments
 * and updates the exchange_limits table.
 * 
 * Note: Vercel Hobby plan limits cron jobs to once per day.
 * For more frequent updates, consider upgrading to Pro plan or using an external cron service.
 * 
 * Security: Protected by Vercel Cron secret (automatically verified by Vercel)
 */
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

    console.log('🔄 [Cron] Starting exchange limits update...');

    // Get all enabled cryptos
    const allCryptos = getEnabledCryptos();
    
    if (allCryptos.length === 0) {
      console.warn('⚠️  [Cron] No cryptos found');
      return NextResponse.json({
        success: false,
        error: 'No supported cryptocurrencies found',
      });
    }

    // Get existing pairs from cache (to refresh stale ones)
    const existingPairs = await getUniqueCurrencyPairs();
    
    // Build list of pairs to update:
    // 1. All possible pairs from enabled cryptos (for initial population)
    // 2. Existing pairs that are stale
    const pairsToUpdate = new Set<string>();
    const pairsList: Array<{ from: string; to: string; isFixedRate: boolean }> = [];

    // Add all possible pairs (both fixed and floating rate)
    for (const fromCrypto of allCryptos) {
      for (const toCrypto of allCryptos) {
        if (fromCrypto.id === toCrypto.id) continue; // Skip same currency
        
        // Add fixed rate pair
        const fixedKey = `${fromCrypto.id}:${toCrypto.id}:true`;
        if (!pairsToUpdate.has(fixedKey)) {
          pairsToUpdate.add(fixedKey);
          pairsList.push({
            from: fromCrypto.id,
            to: toCrypto.id,
            isFixedRate: true,
          });
        }

        // Add floating rate pair
        const floatKey = `${fromCrypto.id}:${toCrypto.id}:false`;
        if (!pairsToUpdate.has(floatKey)) {
          pairsToUpdate.add(floatKey);
          pairsList.push({
            from: fromCrypto.id,
            to: toCrypto.id,
            isFixedRate: false,
          });
        }
      }
    }

    // Also check existing pairs - if stale, add to update list
    for (const pair of existingPairs) {
      const stale = await areLimitsStale(pair.from, pair.to, pair.isFixedRate, 10);
      if (stale) {
        const key = `${pair.from}:${pair.to}:${pair.isFixedRate}`;
        if (!pairsToUpdate.has(key)) {
          pairsToUpdate.add(key);
          pairsList.push(pair);
        }
      }
    }

    console.log(`📊 [Cron] Updating limits for ${pairsList.length} currency pairs...`);

    let successCount = 0;
    let errorCount = 0;

    // Fetch and update limits for each pair (with rate limiting)
    // Process in batches to avoid overwhelming NOWPayments API
    const batchSize = 5;
    for (let i = 0; i < pairsList.length; i += batchSize) {
      const batch = pairsList.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (pair) => {
          try {
            const limits = await getExchangeLimits(pair.from, pair.to, pair.isFixedRate);
            await upsertExchangeLimits(pair.from, pair.to, pair.isFixedRate, limits);
            successCount++;
          } catch (error: any) {
            console.error(`❌ [Cron] Failed to update limits for ${pair.from}->${pair.to} (${pair.isFixedRate ? 'fixed' : 'float'}):`, error.message);
            errorCount++;
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < pairsList.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ [Cron] Exchange limits update complete: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      updated: successCount,
      errors: errorCount,
      total: pairsList.length,
    });
  } catch (error: any) {
    console.error('❌ [Cron] Exchange limits update failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update exchange limits',
      },
      { status: 500 }
    );
  }
}

