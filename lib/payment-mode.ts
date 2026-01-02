import { supabaseAdmin } from './supabase';

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

export type PaymentMode = 'live' | 'sandbox';

/**
 * Get current payment mode
 * Default: 'live' (production mode)
 */
export async function getPaymentMode(): Promise<PaymentMode> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('exchange_settings')
    .select('value')
    .eq('key', 'payment_mode')
    .single();

  if (error || !data) {
    return 'live'; // Default to live (production)
  }

  const mode = (data.value as any)?.mode;
  return (mode === 'sandbox' ? 'sandbox' : 'live') as PaymentMode;
}

/**
 * Set payment mode
 */
export async function setPaymentMode(mode: PaymentMode, adminId: string): Promise<void> {
  checkSupabase();
  
  if (mode !== 'live' && mode !== 'sandbox') {
    throw new Error('Invalid payment mode. Must be "live" or "sandbox"');
  }
  
  const { error } = await supabaseAdmin!
    .from('exchange_settings')
    .upsert({
      key: 'payment_mode',
      value: { mode },
      updated_by: adminId,
    }, {
      onConflict: 'key',
    });

  if (error) {
    throw new Error(`Failed to set payment mode: ${error.message}`);
  }
}

/**
 * Check if sandbox mode is enabled
 */
export async function isSandboxMode(): Promise<boolean> {
  const mode = await getPaymentMode();
  return mode === 'sandbox';
}

/**
 * Check if live mode is enabled
 */
export async function isLiveMode(): Promise<boolean> {
  const mode = await getPaymentMode();
  return mode === 'live';
}

