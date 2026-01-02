import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import AdminLayoutWrapper from '@/components/admin/AdminLayoutWrapper';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get admin without redirecting (we'll handle redirect in wrapper)
  const admin = await getAdminUser();

  return (
    <AdminLayoutWrapper admin={admin}>
      {children}
    </AdminLayoutWrapper>
  );
}

