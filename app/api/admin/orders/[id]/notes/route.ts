import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('operator');
    const { note } = await request.json();

    if (!note || note.trim() === '') {
      return NextResponse.json(
        { error: 'Note is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin!
      .from('admin_notes')
      .insert({
        order_id: params.id,
        admin_id: admin.adminId,
        note: note.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'add_order_note', 'order', {
      resourceId: params.id,
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

