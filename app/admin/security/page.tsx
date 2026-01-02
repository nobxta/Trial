import { requireAdmin } from '@/lib/admin-rbac';
import AdminUsersManagement from '@/components/admin/AdminUsersManagement';
import { getAllAdminUsers } from '@/lib/db-admin';

export default async function AdminSecurityPage() {
  await requireAdmin('super_admin');
  const admins = await getAllAdminUsers();

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6">Admin & Security</h1>
      <AdminUsersManagement admins={admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        role: admin.role,
        last_login: admin.lastLogin,
        created_at: admin.createdAt,
      }))} />
    </div>
  );
}

