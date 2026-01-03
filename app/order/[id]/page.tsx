"use client";

import { useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import OrderSummary from "@/components/OrderSummary";
import OrderDetails from "@/components/OrderDetails";
import QRCodeSection from "@/components/QRCodeSection";
import ProgressTimeline from "@/components/ProgressTimeline";
import OrderInfo from "@/components/OrderInfo";
import { normalizeAsset } from "@/lib/asset-normalize";
import { formatCryptoAmount } from "@/lib/amount-format";

// Single source of truth: Order from API
interface Order {
  id: string;
  orderId: string;
  paymentId: string;
  status: string; // User-facing status
  internalStatus: string; // Internal status (NEW, PAYMENT_CONFIRMED, DONE, etc.)
  currentStep: number; // Progress step from backend
  // Crypto amounts (what user sends/receives)
  payAmount: number; // Crypto amount user sends
  payCurrency: string; // Crypto currency user sends
  payNetwork: string | null;
  payAddress: string | null;
  outcomeAmount: number; // Crypto amount user receives
  outcomeCurrency: string; // Crypto currency user receives
  outcomeNetwork: string | null;
  outcomeAddress: string | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  // Transaction hashes
  payinHash: string | null;
  payoutHash: string | null;
}

// Normalized asset metadata (computed once, never changes)
const ASSET_META: Record<string, { name: string; icon: string }> = {
  eth: { name: 'Ethereum', icon: 'https://nowpayments.io/images/coins/eth.svg' },
  btc: { name: 'Bitcoin', icon: 'https://nowpayments.io/images/coins/btc.svg' },
  usdt: { name: 'Tether', icon: 'https://nowpayments.io/images/coins/usdt.svg' },
  usdttrc20: { name: 'USDT (Tron)', icon: 'https://nowpayments.io/images/coins/usdt.svg' },
  usdterc20: { name: 'USDT (Ethereum)', icon: 'https://nowpayments.io/images/coins/usdt.svg' },
  usdc: { name: 'USD Coin', icon: 'https://nowpayments.io/images/coins/usdc.svg' },
  bnb: { name: 'BNB', icon: 'https://nowpayments.io/images/coins/bnb.svg' },
  sol: { name: 'Solana', icon: 'https://nowpayments.io/images/coins/sol.svg' },
};

function getAssetMeta(assetCode: string): { name: string; icon: string } {
  const key = assetCode.toLowerCase();
  const normalized = normalizeAsset(assetCode);
  
  if (normalized) {
    return {
      name: normalized.displayName,
      icon: normalized.iconUrl,
    };
  }
  return ASSET_META[key] || {
    name: assetCode.toUpperCase(),
    icon: `https://nowpayments.io/images/coins/${key}.svg`,
  };
}

// Map internal_status to timeline step
function getStepFromInternalStatus(internalStatus: string | null): number {
  if (!internalStatus) return 0;
  
  switch (internalStatus) {
    case 'NEW':
    case 'AWAITING_DEPOSIT':
      return 0; // Waiting for payment
    case 'CONFIRMING':
      return 1; // Waiting for confirmation
    case 'PAYMENT_CONFIRMED':
      return 2; // Payment confirmed
    case 'PROCESSING_BY_PROVIDER':
    case 'MANUAL_REVIEW':
      return 3; // Processing
    case 'DONE':
      return 4; // Completed
    case 'FAILED':
    case 'EXPIRED':
      return 0; // Failed/Expired (show at beginning)
    default:
      return 0;
  }
}

export default function OrderPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  
  // SINGLE SOURCE OF TRUTH: One state for order data
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Refs for polling management
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch order from API (single source of truth)
  const fetchOrder = async (): Promise<void> => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/order/${orderId}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('Order not found');
          setLoading(false);
          setIsSyncing(false);
          return;
        }
        if (res.status === 500 || res.status === 503) {
          console.warn('Order API temporarily unavailable');
          setIsSyncing(false);
          return;
        }
        setIsSyncing(false);
        return;
      }
      
      const data = await res.json();
      
      if (data?.success && data?.order) {
        const apiOrder = data.order;
        
        // CRITICAL: ALWAYS update state - no comparisons, no skipping
        const orderData: Order = {
          id: apiOrder.id,
          orderId: apiOrder.orderId,
          paymentId: apiOrder.paymentId,
          status: apiOrder.status,
          internalStatus: apiOrder.internalStatus,
          currentStep: apiOrder.currentStep ?? getStepFromInternalStatus(apiOrder.internalStatus),
          payAmount: apiOrder.payAmount ?? apiOrder.fromAmount,
          payCurrency: apiOrder.payCurrency ?? apiOrder.fromCurrency,
          payNetwork: apiOrder.payNetwork ?? apiOrder.fromNetwork,
          payAddress: apiOrder.payAddress ?? apiOrder.fromAddress,
          outcomeAmount: apiOrder.outcomeAmount ?? apiOrder.toAmount,
          outcomeCurrency: apiOrder.outcomeCurrency ?? apiOrder.toCurrency,
          outcomeNetwork: apiOrder.outcomeNetwork ?? apiOrder.toNetwork,
          outcomeAddress: apiOrder.outcomeAddress ?? apiOrder.toAddress,
          createdAt: apiOrder.createdAt,
          updatedAt: apiOrder.updatedAt,
          expiresAt: apiOrder.expiresAt,
          payinHash: apiOrder.payinHash,
          payoutHash: apiOrder.payoutHash,
        };
        
        setOrder(orderData);
        setLoading(false);
        setError(null);
        
        // Stop polling on final states
        const finalStatuses = ['DONE', 'FAILED', 'EXPIRED'];
        if (finalStatuses.includes(orderData.internalStatus)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } else {
        setError('Order not found');
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError('Failed to load order');
      setLoading(false);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Set up polling: fetch order every 3 seconds
  useEffect(() => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }
    
    // Initial fetch
    fetchOrder();
    
    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(fetchOrder, 3000);
    
    // Visibility-based refetch
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrder();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [orderId]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d11] text-white selection:bg-blue-500/30 selection:text-blue-200 relative">
        <Header />
        <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-[#8b949e]">Loading order...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0a0d11] text-white selection:bg-blue-500/30 selection:text-blue-200 relative">
        <Header />
        <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="text-red-400 text-lg font-semibold">{error || 'Order not found'}</div>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] rounded-xl text-white font-semibold transition-colors shadow-lg shadow-blue-500/20"
              >
                Go to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Check if expired
  const isExpired = order.internalStatus === 'EXPIRED' || 
    !!(order.expiresAt && new Date(order.expiresAt) < new Date());
  
  // Calculate time remaining
  const createdAt = new Date(order.createdAt);
  const defaultTimeLimit = 15 * 60; // 15 minutes
  const elapsed = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  const timeRemaining = isExpired ? 0 : Math.max(0, defaultTimeLimit - elapsed);
  
  // Get asset metadata (normalized once)
  const sendMeta = getAssetMeta(order.payCurrency);
  const receiveMeta = getAssetMeta(order.outcomeCurrency);
  
  // Format amounts
  const sendAmountFormatted = formatCryptoAmount(order.payAmount, order.payCurrency);
  const receiveAmountFormatted = formatCryptoAmount(order.outcomeAmount, order.outcomeCurrency);
  
  // Get timeline step from internal_status (single source of truth)
  const timelineStep = getStepFromInternalStatus(order.internalStatus);
  
  return (
    <div className="min-h-screen bg-[#0a0d11] text-white selection:bg-blue-500/30 selection:text-blue-200 relative" key={order.updatedAt}>
      <Header />
      <main className="relative z-10 pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6">
        {/* Subtle background gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="container mx-auto max-w-7xl">
          {/* Order Summary */}
          <OrderSummary
            sendAmount={sendAmountFormatted}
            sendSymbol={sendMeta.name.split(' ')[0].toUpperCase()}
            sendDisplayName={sendMeta.name}
            sendIconUrl={sendMeta.icon}
            receiveAmount={receiveAmountFormatted}
            receiveSymbol={receiveMeta.name.split(' ')[0].toUpperCase()}
            receiveDisplayName={receiveMeta.name}
            receiveIconUrl={receiveMeta.icon}
          />
          
          {/* Main Order Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left: Order Details */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <OrderDetails
                orderId={order.orderId}
                depositAmount={sendAmountFormatted}
                depositSymbol={sendMeta.name.split(' ')[0].toUpperCase()}
                depositDisplayName={sendMeta.name}
                depositIconUrl={sendMeta.icon}
                depositAddress={order.payAddress || ''}
                orderType="Fixed rate"
                confirmationsNeeded={1}
                timeRemaining={timeRemaining}
                createdAt={createdAt}
                isExpired={isExpired}
                receiveSymbol={receiveMeta.name.split(' ')[0].toUpperCase()}
                receiveDisplayName={receiveMeta.name}
                internalStatus={order.internalStatus}
              />
            </div>
            
            {/* Right: QR Code */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <QRCodeSection
                address={order.payAddress || ''}
                amount={sendAmountFormatted}
                symbol={sendMeta.name.split(' ')[0].toUpperCase()}
                isExpired={isExpired}
              />
            </div>
          </div>
          
          {/* Progress Timeline */}
          <div className="mt-6 sm:mt-8">
            <ProgressTimeline currentStep={timelineStep} isExpired={isExpired} />
            
            {/* Subtle syncing indicator */}
            {!isExpired && !['DONE', 'FAILED', 'EXPIRED'].includes(order.internalStatus) && isSyncing && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#8b949e]">
                <div className="w-4 h-4 border-2 border-[#8b949e] border-t-transparent rounded-full animate-spin"></div>
                <span>Checking payment status...</span>
              </div>
            )}
          </div>
          
          {/* Info Sections */}
          <div className="mt-8 sm:mt-10 md:mt-12">
            <OrderInfo orderId={orderId} />
          </div>
        </div>
      </main>
    </div>
  );
}
