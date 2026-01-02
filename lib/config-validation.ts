/**
 * Configuration validation - runs at startup
 * Prevents runtime errors by catching missing config early
 */

export function validateConfig() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // CRITICAL: NOWPayments API Key
  const nowpaymentsKey = process.env.NOWPAYMENTS_API_KEY || process.env.NEXT_PUBLIC_NOWPAYMENTS_API_KEY;
  if (!nowpaymentsKey || nowpaymentsKey.trim() === '') {
    errors.push('NOWPAYMENTS_API_KEY is required. Set it in .env.local');
  }

  // CRITICAL: JWT Secret in production
  const jwtSecret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!jwtSecret || jwtSecret === 'your-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a secure random string in production. Do not use the default value.');
    }
  } else {
    // Warning in development
    if (!jwtSecret || jwtSecret === 'your-secret-key-change-in-production') {
      warnings.push('JWT_SECRET is using default value. Change it before deploying to production.');
    }
  }

  // CRITICAL: Supabase configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    errors.push('Supabase configuration is required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn('');
  }

  // Throw errors (crashes app if critical config missing)
  if (errors.length > 0) {
    console.error('\n❌ Configuration Errors (app will not start):');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nPlease fix these errors and restart the application.\n');
    throw new Error(`Configuration validation failed: ${errors.join('; ')}`);
  }

  // Success message
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Configuration validated successfully');
  }
}

// Run validation on module load (server-side only)
if (typeof window === 'undefined') {
  try {
    validateConfig();
  } catch (error) {
    // In production, we want the app to crash if config is invalid
    // In development, we can be more lenient
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.error('Configuration validation failed (non-fatal in development):', error);
    }
  }
}

