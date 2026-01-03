import { NextRequest, NextResponse } from 'next/server';
import { getExchangeLimits, ExchangeLimits } from '@/lib/nowpayments';
import { getCryptoById } from '@/lib/supported-cryptos';
import {
  getExchangeLimitsFromCache,
  upsertExchangeLimits,
  areLimitsStale,
  getExchangeLimitsWithFallback,
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
  } catch (error: any) {
    // Suppress errors for unsupported pairs (400 errors) - these are expected
    // Only log unexpected errors (500+)
    const isUnsupportedPair = error.statusCode === 400 || error.isUnsupportedPair;
    if (!isUnsupportedPair) {
      console.error(`Background limit refresh error for ${currencyFrom}->${currencyTo}:`, error);
    }
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

    // Prevent same currency exchanges (check by symbol, not just ID)
    // e.g., USDT TRC20 -> USDT ERC20 should be blocked
    if (sendCrypto.symbol === receiveCrypto.symbol) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot exchange ${sendCrypto.symbol} to ${receiveCrypto.symbol} (same currency)`,
          isUnsupportedPair: true,
        },
        { status: 400 }
      );
    }

    const isFixedRate = isFixedRateParam === 'true';

    // Check if we have cached limits (to determine if result is cached)
    const cachedLimits = await getExchangeLimitsFromCache(currencyFrom, currencyTo, isFixedRate);
    const stale = cachedLimits ? await areLimitsStale(currencyFrom, currencyTo, isFixedRate, 10) : false;
    
    // If stale, refresh in background (don't wait for it)
    // This ensures fresh limits for the next request while returning cached data instantly
    if (stale && cachedLimits) {
      // Refresh asynchronously (fire and forget)
      refreshLimitsInBackground(currencyFrom, currencyTo, isFixedRate).catch(err => {
        console.error('Background limit refresh failed:', err);
      });
    }

    // Use the new function that checks DB first, then fetches from API if not found
    try {
      const limits = await getExchangeLimitsWithFallback(currencyFrom, currencyTo, isFixedRate);
      const wasCached = cachedLimits !== null;

      return NextResponse.json({
        success: true,
        limits,
        cached: wasCached,
        stale: stale,
        last_updated: cachedLimits?.updatedAt,
      });
    } catch (error: any) {
      // API call failed
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

