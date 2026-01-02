import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/db-admin-logs';
import { getOrderByPaymentId, updateOrderStatus } from '@/lib/db-orders';
import { checkWebhookIdempotency, recordWebhookIdempotency } from '@/lib/db-orders';
import { type InternalStatus } from '@/lib/status-mapping';

function mapPaymentStatusToOrderStatus(paymentStatus: string): string {
  const statusMap: Record<string, string> = {
    'waiting': 'NEW',
    'confirming': 'CONFIRMING',
    'confirmed': 'PENDING',
    'sending': 'EXCHANGE',
    'partially_paid': 'PENDING',
    'finished': 'DONE',
    'success': 'DONE',
    'failed': 'EXPIRED',
    'expired': 'EXPIRED',
    'refunded': 'EXPIRED'
  };
  return statusMap[paymentStatus?.toLowerCase()] || 'NEW';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('super_admin');

    // Get webhook record
    const { data: webhook, error: webhookError } = await supabaseAdmin!
      .from('webhook_idempotency')
      .select('*')
      .eq('id', params.id)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Find order
    const order = await getOrderByPaymentId(webhook.payment_id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found for this payment' },
        { status: 404 }
      );
    }

    // Check idempotency (but allow replay for super admin)
    const alreadyProcessed = await checkWebhookIdempotency(webhook.payment_id, webhook.payment_status);
    
    // Map status
    const mappedStatus = mapPaymentStatusToOrderStatus(webhook.payment_status) as InternalStatus;

    // Update order status (idempotency is handled in updateOrderStatus)
    const previousState = { status: order.status };
    const updatedOrder = await updateOrderStatus(
      order.orderId,
      mappedStatus,
      undefined,
      {
        source: 'webhook',
        paymentStatus: webhook.payment_status,
        skipTransitionCheck: false, // Still respect state guards
      }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Record idempotency if not already recorded
    if (!alreadyProcessed) {
      await recordWebhookIdempotency(webhook.payment_id, webhook.payment_status, order.orderId);
    }

    // Log admin action
    await logAdminAction(admin.adminId, 'replay_webhook', 'webhook', {
      resourceId: params.id,
      details: {
        payment_id: webhook.payment_id,
        order_id: order.orderId,
        payment_status: webhook.payment_status,
        mapped_status: mappedStatus,
        was_already_processed: alreadyProcessed,
      },
      previousState,
      newState: { status: mappedStatus },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook replayed successfully',
      order_id: order.orderId,
      status: mappedStatus,
      was_already_processed: alreadyProcessed,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Replay webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

