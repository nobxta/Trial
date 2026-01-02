'use client';

import { useEffect, useState } from 'react';
import DisputesManager from '@/components/admin/DisputesManager';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/disputes');
        if (response.ok) {
          const data = await response.json();
          setDisputes(data.disputes || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error('Failed to fetch disputes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="admin-page-enter">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6">Disputes / Support</h1>
      <DisputesManager initialDisputes={disputes} total={total} />
    </div>
  );
}
