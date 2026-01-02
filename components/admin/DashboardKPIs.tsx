'use client';

import { useEffect, useState, memo } from 'react';

interface DashboardData {
  volume: {
    '24h': number;
    '7d': number;
    '30d': number;
  };
  orders: {
    byStatus: Record<string, number>;
    total: number;
  };
  successRate: number;
  avgExchangeTime: number;
  revenue: number;
  latestOrders: any[];
  webhookFailures: number;
  paymentDelays: number;
}

const DashboardKPIs = memo(function DashboardKPIs() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/analytics');
        if (response.ok) {
          const analytics = await response.json();
          setData(analytics);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      NEW: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
      AWAITING_DEPOSIT: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
      CONFIRMING: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
      PAYMENT_CONFIRMED: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
      MANUAL_REVIEW: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
      PROCESSING_BY_PROVIDER: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
      DONE: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
      FAILED: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
      EXPIRED: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
      PENDING: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
      EXCHANGE: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
    };
    return styles[status] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-card p-6">
              <div className="skeleton h-4 w-24 mb-4" />
              <div className="skeleton h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="admin-card p-6">
          <div className="skeleton h-6 w-40 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="text-center">
                <div className="skeleton h-6 w-16 mx-auto mb-2" />
                <div className="skeleton h-8 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-card p-8 text-center">
        <p style={{ color: 'var(--admin-danger)' }}>Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="admin-card p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
            borderColor: 'rgba(59, 130, 246, 0.3)'
          }}
        >
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
            Total Volume (24h)
          </h3>
          <p className="text-3xl font-bold" style={{ color: 'var(--admin-primary-light)' }}>
            {formatCurrency(data.volume['24h'])}
          </p>
        </div>
        <div 
          className="admin-card p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
            borderColor: 'rgba(16, 185, 129, 0.3)'
          }}
        >
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
            Success Rate
          </h3>
          <p className="text-3xl font-bold" style={{ color: 'var(--admin-success-light)' }}>
            {data.successRate.toFixed(1)}%
          </p>
        </div>
        <div 
          className="admin-card p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
            borderColor: 'rgba(139, 92, 246, 0.3)'
          }}
        >
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
            Avg Exchange Time
          </h3>
          <p className="text-3xl font-bold" style={{ color: '#a78bfa' }}>
            {data.avgExchangeTime.toFixed(1)} min
          </p>
        </div>
        <div 
          className="admin-card p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
            borderColor: 'rgba(99, 102, 241, 0.3)'
          }}
        >
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
            Total Orders
          </h3>
          <p className="text-3xl font-bold" style={{ color: '#818cf8' }}>
            {data.orders.total}
          </p>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Orders by Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(data.orders.byStatus).map(([status, count]) => {
            const style = getStatusStyle(status);
            return (
              <div key={status} className="text-center">
                <div 
                  className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: style.bg, color: style.text }}
                >
                  {status}
                </div>
                <p className="text-2xl font-bold mt-3" style={{ color: 'var(--admin-text-primary)' }}>
                  {count}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.webhookFailures > 0 && (
          <div 
            className="admin-card p-4"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)'
            }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--admin-danger-light)' }}>
              Webhook Failures (24h)
            </h3>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--admin-danger)' }}>
              {data.webhookFailures}
            </p>
          </div>
        )}
        {data.paymentDelays > 0 && (
          <div 
            className="admin-card p-4"
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'rgba(245, 158, 11, 0.3)'
            }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--admin-warning-light)' }}>
              Payment Delays
            </h3>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--admin-warning)' }}>
              {data.paymentDelays}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              Orders in CONFIRMING &gt; 30min
            </p>
          </div>
        )}
      </div>

      {/* Latest Orders */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Latest Orders
        </h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>From → To</th>
                <th>Amount</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.latestOrders.map((order) => {
                const style = getStatusStyle(order.status);
                return (
                  <tr key={order.id}>
                    <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                      {order.order_id}
                    </td>
                    <td>
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-semibold inline-block"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--admin-text-secondary)' }}>
                      {order.from_currency} → {order.to_currency}
                    </td>
                    <td className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                      {parseFloat(order.from_amount).toFixed(8)}
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)' }}>
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default DashboardKPIs;

