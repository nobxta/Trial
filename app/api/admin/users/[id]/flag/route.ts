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
    const { reason, metadata } = await request.json();

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from('flagged_users')
      .insert({
        user_id: params.id,
        reason: reason.trim(),
        flagged_by: admin.adminId,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'flag_user', 'user', {
      resourceId: params.id,
      details: { reason, flag_id: data.id },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, flag: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Flag user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

