/**
 * Cron run visibility: record last success/failure per endpoint for alerting.
 * Required so cron and email queue failures are not silent.
 */

import { supabaseAdmin } from './supabase';

const STALE_SUCCESS_MINUTES = 15;
const EMAIL_BACKLOG_ALERT_THRESHOLD = 100;

export async function recordCronSuccess(endpoint: string): Promise<void> {
  if (!supabaseAdmin) return;
  const now = new Date().toISOString();
  await supabaseAdmin.from('cron_runs').upsert(
    {
      endpoint,
      last_success_at: now,
      last_error: null,
      last_run_at: now,
      updated_at: now,
    },
    { onConflict: 'endpoint' }
  );
}

export async function recordCronFailure(endpoint: string, errorMessage: string): Promise<void> {
  if (!supabaseAdmin) return;
  const now = new Date().toISOString();
  await supabaseAdmin.from('cron_runs').upsert(
    {
      endpoint,
      last_error: errorMessage,
      last_run_at: now,
      updated_at: now,
    },
    { onConflict: 'endpoint' }
  );
}

/** Log error when no successful run for this endpoint in > N minutes */
export async function alertIfCronStale(endpoint: string): Promise<void> {
  if (!supabaseAdmin) return;
  const { data } = await supabaseAdmin.from('cron_runs').select('last_success_at').eq('endpoint', endpoint).single();
  if (!data?.last_success_at) return;
  const last = new Date(data.last_success_at).getTime();
  const stale = Date.now() - last > STALE_SUCCESS_MINUTES * 60 * 1000;
  if (stale) {
    console.error(`[Cron] ALERT: No successful run for ${endpoint} in > ${STALE_SUCCESS_MINUTES} minutes`);
  }
}

export async function getPendingEmailCount(): Promise<number> {
  if (!supabaseAdmin) return 0;
  const { count, error } = await supabaseAdmin
    .from('email_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

/** Log error when email backlog exceeds threshold */
export function alertIfEmailBacklog(count: number): void {
  if (count >= EMAIL_BACKLOG_ALERT_THRESHOLD) {
    console.error(`[Cron] ALERT: Email queue backlog = ${count} (threshold ${EMAIL_BACKLOG_ALERT_THRESHOLD})`);
  }
}
