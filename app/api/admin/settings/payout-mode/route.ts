import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getPayoutMode, setPayoutMode } from '@/lib/payout-mode';
import { logAdminAction } from '@/lib/db-admin-logs';

export async function GET() {
  try {
    await requireAdminRole('viewer');
    const mode = await getPayoutMode();
    return NextResponse.json({ payoutMode: mode });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get payout mode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    const { mode } = await request.json();

    if (mode !== 'manual' && mode !== 'automatic') {
      return NextResponse.json(
        { error: 'Invalid payout mode. Must be "manual" or "automatic"' },
        { status: 400 }
      );
    }

    const previousMode = await getPayoutMode();
    await setPayoutMode(mode as 'manual' | 'automatic', admin.adminId);

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'change_payout_mode', 'system', {
      details: { 
        previous_mode: previousMode,
        new_mode: mode 
      },
      previousState: { payoutMode: previousMode },
      newState: { payoutMode: mode },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, payoutMode: mode });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Set payout mode error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

