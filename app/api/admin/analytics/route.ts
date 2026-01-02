import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    await requireAdminRole('viewer');

    // Get date ranges
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total volume
    const { data: volume24h } = await supabaseAdmin!
      .from('orders')
      .select('from_amount')
      .gte('created_at', last24h.toISOString());
    
    const { data: volume7d } = await supabaseAdmin!
      .from('orders')
      .select('from_amount')
      .gte('created_at', last7d.toISOString());
    
    const { data: volume30d } = await supabaseAdmin!
      .from('orders')
      .select('from_amount')
      .gte('created_at', last30d.toISOString());

    const totalVolume24h = (volume24h || []).reduce((sum, o) => sum + parseFloat(o.from_amount), 0);
    const totalVolume7d = (volume7d || []).reduce((sum, o) => sum + parseFloat(o.from_amount), 0);
    const totalVolume30d = (volume30d || []).reduce((sum, o) => sum + parseFloat(o.from_amount), 0);

    // Order counts by status
    const { data: ordersByStatus } = await supabaseAdmin!
      .from('orders')
      .select('status');

    const statusCounts: Record<string, number> = {};
    (ordersByStatus || []).forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    // Success rate
    const totalOrders = ordersByStatus?.length || 0;
    const doneOrders = statusCounts['DONE'] || 0;
    const successRate = totalOrders > 0 ? (doneOrders / totalOrders) * 100 : 0;

    // Average exchange time (time from NEW to DONE)
    const { data: doneOrdersData } = await supabaseAdmin!
      .from('orders')
      .select('created_at, updated_at')
      .eq('status', 'DONE');

    let avgExchangeTime = 0;
    if (doneOrdersData && doneOrdersData.length > 0) {
      const times = doneOrdersData.map(order => {
        const created = new Date(order.created_at).getTime();
        const updated = new Date(order.updated_at).getTime();
        return updated - created;
      });
      avgExchangeTime = times.reduce((sum, t) => sum + t, 0) / times.length / 1000 / 60; // minutes
    }

    // Revenue (estimate from fees - would need fee calculation)
    // For now, return 0 as fee calculation needs to be implemented
    const revenue = 0;

    // Latest orders
    const { data: latestOrders } = await supabaseAdmin!
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Webhook failures (last 24h) - would need error tracking
    const webhookFailures = 0;

    // Payment delays (orders in CONFIRMING > 30min)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const { data: delayedPayments } = await supabaseAdmin!
      .from('orders')
      .select('*')
      .eq('status', 'CONFIRMING')
      .lt('updated_at', thirtyMinutesAgo.toISOString());

    // ACTIONABLE METRICS

    // Order drop-off analysis
    const { data: allOrders } = await supabaseAdmin!
      .from('orders')
      .select('status, created_at, updated_at');

    const dropOffAnalysis: Record<string, number> = {};
    (allOrders || []).forEach(order => {
      if (order.status !== 'DONE' && order.status !== 'EXPIRED') {
        dropOffAnalysis[order.status] = (dropOffAnalysis[order.status] || 0) + 1;
      }
    });

    // Confirmation-to-DONE time (using order_status_history)
    let avgConfirmationToDone = 0;
    if (doneOrdersData && doneOrdersData.length > 0) {
      const orderIds = doneOrdersData.map((o: any) => {
        // Get order_id from done orders - need to fetch full orders
        return '';
      }).filter(Boolean);

      if (orderIds.length > 0) {
        const { data: doneOrdersFull } = await supabaseAdmin!
          .from('orders')
          .select('order_id')
          .eq('status', 'DONE')
          .limit(50);

        const doneOrderIds = (doneOrdersFull || []).map(o => o.order_id);

        if (doneOrderIds.length > 0) {
          const { data: history } = await supabaseAdmin!
            .from('order_status_history')
            .select('order_id, status, created_at')
            .in('order_id', doneOrderIds);

          // Group by order_id and calculate time from CONFIRMING to DONE
          const orderGroups: Record<string, any[]> = {};
          (history || []).forEach(entry => {
            if (!orderGroups[entry.order_id]) {
              orderGroups[entry.order_id] = [];
            }
            orderGroups[entry.order_id].push(entry);
          });

          const confirmationToDoneTimes: number[] = [];
          Object.values(orderGroups).forEach(entries => {
            const confirming = entries.find(e => e.status === 'CONFIRMING');
            const done = entries.find(e => e.status === 'DONE');
            if (confirming && done) {
              const timeDiff = (new Date(done.created_at).getTime() - new Date(confirming.created_at).getTime()) / 1000 / 60;
              if (timeDiff > 0) {
                confirmationToDoneTimes.push(timeDiff);
              }
            }
          });

          if (confirmationToDoneTimes.length > 0) {
            avgConfirmationToDone = confirmationToDoneTimes.reduce((sum, t) => sum + t, 0) / confirmationToDoneTimes.length;
          }
        }
      }
    }

    // Coin/network failure rate
    const coinFailureRates: Record<string, { total: number; failed: number; rate: number }> = {};
    (allOrders || []).forEach((order: any) => {
      const key = `${order.from_currency}→${order.to_currency}`;
      if (!coinFailureRates[key]) {
        coinFailureRates[key] = { total: 0, failed: 0, rate: 0 };
      }
      coinFailureRates[key].total++;
      if (order.status === 'EXPIRED') {
        coinFailureRates[key].failed++;
      }
    });

    Object.keys(coinFailureRates).forEach(key => {
      const stats = coinFailureRates[key];
      stats.rate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;
    });

    // Fee revenue per pair (estimate - would need actual fee calculation)
    const feeRevenuePerPair: Record<string, number> = {};
    (allOrders || []).forEach((order: any) => {
      if (order.status === 'DONE') {
        const key = `${order.from_currency}→${order.to_currency}`;
        // Estimate 1% fee
        const estimatedFee = parseFloat(order.from_amount) * 0.01;
        feeRevenuePerPair[key] = (feeRevenuePerPair[key] || 0) + estimatedFee;
      }
    });

    // Volume Over Time - aggregate by day for 7, 30, and 90 days
    const last90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const { data: ordersForTimeSeries } = await supabaseAdmin!
      .from('orders')
      .select('from_amount, created_at')
      .gte('created_at', last90d.toISOString())
      .order('created_at', { ascending: true });

    // Aggregate volume by day
    const volumeByDay: Record<string, { date: string; volume: number }> = {};
    
    (ordersForTimeSeries || []).forEach((order: any) => {
      const date = new Date(order.created_at);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!volumeByDay[dateKey]) {
        volumeByDay[dateKey] = { date: dateKey, volume: 0 };
      }
      volumeByDay[dateKey].volume += parseFloat(order.from_amount);
    });

    // Convert to arrays for 7, 30, and 90 day ranges
    const volume7Days: Array<{ date: string; volume: number }> = [];
    const volume30Days: Array<{ date: string; volume: number }> = [];
    const volume90Days: Array<{ date: string; volume: number }> = [];

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    Object.values(volumeByDay).forEach(day => {
      const dayDate = new Date(day.date);
      volume90Days.push(day);
      if (dayDate >= thirtyDaysAgo) {
        volume30Days.push(day);
      }
      if (dayDate >= sevenDaysAgo) {
        volume7Days.push(day);
      }
    });

    // Sort by date
    volume7Days.sort((a, b) => a.date.localeCompare(b.date));
    volume30Days.sort((a, b) => a.date.localeCompare(b.date));
    volume90Days.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      volume: {
        '24h': totalVolume24h,
        '7d': totalVolume7d,
        '30d': totalVolume30d,
      },
      volumeOverTime: {
        '7d': volume7Days,
        '30d': volume30Days,
        '90d': volume90Days,
      },
      orders: {
        byStatus: statusCounts,
        total: totalOrders,
      },
      successRate: Math.round(successRate * 100) / 100,
      avgExchangeTime: Math.round(avgExchangeTime * 100) / 100, // minutes
      revenue,
      latestOrders: latestOrders || [],
      webhookFailures,
      paymentDelays: delayedPayments?.length || 0,
      // Actionable metrics
      dropOffAnalysis,
      avgConfirmationToDone: Math.round(avgConfirmationToDone * 100) / 100,
      coinFailureRates,
      feeRevenuePerPair,
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

