import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';

export async function GET() {
  try {
    await requireAdminRole('super_admin');

    return NextResponse.json({
      environment: process.env.NODE_ENV || 'development',
      supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      // Live mode credentials
      nowpaymentsApiKeyLiveConfigured: !!process.env.NOWPAYMENTS_API_KEY_LIVE || !!process.env.NOWPAYMENTS_API_KEY,
      nowpaymentsIpnSecretLiveConfigured: !!process.env.NOWPAYMENTS_IPN_SECRET_LIVE || !!process.env.NOWPAYMENTS_IPN_SECRET,
      // Sandbox mode credentials
      nowpaymentsApiKeySandboxConfigured: !!process.env.NOWPAYMENTS_API_KEY_SANDBOX,
      nowpaymentsIpnSecretSandboxConfigured: !!process.env.NOWPAYMENTS_IPN_SECRET_SANDBOX,
      // Legacy (for backward compatibility)
      nowpaymentsApiKeyConfigured: !!process.env.NOWPAYMENTS_API_KEY,
      nowpaymentsIpnSecretConfigured: !!process.env.NOWPAYMENTS_IPN_SECRET,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

