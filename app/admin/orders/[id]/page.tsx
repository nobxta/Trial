import { requireAdmin } from '@/lib/admin-rbac';
import OrderDetailPanel from '@/components/admin/OrderDetailPanel';
import { getOrderByOrderId } from '@/lib/db-orders';
import { supabaseAdmin } from '@/lib/supabase';

async function getOrderData(orderId: string) {
  const order = await getOrderByOrderId(orderId);
  if (!order) return null;

  const { data: history } = await supabaseAdmin!
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  const { data: webhooks } = await supabaseAdmin!
    .from('webhook_idempotency')
    .select('*')
    .eq('order_id', orderId)
    .order('processed_at', { ascending: false });

  const { data: notes } = await supabaseAdmin!
    .from('admin_notes')
    .select('*, admin_users(email)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  return {
    order,
    history: history || [],
    webhooks: webhooks || [],
    notes: notes || [],
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin('viewer');
  const data = await getOrderData(params.id);

  if (!data) {
    return (
      <div className="admin-page-enter">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Order Not Found
        </h1>
        <p style={{ color: 'var(--admin-text-muted)' }}>
          The order you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>Order Details</h1>
      <OrderDetailPanel data={data} />
    </div>
  );
}

