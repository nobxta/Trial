import { NextRequest, NextResponse } from 'next/server';
import { runOrderReconciliation } from '@/lib/order-reconciliation';
import { recordCronSuccess, recordCronFailure, alertIfCronStale } from '@/lib/cron-runs';

const ENDPOINT = '/api/cron/reconcile-orders';

/**
 * Cron: Webhook failure recovery.
 * Security: In production CRON_SECRET must exist and be non-empty; fail closed.
 */
async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET missing in production');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await alertIfCronStale(ENDPOINT);
    const result = await runOrderReconciliation({
      olderThanMinutes: 15,
      paidStaleMinutes: 25, // After ~25 min in Exchanging, check provider and set DONE if finished
      limit: 50,
    });

    if (result.processed > 0 || result.errors > 0) {
      console.log('[Cron] reconcile-orders:', {
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        processedOrderIds: result.processedOrderIds,
        errorOrderIds: result.errorOrderIds,
      });
    }

    await recordCronSuccess(ENDPOINT);
    return NextResponse.json({
      success: true,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors,
      processedOrderIds: result.processedOrderIds,
      errorOrderIds: result.errorOrderIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] reconcile-orders error:', error);
    await recordCronFailure(ENDPOINT, error?.message ?? 'Reconciliation failed');
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Reconciliation failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
