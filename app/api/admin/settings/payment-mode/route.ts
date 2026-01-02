import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getPaymentMode, setPaymentMode, type PaymentMode } from '@/lib/payment-mode';
import { logAdminAction } from '@/lib/db-admin-logs';

export async function GET() {
  try {
    await requireAdminRole('viewer');

    const paymentMode = await getPaymentMode();

    return NextResponse.json({
      paymentMode,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get payment mode error:', error);
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

    if (mode !== 'live' && mode !== 'sandbox') {
      return NextResponse.json(
        { error: 'Invalid payment mode. Must be "live" or "sandbox"' },
        { status: 400 }
      );
    }

    const previousMode = await getPaymentMode();
    
    await setPaymentMode(mode as PaymentMode, admin.adminId);

    // Log admin action
    await logAdminAction({
      adminId: admin.adminId,
      action: 'change_payment_mode',
      targetType: 'system',
      targetId: 'payment_mode',
      details: {
        previous_mode: previousMode,
        new_mode: mode,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      paymentMode: mode,
      message: `Payment mode changed to ${mode}`,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Set payment mode error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

