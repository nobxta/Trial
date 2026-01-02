'use client';

import { useEffect, useState } from 'react';
import AnalyticsCharts from '@/components/admin/AnalyticsCharts';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
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
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="admin-page-transition">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Analytics
        </h1>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="admin-card p-6">
                <div className="skeleton h-6 w-32 mb-6" />
                <div className="skeleton h-64" />
              </div>
            ))}
          </div>
          <div className="admin-card p-6">
            <div className="skeleton h-6 w-40 mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-24" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-transition">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
        Analytics
      </h1>
      {data ? (
        <AnalyticsCharts data={data} />
      ) : (
        <div className="admin-card p-8 text-center">
          <p style={{ color: 'var(--admin-danger)' }}>Failed to load analytics data</p>
        </div>
      )}
    </div>
  );
}

