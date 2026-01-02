'use client';

import { useState, memo } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Lock } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  last_login: string | null;
  created_at: string;
}

interface AdminUsersManagementProps {
  admins: AdminUser[];
}

const AdminUsersManagement = memo(function AdminUsersManagement({ admins }: AdminUsersManagementProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', role: 'viewer' });
  const [editAdmin, setEditAdmin] = useState({ email: '', role: 'viewer', password: '' });

  const handleCreate = async () => {
    if (!newAdmin.email || !newAdmin.password) {
      alert('Email and password are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/security/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create admin user');
        return;
      }

      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const updates: any = { email: editAdmin.email, role: editAdmin.role };
      if (editAdmin.password) {
        updates.password = editAdmin.password;
      }

      const response = await fetch(`/api/admin/security/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update admin user');
        return;
      }

      setEditingId(null);
      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin user? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/security/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete admin user');
        return;
      }

      window.location.reload();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-table-container">
      <div className="admin-table-header">
        <h2>Admin Users</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="admin-btn admin-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      {showCreateForm && (
        <div 
          className="px-6 py-4"
          style={{ 
            background: 'var(--admin-surface)',
            borderBottom: '1px solid var(--admin-border)'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--admin-text-primary)' }}>
            Create New Admin User
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="email"
              placeholder="Email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              className="admin-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              className="admin-input"
            />
            <select
              value={newAdmin.role}
              onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
              className="admin-input"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              className="admin-btn flex items-center gap-2"
              style={{ background: 'var(--admin-success)', color: 'white' }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewAdmin({ email: '', password: '', role: 'viewer' });
              }}
              className="admin-btn admin-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Last Login</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              {editingId === admin.id ? (
                <>
                  <td>
                    <input
                      type="email"
                      value={editAdmin.email}
                      onChange={(e) => setEditAdmin({ ...editAdmin, email: e.target.value })}
                      className="admin-input text-sm"
                    />
                  </td>
                  <td>
                    <select
                      value={editAdmin.role}
                      onChange={(e) => setEditAdmin({ ...editAdmin, role: e.target.value })}
                      className="admin-input text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="operator">Operator</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {admin.last_login ? format(new Date(admin.last_login), 'MMM d, yyyy HH:mm') : 'Never'}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {format(new Date(admin.created_at), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="New password (optional)"
                        value={editAdmin.password}
                        onChange={(e) => setEditAdmin({ ...editAdmin, password: e.target.value })}
                        className="admin-input text-sm"
                      />
                      <button
                        onClick={() => handleEdit(admin.id)}
                        className="admin-btn text-xs px-3 py-1.5"
                        style={{ background: 'var(--admin-success)', color: 'white' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditAdmin({ email: '', role: 'viewer', password: '' });
                        }}
                        className="admin-btn admin-btn-secondary text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{admin.email}</td>
                  <td>
                    <span 
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ 
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: '#818cf8'
                      }}
                    >
                      {admin.role}
                    </span>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {admin.last_login ? format(new Date(admin.last_login), 'MMM d, yyyy HH:mm') : 'Never'}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    {format(new Date(admin.created_at), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingId(admin.id);
                          setEditAdmin({ email: admin.email, role: admin.role, password: '' });
                        }}
                        className="admin-btn admin-btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id)}
                        disabled={deletingId === admin.id}
                        className="admin-btn admin-btn-danger text-xs px-3 py-1.5 flex items-center gap-1"
                        style={{ opacity: deletingId === admin.id ? 0.5 : 1 }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default AdminUsersManagement;
