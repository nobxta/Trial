import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';
import { getPaymentStatus } from '@/lib/nowpayments';

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const paymentId = searchParams.get('paymentId');
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');

    let query = supabaseAdmin!
      .from('orders')
      .select('order_id, payment_id, status, from_currency, from_amount, to_currency, to_amount, from_network, to_network, created_at, updated_at')
      .not('payment_id', 'is', null)
      .order('created_at', { ascending: false });

    if (paymentId) {
      query = query.ilike('payment_id', `%${paymentId}%`);
    }
    if (orderId) {
      query = query.ilike('order_id', `%${orderId}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Get total count
    let countQuery = supabaseAdmin!
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .not('payment_id', 'is', null);
    
    if (paymentId) {
      countQuery = countQuery.ilike('payment_id', `%${paymentId}%`);
    }
    if (orderId) {
      countQuery = countQuery.ilike('order_id', `%${orderId}%`);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;

    const payments = (orders || []).map(order => ({
      payment_id: order.payment_id,
      order_id: order.order_id,
      status: order.status,
      from_currency: order.from_currency,
      from_network: order.from_network,
      from_amount: order.from_amount,
      to_currency: order.to_currency,
      to_network: order.to_network,
      to_amount: order.to_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
    }));

    return NextResponse.json({
      payments,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

