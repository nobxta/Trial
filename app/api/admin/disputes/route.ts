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

    // Filter out live_chat disputes without actual issues
    const validDisputes = await Promise.all(
      (disputes || []).map(async (dispute: any) => {
        // For live_chat type, check if it has an actual issue
        if (dispute.type === 'live_chat') {
          // Check if description is the default placeholder
          if (dispute.description === 'Live chat conversation') {
            return null; // Filter out chats without issues
          }
          
          // Also check if there are user messages with actual content (not just greetings)
          const { data: messages } = await supabaseAdmin!
            .from('dispute_messages')
            .select('message, sender')
            .eq('dispute_id', dispute.id)
            .eq('sender', 'user')
            .order('created_at', { ascending: true });
          
          if (!messages || messages.length === 0) {
            return null; // No user messages, filter out
          }
          
          // Check if all messages are just greetings
          const greetings = ['hi', 'hello', 'hey', 'hi there', 'hello there', 'hey there'];
          const hasNonGreeting = messages.some((msg: any) => {
            const msgLower = msg.message.toLowerCase().trim();
            return msgLower.length > 10 && !greetings.some(g => msgLower.includes(g));
          });
          
          if (!hasNonGreeting) {
            return null; // Only greetings, filter out
          }
        }
        
        return dispute;
      })
    );

    // Filter out null values
    const filteredDisputes = validDisputes.filter((d: any) => d !== null);

    // Get unread counts for each valid dispute
    const disputesWithUnread = await Promise.all(
      filteredDisputes.map(async (dispute: any) => {
        const unreadCount = await getUnreadCount(dispute.id, 'admin');
        return {
          ...dispute,
          unread_count: unreadCount,
        };
      })
    );

    // Count calculation: Get all disputes first, then filter
    // For accurate count, we need to apply the same filtering logic
    let allDisputesQuery = supabaseAdmin!
      .from('disputes')
      .select('id, type, description');

    if (status) {
      allDisputesQuery = allDisputesQuery.eq('status', status);
    }
    if (orderId) {
      allDisputesQuery = allDisputesQuery.ilike('order_id', `%${orderId}%`);
    }

    const { data: allDisputes } = await allDisputesQuery;

    // Filter out live_chat disputes without issues (same logic as above)
    const validDisputeIds = await Promise.all(
      (allDisputes || []).map(async (dispute: any) => {
        if (dispute.type === 'live_chat') {
          if (dispute.description === 'Live chat conversation') {
            return null;
          }
          
          const { data: messages } = await supabaseAdmin!
            .from('dispute_messages')
            .select('message')
            .eq('dispute_id', dispute.id)
            .eq('sender', 'user')
            .limit(5);
          
          if (!messages || messages.length === 0) {
            return null;
          }
          
          const greetings = ['hi', 'hello', 'hey', 'hi there', 'hello there', 'hey there'];
          const hasNonGreeting = messages.some((msg: any) => {
            const msgLower = msg.message.toLowerCase().trim();
            return msgLower.length > 10 && !greetings.some(g => msgLower.includes(g));
          });
          
          if (!hasNonGreeting) {
            return null;
          }
        }
        return dispute.id;
      })
    );

    const count = validDisputeIds.filter((id: any) => id !== null).length;

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

