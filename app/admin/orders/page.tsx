import { requireAdmin } from '@/lib/admin-rbac';
import OrdersTable from '@/components/admin/OrdersTable';
import { supabaseAdmin } from '@/lib/supabase';

async function getOrders(searchParams: { [key: string]: string | string[] | undefined }) {
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const orderId = typeof searchParams.orderId === 'string' ? searchParams.orderId : undefined;
  const paymentId = typeof searchParams.paymentId === 'string' ? searchParams.paymentId : undefined;
  const showUnpaid = typeof searchParams.showUnpaid === 'string' ? searchParams.showUnpaid === 'true' : false;
  const showAnonymous = typeof searchParams.showAnonymous === 'string' ? searchParams.showAnonymous === 'true' : false;
  const reviewQueue = typeof searchParams.reviewQueue === 'string' ? searchParams.reviewQueue === 'true' : false;

  const limit = 50;
  let query = supabaseAdmin!
    .from('orders')
    .select('*', { count: 'exact' })
    .limit(limit);

  // Filter out anonymous orders by default (user_id IS NOT NULL)
  if (!showAnonymous) {
    query = query.not('user_id', 'is', null);
  }

  // DEFAULT FILTER: Show PAYMENT_CONFIRMED and MANUAL_REVIEW by default
  // Hide unpaid spam orders (NEW, AWAITING_DEPOSIT) unless explicitly requested
  if (reviewQueue) {
    // Manual review queue: Only orders with confirmed payment
    query = query.in('internal_status', ['PAYMENT_CONFIRMED', 'MANUAL_REVIEW'])
      .order('created_at', { ascending: true }); // Oldest first
  } else if (!showUnpaid && (!status || status === 'all')) {
    // Default: If no explicit status filter, show PAYMENT_CONFIRMED and MANUAL_REVIEW
    // This hides unpaid spam orders by default
    query = query.in('internal_status', ['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'CONFIRMING', 'PROCESSING_BY_PROVIDER', 'DONE', 'FAILED', 'EXPIRED']);
  }

  // Status filter (uses internal_status) - only apply if not already filtered by reviewQueue
  if (status && status !== 'all' && !reviewQueue) {
    query = query.eq('internal_status', status);
  }
  if (orderId) {
    query = query.ilike('order_id', `%${orderId}%`);
  }
  if (paymentId) {
    query = query.ilike('payment_id', `%${paymentId}%`);
  }

  // Apply sorting: when showAnonymous=true, sort with user_id NULLS LAST
  if (showAnonymous && !reviewQueue) {
    query = query.order('user_id', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
  } else if (!reviewQueue) {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to fetch orders:', error);
    return { orders: [], total: 0 };
  }

  return {
    orders: (data || []).map(order => ({
      id: order.id,
      order_id: order.order_id,
      payment_id: order.payment_id,
      status: order.status, // Legacy
      internal_status: order.internal_status || order.status,
      user_status: order.user_status,
      provider_status: order.provider_status,
      from_currency: order.from_currency,
      from_amount: order.from_amount,
      from_network: order.from_network,
      to_currency: order.to_currency,
      to_amount: order.to_amount,
      to_network: order.to_network,
      to_address: order.to_address || null,
      created_at: order.created_at,
      updated_at: order.updated_at,
      locked: order.locked || false,
    })),
    total: count || 0,
  };
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  await requireAdmin('viewer');
  const { orders, total } = await getOrders(searchParams);

  const isReviewQueue = typeof searchParams.reviewQueue === 'string' && searchParams.reviewQueue === 'true';

  return (
    <div className="admin-page-transition">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>
          {isReviewQueue ? 'Manual Review Queue' : 'Orders'}
        </h1>
        {!isReviewQueue && (
          <a
            href="/admin/orders?reviewQueue=true"
            className="admin-btn admin-btn-primary"
          >
            View Review Queue
          </a>
        )}
        {isReviewQueue && (
          <a
            href="/admin/orders"
            className="admin-btn admin-btn-secondary"
          >
            View All Orders
          </a>
        )}
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--admin-text-muted)', maxWidth: '56rem' }}>
        <strong style={{ color: 'var(--admin-text-secondary)' }}>Use this page for:</strong> Managing orders. Every order that reaches PAYMENT_CONFIRMED completes automatically (sandbox: 7–20 min; live: when NOWPayments webhook reports finished). No admin click required. Click an Order ID for full details and actions (resync, mark completed, lock, verify).
      </p>
      <OrdersTable orders={orders} total={total} isReviewQueue={isReviewQueue} />
    </div>
  );
}

