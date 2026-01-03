import { NextRequest, NextResponse } from 'next/server';
import { fetchAndSaveAllExchangeLimits, FetchAllLimitsResult } from '@/lib/db-exchange-limits';

/**
 * POST /api/exchange/limits/sync
 * Fetches and saves all exchange limits for all enabled currency pairs from NowPayments API
 * 
 * Query parameters:
 * - is_fixed_rate: 'true' or 'false' (optional, default: 'false')
 * - delay: Delay in milliseconds between requests (optional, default: 100)
 * - skip_same_symbol: 'true' or 'false' - Skip pairs with same symbol (optional, default: 'true')
 * 
 * This endpoint can take a long time to complete depending on the number of currency pairs.
 * It's recommended to run this as a background job or cron task.
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isFixedRateParam = searchParams.get('is_fixed_rate');
    const delayParam = searchParams.get('delay');
    const skipSameSymbolParam = searchParams.get('skip_same_symbol');

    const isFixedRate = isFixedRateParam === 'true';
    const delay = delayParam ? parseInt(delayParam, 10) : 100;
    const skipSameSymbol = skipSameSymbolParam !== 'false'; // Default to true

    // Validate delay
    if (delay < 0 || delay > 5000) {
      return NextResponse.json(
        { error: 'delay must be between 0 and 5000 milliseconds' },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting bulk exchange limits sync (isFixedRate: ${isFixedRate}, delay: ${delay}ms, skipSameSymbol: ${skipSameSymbol})...`);

    // Start the sync process
    const result: FetchAllLimitsResult = await fetchAndSaveAllExchangeLimits(isFixedRate, {
      delayBetweenRequests: delay,
      skipSameSymbol,
    });

    return NextResponse.json({
      success: true,
      result: {
        total: result.total,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
      },
      message: `Sync completed: ${result.success} successful, ${result.failed} failed out of ${result.total} total pairs`,
    });
  } catch (error: any) {
    console.error('Exchange limits sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync exchange limits',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/exchange/limits/sync
 * Returns information about the sync endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/exchange/limits/sync',
    method: 'POST',
    description: 'Fetches and saves all exchange limits for all enabled currency pairs from NowPayments API',
    queryParameters: {
      is_fixed_rate: 'true or false (optional, default: false)',
      delay: 'Delay in milliseconds between requests (optional, default: 100)',
      skip_same_symbol: 'Skip pairs with same symbol (optional, default: true)',
    },
    note: 'This endpoint can take a long time to complete. It is recommended to run this as a background job or cron task.',
  });
}

