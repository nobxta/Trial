import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNotMaintenanceMode } from '@/lib/maintenance-mode';

export async function GET() {
  try {
    await requireAdminRole('viewer');

    const { data, error } = await supabaseAdmin!
      .from('exchange_pairs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ pairs: data || [] });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get exchange pairs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();
    const pairData = await request.json();

    const { data, error } = await supabaseAdmin!
      .from('exchange_pairs')
      .insert({
        from_currency: pairData.fromCurrency,
        from_network: pairData.fromNetwork || null,
        to_currency: pairData.toCurrency,
        to_network: pairData.toNetwork || null,
        enabled: pairData.enabled !== false,
        min_amount: pairData.minAmount || 0,
        max_amount: pairData.maxAmount || null,
        fee_percent: pairData.feePercent || 0,
      })
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'create_exchange_pair', 'exchange_pair', {
      resourceId: data.id,
      details: pairData,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, pair: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Create exchange pair error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();
    const { id, ...updates } = await request.json();

    const updateData: any = {};
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.minAmount !== undefined) updateData.min_amount = updates.minAmount;
    if (updates.maxAmount !== undefined) updateData.max_amount = updates.maxAmount;
    if (updates.feePercent !== undefined) updateData.fee_percent = updates.feePercent;

    const { data, error } = await supabaseAdmin!
      .from('exchange_pairs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'update_exchange_pair', 'exchange_pair', {
      resourceId: id,
      details: updates,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, pair: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Update exchange pair error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

