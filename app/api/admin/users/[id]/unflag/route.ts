import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('operator');
    const { reason } = await request.json();

    // Get current flag
    const { data: currentFlag } = await supabaseAdmin!
      .from('flagged_users')
      .select('*')
      .eq('user_id', params.id)
      .is('resolved_at', null)
      .order('flagged_at', { ascending: false })
      .limit(1)
      .single();

    if (!currentFlag) {
      return NextResponse.json(
        { error: 'User is not flagged' },
        { status: 400 }
      );
    }

    // Resolve flag
    const { data: updatedFlag, error } = await supabaseAdmin!
      .from('flagged_users')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: admin.adminId,
      })
      .eq('id', currentFlag.id)
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'unflag_user', 'user', {
      resourceId: params.id,
      previousState: { flagged: true, flag_id: currentFlag.id },
      newState: { flagged: false, resolved_at: updatedFlag.resolved_at },
      details: { reason: reason || 'Flag resolved' },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, flag: updatedFlag });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Unflag user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

