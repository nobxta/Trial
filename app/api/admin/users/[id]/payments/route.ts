import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get orders for this user, then get payment IDs
    const { data: orders } = await supabaseAdmin!
      .from('orders')
      .select('payment_id, payment_id')
      .eq('user_id', params.id)
      .not('payment_id', 'is', null);

    const paymentIds = (orders || []).map(o => o.payment_id).filter(Boolean);

    if (paymentIds.length === 0) {
      return NextResponse.json({
        payments: [],
        total: 0,
        limit,
        offset,
      });
    }

    // Get orders with payment info
    let query = supabaseAdmin!
      .from('orders')
      .select('order_id, payment_id, status, from_currency, from_amount, to_currency, to_amount, from_network, to_network, created_at, updated_at')
      .eq('user_id', params.id)
      .not('payment_id', 'is', null)
      .order('created_at', { ascending: false });

    query = query.range(offset, offset + limit - 1);

    const { data: payments, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Get total count
    const { count } = await supabaseAdmin!
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', params.id)
      .not('payment_id', 'is', null);

    return NextResponse.json({
      payments: (payments || []).map(p => ({
        payment_id: p.payment_id,
        order_id: p.order_id,
        status: p.status,
        from_currency: p.from_currency,
        from_amount: p.from_amount,
        to_currency: p.to_currency,
        to_amount: p.to_amount,
        from_network: p.from_network,
        to_network: p.to_network,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
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
    console.error('Get user payments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

