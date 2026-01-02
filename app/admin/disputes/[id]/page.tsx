'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatWindow from '@/components/ChatWindow';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  sender: 'user' | 'admin' | 'system';
  message: string;
  created_at: string;
}

interface DisputeData {
  id: string;
  chat_id?: string | null;
  type?: 'order_dispute' | 'live_chat';
  status: string;
  user_email?: string | null;
  created_at: string;
  last_message_at?: string | null;
  order_id?: string | null;
  title?: string;
  description?: string;
}

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadDispute = async () => {
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}/messages`);
      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to load dispute');
        router.push('/admin/disputes');
        return;
      }

      setDispute(data.dispute);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading dispute:', error);
      alert('Failed to load dispute');
      router.push('/admin/disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (disputeId) {
      loadDispute();
      
      // Start polling for new messages
      pollIntervalRef.current = setInterval(() => {
        loadDispute();
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [disputeId]);

  const handleSendMessage = async (message: string) => {
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Reload messages
      await loadDispute();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send message');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!dispute) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update status');
      }

      await loadDispute();
    } catch (error: any) {
      alert(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete chat');
      }

      alert('Chat deleted successfully');
      router.push('/admin/disputes');
    } catch (error: any) {
      alert(error.message || 'Failed to delete chat');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-enter">
        <div className="text-center py-8">Loading dispute...</div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="admin-page-enter">
        <div className="text-center py-8 text-red-600">Dispute not found</div>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      open: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
      waiting: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
      investigating: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
      resolved: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
      closed: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
      deleted: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
    };
    return styles[status] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
  };

  return (
    <div className="admin-page-enter">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/disputes')}
            className="mb-2 transition-colors"
            style={{ color: 'var(--admin-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-text-secondary)'}
          >
            ← Back to Disputes
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>
            Dispute / Chat Details
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Window - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                Chat Messages
              </h2>
              {dispute.chat_id && (
                <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  Chat ID: <span className="font-mono">{dispute.chat_id}</span>
                </div>
              )}
            </div>
            <div style={{ height: '600px' }}>
              {dispute.chat_id ? (
                <ChatWindow
                  chatId={dispute.chat_id}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isAdmin={true}
                  disabled={dispute.status === 'deleted'}
                />
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>
                  This dispute does not have a chat ID. Chat functionality is only available for live chats.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Panel - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="admin-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
                Dispute Information
              </h3>
              
              <div className="space-y-3">
                {dispute.type && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                      Type
                    </label>
                    <div className="mt-1">
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
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                    Status
                  </label>
                  <div className="mt-1">
                    {(() => {
                      const statusStyle = getStatusStyle(dispute.status);
                      return (
                        <span 
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{ background: statusStyle.bg, color: statusStyle.text }}
                        >
                          {dispute.status}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {dispute.user_email && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                      User Email
                    </label>
                    <div className="mt-1 text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                      {dispute.user_email}
                    </div>
                  </div>
                )}

                {dispute.order_id && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                      Order ID
                    </label>
                    <div className="mt-1">
                      <a
                        href={`/admin/orders/${dispute.order_id}`}
                        className="text-sm font-mono transition-colors hover:underline"
                        style={{ color: 'var(--admin-primary-light)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
                      >
                        {dispute.order_id}
                      </a>
                    </div>
                  </div>
                )}

                {dispute.title && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                      Title
                    </label>
                    <div className="mt-1 text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                      {dispute.title}
                    </div>
                  </div>
                )}

                {dispute.description && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                      Description
                    </label>
                    <div className="mt-1 text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                      {dispute.description}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                    Created
                  </label>
                  <div className="mt-1 text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                    {format(new Date(dispute.created_at), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>

                {dispute.last_message_at && (
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                      Last Message
                    </label>
                    <div className="mt-1 text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                      {format(new Date(dispute.last_message_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6" style={{ borderTop: '1px solid var(--admin-border)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
                Actions
              </h3>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange('open')}
                    disabled={updatingStatus || dispute.status === 'open'}
                    className="admin-btn flex-1 text-sm"
                    style={{ 
                      background: 'var(--admin-warning)',
                      color: 'white',
                      opacity: (updatingStatus || dispute.status === 'open') ? 0.5 : 1
                    }}
                  >
                    Set Open
                  </button>
                  <button
                    onClick={() => handleStatusChange('waiting')}
                    disabled={updatingStatus || dispute.status === 'waiting'}
                    className="admin-btn admin-btn-primary flex-1 text-sm"
                    style={{ opacity: (updatingStatus || dispute.status === 'waiting') ? 0.5 : 1 }}
                  >
                    Set Waiting
                  </button>
                </div>
                
                {dispute.type === 'live_chat' && (
                  <button
                    onClick={() => handleStatusChange('closed')}
                    disabled={updatingStatus || dispute.status === 'closed'}
                    className="admin-btn admin-btn-secondary w-full text-sm"
                    style={{ opacity: (updatingStatus || dispute.status === 'closed') ? 0.5 : 1 }}
                  >
                    Close Chat
                  </button>
                )}
                
                {dispute.type === 'order_dispute' && (
                  <>
                    {dispute.status === 'open' && (
                      <button
                        onClick={() => handleStatusChange('investigating' as any)}
                        disabled={updatingStatus}
                        className="admin-btn admin-btn-primary w-full text-sm"
                        style={{ opacity: updatingStatus ? 0.5 : 1 }}
                      >
                        Set Investigating
                      </button>
                    )}
                    {dispute.status === 'investigating' && (
                      <button
                        onClick={() => handleStatusChange('resolved' as any)}
                        disabled={updatingStatus}
                        className="admin-btn w-full text-sm"
                        style={{ 
                          background: 'var(--admin-success)',
                          color: 'white',
                          opacity: updatingStatus ? 0.5 : 1
                        }}
                      >
                        Resolve
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={handleDelete}
                  disabled={deleting || dispute.status === 'deleted'}
                  className="admin-btn admin-btn-danger w-full text-sm"
                  style={{ opacity: (deleting || dispute.status === 'deleted') ? 0.5 : 1 }}
                >
                  {deleting ? 'Deleting...' : 'Delete Chat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

