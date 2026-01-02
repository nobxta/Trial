'use client';

import { useEffect, useState } from 'react';
import RatesFeesEditor from '@/components/admin/RatesFeesEditor';

export default function AdminRatesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/rates');
        if (response.ok) {
          const rates = await response.json();
          setData(rates);
        }
      } catch (error) {
        console.error('Failed to fetch rates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="admin-page-enter">
        <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-page-enter">
        <p style={{ color: 'var(--admin-text-muted)' }}>Failed to load rates data</p>
      </div>
    );
  }

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>Rates & Fees</h1>
      <RatesFeesEditor initialData={data} />
    </div>
  );
}
