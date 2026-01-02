import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network');
    const type = searchParams.get('type');

    let query = supabaseAdmin!
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (network) {
      query = query.eq('network', network);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: wallets, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ wallets: wallets || [] });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Get wallets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRole('super_admin');
    const walletData = await request.json();

    const { data, error } = await supabaseAdmin!
      .from('wallets')
      .insert({
        network: walletData.network,
        currency: walletData.currency,
        address: walletData.address,
        label: walletData.label || null,
        type: walletData.type || 'hot',
        balance: walletData.balance || 0,
        is_active: walletData.is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, wallet: data });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Create wallet error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

