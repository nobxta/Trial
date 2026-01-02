import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const email = searchParams.get('email');

    let query = supabaseAdmin!
      .from('users')
      .select('id, email, email_verified, created_at, blocked')
      .order('created_at', { ascending: false });

    if (email) {
      query = query.ilike('email', `%${email}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: users, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Get order counts, volumes, and last order date for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const { data: orders } = await supabaseAdmin!
          .from('orders')
          .select('from_amount, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const totalOrders = orders?.length || 0;
        const totalVolume = (orders || []).reduce((sum, o) => sum + parseFloat(o.from_amount), 0);
        const lastOrderDate = orders && orders.length > 0 ? orders[0].created_at : null;

        // Check if flagged
        const { data: flagged } = await supabaseAdmin!
          .from('flagged_users')
          .select('id, reason, resolved_at')
          .eq('user_id', user.id)
          .is('resolved_at', null)
          .limit(1);

        // Check if blocked
        const isBlocked = user.blocked || false;

        // Risk indicator: flagged = high, high activity (>10 orders) = medium, normal = low
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (flagged && flagged.length > 0) {
          riskLevel = 'high';
        } else if (totalOrders > 10) {
          riskLevel = 'medium';
        }

        return {
          ...user,
          totalOrders,
          totalVolume,
          lastOrderDate,
          flagged: flagged && flagged.length > 0,
          blocked: isBlocked,
          riskLevel,
        };
      })
    );

    // Get total count
    let countQuery = supabaseAdmin!.from('users').select('*', { count: 'exact', head: true });
    if (email) {
      countQuery = countQuery.ilike('email', `%${email}%`);
    }
    const { count } = await countQuery;

    return NextResponse.json({
      users: usersWithStats,
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
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

