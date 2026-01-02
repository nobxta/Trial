import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNotMaintenanceMode } from '@/lib/maintenance-mode';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();

    const { status, tx_hash, failed_reason } = await request.json();

    const { data: current } = await supabaseAdmin!
      .from('payouts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!current) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (tx_hash) updateData.tx_hash = tx_hash;
    if (failed_reason) updateData.failed_reason = failed_reason;
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin!
      .from('payouts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'update_payout', 'payout', {
      resourceId: params.id,
      previousState: current,
      newState: data,
      details: { status, tx_hash, failed_reason },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, payout: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Update payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

