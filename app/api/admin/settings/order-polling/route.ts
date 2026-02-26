import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getOrderPollingEnabled, setOrderPollingEnabled } from '@/lib/order-polling-setting';
import { logAdminAction } from '@/lib/db-admin-logs';

export async function GET() {
  try {
    await requireAdminRole('viewer');
    const enabled = await getOrderPollingEnabled();
    return NextResponse.json({ orderPollingEnabled: enabled });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Get order polling setting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    const body = await request.json();
    const enabled = body?.enabled;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid payload. Must be { "enabled": true | false }' },
        { status: 400 }
      );
    }

    const previous = await getOrderPollingEnabled();
    await setOrderPollingEnabled(enabled, admin.adminId);

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'change_order_polling', 'system', {
      details: { previous_enabled: previous, new_enabled: enabled },
      previousState: { orderPollingEnabled: previous },
      newState: { orderPollingEnabled: enabled },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, orderPollingEnabled: enabled });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Set order polling error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
