import { requireAdmin } from '@/lib/admin-rbac';
import UserDetailPanel from '@/components/admin/UserDetailPanel';
import { supabaseAdmin } from '@/lib/supabase';

async function getUserData(userId: string) {
  // Get user basic info
  const { data: user, error: userError } = await supabaseAdmin!
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return null;
  }

  // Get order stats
  const { data: orders } = await supabaseAdmin!
    .from('orders')
    .select('from_amount, created_at')
    .eq('user_id', userId);

  const totalOrders = orders?.length || 0;
  const totalVolume = (orders || []).reduce((sum, o) => sum + parseFloat(o.from_amount), 0);
  const lastOrderDate = orders && orders.length > 0 
    ? orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
    : null;

  // Get flagged status
  const { data: flagged } = await supabaseAdmin!
    .from('flagged_users')
    .select('*, admin_users(email)')
    .eq('user_id', userId)
    .is('resolved_at', null)
    .order('flagged_at', { ascending: false })
    .limit(1);

  // Get disputes count
  const { count: disputesCount } = await supabaseAdmin!
    .from('disputes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get last login
  const { data: lastLogin } = await supabaseAdmin!
    .from('user_login_logs')
    .select('login_at, ip_address, user_agent, country')
    .eq('user_id', userId)
    .eq('success', true)
    .order('login_at', { ascending: false })
    .limit(1)
    .single();

  // Get admin notes
  const { data: notes } = await supabaseAdmin!
    .from('admin_notes')
    .select('*, admin_users(email)')
    .eq('entity_type', 'user')
    .eq('entity_id', userId)
    .order('created_at', { ascending: false });

  // Risk indicator
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (flagged && flagged.length > 0) {
    riskLevel = 'high';
  } else if (totalOrders > 10) {
    riskLevel = 'medium';
  }

  return {
    user: {
      ...user,
      totalOrders,
      totalVolume,
      lastOrderDate,
      flagged: flagged && flagged.length > 0,
      flagDetails: flagged && flagged.length > 0 ? flagged[0] : null,
      disputesCount: disputesCount || 0,
      lastLogin: lastLogin || null,
      riskLevel,
      notes: notes || [],
    },
  };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin('viewer');
  const data = await getUserData(params.id);

  if (!data) {
    return (
      <div className="admin-page-enter">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
            User Not Found
          </h1>
          <p style={{ color: 'var(--admin-text-muted)' }}>
            The user you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-enter">
      <UserDetailPanel initialData={data.user} userId={params.id} />
    </div>
  );
}

