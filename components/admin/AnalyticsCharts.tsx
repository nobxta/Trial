'use client';

import { useState } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsChartsProps {
  data: any;
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Prepare data for charts
  const statusDistribution = Object.entries(data.orders.byStatus).map(([status, count]) => ({
    status,
    count,
  }));

  const coinFailureData = data.coinFailureRates ? Object.entries(data.coinFailureRates)
    .map(([pair, stats]: [string, any]) => ({
      pair,
      failureRate: stats.rate,
      total: stats.total,
      failed: stats.failed,
    }))
    .sort((a, b) => b.failureRate - a.failureRate)
    .slice(0, 10) : [];

  const feeRevenueData = data.feeRevenuePerPair ? Object.entries(data.feeRevenuePerPair)
    .map(([pair, revenue]: [string, any]) => ({
      pair,
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10) : [];

  // Format volume over time data
  const volumeData = data.volumeOverTime?.[timeRange] || [];
  const formattedVolumeData = volumeData.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    volume: parseFloat(item.volume.toFixed(8)),
  }));

  const chartTextColor = 'var(--admin-text-muted)';
  const chartGridColor = 'var(--admin-border)';
  const tooltipBg = 'var(--admin-card)';
  const tooltipBorder = 'var(--admin-border)';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="admin-card p-6">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
            Orders by Status
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="status" stroke={chartTextColor} tick={{ fill: chartTextColor }} />
              <YAxis stroke={chartTextColor} tick={{ fill: chartTextColor }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: tooltipBg, 
                  border: `1px solid ${tooltipBorder}`, 
                  borderRadius: '8px',
                  boxShadow: 'var(--admin-shadow-lg)',
                  color: 'var(--admin-text-primary)'
                }} 
              />
              <Legend wrapperStyle={{ color: chartTextColor }} />
              <Bar dataKey="count" fill="var(--admin-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>
              Volume Over Time
            </h2>
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: timeRange === range ? 'var(--admin-primary)' : 'var(--admin-surface)',
                    color: timeRange === range ? 'white' : 'var(--admin-text-secondary)',
                    border: timeRange === range ? 'none' : `1px solid var(--admin-border)`
                  }}
                  onMouseEnter={(e) => {
                    if (timeRange !== range) {
                      e.currentTarget.style.background = 'var(--admin-card-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (timeRange !== range) {
                      e.currentTarget.style.background = 'var(--admin-surface)';
                    }
                  }}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>
          {formattedVolumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formattedVolumeData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--admin-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--admin-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="date" stroke={chartTextColor} tick={{ fill: chartTextColor }} />
                <YAxis stroke={chartTextColor} tick={{ fill: chartTextColor }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`, 
                    borderRadius: '8px',
                    boxShadow: 'var(--admin-shadow-lg)',
                    color: 'var(--admin-text-primary)'
                  }}
                  formatter={(value: number) => `${value.toFixed(8)}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="var(--admin-primary)" 
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12" style={{ color: 'var(--admin-text-muted)' }}>
              No volume data available for the selected period
            </div>
          )}
        </div>
      </div>
      {/* Actionable Metrics */}
      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Actionable Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--admin-text-primary)' }}>
              Order Drop-Off Points
            </h3>
            <div className="space-y-1">
              {data.dropOffAnalysis && Object.entries(data.dropOffAnalysis).map(([status, count]: [string, any]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--admin-text-secondary)' }}>{status}:</span>
                  <span className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                    {count} orders stuck
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2" style={{ color: 'var(--admin-text-primary)' }}>
              Confirmation Performance
            </h3>
            <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
              Avg time from CONFIRMING to DONE: <strong style={{ color: 'var(--admin-text-primary)' }}>
                {data.avgConfirmationToDone?.toFixed(1) || 'N/A'} min
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* Coin Failure Rates */}
      {coinFailureData.length > 0 && (
        <div className="admin-card p-6">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
            Coin/Network Failure Rates
          </h2>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Failure Rate</th>
                  <th>Failed</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {coinFailureData.map((item) => {
                  const getFailureStyle = () => {
                    if (item.failureRate > 10) {
                      return { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' };
                    } else if (item.failureRate > 5) {
                      return { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' };
                    } else {
                      return { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' };
                    }
                  };
                  const style = getFailureStyle();
                  return (
                    <tr key={item.pair}>
                      <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                        {item.pair}
                      </td>
                      <td>
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium inline-block"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {item.failureRate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--admin-text-secondary)' }}>{item.failed}</td>
                      <td style={{ color: 'var(--admin-text-secondary)' }}>{item.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fee Revenue per Pair */}
      {feeRevenueData.length > 0 && (
        <div className="admin-card p-6">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
            Fee Revenue per Pair (Top 10)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={feeRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis 
                dataKey="pair" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                stroke={chartTextColor} 
                tick={{ fill: chartTextColor }} 
              />
              <YAxis stroke={chartTextColor} tick={{ fill: chartTextColor }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: tooltipBg, 
                  border: `1px solid ${tooltipBorder}`, 
                  borderRadius: '8px',
                  boxShadow: 'var(--admin-shadow-lg)',
                  color: 'var(--admin-text-primary)'
                }} 
              />
              <Legend wrapperStyle={{ color: chartTextColor }} />
              <Bar dataKey="revenue" fill="var(--admin-success)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="admin-card p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
          Key Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div 
            className="p-4 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text-muted)' }}>
              Success Rate
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--admin-success-light)' }}>
              {data.successRate.toFixed(1)}%
            </p>
          </div>
          <div 
            className="p-4 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text-muted)' }}>
              Avg Exchange Time
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--admin-primary-light)' }}>
              {data.avgExchangeTime.toFixed(1)} min
            </p>
          </div>
          <div 
            className="p-4 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text-muted)' }}>
              Total Orders
            </p>
            <p className="text-3xl font-bold" style={{ color: '#a78bfa' }}>
              {data.orders.total}
            </p>
          </div>
          <div 
            className="p-4 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-text-muted)' }}>
              Revenue
            </p>
            <p className="text-3xl font-bold" style={{ color: '#818cf8' }}>
              ${data.revenue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

