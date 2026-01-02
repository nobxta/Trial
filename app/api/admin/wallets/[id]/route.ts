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

    const updates = await request.json();

    const { data: current } = await supabaseAdmin!
      .from('wallets')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!current) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (updates.balance !== undefined) updateData.balance = updates.balance;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.label !== undefined) updateData.label = updates.label;

    const { data, error } = await supabaseAdmin!
      .from('wallets')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'update_wallet', 'wallet', {
      resourceId: params.id,
      previousState: current,
      newState: data,
      details: updates,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, wallet: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Update wallet error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();

    const { data: current } = await supabaseAdmin!
      .from('wallets')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!current) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin!
      .from('wallets')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'delete_wallet', 'wallet', {
      resourceId: params.id,
      previousState: current,
      details: { deleted: true },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Delete wallet error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

