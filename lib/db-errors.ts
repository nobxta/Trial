/**
 * Shared error wrapper for database calls. Use so callers can handle failures explicitly
 * and never treat DB errors as "null/empty" success.
 */

/** Supabase/PostgREST "no rows" for .single() / .maybeSingle() */
export const PGRST_NO_ROWS = 'PGRST116';

/** Postgres unique constraint violation */
export const PG_UNIQUE_VIOLATION = '23505';

/**
 * Typed database error. Thrown on real DB failures (connection, constraint, etc.).
 * Not thrown for "not found" (PGRST116) when that is a valid outcome.
 */
export class DbError extends Error {
  readonly code?: string;
  readonly context?: string;
  readonly cause?: unknown;

  constructor(message: string, options?: { code?: string; context?: string; cause?: unknown }) {
    super(message);
    this.name = 'DbError';
    this.code = options?.code;
    this.context = options?.context;
    this.cause = options?.cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DbError);
    }
  }
}

/**
 * Wrap a Supabase/PostgREST error into a DbError. Use after checking for expected
 * codes (e.g. PGRST116 = not found, 23505 = duplicate).
 */
export function wrapDbError(
  err: { message?: string; code?: string; details?: string },
  context: string
): DbError {
  const message = err?.message ?? 'Database operation failed';
  return new DbError(message, {
    code: err?.code,
    context,
    cause: err,
  });
}

/** Return true if the error code means "no rows" (valid for get-by-id style queries). */
export function isNotFoundError(code: string | undefined): boolean {
  return code === PGRST_NO_ROWS;
}

/** Return true if the error code is a unique constraint violation. */
export function isUniqueViolation(code: string | undefined): boolean {
  return code === PG_UNIQUE_VIOLATION;
}
