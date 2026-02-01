import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getEnvPresence, getNodeEnv } from '@/lib/env';

export async function GET() {
  try {
    await requireAdminRole('super_admin');

    const presence = getEnvPresence();
    return NextResponse.json({
      environment: getNodeEnv(),
      supabaseConfigured: presence.supabaseConfigured,
      nowpaymentsApiKeyLiveConfigured: presence.nowpaymentsApiKeyLiveConfigured,
      nowpaymentsIpnSecretLiveConfigured: presence.nowpaymentsIpnSecretLiveConfigured,
      nowpaymentsApiKeySandboxConfigured: presence.nowpaymentsApiKeySandboxConfigured,
      nowpaymentsIpnSecretSandboxConfigured: presence.nowpaymentsIpnSecretSandboxConfigured,
      nowpaymentsApiKeyConfigured: presence.nowpaymentsApiKeyLiveConfigured,
      nowpaymentsIpnSecretConfigured: presence.nowpaymentsIpnSecretLiveConfigured,
      smtpConfigured: presence.smtpConfigured,
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

