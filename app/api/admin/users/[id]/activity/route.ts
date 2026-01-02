import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('viewer');

    // Get login logs (last 50)
    const { data: loginLogs } = await supabaseAdmin!
      .from('user_login_logs')
      .select('*')
      .eq('user_id', params.id)
      .order('login_at', { ascending: false })
      .limit(50);

    // Get activity logs (last 100)
    const { data: activityLogs } = await supabaseAdmin!
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get unique IPs
    const uniqueIPs = loginLogs 
      ? [...new Set(loginLogs.map(log => log.ip_address).filter(Boolean))]
      : [];

    // Get unique countries
    const uniqueCountries = loginLogs
      ? [...new Set(loginLogs.map(log => log.country).filter(Boolean))]
      : [];

    return NextResponse.json({
      loginLogs: loginLogs || [],
      activityLogs: activityLogs || [],
      uniqueIPs,
      uniqueCountries,
      totalLogins: loginLogs?.length || 0,
      totalActivities: activityLogs?.length || 0,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get user activity error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

