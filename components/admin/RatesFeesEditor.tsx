'use client';

import { useState, useEffect, memo } from 'react';
import { Save } from 'lucide-react';

interface RatesFeesEditorProps {
  initialData: {
    globalFeePercent: number;
    emergencyFeeMultiplier: number;
    rateType: string;
    pairs: Array<{
      id: string;
      from_currency: string;
      to_currency: string;
      from_network: string | null;
      to_network: string | null;
      fee_percent: string;
    }>;
  };
}

const RatesFeesEditor = memo(function RatesFeesEditor({ initialData }: RatesFeesEditorProps) {
  const [globalFee, setGlobalFee] = useState(initialData.globalFeePercent);
  const [emergencyMultiplier, setEmergencyMultiplier] = useState(initialData.emergencyFeeMultiplier);
  const [rateType, setRateType] = useState(initialData.rateType);
  const [pairFees, setPairFees] = useState<Record<string, number>>(
    initialData.pairs.reduce((acc, pair) => {
      acc[pair.id] = parseFloat(pair.fee_percent);
      return acc;
    }, {} as Record<string, number>)
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!confirm('Are you sure you want to update rates and fees? This will affect all future orders.')) {
      return;
    }

    setSaving(true);
    try {
      const pairFeesArray = Object.entries(pairFees).map(([id, fee_percent]) => ({
        id,
        fee_percent,
      }));

      const response = await fetch('/api/admin/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          globalFeePercent: globalFee,
          emergencyFeeMultiplier: emergencyMultiplier,
          rateType,
          pairFees: pairFeesArray,
        }),
      });

      if (!response.ok) {
        alert('Failed to update rates');
        return;
      }

      alert('Rates and fees updated successfully');
      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Global Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Global Fee Percentage
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={globalFee}
              onChange={(e) => setGlobalFee(parseFloat(e.target.value) || 0)}
              className="admin-input"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              Default fee applied to all exchange pairs
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Emergency Fee Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              value={emergencyMultiplier}
              onChange={(e) => setEmergencyMultiplier(parseFloat(e.target.value) || 1)}
              className="admin-input"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              Temporary multiplier for emergency situations
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
              Rate Type
            </label>
            <select
              value={rateType}
              onChange={(e) => setRateType(e.target.value)}
              className="admin-input"
            >
              <option value="float">Float (Dynamic)</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Per-Pair Fee Overrides
        </h2>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pair</th>
                <th>Fee %</th>
              </tr>
            </thead>
            <tbody>
              {initialData.pairs.map((pair) => (
                <tr key={pair.id}>
                  <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                    {pair.from_currency} {pair.from_network && `(${pair.from_network})`} → {pair.to_currency} {pair.to_network && `(${pair.to_network})`}
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={pairFees[pair.id] || 0}
                      onChange={(e) => setPairFees({ ...pairFees, [pair.id]: parseFloat(e.target.value) || 0 })}
                      className="admin-input w-24 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="admin-btn admin-btn-primary flex items-center gap-2"
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
});

export default RatesFeesEditor;

