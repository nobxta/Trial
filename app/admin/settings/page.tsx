'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, AlertCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [rotating, setRotating] = useState(false);
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [payoutMode, setPayoutMode] = useState<'manual' | 'automatic'>('manual');
  const [changingPayoutMode, setChangingPayoutMode] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'live' | 'sandbox'>('live');
  const [sandboxCase, setSandboxCase] = useState<'success' | 'failed' | 'expired' | 'partially_paid'>('success');
  const [changingPaymentMode, setChangingPaymentMode] = useState(false);
  const [changingSandboxCase, setChangingSandboxCase] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [envResponse, payoutModeResponse, paymentModeResponse] = await Promise.all([
          fetch('/api/admin/settings/env'),
          fetch('/api/admin/settings/payout-mode'),
          fetch('/api/admin/settings/payment-mode'),
        ]);
        
        if (envResponse.ok) {
          const data = await envResponse.json();
          setEnvInfo(data);
        }
        
        if (payoutModeResponse.ok) {
          const data = await payoutModeResponse.json();
          setPayoutMode(data.payoutMode || 'manual');
        }
        
        if (paymentModeResponse.ok) {
          const data = await paymentModeResponse.json();
          setPaymentMode(data.paymentMode || 'live');
          setSandboxCase(data.sandboxCase || 'success');
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRotateWebhookSecret = async () => {
    if (!confirm('Are you sure you want to rotate the webhook secret? You must update your environment variable immediately.')) {
      return;
    }

    setRotating(true);
    try {
      const response = await fetch('/api/admin/settings/webhook-secret', {
        method: 'POST',
      });

      if (!response.ok) {
        alert('Failed to rotate webhook secret');
        return;
      }

      const data = await response.json();
      alert(`Webhook secret rotated. New secret: ${data.secret}\n\nIMPORTANT: Update your NOWPAYMENTS_IPN_SECRET environment variable immediately!`);
    } catch (error) {
      alert('An error occurred');
    } finally {
      setRotating(false);
    }
  };

  const handleChangePayoutMode = async (newMode: 'manual' | 'automatic') => {
    if (newMode === 'automatic') {
      if (!confirm('WARNING: Automatic payout mode allows NOWPayments to send payouts automatically.\n\nAre you sure you want to enable automatic payouts?')) {
        return;
      }
    }

    setChangingPayoutMode(true);
    try {
      const response = await fetch('/api/admin/settings/payout-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to change payout mode');
        return;
      }

      setPayoutMode(newMode);
      alert(`Payout mode changed to ${newMode === 'manual' ? 'Manual' : 'Automatic'}`);
    } catch (error) {
      alert('An error occurred');
    } finally {
      setChangingPayoutMode(false);
    }
  };

  const handleChangePaymentMode = async (newMode: 'live' | 'sandbox') => {
    if (newMode === 'sandbox') {
      if (!confirm('WARNING: Sandbox mode uses test payments. No real money will be processed.\n\nAre you sure you want to switch to Sandbox mode?')) {
        return;
      }
    } else {
      if (!confirm('WARNING: Live mode processes REAL payments with REAL money.\n\nAre you sure you want to switch to Live mode?')) {
        return;
      }
    }

    setChangingPaymentMode(true);
    try {
      const response = await fetch('/api/admin/settings/payment-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to change payment mode');
        return;
      }

      setPaymentMode(newMode);
      alert(`Payment mode changed to ${newMode === 'live' ? 'Live (Real Payments)' : 'Sandbox (Test Payments)'}`);
    } catch (error) {
      alert('An error occurred');
    } finally {
      setChangingPaymentMode(false);
    }
  };

  const handleChangeSandboxCase = async (newCase: 'success' | 'failed' | 'expired' | 'partially_paid') => {
    if (newCase === sandboxCase) return;
    setChangingSandboxCase(true);
    try {
      const response = await fetch('/api/admin/settings/payment-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxCase: newCase }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to change sandbox case');
        return;
      }

      const data = await response.json();
      setSandboxCase(data.sandboxCase ?? newCase);
      alert(`Sandbox case set to ${data.sandboxCase ?? newCase}. New sandbox payments will simulate this outcome.`);
    } catch (error) {
      alert('An error occurred');
    } finally {
      setChangingSandboxCase(false);
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
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>Settings</h1>
      <div className="admin-card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
            Environment Configuration
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>Environment</span>
              <span className="text-sm font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                {envInfo?.environment || 'development'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>Supabase URL</span>
              <span className="text-sm font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                {envInfo?.supabaseConfigured ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
            Payment Mode
          </h2>
          {paymentMode === 'sandbox' && (
            <div 
              className="mb-4 p-4 rounded-lg"
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--admin-warning-light)' }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-warning-light)' }}>
                    🟡 Sandbox Mode (TEST PAYMENTS)
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                    All payments are test payments. No real money will be processed. Use this for testing payment flows.
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    API: api-sandbox.nowpayments.io | Uses: NOWPAYMENTS_API_KEY_SANDBOX
                  </p>
                </div>
              </div>
            </div>
          )}
          {paymentMode === 'live' && (
            <div 
              className="mb-4 p-4 rounded-lg"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(34, 197, 94)' }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'rgb(34, 197, 94)' }}>
                    🟢 Live Mode (REAL PAYMENTS)
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    All payments are real payments with real money. Use this for production.
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                    API: api.nowpayments.io | Uses: NOWPAYMENTS_API_KEY_LIVE
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => handleChangePaymentMode('live')}
              disabled={changingPaymentMode || paymentMode === 'live'}
              className="admin-btn"
              style={{
                background: paymentMode === 'live' ? 'rgb(34, 197, 94)' : 'var(--admin-surface)',
                color: paymentMode === 'live' ? 'white' : 'var(--admin-text-secondary)',
                opacity: (changingPaymentMode || paymentMode === 'live') ? 0.5 : 1
              }}
            >
              🟢 Live Payments
            </button>
            <button
              onClick={() => handleChangePaymentMode('sandbox')}
              disabled={changingPaymentMode || paymentMode === 'sandbox'}
              className="admin-btn"
              style={{
                background: paymentMode === 'sandbox' ? 'var(--admin-warning)' : 'var(--admin-surface)',
                color: paymentMode === 'sandbox' ? 'white' : 'var(--admin-text-secondary)',
                opacity: (changingPaymentMode || paymentMode === 'sandbox') ? 0.5 : 1
              }}
            >
              🟡 Sandbox Mode
            </button>
          </div>
          <div className="text-xs mb-4" style={{ color: 'var(--admin-text-muted)' }}>
            Current mode: <strong>{paymentMode === 'live' ? 'Live' : 'Sandbox'}</strong> | 
            Change takes effect immediately (no redeploy required)
          </div>
          {paymentMode === 'sandbox' && (
            <div className="pt-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--admin-text-primary)' }}>
                Sandbox case (simulated outcome for new payments)
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--admin-text-muted)' }}>
                Choose how sandbox payments will behave: success, failed, expired, or partially_paid.
              </p>
              <div className="flex flex-wrap gap-2">
                {(['success', 'failed', 'expired', 'partially_paid'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => handleChangeSandboxCase(c)}
                    disabled={changingSandboxCase || sandboxCase === c}
                    className="admin-btn"
                    style={{
                      background: sandboxCase === c ? 'var(--admin-warning)' : 'var(--admin-surface)',
                      color: sandboxCase === c ? 'white' : 'var(--admin-text-secondary)',
                      opacity: (changingSandboxCase || sandboxCase === c) ? 0.8 : 1,
                      textTransform: 'capitalize',
                    }}
                  >
                    {c.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>
                Current: <strong>{sandboxCase.replace('_', ' ')}</strong>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
            NOWPayments Configuration
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>Live API Key</span>
              <span className="text-sm font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                {envInfo?.nowpaymentsApiKeyLiveConfigured ? '••••••••' : 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>Live IPN Secret</span>
              <span className="text-sm font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                {envInfo?.nowpaymentsIpnSecretLiveConfigured ? '••••••••' : 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>Sandbox API Key</span>
              <span className="text-sm font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                {envInfo?.nowpaymentsApiKeySandboxConfigured ? '••••••••' : 'Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>Sandbox IPN Secret</span>
              <span className="text-sm font-mono" style={{ color: 'var(--admin-text-primary)' }}>
                {envInfo?.nowpaymentsIpnSecretSandboxConfigured ? '••••••••' : 'Not configured'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-text-primary)' }}>Payout Mode</h2>
          {payoutMode === 'manual' && (
            <div 
              className="mb-4 p-4 rounded-lg"
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--admin-warning-light)' }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-warning-light)' }}>
                    Manual Payout Mode (DEFAULT & SAFEST)
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                    System does NOT control wallets. Admin must send crypto manually from personal wallet, then mark orders as completed.
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    Orders will stop at PENDING/EXCHANGE status and wait for manual completion.
                  </p>
                </div>
              </div>
            </div>
          )}
          {payoutMode === 'automatic' && (
            <div 
              className="mb-4 p-4 rounded-lg"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--admin-primary-light)' }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-primary-light)' }}>
                    Automatic Payout Mode
                  </p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    NOWPayments will send payouts automatically. Orders will complete automatically when NOWPayments confirms payout.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleChangePayoutMode('manual')}
              disabled={changingPayoutMode || payoutMode === 'manual'}
              className="admin-btn"
              style={{
                background: payoutMode === 'manual' ? 'var(--admin-warning)' : 'var(--admin-surface)',
                color: payoutMode === 'manual' ? 'white' : 'var(--admin-text-secondary)',
                opacity: (changingPayoutMode || payoutMode === 'manual') ? 0.5 : 1
              }}
            >
              Manual Payouts
            </button>
            <button
              onClick={() => handleChangePayoutMode('automatic')}
              disabled={changingPayoutMode || payoutMode === 'automatic'}
              className="admin-btn"
              style={{
                background: payoutMode === 'automatic' ? 'var(--admin-primary)' : 'var(--admin-surface)',
                color: payoutMode === 'automatic' ? 'white' : 'var(--admin-text-secondary)',
                opacity: (changingPayoutMode || payoutMode === 'automatic') ? 0.5 : 1
              }}
            >
              Automatic Payouts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
