'use client';

import { useState, useEffect } from 'react';

export default function AdminEmailSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings/email');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings || {});
        }
      } catch (error) {
        console.error('Failed to fetch email settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Save all settings
      const promises = Object.entries(settings).map(([key, value]) =>
        fetch('/api/admin/settings/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
      );

      const results = await Promise.all(promises);
      const failed = results.some(r => !r.ok);

      if (failed) {
        setMessage({ type: 'error', text: 'Failed to save some settings' });
      } else {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>Email Settings</h1>
      
      <div className="admin-card p-6 space-y-6">
        {/* Message */}
        {message && (
          <div 
            className="p-4 rounded-lg"
            style={{
              background: message.type === 'success' 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.type === 'success' 
                ? 'rgba(16, 185, 129, 0.3)' 
                : 'rgba(239, 68, 68, 0.3)'}`,
              color: message.type === 'success' 
                ? 'var(--admin-success-light)' 
                : 'var(--admin-danger-light)'
            }}
          >
            {message.text}
          </div>
        )}

        {/* Sender Configuration */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
            Sender Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text-secondary)' }}>
                Sender Email
              </label>
              <input
                type="email"
                value={settings.sender_email || ''}
                onChange={(e) => updateSetting('sender_email', e.target.value)}
                className="admin-input"
                placeholder="noreply@mintmove.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text-secondary)' }}>
                Sender Name
              </label>
              <input
                type="text"
                value={settings.sender_name || ''}
                onChange={(e) => updateSetting('sender_name', e.target.value)}
                className="admin-input"
                placeholder="MintMove"
              />
            </div>
          </div>
        </div>

        {/* Email Toggles */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
            Email Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                  Order Status Notifications
                </label>
                <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                  Send emails when order status changes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.order_notifications_enabled === 'true'}
                  onChange={(e) => updateSetting('order_notifications_enabled', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div 
                  className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all"
                  style={{
                    background: settings.order_notifications_enabled === 'true' 
                      ? 'var(--admin-primary)' 
                      : 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)'
                  }}
                />
              </label>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                  Verification Emails
                </label>
                <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                  Send verification emails on user signup
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.verification_enabled === 'true'}
                  onChange={(e) => updateSetting('verification_enabled', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div 
                  className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all"
                  style={{
                    background: settings.verification_enabled === 'true' 
                      ? 'var(--admin-primary)' 
                      : 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)'
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="admin-btn admin-btn-primary"
            style={{ opacity: saving ? 0.5 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

