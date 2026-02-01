'use client';

import { useState, memo } from 'react';
import { format } from 'date-fns';
import { RefreshCw, ExternalLink, Flag, Filter } from 'lucide-react';
import Link from 'next/link';

interface Payment {
  payment_id: string;
  order_id: string;
  status: string; // Legacy
  internal_status?: string;
  user_status?: string;
  provider_status?: string | null;
  from_currency: string;
  from_network: string | null;
  from_amount: string;
  to_currency: string;
  to_network: string | null;
  to_amount: string;
  created_at: string;
  updated_at: string;
}

interface PaymentsTableProps {
  payments: Payment[];
  total: number;
  /** 'paid' = only payments where user has paid (default). 'all' = every payment including unpaid. */
  filter?: 'paid' | 'all';
}

const PaymentsTable = memo(function PaymentsTable({ payments, total, filter = 'paid' }: PaymentsTableProps) {
  const [verifying, setVerifying] = useState<string | null>(null);
  const [flagging, setFlagging] = useState<string | null>(null);

  const handleVerify = async (paymentId: string, orderId: string) => {
    setVerifying(paymentId);
    try {
      // Use order actions API for read-only verification
      const response = await fetch(`/api/admin/orders/${orderId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_payment' }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to verify payment: ${error.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();
      const { comparison, provider_data } = data;
      
      // Show comparison dialog
      const message = `Provider Status: ${comparison.provider_status}\n` +
        `Provider Mapped: ${comparison.provider_mapped_internal}\n` +
        `DB Internal Status: ${comparison.db_internal_status}\n` +
        `Status Match: ${comparison.status_match ? '✓ Yes' : '✗ No'}\n\n` +
        `This is a read-only check. No database changes were made.`;
      
      alert(message);
    } catch (error) {
      alert('An error occurred while verifying payment');
    } finally {
      setVerifying(null);
    }
  };

  const handleFlag = async (paymentId: string) => {
    const reason = prompt('Reason for flagging this payment:');
    if (!reason) return;

    setFlagging(paymentId);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        alert('Failed to flag payment');
        return;
      }

      alert('Payment flagged');
    } catch (error) {
      alert('An error occurred');
    } finally {
      setFlagging(null);
    }
  };

  const getExplorerUrl = (network: string | null, txHash?: string) => {
    if (!network || !txHash) return null;
    const networks: Record<string, string> = {
      'ethereum': 'https://etherscan.io/tx/',
      'bsc': 'https://bscscan.com/tx/',
      'polygon': 'https://polygonscan.com/tx/',
      'tron': 'https://tronscan.org/#/transaction/',
      'bitcoin': 'https://blockstream.info/tx/',
    };
    return networks[network.toLowerCase()] ? `${networks[network.toLowerCase()]}${txHash}` : null;
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

  return (
    <div className="admin-table-container">
      <div className="admin-table-header flex flex-wrap items-center gap-3">
        <h2>Payments</h2>
        <span 
          className="text-sm font-semibold px-3 py-1 rounded-lg"
          style={{ 
            background: 'var(--admin-surface)',
            color: 'var(--admin-text-secondary)'
          }}
        >
          Total: {total}
        </span>
        <div className="flex items-center gap-2 ml-auto" style={{ color: 'var(--admin-text-muted)' }}>
          <Filter className="w-4 h-4" />
          <span className="text-sm">Showing:</span>
          {filter === 'paid' ? (
            <>
              <span className="text-sm font-medium" style={{ color: 'var(--admin-text-primary)' }}>Paid only</span>
              <Link
                href="/admin/payments?filter=all"
                className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
                style={{ background: 'var(--admin-surface)', color: 'var(--admin-primary-light)' }}
              >
                Show all
              </Link>
            </>
          ) : (
            <>
              <span className="text-sm font-medium" style={{ color: 'var(--admin-text-primary)' }}>All</span>
              <Link
                href="/admin/payments"
                className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
                style={{ background: 'var(--admin-surface)', color: 'var(--admin-primary-light)' }}
              >
                Paid only
              </Link>
            </>
          )}
        </div>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Payment ID</th>
            <th>Order ID</th>
            <th>Internal Status</th>
            <th>Provider Status</th>
            <th>User Status</th>
            <th>Amount</th>
            <th>Network</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const statusStyle = getStatusStyle(payment.internal_status || payment.status);
            return (
              <tr key={payment.payment_id}>
                <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                  {payment.payment_id}
                </td>
                <td>
                  <Link
                    href={`/admin/orders/${payment.order_id}`}
                    className="font-mono text-sm transition-colors hover:underline"
                    style={{ color: 'var(--admin-primary-light)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
                  >
                    {payment.order_id}
                  </Link>
                </td>
                <td>
                  <span 
                    className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: statusStyle.bg, color: statusStyle.text }}
                  >
                    {payment.internal_status || payment.status}
                  </span>
                </td>
                <td>
                  <span 
                    className="px-2 py-1 rounded text-xs font-mono"
                    style={{ 
                      background: 'var(--admin-surface)',
                      color: 'var(--admin-text-muted)'
                    }}
                    title="Read-only provider truth"
                  >
                    {payment.provider_status || '-'}
                  </span>
                </td>
                <td>
                  <span 
                    className="px-2 py-1 rounded text-xs"
                    style={{ 
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--admin-primary-light)'
                    }}
                  >
                    {payment.user_status || '-'}
                  </span>
                </td>
                <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {parseFloat(payment.from_amount).toFixed(8)} {payment.from_currency}
                </td>
                <td style={{ color: 'var(--admin-text-muted)' }}>{payment.from_network || '-'}</td>
                <td style={{ color: 'var(--admin-text-muted)' }}>
                  {format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(payment.payment_id, payment.order_id)}
                      disabled={verifying === payment.payment_id}
                      className="admin-btn admin-btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                      style={{ opacity: verifying === payment.payment_id ? 0.5 : 1 }}
                      title="Read-only verification: Check provider status without changing database"
                    >
                      <RefreshCw className={`w-3 h-3 ${verifying === payment.payment_id ? 'animate-spin' : ''}`} />
                      Verify
                    </button>
                    <button
                      onClick={() => handleFlag(payment.payment_id)}
                      disabled={flagging === payment.payment_id}
                      className="admin-btn admin-btn-danger text-xs px-3 py-1.5 flex items-center gap-1"
                      style={{ opacity: flagging === payment.payment_id ? 0.5 : 1 }}
                    >
                      <Flag className="w-3 h-3" />
                      Flag
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default PaymentsTable;

