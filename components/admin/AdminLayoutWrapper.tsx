'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

interface AdminLayoutWrapperProps {
  admin: any;
  children: React.ReactNode;
}

export default function AdminLayoutWrapper({ admin, children }: AdminLayoutWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isSignInPage = pathname === '/admin/signin';

  // If on signin page, render without layout
  if (isSignInPage) {
    return <>{children}</>;
  }

  // If not authenticated and not on signin, redirect to 404
  useEffect(() => {
    if (!admin && !isSignInPage) {
      router.push('/admin/not-found');
    }
  }, [admin, isSignInPage, router]);

  // If not authenticated, show nothing (redirecting)
  if (!admin) {
    return null;
  }

  // Render full admin layout
  return (
    <div className="admin-panel flex min-h-screen" style={{ background: 'var(--admin-bg)' }}>
      <AdminSidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <AdminTopbar />
        <main className="flex-1 p-6 lg:p-8">
          <div className="admin-page-transition">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

