'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  CreditCard, 
  Users, 
  RefreshCw, 
  DollarSign, 
  Webhook, 
  Wallet, 
  AlertCircle, 
  BarChart3, 
  Settings, 
  Shield 
} from 'lucide-react';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/exchange', label: 'Exchange Engine', icon: RefreshCw },
  { href: '/admin/rates', label: 'Rates & Fees', icon: DollarSign },
  { href: '/admin/webhooks', label: 'Webhooks & Logs', icon: Webhook },
  { href: '/admin/wallets', label: 'Wallets / Payouts', icon: Wallet },
  { href: '/admin/disputes', label: 'Disputes / Support', icon: AlertCircle },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/security', label: 'Admin & Security', icon: Shield },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div 
      className="w-64 min-h-screen fixed left-0 top-0 z-30 flex flex-col"
      style={{ 
        background: 'var(--admin-surface)',
        borderRight: '1px solid var(--admin-border)'
      }}
    >
      <div className="p-6 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>
          MintMove Admin
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
          Control Panel
        </p>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || 
                            (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'shadow-sm'
                      : ''
                  }`}
                  style={{
                    background: isActive ? 'var(--admin-primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--admin-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--admin-card-hover)';
                      e.currentTarget.style.color = 'var(--admin-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--admin-text-secondary)';
                    }
                  }}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

