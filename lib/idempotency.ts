import { supabaseAdmin } from './supabase';
import { DbError, wrapDbError, isNotFoundError, isUniqueViolation } from './db-errors';

/**
 * Atomic idempotency claim: INSERT ... ON CONFLICT DO NOTHING RETURNING id.
 * Only the caller that successfully inserts may execute side effects; all others must exit.
 * Required to prevent duplicate side effects under concurrent webhook delivery.
 */
export async function tryClaimIdempotency(scope: string, key: string): Promise<boolean> {
  if (!supabaseAdmin) {
    throw new DbError('Database not configured', { context: 'idempotency.tryClaimIdempotency' });
  }
  const { data, error } = await supabaseAdmin.rpc('try_claim_idempotency', {
    p_scope: scope,
    p_key: key,
  });
  if (error) throw wrapDbError(error, `idempotency.tryClaimIdempotency(${scope}:${key})`);
  return data === true;
}

/**
 * Check if an action with the given scope and key has already been executed.
 * Returns true if already executed, false if first time.
 * Throws DbError on real DB failures (no silent fail).
 * Prefer tryClaimIdempotency for any path that runs side effects (email, ledger).
 */
export async function hasRun(scope: string, key: string): Promise<boolean> {
  if (!supabaseAdmin) {
    throw new DbError('Database not configured', { context: 'idempotency.hasRun' });
  }

  const { data, error } = await supabaseAdmin
    .from('idempotency_keys')
    .select('id')
    .eq('scope', scope)
    .eq('key', key)
    .limit(1)
    .single();

  if (error) {
    if (isNotFoundError(error.code)) return false; // Not run yet (valid outcome)
    throw wrapDbError(error, `idempotency.hasRun(${scope}:${key})`);
  }

  return !!data;
}

/**
 * Mark an action as executed (idempotent).
 * Throws DbError on real DB failures. Returns true on success; returns true when
 * duplicate (23505) as that means already marked (business result).
 * Prefer tryClaimIdempotency for side-effect paths.
 */
export async function markRun(scope: string, key: string): Promise<boolean> {
  if (!supabaseAdmin) {
    throw new DbError('Database not configured', { context: 'idempotency.markRun' });
  }

  const { error } = await supabaseAdmin
    .from('idempotency_keys')
    .insert({ scope, key })
    .select()
    .single();

  if (error) {
    if (isUniqueViolation(error.code)) return true; // Already exists (expected in concurrent scenarios)
    throw wrapDbError(error, `idempotency.markRun(${scope}:${key})`);
  }

  return true;
}

/**
 * Check and mark in two steps (race-prone). Use tryClaimIdempotency for order_status_email and ledger.
 */
export async function checkAndMark(scope: string, key: string): Promise<boolean> {
  const alreadyRun = await hasRun(scope, key);
  if (alreadyRun) {
    return false; // Already executed
  }

  const marked = await markRun(scope, key);
  return marked;
}
