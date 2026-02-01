import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getPaymentMode, setPaymentMode, getSandboxCase, setSandboxCase, type PaymentMode } from '@/lib/payment-mode';
import { logAdminAction } from '@/lib/db-admin-logs';
import type { SandboxCase } from '@/lib/sandbox-case';

export async function GET() {
  try {
    await requireAdminRole('viewer');

    const [paymentMode, sandboxCase] = await Promise.all([
      getPaymentMode(),
      getSandboxCase(),
    ]);

    return NextResponse.json({
      paymentMode,
      sandboxCase,
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

    const body = await request.json();
    const { mode, sandboxCase: sandboxCaseBody } = body;

    const updates: { paymentMode?: PaymentMode; sandboxCase?: SandboxCase } = {};

    if (mode !== undefined) {
      if (mode !== 'live' && mode !== 'sandbox') {
        return NextResponse.json(
          { error: 'Invalid payment mode. Must be "live" or "sandbox"' },
          { status: 400 }
        );
      }
      updates.paymentMode = mode as PaymentMode;
    }

    const allowedSandboxCases = ['success', 'failed', 'expired', 'partially_paid'] as const;
    if (sandboxCaseBody !== undefined) {
      const normalized = String(sandboxCaseBody).toLowerCase().trim();
      if (!allowedSandboxCases.includes(normalized as SandboxCase)) {
        return NextResponse.json(
          { error: `Invalid sandbox case. Must be one of: ${allowedSandboxCases.join(', ')}` },
          { status: 400 }
        );
      }
      updates.sandboxCase = normalized as SandboxCase;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Provide mode and/or sandboxCase' },
        { status: 400 }
      );
    }

    const previousMode = await getPaymentMode();
    const previousSandboxCase = await getSandboxCase();

    if (updates.paymentMode !== undefined) {
      await setPaymentMode(updates.paymentMode, admin.adminId);
      await logAdminAction(
        admin.adminId,
        'change_payment_mode',
        'system',
        {
          resourceId: 'payment_mode',
          details: {
            previous_mode: previousMode,
            new_mode: updates.paymentMode,
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );
    }

    if (updates.sandboxCase !== undefined) {
      await setSandboxCase(updates.sandboxCase, admin.adminId);
      await logAdminAction(
        admin.adminId,
        'change_sandbox_case',
        'system',
        {
          resourceId: 'sandbox_case',
          details: {
            previous_sandbox_case: previousSandboxCase,
            new_sandbox_case: updates.sandboxCase,
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );
    }

    const resultPaymentMode = updates.paymentMode ?? previousMode;
    const resultSandboxCase = updates.sandboxCase ?? previousSandboxCase;

    return NextResponse.json({
      success: true,
      paymentMode: resultPaymentMode,
      sandboxCase: resultSandboxCase,
      message: updates.paymentMode !== undefined
        ? `Payment mode changed to ${resultPaymentMode}`
        : `Sandbox case set to ${resultSandboxCase}`,
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

