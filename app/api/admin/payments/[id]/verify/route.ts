import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { getPaymentStatus } from '@/lib/nowpayments';
import { supabaseAdmin } from '@/lib/supabase';
import { updateOrderStatus } from '@/lib/db-orders';
import { mapProviderStatusToInternal, type InternalStatus } from '@/lib/status-mapping';

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
      status: order.internal_status || order.status,
      payment_id: order.payment_id,
    };

    if (order.payment_mode !== 'live' && order.payment_mode !== 'sandbox') {
      return NextResponse.json(
        { error: 'Order has no payment_mode set; cannot verify safely' },
        { status: 400 }
      );
    }

    const paymentStatus = await getPaymentStatus(params.id, order.payment_mode);

    let mappedStatus = mapProviderStatusToInternal(paymentStatus.payment_status) as InternalStatus;
    if (order.payout_mode === 'manual' && mappedStatus === 'DONE') {
      mappedStatus = 'PAYMENT_CONFIRMED';
    }

    const currentStatus = order.internal_status || order.status;
    let updatedStatus = currentStatus;
    if (mappedStatus !== currentStatus || order.provider_status !== paymentStatus.payment_status) {
      const updatedOrder = await updateOrderStatus(order.order_id, mappedStatus, {
        providerStatus: paymentStatus.payment_status,
      }, {
        source: 'admin',
        paymentStatus: paymentStatus.payment_status,
        updatedBy: admin.adminId,
      });
      updatedStatus = updatedOrder?.internalStatus || currentStatus;
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'verify_payment', 'payment', {
      resourceId: params.id,
      previousState,
      newState: { status: updatedStatus, payment_status: paymentStatus.payment_status },
      details: { payment_id: params.id, provider_status: paymentStatus.payment_status },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      payment: paymentStatus,
      order_status: updatedStatus,
      provider_mapped_status: mappedStatus,
      status_changed: updatedStatus !== currentStatus,
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

