import { requireAdmin } from '@/lib/admin-rbac';
import UsersTable from '@/components/admin/UsersTable';
import { supabaseAdmin } from '@/lib/supabase';

async function getUsers() {
  const limit = 50;
  const { data: users, error } = await supabaseAdmin!
    .from('users')
    .select('id, email, email_verified, created_at, blocked')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch users:', error);
    return { users: [], total: 0 };
  }

  const usersWithStats = await Promise.all(
    (users || []).map(async (user) => {
      const { data: orders } = await supabaseAdmin!
        .from('orders')
        .select('from_amount, created_at')
        .eq('user_id', user.id);

      const totalOrders = orders?.length || 0;
      const totalVolume = (orders || []).reduce((sum, o) => sum + parseFloat(o.from_amount), 0);

      const { data: flagged } = await supabaseAdmin!
        .from('flagged_users')
        .select('id, reason, resolved_at')
        .eq('user_id', user.id)
        .is('resolved_at', null)
        .limit(1);

        const lastOrderDate = orders && orders.length > 0 
          ? orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
          : null;

        // Risk indicator
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (flagged && flagged.length > 0) {
          riskLevel = 'high';
        } else if (totalOrders > 10) {
          riskLevel = 'medium';
        }

        return {
          ...user,
          totalOrders,
          totalVolume,
          lastOrderDate,
          flagged: !!(flagged && flagged.length > 0),
          blocked: user.blocked || false,
          riskLevel,
        };
    })
  );

  return { users: usersWithStats, total: users?.length || 0 };
}

export default async function AdminUsersPage() {
  await requireAdmin('viewer');
  const { users, total } = await getUsers();

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <UsersTable users={users} total={total} />
    </div>
  );
}

