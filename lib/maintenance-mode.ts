import { supabaseAdmin } from './supabase';

function checkSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  checkSupabase();
  
  const { data, error } = await supabaseAdmin!
    .from('exchange_settings')
    .select('value')
    .eq('key', 'maintenance_mode')
    .single();

  if (error || !data) {
    return false; // Default to false if not set
  }

  return (data.value as any)?.enabled === true;
}

/**
 * Set maintenance mode
 */
export async function setMaintenanceMode(enabled: boolean, adminId: string): Promise<void> {
  checkSupabase();
  
  const { error } = await supabaseAdmin!
    .from('exchange_settings')
    .upsert({
      key: 'maintenance_mode',
      value: { enabled },
      updated_by: adminId,
    }, {
      onConflict: 'key',
    });

  if (error) {
    throw new Error(`Failed to set maintenance mode: ${error.message}`);
  }
}

/**
 * Middleware to check maintenance mode and block writes
 */
export async function requireNotMaintenanceMode(): Promise<void> {
  const maintenanceMode = await isMaintenanceMode();
  if (maintenanceMode) {
    throw new Error('System is in maintenance mode. All write operations are disabled.');
  }
}

