/**
 * Configuration validation - triggers centralized env validation on load.
 * All required env vars are validated in lib/env.ts (fail-fast on server).
 * Do not reference .env.local or any file path; config must come from environment.
 */
import './env';

export function validateConfig(): void {
  // Validation runs when env module is first imported (see lib/env.ts).
  // This export exists for backwards compatibility with code that calls validateConfig().
}
