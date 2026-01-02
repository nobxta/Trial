'use client';

import { useState, useEffect, memo } from 'react';
import { format } from 'date-fns';
import { Plus, Pause, ExternalLink, AlertCircle } from 'lucide-react';

interface Wallet {
  id: string;
  network: string;
  currency: string;
  address: string;
  label: string | null;
  type: string;
  balance: string;
  is_active: boolean;
}

interface Payout {
  id: string;
  order_id: string | null;
  network: string;
  currency: string;
  amount: string;
  recipient_address: string;
  tx_hash: string | null;
  status: string;
  created_at: string;
  wallets?: { address: string; label: string | null };
}

interface WalletsPayoutsManagerProps {
  initialWallets: Wallet[];
  initialPayouts: Payout[];
}

const WalletsPayoutsManager = memo(function WalletsPayoutsManager({ initialWallets, initialPayouts }: WalletsPayoutsManagerProps) {
  const [wallets, setWallets] = useState(initialWallets);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [payoutMode, setPayoutMode] = useState<'manual' | 'automatic'>('manual');
  const [newWallet, setNewWallet] = useState({
    network: '',
    currency: '',
    address: '',
    label: '',
    type: 'hot',
  });

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

  const handleAddWallet = async () => {
    if (!newWallet.network || !newWallet.currency || !newWallet.address) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWallet),
      });

      if (!response.ok) {
        alert('Failed to add wallet');
        return;
      }

      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    }
  };

  const handlePausePayouts = async () => {
    if (!confirm('Are you sure you want to pause all payouts?')) return;

    try {
      const response = await fetch('/api/admin/payouts/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to pause payouts');
        return;
      }

      alert('Payouts paused');
    } catch (error) {
      alert('An error occurred');
    }
  };

  const handleUpdatePayoutStatus = async (payoutId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        alert('Failed to update payout status');
        return;
      }

      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    }
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
      processing: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
      completed: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
      failed: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
      cancelled: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
    };
    return styles[status] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
  };

  return (
    <div className="space-y-6">
      {/* Manual Payout Mode Warning */}
      {payoutMode === 'manual' && (
        <div 
          className="rounded-lg p-4"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--admin-warning-light)' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-warning-light)' }}>
                Manual Payout Mode Active
              </p>
              <p className="text-xs mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                System does NOT control wallets or send crypto automatically. Wallets listed here are for tracking purposes only.
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Admin must send crypto manually from personal wallet, then mark orders as completed in the Orders page.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>Wallets</h2>
          <button
            onClick={() => setShowWalletForm(!showWalletForm)}
            className="admin-btn admin-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Wallet
          </button>
        </div>

        {showWalletForm && (
          <div className="mb-6 p-4 rounded-lg space-y-3" style={{ background: 'var(--admin-surface)' }}>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Network"
                value={newWallet.network}
                onChange={(e) => setNewWallet({ ...newWallet, network: e.target.value })}
                className="admin-input"
              />
              <input
                type="text"
                placeholder="Currency"
                value={newWallet.currency}
                onChange={(e) => setNewWallet({ ...newWallet, currency: e.target.value })}
                className="admin-input"
              />
              <input
                type="text"
                placeholder="Address"
                value={newWallet.address}
                onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                className="admin-input"
              />
              <input
                type="text"
                placeholder="Label (optional)"
                value={newWallet.label}
                onChange={(e) => setNewWallet({ ...newWallet, label: e.target.value })}
                className="admin-input"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddWallet}
                className="admin-btn flex items-center gap-2"
                style={{ background: 'var(--admin-success)', color: 'white' }}
              >
                Save
              </button>
              <button
                onClick={() => setShowWalletForm(false)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Network</th>
                <th>Currency</th>
                <th>Address</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet.id}>
                  <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{wallet.network}</td>
                  <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{wallet.currency}</td>
                  <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>{wallet.address}</td>
                  <td style={{ color: 'var(--admin-text-secondary)' }}>{wallet.type}</td>
                  <td className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                    {parseFloat(wallet.balance).toFixed(8)}
                  </td>
                  <td>
                    <span 
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        background: wallet.is_active 
                          ? 'rgba(16, 185, 129, 0.2)' 
                          : 'var(--admin-surface)',
                        color: wallet.is_active 
                          ? 'var(--admin-success-light)' 
                          : 'var(--admin-text-secondary)'
                      }}
                    >
                      {wallet.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>Payouts</h2>
          <button
            onClick={handlePausePayouts}
            className="admin-btn admin-btn-danger flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pause Payouts
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>TX Hash</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => {
                const statusStyle = getStatusStyle(payout.status);
                return (
                  <tr key={payout.id}>
                    <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                      {payout.order_id || '-'}
                    </td>
                    <td className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                      {parseFloat(payout.amount).toFixed(8)} {payout.currency}
                    </td>
                    <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                      {payout.recipient_address}
                    </td>
                    <td>
                      <span 
                        className="px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{ background: statusStyle.bg, color: statusStyle.text }}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                      {payout.tx_hash || '-'}
                    </td>
                    <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {format(new Date(payout.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {payout.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdatePayoutStatus(payout.id, 'completed')}
                              className="admin-btn text-xs px-3 py-1.5"
                              style={{ background: 'var(--admin-success)', color: 'white' }}
                            >
                              Mark Complete
                            </button>
                            <button
                              onClick={() => handleUpdatePayoutStatus(payout.id, 'failed')}
                              className="admin-btn admin-btn-danger text-xs px-3 py-1.5"
                            >
                              Mark Failed
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default WalletsPayoutsManager;

