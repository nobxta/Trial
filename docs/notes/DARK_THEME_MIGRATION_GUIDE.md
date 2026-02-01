# Dark Theme Migration Guide

## ✅ Completed Components

The following components have been fully migrated to dark theme:
- ✅ AdminLayoutWrapper
- ✅ AdminSidebar  
- ✅ AdminTopbar
- ✅ DashboardKPIs
- ✅ OrdersTable
- ✅ AnalyticsCharts
- ✅ UsersTable
- ✅ PaymentsTable
- ✅ OrderDetailPanel
- ✅ DisputesManager

## 🔄 Remaining Components to Update

### High Priority:
1. **UserDetailPanel.tsx** - User detail view with tables
2. **WalletsPayoutsManager.tsx** - Wallet and payout management
3. **WebhookLogsTable.tsx** - Webhook logs table
4. **AdminUsersManagement.tsx** - Admin user management table
5. **RatesFeesEditor.tsx** - Rates and fees editor
6. **ExchangePairEditor.tsx** - Exchange pair editor

### Medium Priority:
7. **app/admin/disputes/[id]/page.tsx** - Dispute detail page
8. **app/admin/settings/page.tsx** - Settings page
9. **app/admin/settings/email/page.tsx** - Email settings
10. **app/admin/email-logs/page.tsx** - Email logs page

## 📋 Migration Pattern

### Step 1: Replace Status Color Functions

**Before:**
```typescript
const statusColors: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  DONE: 'bg-green-100 text-green-800',
  // ...
};
```

**After:**
```typescript
const getStatusStyle = (status: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    NEW: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
    DONE: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
    // ...
  };
  return styles[status] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
};
```

### Step 2: Replace Table Containers

**Before:**
```tsx
<div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
    <h2 className="text-xl font-bold text-gray-900">Title</h2>
  </div>
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gradient-to-r from-gray-50 to-white">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 text-sm text-gray-900">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

**After:**
```tsx
<div className="admin-table-container">
  <div className="admin-table-header">
    <h2>Title</h2>
  </div>
  <table className="admin-table">
    <thead>
      <tr>
        <th>Column</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style={{ color: 'var(--admin-text-primary)' }}>Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Step 3: Replace Cards/Panels

**Before:**
```tsx
<div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
  <h2 className="text-xl font-bold text-gray-900 mb-6">Title</h2>
  <p className="text-sm text-gray-600">Content</p>
</div>
```

**After:**
```tsx
<div className="admin-card p-6">
  <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--admin-text-primary)' }}>
    Title
  </h2>
  <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>Content</p>
</div>
```

### Step 4: Replace Text Colors

**Before:**
```tsx
<p className="text-gray-900">Primary text</p>
<p className="text-gray-600">Secondary text</p>
<p className="text-gray-500">Muted text</p>
```

**After:**
```tsx
<p style={{ color: 'var(--admin-text-primary)' }}>Primary text</p>
<p style={{ color: 'var(--admin-text-secondary)' }}>Secondary text</p>
<p style={{ color: 'var(--admin-text-muted)' }}>Muted text</p>
```

### Step 5: Replace Status Badges

**Before:**
```tsx
<span className={`px-3 py-1 rounded-full text-xs ${statusColors[status]}`}>
  {status}
</span>
```

**After:**
```tsx
{(() => {
  const style = getStatusStyle(status);
  return (
    <span 
      className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
})()}
```

### Step 6: Replace Buttons

**Before:**
```tsx
<button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg">
  Action
</button>
```

**After:**
```tsx
<button className="admin-btn admin-btn-primary">
  Action
</button>
```

### Step 7: Replace Inputs

**Before:**
```tsx
<input className="w-full px-3 py-2 border border-gray-300 rounded-md" />
```

**After:**
```tsx
<input className="admin-input" />
```

### Step 8: Replace Modals

**Before:**
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50">
  <div className="bg-white p-6 rounded-xl">
    Content
  </div>
</div>
```

**After:**
```tsx
<div 
  className="fixed inset-0 flex items-center justify-center z-50"
  style={{ background: 'rgba(0, 0, 0, 0.5)' }}
>
  <div className="admin-card p-6">
    Content
  </div>
</div>
```

## 🎨 Status Style Reference

Use these patterns for common statuses:

```typescript
const getStatusStyle = (status: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    // Order Statuses
    NEW: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
    CONFIRMING: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
    PAYMENT_CONFIRMED: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
    MANUAL_REVIEW: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
    PROCESSING_BY_PROVIDER: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
    DONE: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
    FAILED: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
    EXPIRED: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
    
    // Dispute Statuses
    open: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
    investigating: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
    resolved: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
    closed: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
  };
  return styles[status] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
};
```

## ✅ Checklist for Each Component

- [ ] Replace all `bg-white` with `admin-card` or `admin-table-container`
- [ ] Replace all `text-gray-900` with `style={{ color: 'var(--admin-text-primary)' }}`
- [ ] Replace all `text-gray-600` with `style={{ color: 'var(--admin-text-secondary)' }}`
- [ ] Replace all `text-gray-500` with `style={{ color: 'var(--admin-text-muted)' }}`
- [ ] Replace status color functions with `getStatusStyle()` pattern
- [ ] Replace table structures with `admin-table` classes
- [ ] Replace buttons with `admin-btn` classes
- [ ] Replace inputs with `admin-input` class
- [ ] Update modals to use dark theme
- [ ] Test contrast and readability

## 🚀 Quick Find & Replace Patterns

Use these regex patterns to find remaining white backgrounds:

1. `bg-white` → `admin-card` (for containers) or remove (for tables)
2. `text-gray-900` → `style={{ color: 'var(--admin-text-primary)' }}`
3. `text-gray-600` → `style={{ color: 'var(--admin-text-secondary)' }}`
4. `text-gray-500` → `style={{ color: 'var(--admin-text-muted)' }}`
5. `border-gray-200` → `border` with `style={{ borderColor: 'var(--admin-border)' }}`
6. `bg-gray-50` → `var(--admin-surface)`
7. `bg-gray-100` → `var(--admin-surface)`

## 📝 Notes

- Always test contrast ratios after changes
- Ensure hover states work properly
- Maintain consistent spacing
- Use CSS variables, not hardcoded colors
- Keep the same functionality - only change styling

