import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminRole('viewer');

    // Get user basic info
    const { data: user, error: userError } = await supabaseAdmin!
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get order stats
    const { data: orders } = await supabaseAdmin!
      .from('orders')
      .select('from_amount, created_at')
      .eq('user_id', params.id);

    const totalOrders = orders?.length || 0;
    const totalVolume = (orders || []).reduce((sum, o) => sum + parseFloat(o.from_amount), 0);
    const lastOrderDate = orders && orders.length > 0 
      ? orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
      : null;

    // Get flagged status
    const { data: flagged } = await supabaseAdmin!
      .from('flagged_users')
      .select('*, admin_users(email)')
      .eq('user_id', params.id)
      .is('resolved_at', null)
      .order('flagged_at', { ascending: false })
      .limit(1);

    // Get disputes count
    const { count: disputesCount } = await supabaseAdmin!
      .from('disputes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', params.id);

    // Get last login
    const { data: lastLogin } = await supabaseAdmin!
      .from('user_login_logs')
      .select('login_at, ip_address, user_agent, country')
      .eq('user_id', params.id)
      .eq('success', true)
      .order('login_at', { ascending: false })
      .limit(1)
      .single();

  // Get admin notes
  const { data: notes } = await supabaseAdmin!
    .from('admin_notes')
    .select('*, admin_users(email)')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false });

    // Risk indicator
    let riskLevel = 'normal';
    if (flagged && flagged.length > 0) {
      riskLevel = 'high';
    } else if (totalOrders > 10) {
      riskLevel = 'medium';
    }

    return NextResponse.json({
      user: {
        ...user,
        totalOrders,
        totalVolume,
        lastOrderDate,
        flagged: flagged && flagged.length > 0,
        flagDetails: flagged && flagged.length > 0 ? flagged[0] : null,
        disputesCount: disputesCount || 0,
        lastLogin: lastLogin || null,
        riskLevel,
        notes: notes || [],
      },
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get user detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

