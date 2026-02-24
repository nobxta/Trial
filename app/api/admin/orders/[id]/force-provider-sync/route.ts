import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getOrderByOrderId, processWebhookStatusUpdateAtomic } from '@/lib/db-orders';
import { getPaymentStatus } from '@/lib/nowpayments';
import { mapProviderStatusToInternal, getUserFacingStatus } from '@/lib/status-mapping';
import { notifyOrderStatus } from '@/lib/notifications';
import { paymentLogger } from '@/lib/payment-logger';

/**
 * POST /api/admin/orders/[id]/force-provider-sync
 *
 * Mandatory runtime test (Step 4): Call NOWPayments GET payment, log raw response,
 * apply processWebhookStatusUpdateAtomic immediately, return old vs new status.
 * If provider returns "finished" but new_internal_status is unchanged, the bug is in DB transition logic.
 */
export async function POST(
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
    const oldInternalStatus = order.internalStatus || order.status;

    let rawProviderResponse: Record<string, unknown>;
    let providerStatus: string;
    try {
      const raw = await getPaymentStatus(paymentIdStr, modeToUse);
      rawProviderResponse = raw as unknown as Record<string, unknown>;
      providerStatus = (rawProviderResponse.payment_status as string) ?? '';
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

    // Log raw provider response for proof
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'force_provider_sync_raw_response',
        timestamp: new Date().toISOString(),
        source: 'force_provider_sync',
        order_id: params.id,
        raw_provider_response: rawProviderResponse,
      })
    );

    let mappedStatus = mapProviderStatusToInternal(providerStatus);
    if (order.payoutMode === 'manual' && mappedStatus === 'DONE') {
      mappedStatus = 'PAYMENT_CONFIRMED';
    }
    const result = await processWebhookStatusUpdateAtomic({
      paymentId: paymentIdStr,
      paymentStatus: providerStatus,
      orderId: order.orderId,
      internalStatus: mappedStatus,
      userStatus: getUserFacingStatus(mappedStatus),
      providerStatus,
      statusSource: 'admin',
      fromAddress: (rawProviderResponse.pay_address ?? rawProviderResponse.payin_address) as string | undefined,
      payinHash: rawProviderResponse.payin_hash as string | undefined,
      payoutHash: rawProviderResponse.payout_hash as string | undefined,
    });

    const updatedOrder = result.alreadyProcessed ? order : result.order;
    const newInternalStatus = updatedOrder.internalStatus || updatedOrder.status;

    const notificationStatuses = ['CONFIRMING', 'PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'DONE', 'EXPIRED'];
    if (!result.alreadyProcessed && notificationStatuses.includes(newInternalStatus)) {
      notifyOrderStatus(order.userId, order.orderId, newInternalStatus.toLowerCase(), request).catch((err) => {
        console.error('[force-provider-sync] notifyOrderStatus failed:', err?.message ?? err);
      });
    }

    return NextResponse.json({
      old_internal_status: oldInternalStatus,
      provider_status: providerStatus,
      new_internal_status: newInternalStatus,
      already_processed: result.alreadyProcessed,
      raw_provider_response: rawProviderResponse,
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Force provider sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
