'use client';

import { useEffect, useState } from 'react';
import WebhookLogsTable from '@/components/admin/WebhookLogsTable';

export default function AdminWebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async (filters?: { paymentId?: string; orderId?: string; paymentStatus?: string; limit?: number; offset?: number }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.paymentId) params.append('paymentId', filters.paymentId);
      if (filters?.orderId) params.append('orderId', filters.orderId);
      if (filters?.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`/api/admin/webhooks?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-enter">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6">Webhooks & Logs</h1>
      <WebhookLogsTable 
        initialWebhooks={webhooks} 
        total={total} 
        onRefresh={fetchWebhooks}
      />
    </div>
  );
}

