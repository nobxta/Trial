import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import {
  getPublicBaseUrl,
  getNowPaymentsLiveIpnSecret,
  getNowPaymentsSandboxIpnSecret,
} from '@/lib/env';

/** Mask a URL for display: show start and end of host, hide middle. */
function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (host.length <= 16) return `${u.origin}${u.pathname}`;
    const start = host.slice(0, 8);
    const end = host.slice(-6);
    return `${u.protocol}//${start}***${end}${u.pathname}`;
  } catch {
    return '(invalid URL)';
  }
}

/**
 * GET /api/admin/system/webhook-diagnostics
 * Returns safe webhook config for debugging (no secrets).
 */
export async function GET() {
  try {
    await requireAdminRole('viewer');

    const baseUrl = getPublicBaseUrl();
    const expectedWebhookPath = '/api/webhook/nowpayments';
    const expectedFullUrl = `${baseUrl}${expectedWebhookPath}`;

    return NextResponse.json({
      expectedWebhookUrl: maskUrl(expectedFullUrl),
      expectedWebhookPath,
      publicBaseUrlConfigured: !!baseUrl && !baseUrl.includes('localhost'),
      ipnSecretLiveSet: !!getNowPaymentsLiveIpnSecret(),
      ipnSecretSandboxSet: !!getNowPaymentsSandboxIpnSecret(),
      hint: 'If order status does not update after payment, see docs/WEBHOOK_DEBUGGING.md and check server logs for webhook_received / signature_invalid / order_not_found.',
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Webhook diagnostics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
