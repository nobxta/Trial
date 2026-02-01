import { requireAdmin } from '@/lib/admin-rbac';
import PaymentsTable from '@/components/admin/PaymentsTable';
import { supabaseAdmin } from '@/lib/supabase';

/** Statuses where the user has actually paid (money received / in progress / completed). Excludes NEW, AWAITING_DEPOSIT, EXPIRED, FAILED. */
const PAID_STATUSES = ['CONFIRMING', 'PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'MANUAL_REVIEW', 'DONE'] as const;

async function getPayments(filter: 'paid' | 'all') {
  const limit = 50;
  let query = supabaseAdmin!
    .from('orders')
    .select('order_id, payment_id, status, internal_status, user_status, provider_status, from_currency, from_amount, to_currency, to_amount, from_network, to_network, created_at, updated_at', { count: 'exact' })
    .not('payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter === 'paid') {
    query = query.in('status', [...PAID_STATUSES]);
  }

  const { data: orders, error, count } = await query;

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

type PageProps = { searchParams: Promise<{ filter?: string }> };

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  await requireAdmin('viewer');
  const { filter: rawFilter } = await searchParams;
  const filter = rawFilter === 'all' ? 'all' : 'paid';
  const { payments, total } = await getPayments(filter);

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-4">Payments</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--admin-text-muted)', maxWidth: '56rem' }}>
        <strong style={{ color: 'var(--admin-text-secondary)' }}>Use this page for:</strong> Viewing payment records (payment IDs, amounts, status). Filter by &quot;Paid&quot; (money received) or &quot;All&quot;. Use <strong>Verify</strong> to compare our status with NOWPayments. To actually send payouts and mark orders done, use <a href="/admin/orders" className="underline hover:no-underline" style={{ color: 'var(--admin-primary-light)' }}>Orders</a> and click Confirmed there.
      </p>
      <PaymentsTable payments={payments} total={total} filter={filter} />
    </div>
  );
}
