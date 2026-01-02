import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('operator');
    const { reason } = await request.json();

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

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

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'flag_payment', 'payment', {
      resourceId: params.id,
      details: { reason, order_id: order.order_id },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'Payment flagged' });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Flag payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

