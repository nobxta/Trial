'use client';

import { useMemo, useState, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import Link from 'next/link';
import { format } from 'date-fns';
import { Lock } from 'lucide-react';

interface Order {
  id: string;
  order_id: string;
  payment_id: string | null;
  status: string; // Legacy
  internal_status?: string;
  user_status?: string;
  provider_status?: string | null;
  from_currency: string;
  from_amount: string;
  to_currency: string;
  to_amount: string;
  created_at: string;
  updated_at: string;
  locked: boolean;
}

interface OrdersTableProps {
  orders: Order[];
  total: number;
  isReviewQueue?: boolean;
}

const getStatusStyle = (status: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    NEW: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
    AWAITING_DEPOSIT: { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' },
    CONFIRMING: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
    PAYMENT_CONFIRMED: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
    MANUAL_REVIEW: { bg: 'rgba(245, 158, 11, 0.2)', text: 'var(--admin-warning-light)' },
    PROCESSING_BY_PROVIDER: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
    DONE: { bg: 'rgba(16, 185, 129, 0.2)', text: 'var(--admin-success-light)' },
    FAILED: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
    EXPIRED: { bg: 'rgba(239, 68, 68, 0.2)', text: 'var(--admin-danger-light)' },
    PENDING: { bg: 'rgba(59, 130, 246, 0.2)', text: 'var(--admin-primary-light)' },
    EXCHANGE: { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa' },
  };
  return styles[status] || { bg: 'var(--admin-surface)', text: 'var(--admin-text-secondary)' };
};

const OrdersTable = memo(function OrdersTable({ orders, total, isReviewQueue = false }: OrdersTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUnpaid, setShowUnpaid] = useState<boolean>(false);

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: 'order_id',
        header: 'Order ID',
        cell: ({ row }) => (
          <Link
            href={`/admin/orders/${row.original.order_id}`}
            className="font-mono text-sm font-semibold transition-colors hover:underline"
            style={{ color: 'var(--admin-primary-light)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-primary-light)'}
          >
            {row.original.order_id}
          </Link>
        ),
      },
      {
        accessorKey: 'internal_status',
        header: 'Internal Status',
        cell: ({ row }) => {
          const status = row.original.internal_status || row.original.status;
          const style = getStatusStyle(status);
          return (
            <span 
              className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
              style={{ background: style.bg, color: style.text }}
            >
              {status}
              {row.original.locked && <Lock className="w-3 h-3" strokeWidth={2.5} />}
            </span>
          );
        },
      },
      {
        id: 'provider_status',
        header: 'Provider Status',
        cell: ({ row }) => (
          <span 
            className="px-2 py-1 rounded text-xs font-mono"
            style={{ 
              background: 'var(--admin-surface)',
              color: 'var(--admin-text-muted)'
            }}
          >
            {row.original.provider_status || '-'}
          </span>
        ),
      },
      {
        id: 'user_status',
        header: 'User Status',
        cell: ({ row }) => (
          <span 
            className="px-2 py-1 rounded text-xs"
            style={{ 
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--admin-primary-light)'
            }}
          >
            {row.original.user_status || '-'}
          </span>
        ),
      },
      {
        id: 'exchange',
        header: 'From → To',
        cell: ({ row }) => (
          <div className="text-sm font-medium">
            <div style={{ color: 'var(--admin-text-primary)' }}>
              {row.original.from_currency} → {row.original.to_currency}
            </div>
            {row.original.from_network && (
              <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                {row.original.from_network}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'from_amount',
        header: 'Amount',
        cell: ({ row }) => (
          <div className="text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
            {parseFloat(row.original.from_amount).toFixed(8)} {row.original.from_currency}
          </div>
        ),
      },
      {
        accessorKey: 'payment_id',
        header: 'Payment ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {row.original.payment_id || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            {format(new Date(row.original.created_at), 'MMM d, yyyy HH:mm')}
          </div>
        ),
      },
    ],
    []
  );

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    const status = statusFilter;
    return orders.filter(order => (order.internal_status || order.status) === status);
  }, [orders, statusFilter]);

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="space-y-4">
      {!isReviewQueue && (
        <div 
          className="admin-card p-4 mb-4"
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.3)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-primary-light)' }}>
                Default View: Payment Confirmed & Manual Review
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Showing orders with PAYMENT_CONFIRMED or MANUAL_REVIEW status. Unpaid orders are hidden by default.
              </p>
            </div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnpaid}
                onChange={(e) => {
                  setShowUnpaid(e.target.checked);
                  const url = new URL(window.location.href);
                  if (e.target.checked) {
                    url.searchParams.set('showUnpaid', 'true');
                  } else {
                    url.searchParams.delete('showUnpaid');
                  }
                  window.location.href = url.toString();
                }}
                className="w-4 h-4 rounded"
                style={{
                  accentColor: 'var(--admin-primary)'
                }}
              />
              <span className="text-sm font-medium" style={{ color: 'var(--admin-text-primary)' }}>
                Show Unpaid Orders
              </span>
            </label>
          </div>
        </div>
      )}

      {isReviewQueue && (
        <div 
          className="admin-card p-4 mb-4"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            borderColor: 'rgba(245, 158, 11, 0.3)'
          }}
        >
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--admin-warning-light)' }}>
              Manual Review Queue
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Orders with confirmed payment, sorted oldest first. Ready for manual payout processing.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
            Filter by Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-input"
          >
            <option value="all">All</option>
            <option value="NEW">NEW</option>
            <option value="AWAITING_DEPOSIT">AWAITING_DEPOSIT</option>
            <option value="CONFIRMING">CONFIRMING</option>
            <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
            <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
            <option value="PROCESSING_BY_PROVIDER">PROCESSING_BY_PROVIDER</option>
            <option value="DONE">DONE</option>
            <option value="FAILED">FAILED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Total: {total} orders
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="admin-btn admin-btn-secondary"
            style={{ opacity: !table.getCanPreviousPage() ? 0.5 : 1 }}
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="admin-btn admin-btn-secondary"
            style={{ opacity: !table.getCanNextPage() ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
        <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
      </div>
    </div>
  );
});

export default OrdersTable;

