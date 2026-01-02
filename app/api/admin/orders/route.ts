import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');

    let query = supabaseAdmin!
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (orderId) {
      query = query.ilike('order_id', `%${orderId}%`);
    }
    if (paymentId) {
      query = query.ilike('payment_id', `%${paymentId}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Get total count
    let countQuery = supabaseAdmin!.from('orders').select('*', { count: 'exact', head: true });
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    const { count } = await countQuery;

    return NextResponse.json({
      orders: data || [],
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
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

