'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
}

export default function AdminEmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/admin/email-logs');
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
        }
      } catch (error) {
        console.error('Failed to fetch email logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      sent: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
      failed: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
      pending: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
    };
    return styles[status] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
  };

  if (loading) {
    return (
      <div className="admin-page-enter">
        <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>Email Logs</h1>
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>To Email</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Sent At</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center" style={{ color: 'var(--admin-text-muted)' }}>
                  No email logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const statusStyle = getStatusStyle(log.status);
                return (
                  <tr key={log.id}>
                    <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                      {log.to_email}
                    </td>
                    <td className="max-w-md truncate" style={{ color: 'var(--admin-text-primary)' }}>
                      {log.subject}
                    </td>
                    <td>
                      <span 
                        className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                        style={{ background: statusStyle.bg, color: statusStyle.text }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--admin-text-muted)' }}>{log.attempts}</td>
                    <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {log.sent_at ? format(new Date(log.sent_at), 'PPpp') : '-'}
                    </td>
                    <td className="text-sm max-w-xs truncate" style={{ color: 'var(--admin-text-muted)' }}>
                      {log.last_error || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

