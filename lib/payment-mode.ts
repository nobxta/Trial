import { supabaseAdmin } from './supabase';
import type { SandboxCase } from './sandbox-case';
import { ALLOWED_SANDBOX_CASES } from './sandbox-case';

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
 * Get sandbox case from admin settings (exchange_settings).
 * Used when payment mode is sandbox to simulate success/failed/expired/partially_paid.
 * Default: 'success'.
 */
export async function getSandboxCase(): Promise<SandboxCase> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('exchange_settings')
    .select('value')
    .eq('key', 'sandbox_case')
    .single();

  if (error || !data) {
    return 'success';
  }

  const raw = (data.value as any)?.case;
  const normalized = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  if (ALLOWED_SANDBOX_CASES.includes(normalized as SandboxCase)) {
    return normalized as SandboxCase;
  }
  return 'success';
}

/**
 * Set sandbox case (admin-controlled). Only relevant when payment mode is sandbox.
 */
export async function setSandboxCase(sandboxCase: SandboxCase, adminId: string): Promise<void> {
  checkSupabase();
  
  if (!ALLOWED_SANDBOX_CASES.includes(sandboxCase)) {
    throw new Error(
      `Invalid sandbox case. Must be one of: ${ALLOWED_SANDBOX_CASES.join(', ')}`
    );
  }
  
  const { error } = await supabaseAdmin!
    .from('exchange_settings')
    .upsert({
      key: 'sandbox_case',
      value: { case: sandboxCase },
      updated_by: adminId,
    }, {
      onConflict: 'key',
    });

  if (error) {
    throw new Error(`Failed to set sandbox case: ${error.message}`);
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

