import { requireAdmin } from '@/lib/admin-rbac';
import PaymentsTable from '@/components/admin/PaymentsTable';
import { supabaseAdmin } from '@/lib/supabase';

async function getPayments() {
  const limit = 50;
  const { data: orders, error, count } = await supabaseAdmin!
    .from('orders')
    .select('order_id, payment_id, status, internal_status, user_status, provider_status, from_currency, from_amount, to_currency, to_amount, from_network, to_network, created_at, updated_at', { count: 'exact' })
    .not('payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch payments:', error);
    return { payments: [], total: 0 };
  }

  const payments = (orders || []).map(order => ({
    payment_id: order.payment_id,
    order_id: order.order_id,
    status: order.status, // Legacy
    internal_status: order.internal_status || order.status,
    user_status: order.user_status,
    provider_status: order.provider_status,
    from_currency: order.from_currency,
    from_network: order.from_network,
    from_amount: order.from_amount,
    to_currency: order.to_currency,
    to_network: order.to_network,
    to_amount: order.to_amount,
    created_at: order.created_at,
    updated_at: order.updated_at,
  }));

  return { payments, total: count || 0 };
}

export default async function AdminPaymentsPage() {
  await requireAdmin('viewer');
  const { payments, total } = await getPayments();

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6">Payments</h1>
      <PaymentsTable payments={payments} total={total} />
    </div>
  );
}
