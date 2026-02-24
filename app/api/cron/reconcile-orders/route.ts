import { NextRequest, NextResponse } from 'next/server';
import { runOrderReconciliation, runManualPayoutAutoComplete } from '@/lib/order-reconciliation';
import { recordCronSuccess, recordCronFailure, alertIfCronStale } from '@/lib/cron-runs';

const ENDPOINT = '/api/cron/reconcile-orders';

function cronLog(event: string, details?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: 'info',
      message: event,
      timestamp: new Date().toISOString(),
      source: 'cron_reconcile_orders',
      endpoint: ENDPOINT,
      ...details,
    })
  );
}

/**
 * Cron: Webhook failure recovery + manual payout auto-complete.
 * Compatible with external cron (e.g. cron-job.org): use GET or POST with Authorization: Bearer CRON_SECRET.
 * Idempotent and safe to run every 5 minutes.
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

  cronLog('cron_request_received', { method: request.method });

  try {
    await alertIfCronStale(ENDPOINT);

    cronLog('reconciliation_started');
    const result = await runOrderReconciliation({
      olderThanMinutes: 15,
      paidStaleMinutes: 25,
      limit: 50,
    });

    cronLog('manual_auto_complete_started');
    const manualResult = await runManualPayoutAutoComplete({
      limit: 50,
    });
    cronLog('manual_auto_complete_executed', {
      processed: manualResult.processed,
      skipped: manualResult.skipped,
      errors: manualResult.errors,
      processedOrderIds: manualResult.processedOrderIds,
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
    if (manualResult.processed > 0 || manualResult.errors > 0) {
      console.log('[Cron] manual-payout-auto-complete:', {
        processed: manualResult.processed,
        skipped: manualResult.skipped,
        errors: manualResult.errors,
        processedOrderIds: manualResult.processedOrderIds,
        errorOrderIds: manualResult.errorOrderIds,
      });
    }

    await recordCronSuccess(ENDPOINT);
    cronLog('cron_completed', {
      reconcile_processed: result.processed,
      reconcile_errors: result.errors,
      manual_processed: manualResult.processed,
      manual_errors: manualResult.errors,
    });
    return NextResponse.json({
      success: true,
      reconcile: {
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        processedOrderIds: result.processedOrderIds,
        errorOrderIds: result.errorOrderIds,
      },
      manualAutoComplete: {
        processed: manualResult.processed,
        skipped: manualResult.skipped,
        errors: manualResult.errors,
        processedOrderIds: manualResult.processedOrderIds,
        errorOrderIds: manualResult.errorOrderIds,
      },
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
