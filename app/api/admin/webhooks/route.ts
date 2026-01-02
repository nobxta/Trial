import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const paymentId = searchParams.get('paymentId');
    const orderId = searchParams.get('orderId');
    const paymentStatus = searchParams.get('paymentStatus');

    let query = supabaseAdmin!
      .from('webhook_idempotency')
      .select('*')
      .order('processed_at', { ascending: false });

    if (paymentId) {
      query = query.ilike('payment_id', `%${paymentId}%`);
    }
    if (orderId) {
      query = query.ilike('order_id', `%${orderId}%`);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Get total count
    let countQuery = supabaseAdmin!.from('webhook_idempotency').select('*', { count: 'exact', head: true });
    if (paymentId) {
      countQuery = countQuery.ilike('payment_id', `%${paymentId}%`);
    }
    if (orderId) {
      countQuery = countQuery.ilike('order_id', `%${orderId}%`);
    }
    if (paymentStatus) {
      countQuery = countQuery.eq('payment_status', paymentStatus);
    }
    const { count } = await countQuery;

    return NextResponse.json({
      webhooks: data || [],
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
    console.error('Get webhooks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

