"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AccountLayout from "@/components/AccountLayout";
import { Loader2, ExternalLink } from "lucide-react";

interface Order {
  id: string;
  orderId: string;
  status: string;
  fromCurrency: string;
  fromAmount: number;
  toCurrency: string;
  toAmount: number;
  createdAt: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    checkAuth();
  }, []); // Only check auth once on mount

  useEffect(() => {
    // Reload orders when filter or page changes
    if (orders.length >= 0) { // Always reload (even if empty)
      loadOrders();
    }
  }, [statusFilter, currentPage]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      
      if (!data.success) {
        router.push("/sign-in");
        return;
      }

      await loadOrders();
    } catch (error) {
      router.push("/sign-in");
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      });
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/account/orders/page.tsx:loadOrders',message:'Fetching orders',data:{url:`/api/account/orders?${params}`,statusFilter,currentPage},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
      // #endregion

      const res = await fetch(`/api/account/orders?${params}`);
      const data = await res.json();

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/account/orders/page.tsx:loadOrders',message:'Orders API response',data:{success:data.success,ordersCount:data.orders?.length||0,hasOrders:Array.isArray(data.orders),error:data.error,status:res.status},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
      // #endregion

      if (data.success) {
        setOrders(data.orders || []);
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/account/orders/page.tsx:loadOrders',message:'Orders set in state',data:{ordersCount:data.orders?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
        // #endregion
      } else {
        console.error("Failed to load orders:", data.error);
        setOrders([]);
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/account/orders/page.tsx:loadOrders',message:'Orders API returned error',data:{error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
        // #endregion
      }
    } catch (error: any) {
      console.error("Failed to load orders:", error);
      setOrders([]);
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/account/orders/page.tsx:loadOrders',message:'Orders fetch exception',data:{error:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'order-history',hypothesisId:'ORDERS_NOT_SHOWING'})}).catch(()=>{});
      // #endregion
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-neutral-500/20 text-neutral-400 border-neutral-500/30";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && orders.length === 0) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Orders History</h1>
        
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 md:p-12 text-center">
          <p className="text-neutral-400">No orders found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white font-mono text-sm">{order.orderId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-neutral-400 text-sm">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="text-white font-medium">
                            {order.fromAmount.toFixed(8)}
                          </span>
                          <span className="text-neutral-400 ml-1">{order.fromCurrency}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="text-white font-medium">
                            {order.toAmount.toFixed(8)}
                          </span>
                          <span className="text-neutral-400 ml-1">{order.toCurrency}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/order/${order.orderId}`}
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View Details
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="glass-panel rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-mono text-sm truncate">{order.orderId}</p>
                    <p className="text-neutral-400 text-xs mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium border flex-shrink-0 ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <p className="text-neutral-400 text-xs mb-1">From</p>
                    <p className="text-white text-sm font-medium">
                      {order.fromAmount.toFixed(8)} {order.fromCurrency}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs mb-1">To</p>
                    <p className="text-white text-sm font-medium">
                      {order.toAmount.toFixed(8)} {order.toCurrency}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/order/${order.orderId}`}
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm pt-2 border-t border-white/5"
                >
                  View Details
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {orders.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden mt-4 md:mt-0">

          {/* Pagination */}
          <div className="px-4 md:px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-neutral-400">
              <span>Showing {orders.length} orders</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={orders.length < itemsPerPage}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}

