/**
 * Centralized environment validation and access.
 *
 * SECURITY: All required secrets MUST be set via environment variables.
 * Defaults are FORBIDDEN for secrets in production because:
 * - Defaults would be committed to code and leak via source/git.
 * - Anyone deploying without configuring env would get a known secret.
 * - Rotation would require code change instead of env change.
 *
 * This module fails fast on first import (server-side) if any required
 * variable is missing, so the app never runs with invalid config.
 */

const isServer = typeof window === 'undefined';
const isProduction = process.env.NODE_ENV === 'production';

/** Forbidden placeholder; using it in production would allow token forgery. */
const JWT_PLACEHOLDER = 'your-secret-key-change-in-production';

/** Cached values after successful validation (server only). */
let cached: {
  JWT_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  PUBLIC_BASE_URL: string;
  NOWPAYMENTS_API_KEY_LIVE: string;
  NOWPAYMENTS_IPN_SECRET_LIVE: string;
  NOWPAYMENTS_API_KEY_SANDBOX: string;
  NOWPAYMENTS_IPN_SECRET_SANDBOX: string;
  NOWPAYMENTS_API_URL: string;
  SMTP: { host: string; port: number; secure: boolean; user: string; pass: string } | null;
} | null = null;

/**
 * Validates all required environment variables. Throws on first server-side load if invalid.
 * Never references .env.local or any file path—config must come from environment.
 */
