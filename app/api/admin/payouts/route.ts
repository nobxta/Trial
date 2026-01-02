import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const orderId = searchParams.get('orderId');

    let query = supabaseAdmin!
      .from('payouts')
      .select('*, wallets(address, label), admin_users(email)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (orderId) {
      query = query.ilike('order_id', `%${orderId}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: payouts, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    let countQuery = supabaseAdmin!
      .from('payouts')
      .select('*', { count: 'exact', head: true });

    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    if (orderId) {
      countQuery = countQuery.ilike('order_id', `%${orderId}%`);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      payouts: payouts || [],
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
    console.error('Get payouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    const payoutData = await request.json();

    const { data, error } = await supabaseAdmin!
      .from('payouts')
      .insert({
        order_id: payoutData.order_id || null,
        wallet_id: payoutData.wallet_id || null,
        network: payoutData.network,
        currency: payoutData.currency,
        amount: payoutData.amount,
        recipient_address: payoutData.recipient_address,
        status: 'pending',
        initiated_by: admin.adminId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, payout: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Create payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

