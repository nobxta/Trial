import { NextRequest, NextResponse } from 'next/server';
import { getExchangeLimits, ExchangeLimits } from '@/lib/nowpayments';
import { getCryptoById } from '@/lib/supported-cryptos';
import {
  getExchangeLimitsFromCache,
  upsertExchangeLimits,
  areLimitsStale,
} from '@/lib/db-exchange-limits';

/**
 * Refresh limits from NOWPayments API and update database cache
 * Called in background when limits are stale
 */
async function refreshLimitsInBackground(
  currencyFrom: string,
  currencyTo: string,
  isFixedRate: boolean
): Promise<void> {
  try {
    const limits = await getExchangeLimits(currencyFrom, currencyTo, isFixedRate);
    await upsertExchangeLimits(currencyFrom, currencyTo, isFixedRate, limits);
  } catch (error) {
    // Log error but don't throw - we'll return cached data
    console.error(`Background limit refresh error for ${currencyFrom}->${currencyTo}:`, error);
  }
}

/**
 * GET /api/exchange/limits
 * Fetches min/max exchange limits for a currency pair from NOWPayments
 * 
 * Query parameters:
 * - send_asset: Asset ID (e.g., 'btc', 'eth')
 * - receive_asset: Asset ID (e.g., 'usdttrc20', 'eth')
 * - is_fixed_rate: 'true' or 'false' (optional, default: 'false')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sendAssetId = searchParams.get('send_asset');
    const receiveAssetId = searchParams.get('receive_asset');
    const isFixedRateParam = searchParams.get('is_fixed_rate');

    if (!sendAssetId || !receiveAssetId) {
      return NextResponse.json(
        { error: 'send_asset and receive_asset query parameters are required' },
        { status: 400 }
      );
    }

    // Get crypto objects to extract NOWPayments currency codes
    const sendCrypto = getCryptoById(sendAssetId);
    const receiveCrypto = getCryptoById(receiveAssetId);

    if (!sendCrypto) {
      return NextResponse.json(
        { error: `Invalid send_asset: ${sendAssetId}` },
        { status: 400 }
      );
    }

    if (!receiveCrypto) {
      return NextResponse.json(
        { error: `Invalid receive_asset: ${receiveAssetId}` },
        { status: 400 }
      );
    }

    // Use the NOWPayments compatible ID directly (already formatted correctly)
    // The id field is already in NOWPayments format (e.g., "btc", "usdttrc20", "etharb")
    const currencyFrom = sendCrypto.id;
    const currencyTo = receiveCrypto.id;

    const isFixedRate = isFixedRateParam === 'true';

    // Check database cache first
    let cachedLimits = await getExchangeLimitsFromCache(currencyFrom, currencyTo, isFixedRate);
    
    // Check if limits are stale (> 10 minutes old)
    const stale = await areLimitsStale(currencyFrom, currencyTo, isFixedRate, 10);
    
    // If stale, refresh in background (don't wait for it)
    // This ensures fresh limits for the next request while returning cached data instantly
    if (stale && cachedLimits) {
      // Refresh asynchronously (fire and forget)
      refreshLimitsInBackground(currencyFrom, currencyTo, isFixedRate).catch(err => {
        console.error('Background limit refresh failed:', err);
      });
    }

    // If we have cached limits (even if stale), return them immediately
    if (cachedLimits) {
      const limits: ExchangeLimits = {
        min_amount: cachedLimits.minAmount,
        max_amount: cachedLimits.maxAmount ?? undefined,
        min_amount_fiat: cachedLimits.minAmountFiat ?? undefined,
        max_amount_fiat: cachedLimits.maxAmountFiat ?? undefined,
      };

      return NextResponse.json({
        success: true,
        limits,
        cached: true,
        stale: stale,
        last_updated: cachedLimits.updatedAt,
      });
    }

    // No cache available - fetch from NOWPayments API
    try {
      const limits = await getExchangeLimits(currencyFrom, currencyTo, isFixedRate);

      // Save to database cache (async, don't wait)
      upsertExchangeLimits(currencyFrom, currencyTo, isFixedRate, limits).catch(err => {
        console.error('Failed to cache limits:', err);
      });

      return NextResponse.json({
        success: true,
        limits,
        cached: false,
      });
    } catch (error: any) {
      // API call failed and no cache available
      console.error('Failed to fetch exchange limits:', error);
      
      // Check if this is an unsupported currency pair (400 from NOWPayments)
      // or a client error (400-499) - return 400 instead of 500
      const statusCode = error.statusCode || (error.isUnsupportedPair ? 400 : 500);
      const isClientError = statusCode >= 400 && statusCode < 500;
      
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to fetch exchange limits from NOWPayments',
        },
        { status: isClientError ? 400 : 500 }
      );
    }
  } catch (error: any) {
    console.error('Exchange limits API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

