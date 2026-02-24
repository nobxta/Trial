import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { getExchangeFeeSettings, updateExchangeFeeSettings } from '@/lib/db-exchange-fees';
import { logAdminAction } from '@/lib/db-admin-logs';

/**
 * GET /api/admin/exchange-fees — return current fixed and floating fee percentages.
 */
export async function GET() {
  try {
    await requireAdminRole('viewer');
    const settings = await getExchangeFeeSettings();
    return NextResponse.json({
      success: true,
      fixedFeePercent: settings.fixedFeePercent,
      floatingFeePercent: settings.floatingFeePercent,
      updatedAt: settings.updatedAt,
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Admin exchange fees GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exchange-fees — update fee percentages.
 * Body: { fixedFeePercent?: number, floatingFeePercent?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    const body = await request.json().catch(() => ({}));
    const fixedFeePercent = body.fixedFeePercent != null ? Number(body.fixedFeePercent) : undefined;
    const floatingFeePercent = body.floatingFeePercent != null ? Number(body.floatingFeePercent) : undefined;

    if (fixedFeePercent === undefined && floatingFeePercent === undefined) {
      return NextResponse.json(
        { error: 'Provide at least one of fixedFeePercent or floatingFeePercent' },
        { status: 400 }
      );
    }

    const previous = await getExchangeFeeSettings();
    const updated = await updateExchangeFeeSettings({
      ...(fixedFeePercent !== undefined && { fixedFeePercent }),
      ...(floatingFeePercent !== undefined && { floatingFeePercent }),
    });

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'update_exchange_fees', 'system', {
      details: { fixedFeePercent: updated.fixedFeePercent, floatingFeePercent: updated.floatingFeePercent },
      previousState: { fixedFeePercent: previous.fixedFeePercent, floatingFeePercent: previous.floatingFeePercent },
      newState: { fixedFeePercent: updated.fixedFeePercent, floatingFeePercent: updated.floatingFeePercent },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      fixedFeePercent: updated.fixedFeePercent,
      floatingFeePercent: updated.floatingFeePercent,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes('must be between 0 and 100')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Admin exchange fees POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
