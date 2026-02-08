'use client';

import { useState, memo, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Lock, RefreshCw, XCircle, MessageSquare, CheckCircle, Eye, Hash, ClipboardCheck } from 'lucide-react';

interface OrderDetailPanelProps {
  data: {
    order: any;
    history: any[];
    webhooks: any[];
    notes: any[];
  };
}

const OrderDetailPanel = memo(function OrderDetailPanel({ data }: OrderDetailPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [payoutMode, setPayoutMode] = useState<'manual' | 'automatic'>('manual');
  const router = useRouter();

  useEffect(() => {
    const fetchPayoutMode = async () => {
      try {
        const response = await fetch('/api/admin/settings/payout-mode');
        if (response.ok) {
          const data = await response.json();
          setPayoutMode(data.payoutMode || 'manual');
        }
      } catch (error) {
        console.error('Failed to fetch payout mode:', error);
      }
    };
    fetchPayoutMode();
  }, []);

  const handleAction = async (action: string, reason?: string, payoutHash?: string) => {
    setActionLoading(action);
    try {
      const response = await fetch(`/api/admin/orders/${data.order.orderId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, payoutHash }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Action failed');
        return;
      }

      const result = await response.json();
      
      // For verify_payment, show comparison details
      if (action === 'verify_payment' && result.comparison) {
        const { comparison } = result;
        const message = `Provider Status: ${comparison.provider_status}\n` +
          `Provider Mapped: ${comparison.provider_mapped_internal}\n` +
          `DB Internal Status: ${comparison.db_internal_status}\n` +
          `Status Match: ${comparison.status_match ? '✓ Yes' : '✗ No'}\n\n` +
          `This is a read-only check. No database changes were made.`;
        alert(message);
      } else {
        router.refresh();
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    setAddingNote(true);
    try {
      const response = await fetch(`/api/admin/orders/${data.order.orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText }),
      });

      if (!response.ok) {
        alert('Failed to add note');
        return;
      }

      setNoteText('');
      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setAddingNote(false);
    }
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

  const statusStyle = getStatusStyle(data.order.internalStatus || data.order.status);

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Order Summary
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Order ID
            </label>
            <p className="font-mono text-sm font-medium" style={{ color: 'var(--admin-text-primary)' }}>
              {data.order.orderId}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Internal Status
            </label>
            <p>
              <span 
                className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
                style={{ background: statusStyle.bg, color: statusStyle.text }}
              >
                {data.order.internalStatus || data.order.status}
                {data.order.locked && <Lock className="w-3.5 h-3.5" strokeWidth={2.5} />}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Provider Status
            </label>
            <p 
              className="px-2 py-1 rounded text-xs font-mono inline-block"
              style={{ 
                background: 'var(--admin-surface)',
                color: 'var(--admin-text-muted)'
              }}
            >
              {data.order.providerStatus || '-'}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              User Status
            </label>
            <p 
              className="px-2 py-1 rounded text-xs inline-block"
              style={{ 
                background: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--admin-primary-light)'
              }}
            >
              {data.order.userStatus || '-'}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Payment ID
            </label>
            <p className="font-mono text-sm font-medium" style={{ color: 'var(--admin-text-primary)' }}>
              {data.order.paymentId || '-'}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              From
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
              {data.order.fromAmount} {data.order.fromCurrency} {data.order.fromNetwork && `(${data.order.fromNetwork})`}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              To
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
              {data.order.toAmount} {data.order.toCurrency} {data.order.toNetwork && `(${data.order.toNetwork})`}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Created
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
              {format(new Date(data.order.createdAt), 'PPpp')}
            </p>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Status Timeline
        </h2>
        <div className="space-y-2">
          {data.history.map((entry, idx) => {
            const entryStyle = getStatusStyle(entry.status);
            return (
              <div key={entry.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ background: entryStyle.text }}
                  />
                  {idx < data.history.length - 1 && (
                    <div 
                      className="w-0.5 h-8 ml-1.5"
                      style={{ background: 'var(--admin-border)' }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ background: entryStyle.bg, color: entryStyle.text }}
                    >
                      {entry.status}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {format(new Date(entry.created_at), 'PPpp')}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                    Source: {entry.source} {entry.payment_status && `(${entry.payment_status})`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Webhook Events */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Webhook Events
        </h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Status</th>
                <th>Processed</th>
              </tr>
            </thead>
            <tbody>
              {data.webhooks.map((webhook) => (
                <tr key={webhook.id}>
                  <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                    {webhook.payment_id}
                  </td>
                  <td style={{ color: 'var(--admin-text-secondary)' }}>{webhook.payment_status}</td>
                  <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {format(new Date(webhook.processed_at), 'PPpp')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Notes */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Internal Notes
        </h2>
        <div className="space-y-4">
          {data.notes.map((note) => (
            <div 
              key={note.id} 
              className="pl-4"
              style={{ borderLeft: '4px solid var(--admin-primary)' }}
            >
              <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>{note.note}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                {note.admin_users?.email} - {format(new Date(note.created_at), 'PPpp')}
              </p>
            </div>
          ))}
          <div className="pt-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add internal note..."
              className="admin-input"
              rows={3}
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !noteText.trim()}
              className="admin-btn admin-btn-primary mt-2 flex items-center gap-2"
              style={{ opacity: (addingNote || !noteText.trim()) ? 0.5 : 1 }}
            >
              <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Admin Actions
        </h2>
        
        {/* In-progress order info: swaps complete automatically; actions below are for edge cases */}
        {['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'CONFIRMING', 'PROCESSING_BY_PROVIDER'].includes(data.order.internalStatus || data.order.status) && (
          <div 
            className="mb-4 p-4 rounded-lg"
            style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)'
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-primary-light)' }}>
              Swap completes automatically
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Sandbox: 7–20 min. Live: when NOWPayments webhook reports finished. Use the actions below only if an order is stuck and you need to resync or mark completed manually.
            </p>
            {data.order.toAddress && (
              <p className="text-xs font-mono mt-2 break-all" style={{ color: 'var(--admin-text-primary)' }}>
                Send to: {data.order.toAddress}
              </p>
            )}
            {data.order.payoutHash && (
              <p className="text-xs font-mono mt-2 break-all" style={{ color: 'var(--admin-text-primary)' }}>
                Payout Hash: {data.order.payoutHash}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {/* Verify Payment - Read-only check */}
          <button
            onClick={() => handleAction('verify_payment')}
            disabled={actionLoading !== null}
            className="admin-btn admin-btn-primary flex items-center gap-2"
            style={{ opacity: actionLoading !== null ? 0.5 : 1 }}
            title="Read-only: Check provider status without changing database"
          >
            <Eye className="w-4 h-4" strokeWidth={2.5} />
            {actionLoading === 'verify_payment' ? 'Verifying...' : 'Verify Payment (Read-only)'}
          </button>

          {/* Move to Manual Review (edge case: e.g. flag for manual handling) */}
          {['PAYMENT_CONFIRMED', 'CONFIRMING'].includes(data.order.internalStatus || data.order.status) && (
            <button
              onClick={() => {
                const reason = prompt('Optional reason for manual review:');
                handleAction('approve_manual_payout', reason || undefined);
              }}
              disabled={actionLoading !== null}
              className="admin-btn flex items-center gap-2"
              style={{ 
                background: 'var(--admin-warning)',
                color: 'white',
                opacity: actionLoading !== null ? 0.5 : 1
              }}
            >
              <ClipboardCheck className="w-4 h-4" strokeWidth={2.5} />
              {actionLoading === 'approve_manual_payout' ? 'Processing...' : 'Move to Manual Review'}
            </button>
          )}

          {/* Enter Payout Hash */}
          {['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'PROCESSING_BY_PROVIDER'].includes(data.order.internalStatus || data.order.status) && (
            <button
              onClick={() => {
                const hash = prompt('Enter payout transaction hash:');
                if (hash && hash.trim()) {
                  const reason = prompt('Optional note:');
                  handleAction('enter_payout_hash', reason || undefined, hash.trim());
                }
              }}
              disabled={actionLoading !== null}
              className="admin-btn admin-btn-primary flex items-center gap-2"
              style={{ opacity: actionLoading !== null ? 0.5 : 1 }}
            >
              <Hash className="w-4 h-4" strokeWidth={2.5} />
              {actionLoading === 'enter_payout_hash' ? 'Processing...' : 'Enter Payout Hash'}
            </button>
          )}

          {/* Mark as Completed */}
          {['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'PROCESSING_BY_PROVIDER', 'CONFIRMING'].includes(data.order.internalStatus || data.order.status) && (
            <button
              onClick={() => {
                const reason = prompt('Optional note (confirmation, etc.):');
                handleAction('mark_completed', reason || undefined);
              }}
              disabled={actionLoading !== null}
              className="admin-btn flex items-center gap-2"
              style={{ 
                background: 'var(--admin-success)',
                color: 'white',
                opacity: actionLoading !== null ? 0.5 : 1
              }}
            >
              <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
              {actionLoading === 'mark_completed' ? 'Processing...' : 'Mark as Completed'}
            </button>
          )}
          
          <button
            onClick={() => handleAction(data.order.locked ? 'unlock' : 'lock')}
            disabled={actionLoading !== null}
            className="admin-btn admin-btn-secondary flex items-center gap-2"
            style={{ opacity: actionLoading !== null ? 0.5 : 1 }}
          >
            <Lock className="w-4 h-4" strokeWidth={2.5} />
            {actionLoading === 'lock' || actionLoading === 'unlock' ? 'Processing...' : data.order.locked ? 'Unlock Order' : 'Lock Order'}
          </button>
          <button
            onClick={() => handleAction('resync')}
            disabled={actionLoading !== null}
            className="admin-btn admin-btn-primary flex items-center gap-2"
            style={{ opacity: actionLoading !== null ? 0.5 : 1 }}
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
            {actionLoading === 'resync' ? 'Resyncing...' : 'Re-sync Status'}
          </button>
          <button
            onClick={() => {
              const reason = prompt('Reason for marking as failed:');
              if (reason) handleAction('mark_failed', reason);
            }}
            disabled={actionLoading !== null}
            className="admin-btn admin-btn-danger flex items-center gap-2"
            style={{ opacity: actionLoading !== null ? 0.5 : 1 }}
          >
            <XCircle className="w-4 h-4" strokeWidth={2.5} />
            {actionLoading === 'mark_failed' ? 'Processing...' : 'Mark Failed'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default OrderDetailPanel;