function validateEnv(): void {
  if (!isServer) return;

  const errors: string[] = [];

  // --- JWT_SECRET ---
  // Defaults are forbidden: a default would be in source code and allow anyone to forge tokens.
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (isProduction) {
    if (!jwtSecret || jwtSecret === JWT_PLACEHOLDER) {
      errors.push(
        'JWT_SECRET must be set to a secure random string in production. Defaults are forbidden (would allow token forgery).'
      );
    }
  } else if (!jwtSecret || jwtSecret === JWT_PLACEHOLDER) {
    console.warn(
      '⚠️  JWT_SECRET is unset or using placeholder. Set a secure value before deploying to production.'
    );
  }

  // --- Supabase ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required. Set it in your environment.');
  }
  if (!supabaseServiceKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required. Defaults are forbidden (would expose DB).');
  }
  if (!supabaseAnonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for the client. Set it in your environment.');
  }

  // --- NOWPayments (at least live mode required) ---
  const npApiLive =
    process.env.NOWPAYMENTS_API_KEY_LIVE?.trim() || process.env.NOWPAYMENTS_API_KEY?.trim();
  const npIpnLive =
    process.env.NOWPAYMENTS_IPN_SECRET_LIVE?.trim() || process.env.NOWPAYMENTS_IPN_SECRET?.trim();
  if (isProduction) {
    if (!npApiLive) {
      errors.push(
        'NOWPAYMENTS_API_KEY or NOWPAYMENTS_API_KEY_LIVE is required in production. Defaults are forbidden (would allow payment abuse).'
      );
    }
    if (!npIpnLive) {
      errors.push(
        'NOWPAYMENTS_IPN_SECRET or NOWPAYMENTS_IPN_SECRET_LIVE is required in production. Defaults are forbidden (would allow fake webhooks).'
      );
    }
  }

  // --- SMTP (required in production so verification and notifications work) ---
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS;
  if (isProduction) {
    if (!smtpUser || !smtpPass) {
      errors.push(
        'SMTP_USER and SMTP_PASS are required in production. Defaults are forbidden (would expose or misuse email).'
      );
    }
  }

  // --- PUBLIC_BASE_URL (required in production for webhooks; no localhost when deployed) ---
  const publicBaseUrl = process.env.PUBLIC_BASE_URL?.trim();
  const isDeployedEnv = typeof process.env.VERCEL === 'string' || typeof process.env.VERCEL_URL === 'string';
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  if (isProduction && !isBuildPhase) {
    if (!publicBaseUrl) {
      errors.push(
        'PUBLIC_BASE_URL is required in production (e.g. https://yourdomain.com). Webhooks need a public URL.'
      );
    } else if (
      isDeployedEnv &&
      publicBaseUrl &&
      (publicBaseUrl.includes('localhost') ||
        publicBaseUrl.includes('127.0.0.1') ||
        publicBaseUrl.includes('ngrok'))
    ) {
      errors.push(
        'PUBLIC_BASE_URL must be your production URL in production. localhost/ngrok are not allowed.'
      );
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('\nConfigure these in your deployment environment (e.g. Vercel project settings).\n');
    throw new Error(`Environment validation failed: ${errors.join('; ')}`);
  }

  // Cache validated values so we never re-read process.env for secrets.
  const portRaw = process.env.SMTP_PORT?.trim();
  const port = portRaw ? parseInt(portRaw, 10) : 587;
  const secure = port === 465 || process.env.SMTP_SECURE === 'true';
  const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';

  const buildTimeBaseUrl =
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://placeholder.vercel.app';
  cached = {
    JWT_SECRET: jwtSecret || JWT_PLACEHOLDER,
    SUPABASE_URL: supabaseUrl || '',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey || '',
    SUPABASE_ANON_KEY: supabaseAnonKey || '',
    PUBLIC_BASE_URL: isProduction
      ? (publicBaseUrl || (isBuildPhase ? buildTimeBaseUrl : ''))
      : (publicBaseUrl || process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'),
    NOWPAYMENTS_API_KEY_LIVE: npApiLive || '',
    NOWPAYMENTS_IPN_SECRET_LIVE: npIpnLive || '',
    NOWPAYMENTS_API_KEY_SANDBOX:
      process.env.NOWPAYMENTS_API_KEY_SANDBOX?.trim() || '',
    NOWPAYMENTS_IPN_SECRET_SANDBOX:
      process.env.NOWPAYMENTS_IPN_SECRET_SANDBOX?.trim() || '',
    NOWPAYMENTS_API_URL:
      process.env.NOWPAYMENTS_API_URL?.trim() || 'https://api.nowpayments.io/v1',
    SMTP:
      smtpUser && smtpPass
        ? { host: smtpHost, port: Number.isNaN(port) ? 587 : port, secure, user: smtpUser, pass: smtpPass }
        : null,
  };
}

if (isServer) {
  try {
    validateEnv();
  } catch (e) {
    if (isProduction) throw e;
    console.error('Environment validation failed (non-fatal in development):', e);
    // In dev, still populate cache with what we have so app can try to run
    cached = {
      JWT_SECRET: process.env.JWT_SECRET?.trim() || JWT_PLACEHOLDER,
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
      PUBLIC_BASE_URL:
        process.env.PUBLIC_BASE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        'http://localhost:3000',
      NOWPAYMENTS_API_KEY_LIVE:
        process.env.NOWPAYMENTS_API_KEY_LIVE?.trim() || process.env.NOWPAYMENTS_API_KEY?.trim() || '',
      NOWPAYMENTS_IPN_SECRET_LIVE:
        process.env.NOWPAYMENTS_IPN_SECRET_LIVE?.trim() || process.env.NOWPAYMENTS_IPN_SECRET?.trim() || '',
      NOWPAYMENTS_API_KEY_SANDBOX: process.env.NOWPAYMENTS_API_KEY_SANDBOX?.trim() || '',
      NOWPAYMENTS_IPN_SECRET_SANDBOX: process.env.NOWPAYMENTS_IPN_SECRET_SANDBOX?.trim() || '',
      NOWPAYMENTS_API_URL:
        process.env.NOWPAYMENTS_API_URL?.trim() || 'https://api.nowpayments.io/v1',
      SMTP:
        process.env.SMTP_USER?.trim() && process.env.SMTP_PASS
          ? {
              host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
              port: parseInt(process.env.SMTP_PORT || '587', 10) || 587,
              secure:
                parseInt(process.env.SMTP_PORT || '587', 10) === 465 ||
                process.env.SMTP_SECURE === 'true',
              user: process.env.SMTP_USER!,
              pass: process.env.SMTP_PASS,
            }
          : null,
    };
  }
}

function getCache() {
  if (!isServer) return null;
  if (!cached) validateEnv();
  return cached;
}

// --- Public getters (server-only for secrets) ---

export function getJwtSecret(): string {
  const c = getCache();
  if (!c) throw new Error('Environment is not available on the client.');
  return c.JWT_SECRET;
}

export function getSupabaseUrl(): string {
  const c = getCache();
  if (!c) return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return c.SUPABASE_URL;
}

export function getSupabaseServiceRoleKey(): string {
  const c = getCache();
  if (!c) return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return c.SUPABASE_SERVICE_ROLE_KEY;
}

export function getSupabaseAnonKey(): string {
  const c = getCache();
  if (!c) return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return c.SUPABASE_ANON_KEY;
}

export function getPublicBaseUrl(): string {
  const c = getCache();
  if (!c) return process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return c.PUBLIC_BASE_URL;
}

export function getNowPaymentsLiveApiKey(): string {
  const c = getCache();
  if (!c) return process.env.NOWPAYMENTS_API_KEY_LIVE || process.env.NOWPAYMENTS_API_KEY || '';
  return c.NOWPAYMENTS_API_KEY_LIVE;
}

export function getNowPaymentsLiveIpnSecret(): string {
  const c = getCache();
  if (!c) return process.env.NOWPAYMENTS_IPN_SECRET_LIVE || process.env.NOWPAYMENTS_IPN_SECRET || '';
  return c.NOWPAYMENTS_IPN_SECRET_LIVE;
}

export function getNowPaymentsSandboxApiKey(): string {
  const c = getCache();
  if (!c) return process.env.NOWPAYMENTS_API_KEY_SANDBOX || '';
  return c.NOWPAYMENTS_API_KEY_SANDBOX;
}

export function getNowPaymentsSandboxIpnSecret(): string {
  const c = getCache();
  if (!c) return process.env.NOWPAYMENTS_IPN_SECRET_SANDBOX || '';
  return c.NOWPAYMENTS_IPN_SECRET_SANDBOX;
}

export function getNowPaymentsApiUrl(): string {
  const c = getCache();
  if (!c) return process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1';
  return c.NOWPAYMENTS_API_URL;
}

export function getSmptConfig(): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
} | null {
  const c = getCache();
  if (!c) {
    if (!isServer) return null;
    const u = process.env.SMTP_USER?.trim();
    const p = process.env.SMTP_PASS;
    if (!u || !p) return null;
    const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
    return {
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port,
      secure: port === 465 || process.env.SMTP_SECURE === 'true',
      user: u,
      pass: p,
    };
  }
  return c.SMTP;
}

