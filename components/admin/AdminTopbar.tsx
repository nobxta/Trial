'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search, LogOut } from 'lucide-react';

interface SystemHealth {
  webhook: 'healthy' | 'unhealthy' | 'unknown';
  nowpayments: 'healthy' | 'unhealthy' | 'unknown';
}

export default function AdminTopbar() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Non-blocking health checks - run in background
  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/system/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  }, []);

  const fetchMaintenanceMode = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/system/maintenance');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenanceMode);
      }
    } catch (error) {
      console.error('Failed to fetch maintenance mode:', error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch - non-blocking
    fetchHealth();
    fetchMaintenanceMode();
    
    // Poll every 30s
    const interval = setInterval(() => {
      fetchHealth();
      fetchMaintenanceMode();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchHealth, fetchMaintenanceMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsLoading(true);
      // Try to determine if it's an order ID or payment ID
      if (searchQuery.length > 10) {
        router.push(`/admin/orders?orderId=${encodeURIComponent(searchQuery)}`);
      } else {
        router.push(`/admin/orders?paymentId=${encodeURIComponent(searchQuery)}`);
      }
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'var(--admin-success)';
      case 'unhealthy':
        return 'var(--admin-danger)';
      default:
        return 'var(--admin-text-muted)';
    }
  };

  const environment = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'TEST' : 'LIVE';

  return (
    <div className="sticky top-0 z-20">
      {maintenanceMode && (
        <div 
          className="px-6 py-2.5 text-center font-semibold flex items-center justify-center gap-2"
          style={{ 
            background: 'var(--admin-warning)',
            color: 'var(--admin-text-inverse)'
          }}
        >
          <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
          <span className="text-sm">MAINTENANCE MODE ENABLED - All write operations are disabled</span>
        </div>
      )}
      <div 
        className="px-6 py-4 border-b"
        style={{ 
          background: 'var(--admin-surface)',
          borderColor: 'var(--admin-border)'
        }}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                Environment:
              </span>
              <span 
                className="px-2.5 py-1 rounded-md text-xs font-semibold"
                style={{
                  background: environment === 'TEST' ? 'var(--admin-warning)' : 'var(--admin-success)',
                  color: 'var(--admin-text-inverse)'
                }}
              >
                {environment}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Webhook:</span>
                <span 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: getHealthColor(health?.webhook || 'unknown') }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>NOWPayments:</span>
                <span 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: getHealthColor(health?.nowpayments || 'unknown') }}
                />
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order ID, Payment ID, Wallet..."
                className="admin-input pl-10"
                disabled={isLoading}
              />
            </div>
          </form>
          
          <button
            onClick={async () => {
              await fetch('/api/admin/auth/logout', { method: 'POST' });
              router.push('/admin/signin');
            }}
            className="admin-btn admin-btn-secondary flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

