import { supabaseAdmin } from './supabase';

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

/**
 * Get whether order-page polling (GET /api/order/[id] syncing from provider) is enabled.
 * When disabled, the site relies purely on webhooks for status updates.
 * Default: true (polling enabled).
 */
export async function getOrderPollingEnabled(): Promise<boolean> {
  checkSupabase();

  const { data, error } = await supabaseAdmin!
    .from('exchange_settings')
    .select('value')
    .eq('key', 'order_polling_enabled')
    .single();

  if (error || !data) {
    return true; // Default: enable polling
  }

  const value = data.value as { enabled?: boolean } | null;
  return value?.enabled !== false;
}

/**
 * Set order polling enabled/disabled. No redeploy required.
 */
export async function setOrderPollingEnabled(
  enabled: boolean,
  adminId?: string
): Promise<void> {
  checkSupabase();

  const row: Record<string, unknown> = {
    key: 'order_polling_enabled',
    value: { enabled },
  };
  if (adminId) {
    row.updated_by = adminId;
  }

  const { error } = await supabaseAdmin!
    .from('exchange_settings')
    .upsert(row, { onConflict: 'key' });

  if (error) {
    throw new Error(`Failed to set order polling: ${error.message}`);
  }
}
