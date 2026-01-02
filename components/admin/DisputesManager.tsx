'use client';

import { useState, memo } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Plus } from 'lucide-react';
import Link from 'next/link';

interface Dispute {
  id: string;
  order_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  refund_required: boolean;
  refund_amount: string | null;
  created_at: string;
  orders?: { order_id: string; status: string };
  users?: { email: string };
  type?: 'order_dispute' | 'live_chat';
  chat_id?: string;
  user_email?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
}

interface DisputesManagerProps {
  initialDisputes: Dispute[];
  total: number;
}

const DisputesManager = memo(function DisputesManager({ initialDisputes, total }: DisputesManagerProps) {
  const [disputes, setDisputes] = useState(initialDisputes);
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleUpdateStatus = async (disputeId: string, status: string) => {
    setUpdating(disputeId);
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        alert('Failed to update dispute status');
        return;
      }

      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setUpdating(null);
    }
  };

  const handleAddNote = async (disputeId: string) => {
    if (!noteText.trim()) return;

    setAddingNote(true);
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText }),
      });

      if (!response.ok) {
        alert('Failed to add note');
        return;
      }

      setNoteText('');
      setSelectedDispute(null);
      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setAddingNote(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      open: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
      investigating: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
      resolved: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
      closed: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
    };
    return styles[status] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
  };

  const getPriorityStyle = (priority: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      low: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
      medium: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
      high: { bg: 'rgba(245, 158, 11, 0.3)', text: 'var(--admin-warning)' },
      urgent: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
    };
    return styles[priority] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
  };

  return (
    <div className="admin-table-container">
      <div className="admin-table-header">
        <h2>Disputes / Support</h2>
        <span 
          className="text-sm font-semibold px-3 py-1 rounded-lg"
          style={{ 
            background: 'var(--admin-surface)',
            color: 'var(--admin-text-secondary)'
          }}
        >
          Total: {total}
        </span>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Chat ID</th>
            <th>Order ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Last Message</th>
            <th>Unread</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map((dispute) => {
            const statusStyle = getStatusStyle(dispute.status);
            return (
              <tr 
                key={dispute.id} 
                className="cursor-pointer"
                onClick={() => window.location.href = `/admin/disputes/${dispute.id}`}
              >
                <td>
                  <span 
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      background: dispute.type === 'live_chat' 
                        ? 'rgba(59, 130, 246, 0.2)' 
                        : 'rgba(139, 92, 246, 0.2)',
                      color: dispute.type === 'live_chat'
                        ? 'var(--admin-primary-light)'
                        : '#a78bfa'
                    }}
                  >
                    {dispute.type === 'live_chat' ? 'Live Chat' : 'Order Dispute'}
                  </span>
                </td>
                <td>
                  {dispute.chat_id ? (
                    <span className="font-mono text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {dispute.chat_id.substring(0, 8)}...
                    </span>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>-</span>
                  )}
                </td>
                <td>
                  {dispute.order_id ? (
                    <Link
                      href={`/admin/orders/${dispute.order_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-sm transition-colors hover:underline"
                      style={{ color: 'var(--admin-primary-light)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
                    >
                      {dispute.order_id}
                    </Link>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>-</span>
                  )}
                </td>
                <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {dispute.title || dispute.user_email || 'Untitled'}
                </td>
                <td>
                  <span 
                    className="px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: statusStyle.bg, color: statusStyle.text }}
                  >
                    {dispute.status}
                  </span>
                </td>
                <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  {dispute.last_message_at 
                    ? format(new Date(dispute.last_message_at), 'MMM d, HH:mm')
                    : format(new Date(dispute.created_at), 'MMM d, HH:mm')}
                </td>
                <td>
                  {dispute.unread_count && dispute.unread_count > 0 ? (
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{ 
                        background: 'var(--admin-danger)',
                        color: 'white'
                      }}
                    >
                      {dispute.unread_count}
                    </span>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>-</span>
                  )}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/admin/disputes/${dispute.id}`}
                    className="admin-btn admin-btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Open
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedDispute && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="admin-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
              Add Note
            </h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note..."
              className="admin-input mb-4"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAddNote(selectedDispute)}
                disabled={addingNote || !noteText.trim()}
                className="admin-btn admin-btn-primary"
                style={{ opacity: (addingNote || !noteText.trim()) ? 0.5 : 1 }}
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
              <button
                onClick={() => {
                  setSelectedDispute(null);
                  setNoteText('');
                }}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DisputesManager;

