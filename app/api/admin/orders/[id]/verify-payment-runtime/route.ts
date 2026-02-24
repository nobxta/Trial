import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getOrderByOrderId } from '@/lib/db-orders';
import { getPaymentStatus } from '@/lib/nowpayments';
import { mapProviderStatusToInternal } from '@/lib/status-mapping';
import { paymentLogger } from '@/lib/payment-logger';

/**
 * GET /api/admin/orders/[id]/verify-payment-runtime
 *
 * Runtime verification: call NOWPayments GET /v1/payment/{payment_id} with the
 * order's payment_mode and compare provider response to DB state.
 * Returns full raw provider response and DB snapshot; logs verification result.
 * Use to confirm: payment exists on NOWPayments, correct env (live/sandbox), and status match.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminRole('operator');

    const order = await getOrderByOrderId(params.id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const paymentId = order.paymentId;
    const mode = order.paymentMode;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Order has no payment_id' },
        { status: 400 }
      );
    }

    const paymentIdStr = String(paymentId);
    const modeToUse = mode ?? 'live';

    let providerResponse: Record<string, unknown>;
    try {
      const raw = await getPaymentStatus(paymentIdStr, modeToUse);
      providerResponse = raw as unknown as Record<string, unknown>;
    } catch (err: any) {
      return NextResponse.json(
        {
          error: 'Failed to fetch payment from NOWPayments',
          provider_error: err?.message ?? String(err),
          payment_id_suffix: paymentLogger.maskPaymentId(paymentIdStr),
          mode: modeToUse,
        },
        { status: 502 }
      );
    }

    const providerStatus = (providerResponse.payment_status as string) ?? null;
    const mappedFromProvider = providerStatus
      ? mapProviderStatusToInternal(providerStatus)
      : null;
    const dbInternalStatus = order.internalStatus || order.status;
    const match =
      mappedFromProvider !== null && mappedFromProvider === dbInternalStatus;

    const baseUrl =
      modeToUse === 'sandbox'
        ? 'https://api-sandbox.nowpayments.io/v1'
        : process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1';

    paymentLogger.runtimeVerification({
      order_id: params.id,
      payment_id_suffix: paymentLogger.maskPaymentId(paymentIdStr),
      provider_status: providerStatus,
      db_internal_status: dbInternalStatus,
      payment_mode: modeToUse,
      provider_base_url: baseUrl,
      match,
    });

    return NextResponse.json({
      provider: {
        full_response: providerResponse,
        payment_status: providerStatus,
        mapped_internal_status: mappedFromProvider,
      },
      db: {
        order_id: params.id,
        internal_status: dbInternalStatus,
        payment_mode: order.paymentMode,
        payment_id: paymentIdStr,
      },
      verification: {
        match,
        provider_base_url: baseUrl,
        mode: modeToUse,
      },
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Verify payment runtime error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
