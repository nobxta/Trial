import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { logAdminAction } from '@/lib/db-admin-logs';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNotMaintenanceMode } from '@/lib/maintenance-mode';

export async function GET() {
  try {
    await requireAdminRole('viewer');

    const { data: globalFee } = await supabaseAdmin!
      .from('exchange_settings')
      .select('value')
      .eq('key', 'global_fee_percent')
      .single();

    const { data: feeMultiplier } = await supabaseAdmin!
      .from('exchange_settings')
      .select('value')
      .eq('key', 'emergency_fee_multiplier')
      .single();

    const { data: rateType } = await supabaseAdmin!
      .from('exchange_settings')
      .select('value')
      .eq('key', 'rate_type')
      .single();

    const { data: pairs } = await supabaseAdmin!
      .from('exchange_pairs')
      .select('id, from_currency, to_currency, from_network, to_network, fee_percent')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      globalFeePercent: globalFee?.value || 1.0,
      emergencyFeeMultiplier: feeMultiplier?.value || 1.0,
      rateType: rateType?.value || 'float',
      pairs: pairs || [],
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get rates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    await requireNotMaintenanceMode();

    const { globalFeePercent, emergencyFeeMultiplier, rateType, pairFees } = await request.json();

    const previousState: any = {};
    const newState: any = {};

    if (globalFeePercent !== undefined) {
      const { data: current } = await supabaseAdmin!
        .from('exchange_settings')
        .select('value')
        .eq('key', 'global_fee_percent')
        .single();
      
      previousState.globalFeePercent = current?.value || 1.0;
      newState.globalFeePercent = globalFeePercent;

      await supabaseAdmin!
        .from('exchange_settings')
        .upsert({
          key: 'global_fee_percent',
          value: globalFeePercent,
          updated_by: admin.adminId,
        }, { onConflict: 'key' });
    }

    if (emergencyFeeMultiplier !== undefined) {
      const { data: current } = await supabaseAdmin!
        .from('exchange_settings')
        .select('value')
        .eq('key', 'emergency_fee_multiplier')
        .single();
      
      previousState.emergencyFeeMultiplier = current?.value || 1.0;
      newState.emergencyFeeMultiplier = emergencyFeeMultiplier;

      await supabaseAdmin!
        .from('exchange_settings')
        .upsert({
          key: 'emergency_fee_multiplier',
          value: emergencyFeeMultiplier,
          updated_by: admin.adminId,
        }, { onConflict: 'key' });
    }

    if (rateType !== undefined) {
      const { data: current } = await supabaseAdmin!
        .from('exchange_settings')
        .select('value')
        .eq('key', 'rate_type')
        .single();
      
      previousState.rateType = current?.value || 'float';
      newState.rateType = rateType;

      await supabaseAdmin!
        .from('exchange_settings')
        .upsert({
          key: 'rate_type',
          value: rateType,
          updated_by: admin.adminId,
        }, { onConflict: 'key' });
    }

    if (pairFees && Array.isArray(pairFees)) {
      for (const pairFee of pairFees) {
        await supabaseAdmin!
          .from('exchange_pairs')
          .update({ fee_percent: pairFee.fee_percent })
          .eq('id', pairFee.id);
      }
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAdminAction(admin.adminId, 'update_rates_fees', 'system', {
      previousState,
      newState,
      details: { globalFeePercent, emergencyFeeMultiplier, rateType, pairFees },
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
    console.error('Update rates error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

