import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';
import { getAllDisputesWithChatInfo, getUnreadCount } from '@/lib/db-chat';

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const orderId = searchParams.get('orderId');

    let query = supabaseAdmin!
      .from('disputes')
      .select('*, orders(order_id, status), users(email), admin_users(email)')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (orderId) {
      query = query.ilike('order_id', `%${orderId}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: disputes, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Get unread counts for each dispute
    const disputesWithUnread = await Promise.all(
      (disputes || []).map(async (dispute: any) => {
        const unreadCount = await getUnreadCount(dispute.id, 'admin');
        return {
          ...dispute,
          unread_count: unreadCount,
        };
      })
    );

    let countQuery = supabaseAdmin!
      .from('disputes')
      .select('*', { count: 'exact', head: true });

    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    if (orderId) {
      countQuery = countQuery.ilike('order_id', `%${orderId}%`);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      disputes: disputesWithUnread,
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
    console.error('Get disputes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('operator');
    const disputeData = await request.json();

    const { data, error } = await supabaseAdmin!
      .from('disputes')
      .insert({
        order_id: disputeData.order_id || null,
        user_id: disputeData.user_id || null,
        title: disputeData.title,
        description: disputeData.description,
        status: 'open',
        priority: disputeData.priority || 'medium',
        refund_required: disputeData.refund_required || false,
        refund_amount: disputeData.refund_amount || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, dispute: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Create dispute error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

