import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { isMaintenanceMode, setMaintenanceMode } from '@/lib/maintenance-mode';
import { logAdminAction } from '@/lib/db-admin-logs';

export async function GET() {
  try {
    await requireAdminRole('viewer');
    const enabled = await isMaintenanceMode();
    return NextResponse.json({ maintenanceMode: enabled });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get maintenance mode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    const { enabled } = await request.json();

    await setMaintenanceMode(enabled, admin.adminId);

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, enabled ? 'enable_maintenance' : 'disable_maintenance', 'system', {
      details: { enabled },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, maintenanceMode: enabled });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Set maintenance mode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