export function getNodeEnv(): string {
  return process.env.NODE_ENV || 'development';
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** For admin/settings: whether each optional/env-dependent value is configured (no secrets). */
export function getEnvPresence(): {
  supabaseConfigured: boolean;
  nowpaymentsApiKeyLiveConfigured: boolean;
  nowpaymentsIpnSecretLiveConfigured: boolean;
  nowpaymentsApiKeySandboxConfigured: boolean;
  nowpaymentsIpnSecretSandboxConfigured: boolean;
  smtpConfigured: boolean;
} {
  const c = getCache();
  return {
    supabaseConfigured: !!(c?.SUPABASE_URL && c.SUPABASE_SERVICE_ROLE_KEY),
    nowpaymentsApiKeyLiveConfigured: !!c?.NOWPAYMENTS_API_KEY_LIVE,
    nowpaymentsIpnSecretLiveConfigured: !!c?.NOWPAYMENTS_IPN_SECRET_LIVE,
    nowpaymentsApiKeySandboxConfigured: !!c?.NOWPAYMENTS_API_KEY_SANDBOX,
    nowpaymentsIpnSecretSandboxConfigured: !!c?.NOWPAYMENTS_IPN_SECRET_SANDBOX,
    smtpConfigured: !!c?.SMTP,
  };
}
