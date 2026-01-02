import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrderByOrderId } from '@/lib/db-orders';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminRole('viewer');

    const order = await getOrderByOrderId(params.id);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get status history
    const { data: history } = await supabaseAdmin!
      .from('order_status_history')
      .select('*')
      .eq('order_id', params.id)
      .order('created_at', { ascending: true });

    // Get webhook events
    const { data: webhooks } = await supabaseAdmin!
      .from('webhook_idempotency')
      .select('*')
      .eq('order_id', params.id)
      .order('processed_at', { ascending: false });

    // Get admin notes
    const { data: notes } = await supabaseAdmin!
      .from('admin_notes')
      .select('*, admin_users(email)')
      .eq('order_id', params.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      order,
      history: history || [],
      webhooks: webhooks || [],
      notes: notes || [],
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

