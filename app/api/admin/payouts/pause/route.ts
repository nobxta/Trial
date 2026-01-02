import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNotMaintenanceMode } from '@/lib/maintenance-mode';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();

    const { action } = await request.json();

    if (action === 'pause') {
      const { error } = await supabaseAdmin!
        .from('exchange_settings')
        .upsert({
          key: 'payouts_paused',
          value: { paused: true },
          updated_by: admin.adminId,
        }, { onConflict: 'key' });

      if (error) throw error;

      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await logAdminAction(admin.adminId, 'pause_payouts', 'system', {
        details: { paused: true },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ success: true, message: 'Payouts paused' });
    }

    if (action === 'resume') {
      const { error } = await supabaseAdmin!
        .from('exchange_settings')
        .upsert({
          key: 'payouts_paused',
          value: { paused: false },
          updated_by: admin.adminId,
        }, { onConflict: 'key' });

      if (error) throw error;

      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await logAdminAction(admin.adminId, 'resume_payouts', 'system', {
        details: { paused: false },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ success: true, message: 'Payouts resumed' });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Payout pause error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

