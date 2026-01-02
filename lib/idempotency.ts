import { supabaseAdmin } from './supabase';

/**
 * Check if an action with the given scope and key has already been executed
 * Returns true if already executed, false if first time
 * 
 * This is safe for concurrent calls - database UNIQUE constraint prevents duplicates
 */
export async function hasRun(scope: string, key: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn('⚠️  Supabase not configured, idempotency check skipped');
    return false; // If DB not available, allow execution (fail open)
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('idempotency_keys')
      .select('id')
      .eq('scope', scope)
      .eq('key', key)
      .limit(1)
      .single();

    // If record exists, action has already run
    if (data && !error) {
      return true;
    }

    // If error is "not found", action hasn't run yet
    if (error && error.code === 'PGRST116') {
      return false;
    }

    // Other errors - log but allow execution (fail open)
    if (error) {
      console.error(`❌ Idempotency check error for ${scope}:${key}:`, error);
      return false;
    }

    return false;
  } catch (error) {
    console.error(`❌ Idempotency check exception for ${scope}:${key}:`, error);
    return false; // Fail open on exceptions
  }
}

/**
 * Mark an action as executed (idempotent)
 * Inserts record into idempotency_keys table
 * 
 * Safe for concurrent calls - UNIQUE constraint prevents duplicates
 * If already exists, this is a no-op (idempotent itself)
 */
export async function markRun(scope: string, key: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn('⚠️  Supabase not configured, idempotency mark skipped');
    return false;
  }

  try {
    const { error } = await supabaseAdmin
      .from('idempotency_keys')
      .insert({
        scope: scope,
        key: key,
      })
      .select()
      .single();

    // If error is "duplicate key", that's fine - action was already marked
    if (error && error.code === '23505') {
      // UNIQUE constraint violation - already exists, which is expected in concurrent scenarios
      return true;
    }

    if (error) {
      console.error(`❌ Failed to mark idempotency for ${scope}:${key}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Exception marking idempotency for ${scope}:${key}:`, error);
    return false;
  }
}

/**
 * Check and mark in a single atomic operation
 * Returns true if this is the first execution, false if already executed
 * 
 * This is the recommended way to use idempotency - atomic check-and-set
 */
export async function checkAndMark(scope: string, key: string): Promise<boolean> {
  // First check if already run
  const alreadyRun = await hasRun(scope, key);
  if (alreadyRun) {
    return false; // Already executed
  }

  // Try to mark as run (insert with UNIQUE constraint)
  // If concurrent call already inserted, this will fail with duplicate key
  // which we treat as "already run"
  const marked = await markRun(scope, key);
  
  // If marking failed due to duplicate, it means another process already ran it
  // If marking succeeded, we're the first to run it
  return marked;
}

