import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientIP } from '@/lib/ip-blocking';

/**
 * Delete all user data - COMPLETE DELETION
 * This will delete:
 * - User account
 * - All orders
 * - All addresses
 * - All disputes/chats
 * - All affiliate data
 * - All referrals
 * - All notes
 * - All activity logs
 * - All login logs
 * 
 * WARNING: This is irreversible!
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('super_admin'); // Only super admins can delete user data

    const userId = params.id;

    // Get user info before deletion for logging
    const { data: user } = await supabaseAdmin!
      .from('users')
      .select('email, created_at')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Confirm deletion (in production, you might want additional confirmation)
    const body = await request.json();
    const confirmDelete = body.confirm === true;

    if (!confirmDelete) {
      return NextResponse.json(
        { error: 'Deletion must be confirmed' },
        { status: 400 }
      );
    }

    // Delete in order (respecting foreign key constraints)
    // Note: Due to CASCADE deletes, some of these may be automatic
    
    // 1. Delete dispute messages (via disputes CASCADE)
    // 2. Delete disputes (will cascade to messages)
    await supabaseAdmin!.from('disputes').delete().eq('user_id', userId);
    
    // 3. Delete referrals (will cascade from affiliates)
    // 4. Delete affiliates
    await supabaseAdmin!.from('affiliates').delete().eq('user_id', userId);
    
    // 5. Delete addresses
    await supabaseAdmin!.from('addresses').delete().eq('user_id', userId);
    
    // 6. Delete orders (will cascade to related data)
    await supabaseAdmin!.from('orders').delete().eq('user_id', userId);
    
    // 7. Delete admin notes
    await supabaseAdmin!.from('admin_notes').delete().eq('user_id', userId);
    
    // 8. Delete flagged users
    await supabaseAdmin!.from('flagged_users').delete().eq('user_id', userId);
    
    // 9. Delete user activity logs
    await supabaseAdmin!.from('user_activity_logs').delete().eq('user_id', userId);
    
    // 10. Delete user login logs
    await supabaseAdmin!.from('user_login_logs').delete().eq('user_id', userId);
    
    // 11. Finally, delete the user account
    const { error: deleteError } = await supabaseAdmin!
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'delete_user_all_data', 'user', {
      resourceId: userId,
      previousState: { email: user.email, created_at: user.created_at },
      newState: { deleted: true },
      details: {
        deleted_at: new Date().toISOString(),
        deleted_by: admin.adminId,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'All user data deleted successfully',
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Delete user data error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

