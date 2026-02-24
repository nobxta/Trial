import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { getPaymentStatus } from '@/lib/nowpayments';
import { supabaseAdmin } from '@/lib/supabase';
import { updateOrderStatus } from '@/lib/db-orders';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('operator');

    const { data: order } = await supabaseAdmin!
      .from('orders')
      .select('*')
      .eq('payment_id', params.id)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const previousState = {
      status: order.status,
      payment_id: order.payment_id,
    };

    const paymentStatus = await getPaymentStatus(params.id);

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
      'refunded': 'EXPIRED',
    };

    let mappedStatus = statusMap[paymentStatus.payment_status?.toLowerCase()] || order.status;
    if (order.payout_mode === 'manual' && mappedStatus === 'DONE') {
      mappedStatus = 'PAYMENT_CONFIRMED';
    }

    if (mappedStatus !== order.status) {
      await updateOrderStatus(order.order_id, mappedStatus, undefined, {
        source: 'admin',
        skipTransitionCheck: true,
      });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'verify_payment', 'payment', {
      resourceId: params.id,
      previousState,
      newState: { status: mappedStatus, payment_status: paymentStatus.payment_status },
      details: { payment_id: params.id, provider_status: paymentStatus.payment_status },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      payment: paymentStatus,
      order_status: mappedStatus,
      status_changed: mappedStatus !== order.status,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

