'use client';

import { useState, useEffect, memo } from 'react';
import { format } from 'date-fns';
import { Search, Eye, RefreshCw, Download, X } from 'lucide-react';
import Link from 'next/link';

interface Webhook {
  id: string;
  payment_id: string;
  payment_status: string;
  order_id: string;
  processed_at: string;
}

interface WebhookLogsTableProps {
  initialWebhooks: Webhook[];
  total: number;
  onRefresh: (filters?: { paymentId?: string; orderId?: string; paymentStatus?: string; limit?: number; offset?: number }) => Promise<void>;
}

const WebhookLogsTable = memo(function WebhookLogsTable({ initialWebhooks, total, onRefresh }: WebhookLogsTableProps) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [searchPaymentId, setSearchPaymentId] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [webhookDetails, setWebhookDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [replaying, setReplaying] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const limit = 50;

  // Update webhooks when initialWebhooks changes
  useEffect(() => {
    setWebhooks(initialWebhooks);
    setCurrentTotal(total);
  }, [initialWebhooks, total]);

  const handleSearch = async () => {
    setCurrentPage(1);
    const filters = {
      paymentId: searchPaymentId || undefined,
      orderId: searchOrderId || undefined,
      paymentStatus: filterStatus || undefined,
      limit,
      offset: 0,
    };
    await onRefresh(filters);
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    const filters = {
      paymentId: searchPaymentId || undefined,
      orderId: searchOrderId || undefined,
      paymentStatus: filterStatus || undefined,
      limit,
      offset: (page - 1) * limit,
    };
    await onRefresh(filters);
  };

  const handleViewDetails = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/admin/webhooks/${webhook.id}`);
      if (response.ok) {
        const data = await response.json();
        setWebhookDetails(data.webhook);
      } else {
        alert('Failed to load webhook details');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleReplay = async (webhookId: string) => {
    if (!confirm('Are you sure you want to replay this webhook? This will re-process the payment status update.')) {
      return;
    }

    setReplaying(webhookId);
    try {
      const response = await fetch(`/api/admin/webhooks/${webhookId}/replay`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to replay webhook');
        return;
      }

      const data = await response.json();
      alert(`Webhook replayed successfully. Order status: ${data.status}`);
      await handleSearch();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setReplaying(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (searchPaymentId) params.append('paymentId', searchPaymentId);
      if (searchOrderId) params.append('orderId', searchOrderId);
      if (filterStatus) params.append('paymentStatus', filterStatus);

      const response = await fetch(`/api/admin/webhooks/export?${params.toString()}`);
      if (!response.ok) {
        alert('Failed to export webhooks');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webhook-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('An error occurred');
    } finally {
      setExporting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    const styles: Record<string, { bg: string; text: string }> = {
      waiting: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
      confirming: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
      confirmed: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
      sending: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
      finished: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
      success: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
      failed: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
      expired: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
      refunded: { bg: 'rgba(245, 158, 11, 0.3)', text: 'var(--admin-warning)' },
    };
    return styles[lowerStatus] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="admin-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Payment ID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                value={searchPaymentId}
                onChange={(e) => setSearchPaymentId(e.target.value)}
                placeholder="Search payment ID..."
                className="admin-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Order ID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--admin-text-muted)' }} />
              <input
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Search order ID..."
                className="admin-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="admin-input"
            >
              <option value="">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="confirming">Confirming</option>
              <option value="confirmed">Confirmed</option>
              <option value="sending">Sending</option>
              <option value="finished">Finished</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="admin-btn admin-btn-primary flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="admin-btn flex items-center gap-2"
              style={{ 
                background: 'var(--admin-success)',
                color: 'white',
                opacity: exporting ? 0.5 : 1
              }}
            >
              <Download className={`w-4 h-4 ${exporting ? 'animate-spin' : ''}`} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Webhook Logs</h2>
          <span 
            className="text-sm font-semibold px-3 py-1 rounded-lg"
            style={{ 
              background: 'var(--admin-surface)',
              color: 'var(--admin-text-secondary)'
            }}
          >
            Total: {currentTotal}
          </span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Payment Status</th>
              <th>Order ID</th>
              <th>Processed At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map((webhook) => {
              const statusStyle = getStatusStyle(webhook.payment_status);
              return (
                <tr key={webhook.id}>
                  <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                    {webhook.payment_id}
                  </td>
                  <td>
                    <span 
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}
                    >
                      {webhook.payment_status}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/orders/${webhook.order_id}`}
                      className="font-mono text-sm transition-colors hover:underline"
                      style={{ color: 'var(--admin-primary-light)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
                    >
                      {webhook.order_id}
                    </Link>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {format(new Date(webhook.processed_at), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(webhook)}
                        className="admin-btn admin-btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Details
                      </button>
                      <button
                        onClick={() => handleReplay(webhook.id)}
                        disabled={replaying === webhook.id}
                        className="admin-btn text-xs px-3 py-1.5 flex items-center gap-1"
                        style={{ 
                          background: '#a78bfa',
                          color: 'white',
                          opacity: replaying === webhook.id ? 0.5 : 1
                        }}
                      >
                        <RefreshCw className={`w-3 h-3 ${replaying === webhook.id ? 'animate-spin' : ''}`} />
                        Replay
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {currentTotal > limit && (
          <div 
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--admin-border)' }}
          >
            <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, currentTotal)} of {currentTotal}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="admin-btn admin-btn-secondary"
                style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage * limit >= currentTotal}
                className="admin-btn admin-btn-secondary"
                style={{ opacity: currentPage * limit >= currentTotal ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedWebhook && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="admin-card p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                Webhook Details
              </h3>
              <button
                onClick={() => {
                  setSelectedWebhook(null);
                  setWebhookDetails(null);
                }}
                style={{ color: 'var(--admin-text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-text-muted)'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {loadingDetails ? (
              <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>Loading...</div>
            ) : webhookDetails ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
                    Payment ID
                  </label>
                  <p className="font-mono text-sm p-2 rounded" style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-primary)' }}>
                    {webhookDetails.payment_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
                    Payment Status
                  </label>
                  <p className="text-sm p-2 rounded" style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-primary)' }}>
                    {webhookDetails.payment_status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
                    Order ID
                  </label>
                  <Link
                    href={`/admin/orders/${webhookDetails.order_id}`}
                    className="font-mono text-sm transition-colors hover:underline"
                    style={{ color: 'var(--admin-primary-light)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
                  >
                    {webhookDetails.order_id}
                  </Link>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
                    Processed At
                  </label>
                  <p className="text-sm p-2 rounded" style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-primary)' }}>
                    {format(new Date(webhookDetails.processed_at), 'PPpp')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
                    Webhook ID
                  </label>
                  <p className="font-mono text-sm p-2 rounded" style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-primary)' }}>
                    {webhookDetails.id}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>No details available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default WebhookLogsTable;

