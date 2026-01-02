'use client';

import { useState, memo, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { 
  Flag, 
  Shield, 
  Ban, 
  MessageSquare, 
  ShoppingCart, 
  CreditCard, 
  AlertCircle,
  Activity,
  FileText,
  ArrowLeft,
  AlertTriangle,
  User as UserIcon,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

interface UserDetailPanelProps {
  initialData: any;
  userId: string;
}

const UserDetailPanel = memo(function UserDetailPanel({ initialData, userId }: UserDetailPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'payments' | 'disputes' | 'activity' | 'notes'>('overview');
  const [user, setUser] = useState(initialData);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'disputes') {
      fetchDisputes();
    } else if (activeTab === 'activity') {
      fetchActivity();
    }
  }, [activeTab, userId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/orders`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/disputes`);
      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes || []);
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/activity`);
      if (response.ok) {
        const data = await response.json();
        setActivity(data);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async () => {
    const reason = prompt('Reason for flagging this user:');
    if (!reason) return;

    setActionLoading('flag');
    try {
      const response = await fetch(`/api/admin/users/${userId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        alert('Failed to flag user');
        return;
      }

      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnflag = async () => {
    if (!confirm('Are you sure you want to unflag this user?')) return;

    setActionLoading('unflag');
    try {
      const response = await fetch(`/api/admin/users/${userId}/unflag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Flag resolved' }),
      });

      if (!response.ok) {
        alert('Failed to unflag user');
        return;
      }

      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async () => {
    const reason = prompt('Reason for blocking this user:');
    if (!reason) return;

    if (!confirm(`Are you sure you want to BLOCK this user? This is a serious action.`)) return;

    setActionLoading('block');
    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        alert('Failed to block user');
        return;
      }

      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async () => {
    if (!confirm('Are you sure you want to unblock this user?')) return;

    setActionLoading('unblock');
    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        alert('Failed to unblock user');
        return;
      }

      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    try {
      const response = await fetch(`/api/admin/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'user',
          entity_id: userId,
          note: noteText,
        }),
      });

      if (!response.ok) {
        alert('Failed to add note');
        return;
      }

      setNoteText('');
      router.refresh();
    } catch (error) {
      alert('An error occurred');
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' };
      case 'medium':
        return { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' };
    }
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      NEW: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/users')}
            className="p-2 rounded-lg transition-colors"
            style={{ 
              background: 'var(--admin-surface)',
              color: 'var(--admin-text-secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--admin-card-hover)';
              e.currentTarget.style.color = 'var(--admin-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--admin-surface)';
              e.currentTarget.style.color = 'var(--admin-text-secondary)';
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>
              User Investigation
            </h1>
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>User ID: {user.id}</p>
          </div>
        </div>
      </div>

      {/* User Overview Card */}
      <div className="admin-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Email
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Account Status
            </label>
            <div className="flex items-center gap-2">
              {user.blocked ? (
                <span 
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--admin-danger)', color: 'white' }}
                >
                  Blocked
                </span>
              ) : user.flagged ? (
                <span 
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: 'var(--admin-danger-light)'
                  }}
                >
                  Flagged
                </span>
              ) : (
                <span 
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ 
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: 'var(--admin-success-light)'
                  }}
                >
                  Active
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Risk Level
            </label>
            {(() => {
              const riskStyle = getRiskColor(user.riskLevel);
              return (
                <span 
                  className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
                  style={{ background: riskStyle.bg, color: riskStyle.text }}
                >
                  {user.riskLevel === 'high' && <AlertTriangle className="w-3 h-3" />}
                  {user.riskLevel === 'medium' && <Shield className="w-3 h-3" />}
                  {user.riskLevel === 'low' && <UserIcon className="w-3 h-3" />}
                  {user.riskLevel.toUpperCase()}
                </span>
              );
            })()}
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Created
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
              {format(new Date(user.created_at), 'PPpp')}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Total Orders
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{user.totalOrders}</p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Total Volume
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{user.totalVolume.toFixed(8)}</p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Last Order
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
              {user.lastOrderDate ? format(new Date(user.lastOrderDate), 'PPpp') : 'Never'}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
              Disputes
            </label>
            <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{user.disputesCount}</p>
          </div>
          {user.lastLogin && (
            <>
              <div>
                <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
                  Last Login
                </label>
                <p className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {format(new Date(user.lastLogin.login_at), 'PPpp')}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block" style={{ color: 'var(--admin-text-muted)' }}>
                  Last IP
                </label>
                <p className="font-medium font-mono text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                  {user.lastLogin.ip_address || '-'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 pt-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
          {user.flagged ? (
            <button
              onClick={handleUnflag}
              disabled={actionLoading !== null}
              className="admin-btn flex items-center gap-2"
              style={{ 
                background: 'var(--admin-success)',
                color: 'white',
                opacity: actionLoading !== null ? 0.5 : 1
              }}
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading === 'unflag' ? 'Unflagging...' : 'Unflag User'}
            </button>
          ) : (
            <button
              onClick={handleFlag}
              disabled={actionLoading !== null}
              className="admin-btn admin-btn-danger flex items-center gap-2"
              style={{ opacity: actionLoading !== null ? 0.5 : 1 }}
            >
              <Flag className="w-4 h-4" />
              {actionLoading === 'flag' ? 'Flagging...' : 'Flag User'}
            </button>
          )}
          {user.blocked ? (
            <button
              onClick={handleUnblock}
              disabled={actionLoading !== null}
              className="admin-btn flex items-center gap-2"
              style={{ 
                background: 'var(--admin-success)',
                color: 'white',
                opacity: actionLoading !== null ? 0.5 : 1
              }}
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading === 'unblock' ? 'Unblocking...' : 'Unblock User'}
            </button>
          ) : (
            <button
              onClick={handleBlock}
              disabled={actionLoading !== null}
              className="admin-btn flex items-center gap-2"
              style={{ 
                background: 'var(--admin-text-primary)',
                color: 'var(--admin-bg)',
                opacity: actionLoading !== null ? 0.5 : 1
              }}
            >
              <Ban className="w-4 h-4" />
              {actionLoading === 'block' ? 'Blocking...' : 'Block User (Super Admin)'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-card overflow-hidden">
        <div style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <div className="flex space-x-1 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: UserIcon },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'disputes', label: 'Disputes', icon: AlertCircle },
              { id: 'activity', label: 'Activity', icon: Activity },
              { id: 'notes', label: 'Notes', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="px-6 py-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-colors"
                  style={{
                    borderBottomColor: activeTab === tab.id ? 'var(--admin-primary)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--admin-primary-light)' : 'var(--admin-text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.color = 'var(--admin-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.color = 'var(--admin-text-secondary)';
                    }
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {user.flagDetails && (
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--admin-danger-light)' }}>
                    Flagged User
                  </h3>
                  <p className="text-sm mb-1" style={{ color: 'var(--admin-text-secondary)' }}>
                    <strong style={{ color: 'var(--admin-text-primary)' }}>Reason:</strong> {user.flagDetails.reason}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    Flagged by: {user.flagDetails.admin_users?.email || 'Unknown'} on {format(new Date(user.flagDetails.flagged_at), 'PPpp')}
                  </p>
                </div>
              )}
              {user.blocked && (
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    background: 'var(--admin-danger)',
                    color: 'white'
                  }}
                >
                  <h3 className="font-semibold mb-2">Blocked User</h3>
                  <p className="text-sm mb-1">
                    <strong>Reason:</strong> {user.block_reason || 'No reason provided'}
                  </p>
                  <p className="text-xs" style={{ opacity: 0.8 }}>
                    Blocked on {user.blocked_at ? format(new Date(user.blocked_at), 'PPpp') : 'Unknown'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ background: 'var(--admin-surface)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--admin-text-primary)' }}>
                    Account Information
                  </h3>
                  <div className="space-y-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                    <div><strong style={{ color: 'var(--admin-text-primary)' }}>Email Verified:</strong> {user.email_verified ? 'Yes' : 'No'}</div>
                    <div><strong style={{ color: 'var(--admin-text-primary)' }}>Account Created:</strong> {format(new Date(user.created_at), 'PPpp')}</div>
                    {user.lastLogin && (
                      <>
                        <div><strong style={{ color: 'var(--admin-text-primary)' }}>Last Login:</strong> {format(new Date(user.lastLogin.login_at), 'PPpp')}</div>
                        <div><strong style={{ color: 'var(--admin-text-primary)' }}>Last IP:</strong> <span className="font-mono">{user.lastLogin.ip_address}</span></div>
                        {user.lastLogin.country && <div><strong style={{ color: 'var(--admin-text-primary)' }}>Country:</strong> {user.lastLogin.country}</div>}
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--admin-surface)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--admin-text-primary)' }}>
                    Activity Summary
                  </h3>
                  <div className="space-y-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                    <div><strong style={{ color: 'var(--admin-text-primary)' }}>Total Orders:</strong> {user.totalOrders}</div>
                    <div><strong style={{ color: 'var(--admin-text-primary)' }}>Total Volume:</strong> {user.totalVolume.toFixed(8)}</div>
                    <div><strong style={{ color: 'var(--admin-text-primary)' }}>Disputes:</strong> {user.disputesCount}</div>
                    <div>
                      <strong style={{ color: 'var(--admin-text-primary)' }}>Risk Level:</strong>{' '}
                      {(() => {
                        const riskStyle = getRiskColor(user.riskLevel);
                        return (
                          <span 
                            className="px-2 py-1 rounded text-xs font-semibold"
                            style={{ background: riskStyle.bg, color: riskStyle.text }}
                          >
                            {user.riskLevel.toUpperCase()}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              {loading ? (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>No orders found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Pair</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const statusStyle = getStatusStyle(order.status);
                        return (
                          <tr key={order.id}>
                            <td>
                              <Link 
                                href={`/admin/orders/${order.order_id}`} 
                                className="font-mono text-sm font-semibold transition-colors hover:underline"
                                style={{ color: 'var(--admin-primary-light)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
                              >
                                {order.order_id}
                              </Link>
                            </td>
                            <td style={{ color: 'var(--admin-text-secondary)' }}>
                              {order.from_currency} → {order.to_currency}
                            </td>
                            <td className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                              {parseFloat(order.from_amount).toFixed(8)}
                            </td>
                            <td>
                              <span 
                                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                                style={{ background: statusStyle.bg, color: statusStyle.text }}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                              {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div>
              {loading ? (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>Loading payments...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>No payments found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Payment ID</th>
                        <th>Order ID</th>
                        <th>Amount</th>
                        <th>Network</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => {
                        const statusStyle = getStatusStyle(payment.status);
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
                            <td className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                              {parseFloat(payment.from_amount).toFixed(8)} {payment.from_currency}
                            </td>
                            <td style={{ color: 'var(--admin-text-secondary)' }}>{payment.from_network || '-'}</td>
                            <td>
                              <span 
                                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                                style={{ background: statusStyle.bg, color: statusStyle.text }}
                              >
                                {payment.status}
                              </span>
                            </td>
                            <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                              {format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Disputes Tab */}
          {activeTab === 'disputes' && (
            <div>
              {loading ? (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>Loading disputes...</div>
              ) : disputes.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>No disputes found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Dispute ID</th>
                        <th>Order ID</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputes.map((dispute) => (
                        <tr key={dispute.id}>
                          <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                            {dispute.id.slice(0, 8)}...
                          </td>
                          <td>
                            {dispute.order_id ? (
                              <Link 
                                href={`/admin/orders/${dispute.order_id}`} 
                                className="font-mono text-sm transition-colors hover:underline"
                                style={{ color: 'var(--admin-primary-light)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
                              >
                                {dispute.order_id}
                              </Link>
                            ) : (
                              <span style={{ color: 'var(--admin-text-muted)' }}>-</span>
                            )}
                          </td>
                          <td>
                            <span 
                              className="px-3 py-1.5 rounded-full text-xs font-semibold"
                              style={{ 
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: 'var(--admin-primary-light)'
                              }}
                            >
                              {dispute.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--admin-text-secondary)' }}>{dispute.priority || 'Normal'}</td>
                          <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                            {format(new Date(dispute.created_at), 'MMM d, yyyy HH:mm')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              {loading ? (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>Loading activity...</div>
              ) : !activity ? (
                <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>No activity data available</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--admin-surface)' }}>
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--admin-text-primary)' }}>
                        Login History
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                        Total logins: {activity.totalLogins || 0}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                        Unique IPs: {activity.uniqueIPs?.length || 0}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                        Unique Countries: {activity.uniqueCountries?.length || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: 'var(--admin-surface)' }}>
                      <h3 className="font-semibold mb-2" style={{ color: 'var(--admin-text-primary)' }}>
                        Activity Logs
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
                        Total activities: {activity.totalActivities || 0}
                      </p>
                    </div>
                  </div>
                  
                  {activity.loginLogs && activity.loginLogs.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
                        Recent Logins
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>IP Address</th>
                              <th>Country</th>
                              <th>User Agent</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activity.loginLogs.slice(0, 20).map((log: any) => (
                              <tr key={log.id}>
                                <td className="text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                                  {format(new Date(log.login_at), 'PPpp')}
                                </td>
                                <td className="font-mono text-sm" style={{ color: 'var(--admin-text-primary)' }}>
                                  {log.ip_address || '-'}
                                </td>
                                <td style={{ color: 'var(--admin-text-secondary)' }}>{log.country || '-'}</td>
                                <td className="text-sm max-w-xs truncate" style={{ color: 'var(--admin-text-muted)' }}>
                                  {log.user_agent || '-'}
                                </td>
                                <td>
                                  {log.success ? (
                                    <span 
                                      className="px-2 py-1 rounded-full text-xs font-semibold"
                                      style={{ 
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        color: 'var(--admin-success-light)'
                                      }}
                                    >
                                      Success
                                    </span>
                                  ) : (
                                    <span 
                                      className="px-2 py-1 rounded-full text-xs font-semibold"
                                      style={{ 
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        color: 'var(--admin-danger-light)'
                                      }}
                                    >
                                      Failed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="space-y-4">
                {user.notes && user.notes.length > 0 ? (
                  user.notes.map((note: any) => (
                    <div 
                      key={note.id} 
                      className="pl-4 py-2"
                      style={{ borderLeft: '4px solid var(--admin-primary)' }}
                    >
                      <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>{note.note}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                        {note.admin_users?.email || 'Unknown'} - {format(new Date(note.created_at), 'PPpp')}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>No notes yet</div>
                )}
              </div>
              <div className="pt-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add internal note about this user..."
                  className="admin-input"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="admin-btn admin-btn-primary mt-2 flex items-center gap-2"
                  style={{ opacity: !noteText.trim() ? 0.5 : 1 }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default UserDetailPanel;

