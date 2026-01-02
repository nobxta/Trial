import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('super_admin'); // Only Super Admin can block

    const { reason } = await request.json();

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'Block reason is required' },
        { status: 400 }
      );
    }

    // Get current user state
    const { data: currentUser } = await supabaseAdmin!
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Block user
    const { data: updatedUser, error } = await supabaseAdmin!
      .from('users')
      .update({
        blocked: true,
        blocked_at: new Date().toISOString(),
        blocked_by: admin.adminId,
        block_reason: reason.trim(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'block_user', 'user', {
      resourceId: params.id,
      previousState: { blocked: currentUser.blocked || false },
      newState: { blocked: true, blocked_at: updatedUser.blocked_at, block_reason: reason },
      details: { reason },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Block user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('super_admin'); // Only Super Admin can unblock

    // Get current user state
    const { data: currentUser } = await supabaseAdmin!
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Unblock user
    const { data: updatedUser, error } = await supabaseAdmin!
      .from('users')
      .update({
        blocked: false,
        blocked_at: null,
        blocked_by: null,
        block_reason: null,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'unblock_user', 'user', {
      resourceId: params.id,
      previousState: { blocked: currentUser.blocked || false },
      newState: { blocked: false },
      details: {},
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Unblock user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

