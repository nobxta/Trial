import { supabaseAdmin } from './supabase';

/**
 * Cleanup unverified accounts older than 1 hour
 * Call this periodically (e.g., via cron job, scheduled task, or on signup)
 */
export async function cleanupUnverifiedAccounts(): Promise<number> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured, skipping cleanup');
    return 0;
  }

  try {
    // Calculate timestamp for 1 hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Delete unverified users created more than 1 hour ago
    const { data, error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('email_verified', false)
      .lt('created_at', oneHourAgo.toISOString())
      .select();

    if (error) {
      console.error('Cleanup error:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} unverified account(s)`);
    }

    return deletedCount;
  } catch (error) {
    console.error('Cleanup error:', error);
    return 0;
  }
}

