import { supabaseAdmin } from './supabase';

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

export type PayoutMode = 'manual' | 'automatic';

/**
 * Get current payout mode
 * Default: 'manual' (safest mode)
 */
export async function getPayoutMode(): Promise<PayoutMode> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('exchange_settings')
    .select('value')
    .eq('key', 'payout_mode')
    .single();

  if (error || !data) {
    return 'manual'; // Default to manual (safest)
  }

  const mode = (data.value as any)?.mode;
  return (mode === 'automatic' ? 'automatic' : 'manual') as PayoutMode;
}

/**
 * Set payout mode
 */
export async function setPayoutMode(mode: PayoutMode, adminId: string): Promise<void> {
  checkSupabase();
  
  if (mode !== 'manual' && mode !== 'automatic') {
    throw new Error('Invalid payout mode. Must be "manual" or "automatic"');
  }
  
  const { error } = await supabaseAdmin!
    .from('exchange_settings')
    .upsert({
      key: 'payout_mode',
      value: { mode },
      updated_by: adminId,
    }, {
      onConflict: 'key',
    });

  if (error) {
    throw new Error(`Failed to set payout mode: ${error.message}`);
  }
}

/**
 * Check if automatic payouts are enabled
 */
export async function isAutomaticPayoutEnabled(): Promise<boolean> {
  const mode = await getPayoutMode();
  return mode === 'automatic';
}

