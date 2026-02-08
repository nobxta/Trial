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
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Lock, CheckCircle, Copy } from 'lucide-react';

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
  from_network?: string | null;
  to_currency: string;
  to_amount: string;
  to_network?: string | null;
  to_address: string | null;
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

const MANUAL_PAYOUT_STATUSES = ['PAYMENT_CONFIRMED', 'MANUAL_REVIEW', 'PROCESSING_BY_PROVIDER'];

const OrdersTable = memo(function OrdersTable({ orders, total, isReviewQueue = false }: OrdersTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUnpaid, setShowUnpaid] = useState<boolean>(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  const handleMarkConfirmed = async (orderId: string) => {
    setConfirmingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_completed' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to mark as confirmed');
        return;
      }
      router.refresh();
    } catch (e) {
      alert('An error occurred');
    } finally {
      setConfirmingOrderId(null);
    }
  };

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
      {
        id: 'manual_payout',
        header: 'Actions',
        cell: ({ row }) => {
          const order = row.original;
          const status = order.internal_status || order.status;
          const showPayout = MANUAL_PAYOUT_STATUSES.includes(status);
          const isConfirming = confirmingOrderId === order.order_id;

          if (!showPayout) {
            return <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>—</span>;
          }

          const addr = order.to_address;
          const payLabel = `${parseFloat(order.to_amount).toFixed(8)} ${order.to_currency}`;

          return (
            <div className="flex flex-col gap-2 max-w-[220px]">
              {addr && (
                <div className="flex items-center gap-1 min-w-0">
                  <code
                    className="font-mono text-[10px] truncate flex-1"
                    style={{ color: 'var(--admin-text-primary)' }}
                    title={addr}
                  >
                    {addr}
                  </code>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        await navigator.clipboard.writeText(addr);
                        if ('vibrate' in navigator) navigator.vibrate(10);
                      } catch {}
                    }}
                    className="shrink-0 p-1 rounded hover:bg-white/10"
                    aria-label="Copy address"
                  >
                    <Copy className="w-3 h-3" style={{ color: 'var(--admin-text-muted)' }} />
                  </button>
                </div>
              )}
              <div className="text-xs font-semibold" style={{ color: 'var(--admin-primary-light)' }}>
                Pay: {payLabel}
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleMarkConfirmed(order.order_id); }}
                disabled={isConfirming || !!order.locked}
                className="admin-btn admin-btn-primary inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold"
                style={{ opacity: (isConfirming || order.locked) ? 0.6 : 1 }}
              >
                {isConfirming ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Confirming…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Confirmed
                  </>
                )}
              </button>
            </div>
          );
        },
      },
    ],
    [confirmingOrderId]
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
                Default View: Payment Confirmed & In Progress
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Showing orders with PAYMENT_CONFIRMED or MANUAL_REVIEW status. These complete automatically; unpaid orders are hidden by default.
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
              In-Progress Queue
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Orders with confirmed payment, sorted oldest first. They complete automatically (sandbox 7–20 min; live when provider reports finished).
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

