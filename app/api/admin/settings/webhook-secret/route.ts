import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNotMaintenanceMode } from '@/lib/maintenance-mode';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();

    const newSecret = crypto.randomBytes(32).toString('hex');

    await supabaseAdmin!
      .from('exchange_settings')
      .upsert({
        key: 'webhook_secret_rotation',
        value: { 
          new_secret: newSecret,
          rotated_at: new Date().toISOString(),
          rotated_by: admin.adminId,
        },
        updated_by: admin.adminId,
      }, { onConflict: 'key' });

    const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'rotate_webhook_secret', 'system', {
      details: { rotated: true },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook secret rotated. Update your environment variable.',
      secret: newSecret,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Rotate webhook secret error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

