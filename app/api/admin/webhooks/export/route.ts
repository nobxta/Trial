import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-rbac';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole('viewer');

    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('paymentId');
    const orderId = searchParams.get('orderId');
    const paymentStatus = searchParams.get('paymentStatus');

    let query = supabaseAdmin!
      .from('webhook_idempotency')
      .select('*')
      .order('processed_at', { ascending: false });

    if (paymentId) {
      query = query.ilike('payment_id', `%${paymentId}%`);
    }
    if (orderId) {
      query = query.ilike('order_id', `%${orderId}%`);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    // Limit to 10000 records for export
    query = query.limit(10000);

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Convert to CSV
    const webhooks = data || [];
    if (webhooks.length === 0) {
      return NextResponse.json(
        { error: 'No webhooks to export' },
        { status: 400 }
      );
    }

    // CSV header
    const headers = ['ID', 'Payment ID', 'Payment Status', 'Order ID', 'Processed At'];
    const csvRows = [headers.join(',')];

    // CSV rows
    webhooks.forEach((webhook: any) => {
      const row = [
        webhook.id,
        webhook.payment_id,
        webhook.payment_status,
        webhook.order_id,
        new Date(webhook.processed_at).toISOString(),
      ];
      csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    });

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="webhook-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error('Export webhooks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

