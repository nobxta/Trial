'use client';

import { useState, memo } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Shield, User as UserIcon } from 'lucide-react';

interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  totalOrders: number;
  totalVolume: number;
  lastOrderDate: string | null;
  flagged: boolean;
  blocked: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

interface UsersTableProps {
  users: User[];
  total: number;
}

const UsersTable = memo(function UsersTable({ users, total }: UsersTableProps) {
  const router = useRouter();
  const [flaggingUserId, setFlaggingUserId] = useState<string | null>(null);

  const handleFlagUser = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    const reason = prompt('Reason for flagging this user:');
    if (!reason) return;

    setFlaggingUserId(userId);
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

      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setFlaggingUserId(null);
    }
  };

  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
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

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <AlertTriangle className="w-3 h-3" />;
      case 'medium':
        return <Shield className="w-3 h-3" />;
      default:
        return <UserIcon className="w-3 h-3" />;
    }
  };

  return (
    <div className="admin-table-container">
      <div className="admin-table-header">
        <h2>All Users</h2>
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
            <th>User ID</th>
            <th>Email</th>
            <th>Orders</th>
            <th>Volume</th>
            <th>Last Order</th>
            <th>Risk</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const riskStyle = getRiskColor(user.riskLevel);
            return (
              <tr 
                key={user.id} 
                className="cursor-pointer"
                onClick={() => handleRowClick(user.id)}
              >
                <td className="font-mono font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {user.id.slice(0, 8)}...
                </td>
                <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                  {user.email}
                </td>
                <td className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                  {user.totalOrders}
                </td>
                <td className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                  {user.totalVolume.toFixed(8)}
                </td>
                <td style={{ color: 'var(--admin-text-muted)' }}>
                  {user.lastOrderDate ? format(new Date(user.lastOrderDate), 'MMM d, yyyy') : '-'}
                </td>
                <td>
                  <span 
                    className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
                    style={{ background: riskStyle.bg, color: riskStyle.text }}
                  >
                    {getRiskIcon(user.riskLevel)}
                    {user.riskLevel.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {user.flagged && (
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: 'var(--admin-danger-light)'
                        }}
                      >
                        Flagged
                      </span>
                    )}
                    {user.blocked && (
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          background: 'var(--admin-danger)',
                          color: 'white'
                        }}
                      >
                        Blocked
                      </span>
                    )}
                  </div>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleFlagUser(user.id, e)}
                    disabled={flaggingUserId === user.id || user.flagged}
                    className="admin-btn admin-btn-danger"
                    style={{ opacity: (flaggingUserId === user.id || user.flagged) ? 0.5 : 1 }}
                  >
                    {flaggingUserId === user.id ? 'Flagging...' : user.flagged ? 'Flagged' : 'Flag User'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default UsersTable;

