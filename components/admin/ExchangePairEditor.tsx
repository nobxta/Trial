'use client';

import { useState, memo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ExchangePair {
  id: string;
  from_currency: string;
  from_network: string | null;
  to_currency: string;
  to_network: string | null;
  enabled: boolean;
  min_amount: string;
  max_amount: string | null;
  fee_percent: string;
}

interface ExchangePairEditorProps {
  pairs: ExchangePair[];
}

const ExchangePairEditor = memo(function ExchangePairEditor({ pairs }: ExchangePairEditorProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleToggle = async (pairId: string, enabled: boolean) => {
    setUpdating(pairId);
    try {
      const response = await fetch('/api/admin/exchange/pairs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pairId, enabled: !enabled }),
      });

      if (!response.ok) {
        alert('Failed to update pair');
        return;
      }

      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setUpdating(null);
    }
  };

  const handleSimulate = async (pairId: string, enabled?: boolean, minAmount?: string, maxAmount?: string) => {
    setSimulating(pairId);
    try {
      const response = await fetch('/api/admin/exchange/pairs/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId,
          enabled,
          minAmount,
          maxAmount,
        }),
      });

      if (!response.ok) {
        alert('Failed to simulate changes');
        return;
      }

      const data = await response.json();
      setSimulationResult({ pairId, ...data.simulation });
    } catch (error) {
      alert('An error occurred');
    } finally {
      setSimulating(null);
    }
  };

  const handleUpdateAmounts = async (pairId: string, minAmount: string, maxAmount: string) => {
    setUpdating(pairId);
    try {
      const response = await fetch('/api/admin/exchange/pairs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pairId,
          minAmount: parseFloat(minAmount),
          maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        }),
      });

      if (!response.ok) {
        alert('Failed to update amounts');
        return;
      }

      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      {simulationResult && (
        <div 
          className="rounded-lg p-4 animate-fade-in"
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}
        >
          <h3 className="font-semibold mb-2" style={{ color: 'var(--admin-primary-light)' }}>
            Simulation Preview
          </h3>
          <div className="space-y-2 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            <p>
              <strong style={{ color: 'var(--admin-text-primary)' }}>Pair:</strong> {simulationResult.pair.from_currency} → {simulationResult.pair.to_currency}
            </p>
            {simulationResult.impact.activeOrdersAffected > 0 && (
              <p className="flex items-center gap-1" style={{ color: 'var(--admin-danger-light)' }}>
                <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                {simulationResult.impact.activeOrdersAffected} active orders would be affected by disabling this pair
              </p>
            )}
            {simulationResult.impact.pendingOrdersAffected > 0 && (
              <p className="flex items-center gap-1" style={{ color: 'var(--admin-warning-light)' }}>
                <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                {simulationResult.impact.pendingOrdersAffected} pending orders would be affected by min/max changes
              </p>
            )}
            {simulationResult.impact.minAmountChange && (
              <p>
                Min amount: {simulationResult.impact.minAmountChange.current} → {simulationResult.impact.minAmountChange.proposed} 
                ({simulationResult.impact.minAmountChange.percentageChange > 0 ? '+' : ''}{simulationResult.impact.minAmountChange.percentageChange.toFixed(1)}%)
              </p>
            )}
          </div>
          <button
            onClick={() => setSimulationResult(null)}
            className="mt-2 text-sm transition-colors hover:underline"
            style={{ color: 'var(--admin-primary-light)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
          >
            Close
          </button>
        </div>
      )}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Exchange Pairs</h2>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pair</th>
              <th>Enabled</th>
              <th>Min Amount</th>
              <th>Max Amount</th>
              <th>Fee %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.id}>
                <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {pair.from_currency} {pair.from_network && `(${pair.from_network})`} → {pair.to_currency} {pair.to_network && `(${pair.to_network})`}
                </td>
                <td>
                  <button
                    onClick={() => handleToggle(pair.id, pair.enabled)}
                    disabled={updating === pair.id}
                    className="admin-btn text-xs px-4 py-2"
                    style={{ 
                      background: pair.enabled ? 'var(--admin-success)' : 'var(--admin-text-muted)',
                      color: 'white',
                      opacity: updating === pair.id ? 0.5 : 1
                    }}
                  >
                    {updating === pair.id ? '...' : pair.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {parseFloat(pair.min_amount).toFixed(8)}
                </td>
                <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {pair.max_amount ? parseFloat(pair.max_amount).toFixed(8) : '∞'}
                </td>
                <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {parseFloat(pair.fee_percent).toFixed(2)}%
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const min = prompt('Min amount:', pair.min_amount);
                        const max = prompt('Max amount (leave empty for unlimited):', pair.max_amount || '');
                        if (min !== null) {
                          handleSimulate(pair.id, undefined, min, max || '');
                        }
                      }}
                      disabled={simulating === pair.id}
                      className="admin-btn admin-btn-primary text-sm px-4 py-2"
                      style={{ opacity: simulating === pair.id ? 0.5 : 1 }}
                    >
                      {simulating === pair.id ? 'Simulating...' : 'Preview'}
                    </button>
                    <button
                      onClick={() => {
                        const min = prompt('Min amount:', pair.min_amount);
                        const max = prompt('Max amount (leave empty for unlimited):', pair.max_amount || '');
                        if (min !== null) {
                          handleUpdateAmounts(pair.id, min, max || '');
                        }
                      }}
                      disabled={updating === pair.id}
                      className="admin-btn admin-btn-primary text-sm px-4 py-2"
                      style={{ opacity: updating === pair.id ? 0.5 : 1 }}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default ExchangePairEditor;

