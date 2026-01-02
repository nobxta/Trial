import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { updateAdminUser, deleteAdminUser } from '@/lib/db-admin';
import { logAdminAction } from '@/lib/db-admin-logs';
import { requireNotMaintenanceMode } from '@/lib/maintenance-mode';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();

    const updates = await request.json();

    if (updates.role && !['viewer', 'operator', 'super_admin'].includes(updates.role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const updated = await updateAdminUser(params.id, {
      email: updates.email,
      role: updates.role,
      password: updates.password,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'update_admin_user', 'admin_user', {
      resourceId: params.id,
      details: { email: updates.email, role: updates.role, password_changed: !!updates.password },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, admin: updated });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Update admin user error:', error);
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
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();

    if (params.id === admin.adminId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const deleted = await deleteAdminUser(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'delete_admin_user', 'admin_user', {
      resourceId: params.id,
      details: { deleted: true },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Delete admin user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

