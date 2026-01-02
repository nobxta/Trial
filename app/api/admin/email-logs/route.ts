import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/email-logs
 * Get last 50 email logs from email_queue
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const { data: logs, error } = await supabaseAdmin
      .from('email_queue')
      .select('id, to_email, subject, status, attempts, sent_at, last_error, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch email logs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch email logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    console.error('Get email logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

