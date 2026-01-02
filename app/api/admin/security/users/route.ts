import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getAllAdminUsers, createAdminUser } from '@/lib/db-admin';
import { logAdminAction } from '@/lib/db-admin-logs';
import { requireNotMaintenanceMode } from '@/lib/maintenance-mode';

export async function GET() {
  try {
    await requireAdminRole('super_admin');
    const admins = await getAllAdminUsers();
    return NextResponse.json({ admins });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();

    const { email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    if (!['viewer', 'operator', 'super_admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const newAdmin = await createAdminUser({
      email,
      password,
      role: role as 'viewer' | 'operator' | 'super_admin',
    });

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'create_admin_user', 'admin_user', {
      resourceId: newAdmin.id,
      details: { email, role },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Admin user with this email already exists' },
        { status: 400 }
      );
    }
    console.error('Create admin user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
