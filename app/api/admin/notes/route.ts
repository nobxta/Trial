import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('operator');
    const { entity_type, entity_id, note } = await request.json();

    if (!note || note.trim() === '') {
      return NextResponse.json(
        { error: 'Note is required' },
        { status: 400 }
      );
    }

    if (!entity_type || !entity_id) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }

    let insertData: any = {
      admin_id: admin.adminId,
      note: note.trim(),
    };

    if (entity_type === 'user') {
      insertData.user_id = entity_id;
    } else if (entity_type === 'order') {
      insertData.order_id = entity_id;
    } else {
      return NextResponse.json(
        { error: 'Invalid entity_type. Must be "user" or "order"' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from('admin_notes')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, `add_${entity_type}_note`, entity_type, {
      resourceId: entity_id,
      details: { note_id: data.id },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, note: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Add note error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

