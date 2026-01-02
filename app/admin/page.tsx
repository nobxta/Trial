import { requireAdmin } from '@/lib/admin-rbac';
import DashboardKPIs from '@/components/admin/DashboardKPIs';

export default async function AdminDashboard() {
  await requireAdmin('viewer');

  return (
    <div className="admin-page-transition">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
        Dashboard
      </h1>
      <DashboardKPIs />
    </div>
  );
}
