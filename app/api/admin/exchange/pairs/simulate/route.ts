import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    await requireAdminRole('viewer');
    const { pairId, enabled, minAmount, maxAmount } = await request.json();

    if (!pairId) {
      return NextResponse.json(
        { error: 'pairId is required' },
        { status: 400 }
      );
    }

    // Get current pair configuration
    const { data: pair } = await supabaseAdmin!
      .from('exchange_pairs')
      .select('*')
      .eq('id', pairId)
      .single();

    if (!pair) {
      return NextResponse.json(
        { error: 'Exchange pair not found' },
        { status: 404 }
      );
    }

    // Simulate impact
    const simulation: any = {
      pair: {
        id: pair.id,
        from_currency: pair.from_currency,
        to_currency: pair.to_currency,
        current: {
          enabled: pair.enabled,
          min_amount: parseFloat(pair.min_amount),
          max_amount: pair.max_amount ? parseFloat(pair.max_amount) : null,
        },
        proposed: {
          enabled: enabled !== undefined ? enabled : pair.enabled,
          min_amount: minAmount !== undefined ? parseFloat(minAmount) : parseFloat(pair.min_amount),
          max_amount: maxAmount !== undefined ? (maxAmount ? parseFloat(maxAmount) : null) : (pair.max_amount ? parseFloat(pair.max_amount) : null),
        },
      },
      impact: {
        activeOrdersAffected: 0,
        pendingOrdersAffected: 0,
        minAmountChange: null as any,
        maxAmountChange: null as any,
      },
    };

    // Check active orders that would be affected
    if (enabled !== undefined && enabled === false && pair.enabled) {
      // Disabling pair - check active orders
      const { data: activeOrders } = await supabaseAdmin!
        .from('orders')
        .select('id, status')
        .eq('from_currency', pair.from_currency)
        .eq('to_currency', pair.to_currency)
        .in('status', ['NEW', 'CONFIRMING', 'PENDING', 'EXCHANGE']);

      simulation.impact.activeOrdersAffected = activeOrders?.length || 0;
    }

    // Check pending orders (NEW status) that would be affected by min/max changes
    if (minAmount !== undefined || maxAmount !== undefined) {
      const { data: pendingOrders } = await supabaseAdmin!
        .from('orders')
        .select('id, from_amount, status')
        .eq('from_currency', pair.from_currency)
        .eq('to_currency', pair.to_currency)
        .eq('status', 'NEW');

      const proposedMin = minAmount !== undefined ? parseFloat(minAmount) : parseFloat(pair.min_amount);
      const proposedMax = maxAmount !== undefined ? (maxAmount ? parseFloat(maxAmount) : null) : (pair.max_amount ? parseFloat(pair.max_amount) : null);

      const affectedOrders = (pendingOrders || []).filter(order => {
        const amount = parseFloat(order.from_amount);
        if (amount < proposedMin) return true;
        if (proposedMax !== null && amount > proposedMax) return true;
        return false;
      });

      simulation.impact.pendingOrdersAffected = affectedOrders.length;

      // Calculate impact of min/max changes
      if (minAmount !== undefined) {
        const currentMin = parseFloat(pair.min_amount);
        simulation.impact.minAmountChange = {
          current: currentMin,
          proposed: proposedMin,
          difference: proposedMin - currentMin,
          percentageChange: ((proposedMin - currentMin) / currentMin) * 100,
        };
      }

      if (maxAmount !== undefined) {
        const currentMax = pair.max_amount ? parseFloat(pair.max_amount) : null;
        simulation.impact.maxAmountChange = {
          current: currentMax,
          proposed: proposedMax,
          difference: proposedMax !== null && currentMax !== null ? proposedMax - currentMax : null,
        };
      }
    }

    return NextResponse.json({ simulation });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Simulate exchange pair error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

