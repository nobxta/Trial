import { NextRequest, NextResponse } from 'next/server';
import { getExchangeLimits } from '@/lib/nowpayments';
import { upsertExchangeLimits, getUniqueCurrencyPairs, areLimitsStale } from '@/lib/db-exchange-limits';

/**
 * Cron: Refresh exchange limits for cached pairs only (no full matrix).
 * Call via external scheduler (e.g. cron-job.org). See docs/EXTERNAL_CRON_SETUP.md.
 *
 * Strategy:
 * - Only updates pairs that already exist in exchange_limits and are stale.
 * - Does NOT generate all N×N pairs (avoids 6000+ API calls and timeouts).
 * - New pairs are filled on-demand when users request them (getExchangeLimitsWithFallback).
 * - Concurrency cap and per-run pair cap keep execution within serverless limits.
 *
 * Security: Requires Authorization: Bearer CRON_SECRET.
 */

const MAX_PAIRS_PER_RUN = 250;
const CONCURRENCY = 10;

type PairResult = { ok: true } | { ok: false; notConvertible: boolean; message: string };

/** Run at most `concurrency` promises at a time; returns results in same order as items. */
async function runWithLimit<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<PairResult>
): Promise<PairResult[]> {
  const results: PairResult[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
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

    console.log('🔄 [Cron] Starting exchange limits update (stale pairs only)...');

    const existingPairs = await getUniqueCurrencyPairs();
    if (existingPairs.length === 0) {
      console.log('📊 [Cron] No cached pairs yet; nothing to refresh. New pairs are cached on first user request.');
      return NextResponse.json({
        success: true,
        updated: 0,
        errors: 0,
        total: 0,
        message: 'No cached pairs. Limits are filled on-demand.',
      });
    }

    const stalePairs: Array<{ from: string; to: string; isFixedRate: boolean }> = [];
    for (const pair of existingPairs) {
      const stale = await areLimitsStale(pair.from, pair.to, pair.isFixedRate, 60 * 24); // 24h
      if (stale) stalePairs.push(pair);
    }

    const toUpdate = stalePairs.slice(0, MAX_PAIRS_PER_RUN);
    if (toUpdate.length === 0) {
      console.log('✅ [Cron] No stale pairs to update.');
      return NextResponse.json({
        success: true,
        updated: 0,
        errors: 0,
        total: existingPairs.length,
      });
    }

    console.log(`📊 [Cron] Updating ${toUpdate.length} stale pairs (capped at ${MAX_PAIRS_PER_RUN}); ${existingPairs.length} total cached.`);

    const start = Date.now();

    const processOne = async (pair: { from: string; to: string; isFixedRate: boolean }): Promise<PairResult> => {
      try {
        const limits = await getExchangeLimits(pair.from, pair.to, pair.isFixedRate);
        await upsertExchangeLimits(pair.from, pair.to, pair.isFixedRate, limits);
        return { ok: true };
      } catch (error: any) {
        const msg = error?.message ?? '';
        const notConvertible = /not convert(able|ible)/i.test(msg);
        if (!notConvertible) {
          console.error(`❌ [Cron] Failed ${pair.from}->${pair.to} (${pair.isFixedRate ? 'fixed' : 'float'}):`, msg);
        }
        return { ok: false, notConvertible, message: msg };
      }
    };

    const results = await runWithLimit(toUpdate, CONCURRENCY, processOne);

    const successCount = results.filter((r) => r.ok === true).length;
    const errorCount = results.filter((r) => r.ok === false).length;
    const notConvertible = results
      .filter((r): r is { ok: false; notConvertible: true; message: string } => r.ok === false && r.notConvertible)
      .length;

    if (notConvertible > 0) {
      console.warn(`⚠️ [Cron] ${notConvertible} pair(s) not supported by provider (skipped).`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ [Cron] Exchange limits update complete in ${elapsed}s: ${successCount} updated, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      updated: successCount,
      errors: errorCount,
      total: toUpdate.length,
      notConvertibleCount: notConvertible,
      elapsedSeconds: parseFloat(elapsed),
    });
  } catch (error: any) {
    console.error('❌ [Cron] Exchange limits update failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Failed to update exchange limits',
      },
      { status: 500 }
    );
  }
}
