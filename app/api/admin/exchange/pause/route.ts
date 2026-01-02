import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';
import { setMaintenanceMode } from '@/lib/maintenance-mode';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    const { paused } = await request.json();

    // Use maintenance mode system
    await setMaintenanceMode(paused, admin.adminId);

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, paused ? 'pause_exchange' : 'resume_exchange', 'exchange', {
      details: { paused },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, paused });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Pause exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

