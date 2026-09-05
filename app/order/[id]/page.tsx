"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, HelpCircle, Check, RefreshCw, ExternalLink, Home, Repeat, History, Clock } from "lucide-react";
import Header from "@/components/Header";
import OrderSummary from "@/components/OrderSummary";
import OrderInfoQRCard from "@/components/OrderInfoQRCard";
import DepositAddressCard from "@/components/order/DepositAddressCard";
import QRModal from "@/components/order/QRModal";
import ProgressTimeline from "@/components/ProgressTimeline";
import OrderInfo from "@/components/OrderInfo";
import CopyToast from "@/components/CopyToast";
import CryptoIcon from "@/components/CryptoIcon";
import { normalizeAsset, getAssetSymbol, getAssetNetworkShort, getAssetIconUrl } from "@/lib/asset-normalize";
import { formatCryptoAmount } from "@/lib/amount-format";
import { orderPageText, getOrderStatusLabel } from "@/lib/order-page-text";

interface Order {
  id: string;
  orderId: string;
  paymentId: string;
  status: string;
  internalStatus: string;
  currentStep: number;
  payAmount: number;
  payCurrency: string;
  payNetwork: string | null;
  payAddress: string | null;
  outcomeAmount: number;
  outcomeCurrency: string;
  outcomeNetwork: string | null;
  outcomeAddress: string | null;
  rateMode: 'fixed' | 'floating' | null;
  providerRateLocked: boolean;
  providerPayAmount: number | null;
  finalReceiveAmount: number | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  payinHash: string | null;
  payoutHash: string | null;
  notificationEmail: string | null;
}

interface AssetInfo {
  symbol: string;
  network: string;
  iconUrl: string;
  displayName: string;
}

function getAssetInfo(assetCode: string): AssetInfo {
  const normalized = normalizeAsset(assetCode);
  
  if (normalized) {
    return {
      symbol: normalized.symbol,
      network: normalized.networkShort,
      iconUrl: normalized.iconUrl,
      displayName: normalized.displayName,
    };
  }
  
  // Fallback
  return {
    symbol: getAssetSymbol(assetCode),
    network: getAssetNetworkShort(assetCode),
    iconUrl: getAssetIconUrl(assetCode),
    displayName: assetCode.toUpperCase(),
  };
}

function getStepFromInternalStatus(internalStatus: string | null): number {
  if (!internalStatus) return 0;
  switch (internalStatus) {
    case 'NEW':
    case 'AWAITING_DEPOSIT':
      return 0;
    case 'CONFIRMING':
      return 1;
    case 'PAYMENT_CONFIRMED':
    case 'PROCESSING_BY_PROVIDER':
    case 'MANUAL_REVIEW':
      return 2;
    case 'DONE':
      return 3;
    case 'FAILED':
    case 'EXPIRED':
      return 0;
    default:
      return 0;
  }
}

function getStatusType(internalStatus: string, isTimerExpired?: boolean): "awaiting" | "confirming" | "exchanging" | "completed" | "expired" {
  // If timer expired and still in awaiting state, show as expired
  if (isTimerExpired && (internalStatus === 'NEW' || internalStatus === 'AWAITING_DEPOSIT')) {
    return 'expired';
  }
  
  switch (internalStatus) {
    case 'NEW':
    case 'AWAITING_DEPOSIT':
      return 'awaiting';
    case 'CONFIRMING':
      return 'confirming';
    case 'PAYMENT_CONFIRMED':
    case 'PROCESSING_BY_PROVIDER':
    case 'MANUAL_REVIEW':
      return 'exchanging';
    case 'DONE':
      return 'completed';
    case 'FAILED':
    case 'EXPIRED':
      return 'expired';
    default:
      return 'awaiting';
  }
}

function getStatusLabel(internalStatus: string, isTimerExpired?: boolean): string {
  // If timer expired and still in awaiting state, show as expired
  if (isTimerExpired && (internalStatus === 'NEW' || internalStatus === 'AWAITING_DEPOSIT')) {
    return 'Expired';
  }
  
  switch (internalStatus) {
    case 'NEW':
    case 'AWAITING_DEPOSIT':
      return 'Awaiting Deposit';
    case 'CONFIRMING':
      return 'Confirming';
    case 'PAYMENT_CONFIRMED':
    case 'PROCESSING_BY_PROVIDER':
    case 'MANUAL_REVIEW':
      return 'Exchanging';
    case 'DONE':
      return 'Completed';
    case 'FAILED':
      return 'Failed';
    case 'EXPIRED':
      return 'Expired';
    default:
      return 'Processing';
  }
}

/**
 * True when two order snapshots carry the same values.
 *
 * Every field is a primitive or null, so a key-by-key comparison is exact and
 * lets the poll skip a state update when nothing moved.
 */
function shallowEqualOrder(a: Order, b: Order): boolean {
  const keys = Object.keys(b) as (keyof Order)[];
  if (keys.length !== Object.keys(a).length) return false;
  return keys.every((k) => a[k] === b[k]);
}

export default function OrderPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isLg, setIsLg] = useState(true);
  const [reportSent, setReportSent] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportIssueType, setReportIssueType] = useState<string | null>(null);
  const [reportOtherText, setReportOtherText] = useState("");
  const [reportSentToast, setReportSentToast] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  /** Only poll when Admin has enabled polling (from API response) */
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const reportIssueOptions = [
    { id: "timeout", label: orderPageText.reportModal.options.timeout },
    { id: "not_detected", label: orderPageText.reportModal.options.notDetected },
    { id: "address_mistake", label: orderPageText.reportModal.options.addressMistake },
    { id: "other", label: orderPageText.reportModal.options.other },
  ] as const;

  const handleReportSubmit = () => {
    if (!reportIssueType) return;
    setReportModalOpen(false);
    setReportSent(true);
    setReportSentToast(true);
    setReportIssueType(null);
    setReportOtherText("");
    setTimeout(() => setReportSentToast(false), 3000);
  };

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);
    const fn = () => setIsLg(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrder = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/order/${orderId}?t=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });

      if (!res.ok) {
        if (res.status === 404) {
          setError('Order not found');
          setLoading(false);
          return;
        }
        if (res.status === 500 || res.status === 503) {
          console.warn('Order API temporarily unavailable');
          return;
        }
        return;
      }

      const data = await res.json();

      if (data?.success && data?.order) {
        const apiOrder = data.order;
        const serverPollingEnabled = data.pollingEnabled === true;
        // CRITICAL: Single source of truth from API — prefer internal_status, fallback to status (legacy), never leave undefined.
        const internalStatus = apiOrder.internalStatus ?? apiOrder.status ?? 'NEW';

        const orderData: Order = {
          id: apiOrder.id,
          orderId: apiOrder.orderId,
          paymentId: apiOrder.paymentId,
          status: apiOrder.status ?? internalStatus,
          internalStatus,
          currentStep: apiOrder.currentStep ?? getStepFromInternalStatus(internalStatus),
          payAmount: apiOrder.payAmount ?? apiOrder.fromAmount,
          payCurrency: apiOrder.payCurrency ?? apiOrder.fromCurrency,
          payNetwork: apiOrder.payNetwork ?? apiOrder.fromNetwork,
          payAddress: apiOrder.payAddress ?? apiOrder.fromAddress,
          outcomeAmount: apiOrder.outcomeAmount ?? apiOrder.toAmount,
          outcomeCurrency: apiOrder.outcomeCurrency ?? apiOrder.toCurrency,
          outcomeNetwork: apiOrder.outcomeNetwork ?? apiOrder.toNetwork,
          outcomeAddress: apiOrder.outcomeAddress ?? apiOrder.toAddress,
          rateMode: apiOrder.rateMode ?? null,
          providerRateLocked: apiOrder.providerRateLocked ?? false,
          providerPayAmount: apiOrder.providerPayAmount ?? null,
          finalReceiveAmount: apiOrder.finalReceiveAmount ?? null,
          createdAt: apiOrder.createdAt,
          updatedAt: apiOrder.updatedAt,
          expiresAt: apiOrder.expiresAt,
          payinHash: apiOrder.payinHash,
          payoutHash: apiOrder.payoutHash,
          notificationEmail: apiOrder.notificationEmail ?? null,
        };

        // Polling runs every ~2s and usually returns identical data. Replacing the
        // object regardless gave it a new identity each time and re-rendered the
        // whole page, so only commit when a field genuinely changed.
        setOrder((prev) => (prev && shallowEqualOrder(prev, orderData) ? prev : orderData));
        setPollingEnabled(serverPollingEnabled);
        setLoading(false);
        setError(null);

        // Development only. The previous condition also accepted `typeof window
        // !== 'undefined'`, which is always true in a browser, so this logged on
        // every poll in production.
        if (process.env.NODE_ENV === 'development') {
          console.log('[Order page] API response status', { orderId: apiOrder.orderId, internalStatus, fromApi: apiOrder.internalStatus });
        }

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
    }
  }, [orderId]);

  const POLL_FAST_MS = 2000;
  const POLL_NORMAL_MS = 5000;
  /** When status is CONFIRMING or exchanging, keep polling fast so UI updates without reload */
  const POLL_ACTIVE_MS = 2500;

  // When polling is disabled by admin, still refresh periodically so UI shows webhook updates without reload
  const FALLBACK_REFRESH_MS = 25000;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.ok && setIsLoggedIn(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }

    fetchOrder();
    if (pollingEnabled) {
      pollIntervalRef.current = setInterval(fetchOrder, POLL_FAST_MS);
    } else {
      pollIntervalRef.current = setInterval(fetchOrder, FALLBACK_REFRESH_MS);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrder();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [orderId, fetchOrder, pollingEnabled]);

  useEffect(() => {
    if (!order) return;
    const finalStatuses = ['DONE', 'FAILED', 'EXPIRED'];
    if (finalStatuses.includes(order.internalStatus)) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const pastExpiresAt = order.expiresAt != null && new Date(order.expiresAt) < new Date();
    if (pastExpiresAt) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    if (!pollingEnabled) return;
    if (!pollIntervalRef.current) return;

    const awaitingDeposit = order.internalStatus === 'NEW' || order.internalStatus === 'AWAITING_DEPOSIT';
    const activeSwap = ['CONFIRMING', 'PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'MANUAL_REVIEW'].includes(order.internalStatus);
    const desiredMs = awaitingDeposit ? POLL_FAST_MS : activeSwap ? POLL_ACTIVE_MS : POLL_NORMAL_MS;

    clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(fetchOrder, desiredMs);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pollingEnabled, order?.internalStatus, order?.expiresAt, fetchOrder]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white">
        <Header />
        <main className="pt-24 pb-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
              <div className="w-12 h-12 border-2 border-[#1E2533] border-t-[#2563EB] rounded-full animate-spin" />
              <p className="text-[#94A3B8] text-sm font-medium">{orderPageText.generic.loading}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Error State
  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white">
        <Header />
        <main className="pt-24 pb-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
              <div className="w-16 h-16 rounded-full bg-[#EF444433] border-2 border-[#EF4444] flex items-center justify-center">
                <span className="text-3xl text-[#EF4444]">!</span>
              </div>
              <h1 className="text-[#EF4444] text-xl font-bold">{error || orderPageText.generic.orderNotFound}</h1>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#3B82F6] rounded-xl text-white font-semibold transition-colors"
              >
                <Home className="w-4 h-4" />
                {orderPageText.generic.goToHome}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  const createdAt = new Date(order.createdAt);
  const defaultTimeLimit = 15 * 60;
  const elapsed = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  const inAwaitingDeposit = order.internalStatus === 'NEW' || order.internalStatus === 'AWAITING_DEPOSIT';
  const showTimer = inAwaitingDeposit;
  const timerExpired = showTimer && elapsed >= defaultTimeLimit;
  const pastExpiresAt = !!(order.expiresAt && new Date(order.expiresAt) < new Date());
  const isExpired = order.internalStatus === 'EXPIRED' || (inAwaitingDeposit && (timerExpired || pastExpiresAt));
  const timeRemaining = showTimer && !isExpired ? Math.max(0, defaultTimeLimit - elapsed) : 0;
  
  // Display: use currency only so we get correct "USDC" + "ERC20" / "USDT" + "TRC20" (no double TRC20)
  const sendInfo = getAssetInfo(order.payCurrency);
  const receiveInfo = getAssetInfo(order.outcomeCurrency);
  const displaySendNetwork = (order.payNetwork?.trim() || sendInfo.network) || undefined;
  const displayReceiveNetwork = (order.outcomeNetwork?.trim() || receiveInfo.network) || undefined;
  // Icon: use network-specific URL only when API sent separate currency+network (e.g. "USDC" + "TRC20"); else use currency's icon
  const sendIconUrl =
    order.payNetwork?.trim() && !sendInfo.network
      ? getAssetIconUrl(order.payCurrency, order.payNetwork)
      : sendInfo.iconUrl;
  const receiveIconUrl =
    order.outcomeNetwork?.trim() && !receiveInfo.network
      ? getAssetIconUrl(order.outcomeCurrency, order.outcomeNetwork)
      : receiveInfo.iconUrl;

  const sendAmountFormatted = formatCryptoAmount(order.payAmount, order.payCurrency);
  const receiveAmountFormatted = formatCryptoAmount(order.outcomeAmount, order.outcomeCurrency);
  
  const timelineStep = order.currentStep ?? getStepFromInternalStatus(order.internalStatus);
  const isPaymentReceived = ["CONFIRMING", "PAYMENT_CONFIRMED", "PROCESSING_BY_PROVIDER", "MANUAL_REVIEW", "DONE"].includes(order.internalStatus);
  const isCompleted = order.internalStatus === 'DONE';

  const handleAddressCopy = () => {
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2500);
  };

  // Completed State
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white">
        <Header />
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-20">
          <div className="mx-auto max-w-6xl space-y-8">
            {/* Success Hero */}
            <div className="rounded-3xl bg-gradient-to-b from-[#22C55E1A] to-transparent border border-[#22C55E33] p-8 md:p-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#22C55E] to-[#4ADE80] flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                  <Check className="w-10 h-10 text-white" strokeWidth={3} />
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 font-['Plus_Jakarta_Sans']">
                Exchange Complete!
              </h1>
              <p className="text-[#94A3B8] text-base mb-8">
                Your funds have been successfully exchanged and sent to your wallet
              </p>
              
              {/* Summary */}
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-3">
                  <CryptoIcon symbol={sendInfo.symbol} imageUrl={sendIconUrl} className="w-12 h-12 rounded-full" />
                  <div className="text-left">
                    <span className="text-[#64748B] text-xs block">Sent</span>
                    <span className="text-white font-bold">{sendAmountFormatted} {sendInfo.symbol}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#22C55E33] flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div className="flex items-center gap-3">
                  <CryptoIcon symbol={receiveInfo.symbol} imageUrl={receiveIconUrl} className="w-12 h-12 rounded-full" />
                  <div className="text-left">
                    <span className="text-[#64748B] text-xs block">Received</span>
                    <span className="text-white font-bold">{receiveAmountFormatted} {receiveInfo.symbol}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2563EB] hover:bg-[#3B82F6] rounded-xl text-white font-semibold transition-colors"
              >
                <Repeat className="w-[18px] h-[18px]" />
                Start New Exchange
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#12161F] hover:bg-[#1A1F2B] border border-[#FFFFFF1A] rounded-xl text-[#94A3B8] font-semibold transition-colors"
              >
                <History className="w-[18px] h-[18px]" />
                View Order History
              </button>
            </div>
          </div>
        </main>
        <CopyToast visible={showCopyToast} message={orderPageText.generic.copied} />
      </div>
    );
  }

  // Expired State
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white">
        <Header />
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg space-y-5">
            
            {/* Main Expired Card - Contains everything */}
            <div className="rounded-[20px] border border-[#FFFFFF1A] bg-[#12161F] overflow-hidden">
              
              {/* Expired Header with Icon */}
              <div className="p-6 pb-4 text-center border-b border-[#FFFFFF0D]">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#EF444420] border border-[#EF444440] mb-4">
                  <Clock className="w-7 h-7 text-[#EF4444]" />
                </div>
                <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Order Expired
                </h1>
                <p className="text-[#64748B] text-sm">
                  The payment was not received within the required time frame.
                </p>
              </div>

              {/* Order Details */}
              <div className="p-5 space-y-4">
                {/* Exchange Summary */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0E14] border border-[#1E2533]">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={sendInfo.symbol} imageUrl={sendIconUrl} className="w-10 h-10 rounded-full" />
                    <div>
                      <span className="text-[#64748B] text-[11px] block">You Pay</span>
                      <span className="text-white font-semibold text-sm">{sendAmountFormatted} {sendInfo.symbol}</span>
                      {displaySendNetwork && <span className="text-[#64748B] text-[10px] ml-1">{displaySendNetwork}</span>}
                    </div>
                  </div>
                  <div className="text-[#64748B] text-lg">→</div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[#64748B] text-[11px] block">You Receive</span>
                      <span className="text-white font-semibold text-sm">{receiveAmountFormatted} {receiveInfo.symbol}</span>
                      {displayReceiveNetwork && <span className="text-[#64748B] text-[10px] ml-1">{displayReceiveNetwork}</span>}
                    </div>
                    <CryptoIcon symbol={receiveInfo.symbol} imageUrl={receiveIconUrl} className="w-10 h-10 rounded-full" />
                  </div>
                </div>

                {/* Order ID */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B0E14] border border-[#1E2533]">
                  <span className="text-[#64748B] text-xs">Order ID</span>
                  <span className="font-mono text-white text-sm">{order.orderId}</span>
                </div>

                {/* Primary Action */}
                <Link
                  href="/"
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#2563EB] hover:bg-[#3B82F6] rounded-xl text-white font-semibold text-sm transition-colors"
                >
                  <Repeat className="w-4 h-4" />
                  Start New Exchange
                </Link>
              </div>
            </div>

            {/* Already Sent Funds - Compact */}
            <div className="rounded-[20px] border border-[#FFFFFF1A] bg-[#12161F] p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#F59E0B1A] flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">Already sent funds?</h3>
                  <p className="text-[#64748B] text-xs leading-relaxed">
                    Contact support with your Order ID if you sent payment after expiry.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/support"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1F2B] hover:bg-[#252B3B] border border-[#FFFFFF1A] rounded-lg text-[#94A3B8] text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact Support
                </Link>
                {!reportSent ? (
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1F2B] hover:bg-[#252B3B] border border-[#FFFFFF1A] rounded-lg text-[#94A3B8] text-sm font-medium transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Report Issue
                  </button>
                ) : (
                  <span className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#22C55E1A] border border-[#22C55E33] rounded-lg text-[#22C55E] text-sm font-medium">
                    <Check className="w-4 h-4" />
                    Sent
                  </span>
                )}
              </div>
            </div>

          </div>
        </main>

        <CopyToast visible={showCopyToast} message={orderPageText.generic.copied} />

        {/* Report Issue Modal */}
        {reportModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E14CC]"
            onClick={() => setReportModalOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="rounded-[20px] border border-[#FFFFFF1A] bg-[#12161F] w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {orderPageText.reportModal.title}
              </h2>
              <p className="text-sm text-[#94A3B8] mb-5">{orderPageText.reportModal.description}</p>
              
              <div className="space-y-2.5 mb-5">
                {reportIssueOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      reportIssueType === opt.id
                        ? "border-[#2563EB] bg-[#2563EB1A] text-white"
                        : "border-[#FFFFFF1A] bg-[#1A1F2B] text-[#94A3B8] hover:border-[#FFFFFF33]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportIssue"
                      value={opt.id}
                      checked={reportIssueType === opt.id}
                      onChange={() => setReportIssueType(opt.id)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      reportIssueType === opt.id ? "border-[#2563EB] bg-[#2563EB]" : "border-[#64748B]"
                    }`}>
                      {reportIssueType === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>

              {reportIssueType === "other" && (
                <textarea
                  placeholder={orderPageText.reportModal.otherPlaceholder}
                  value={reportOtherText}
                  onChange={(e) => setReportOtherText(e.target.value)}
                  className="w-full min-h-[80px] px-4 py-3 rounded-xl bg-[#0B0E14] border border-[#1E2533] text-white text-sm placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] mb-5 resize-none"
                />
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReportModalOpen(false);
                    setReportIssueType(null);
                    setReportOtherText("");
                  }}
                  className="px-4 py-2.5 text-[#94A3B8] hover:text-white font-medium text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReportSubmit}
                  disabled={!reportIssueType}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  Send Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Sent Toast */}
        {reportSentToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#22C55E1A] border border-[#22C55E33] text-[#22C55E] text-sm font-medium">
            <Check className="w-4 h-4" />
            Report sent
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white">
      <Header />
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* ========== MOBILE LAYOUT ========== */}
          <div className="flex flex-col gap-5 md:hidden">
            {/* Order Summary */}
            <OrderSummary
              sendAmount={sendAmountFormatted}
              sendSymbol={sendInfo.symbol}
              sendNetwork={displaySendNetwork}
              sendDisplayName={sendInfo.displayName}
              sendIconUrl={sendIconUrl}
              receiveAmount={receiveAmountFormatted}
              receiveSymbol={receiveInfo.symbol}
              receiveNetwork={displayReceiveNetwork}
              receiveDisplayName={receiveInfo.displayName}
              receiveIconUrl={receiveIconUrl}
              youPayLabel="You Pay"
              youReceiveLabel="You Receive"
              status={getStatusLabel(order.internalStatus, isExpired)}
              statusType={getStatusType(order.internalStatus, isExpired)}
            />

            {/* Mobile Order Info Row */}
            {!isExpired && (
              <div className="rounded-2xl border border-[#FFFFFF1A] bg-[#12161F] p-3.5 flex items-center justify-between">
                <div className="text-center flex-1">
                  <span className="text-[#64748B] text-[10px] font-medium uppercase tracking-wider block">Order ID</span>
                  <span className="text-white font-mono text-xs font-semibold">{order.orderId}</span>
                </div>
                <div className="w-px h-8 bg-[#FFFFFF1A]" />
                <div className="text-center flex-1">
                  <span className="text-[#64748B] text-[10px] font-medium uppercase tracking-wider block">Type</span>
                  <span className="text-white text-xs font-semibold">
                    {order.rateMode === 'fixed' ? 'Fixed Rate' : 'Floating Rate'}
                  </span>
                </div>
                <div className="w-px h-8 bg-[#FFFFFF1A]" />
                <div className="text-center flex-1">
                  <span className="text-[#64748B] text-[10px] font-medium uppercase tracking-wider block">Time Left</span>
                  {showTimer ? (
                    <span className={`font-mono text-xs font-bold ${timeRemaining < 120 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="text-[#64748B] text-xs">—</span>
                  )}
                </div>
              </div>
            )}

            {/* Deposit Address Card */}
            {!isExpired && (
              <>
                <p className="text-[#94A3B8] text-xs mb-1">
                  You must send exactly: <span className="font-semibold text-white">{sendAmountFormatted} {sendInfo.symbol}</span>
                </p>
                <DepositAddressCard
                  depositAddress={order.payAddress || ""}
                  amount={sendAmountFormatted}
                  symbol={sendInfo.symbol}
                internalStatus={order.internalStatus}
                isExpired={false}
                onCopy={handleAddressCopy}
                onViewQr={() => order.payAddress && setQrModalOpen(true)}
                payoutTxHash={order.payoutHash}
                outcomeNetwork={order.outcomeNetwork}
                receivedAmount={receiveAmountFormatted}
                receivedSymbol={receiveInfo.symbol}
                receiveAddress={order.outcomeAddress}
                receiveSymbol={receiveInfo.symbol}
                />
              </>
            )}

            {/* Progress Timeline (Mobile - simplified) */}
            <div className="rounded-2xl border border-[#FFFFFF1A] bg-[#12161F] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">Progress</h3>
                <span className="text-[#94A3B8] text-xs">Step {timelineStep + 1} of 4</span>
              </div>
              <div className="flex gap-2 mb-3">
                {[0, 1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded flex-1 ${
                      step <= timelineStep ? 'bg-[#22C55E]' : 'bg-[#1E2533]'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between">
                {['Waiting', 'Confirming', 'Exchanging', 'Done'].map((label, i) => (
                  <span
                    key={label}
                    className={`text-[10px] font-medium ${
                      i <= timelineStep ? 'text-[#22C55E]' : 'text-[#64748B]'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Help Button (Mobile) */}
            <button
              type="button"
              className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-[#FFFFFF1A] bg-[#12161F] text-[#94A3B8]"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              <span className="text-[13px] font-medium">Need Help? Contact Support</span>
            </button>

            {/* Email notifications (Mobile) — attach email for status updates */}
            <OrderInfo
              orderId={orderId}
              initialNotificationEmail={order?.notificationEmail ?? undefined}
              isLoggedIn={isLoggedIn}
              text={{
                instructionsTitle: orderPageText.information.sectionTitle,
                instructionsTitleShort: orderPageText.information.sectionTitleShort,
                confirmationsLabel: orderPageText.information.confirmationsLabel,
                confirmationsRequired: orderPageText.information.confirmationsRequired,
                networkSpeedLabel: orderPageText.information.networkSpeedLabel,
                networkSpeed: orderPageText.information.networkSpeed,
                notificationsTitle: orderPageText.notification.sectionTitle,
                notificationsTitleShort: orderPageText.notification.sectionTitleShort,
                stayUpdated: orderPageText.notification.stayUpdated,
                notificationDescription: orderPageText.notification.description,
                emailPlaceholder: orderPageText.notification.emailPlaceholder,
                subscribe: orderPageText.notification.subscribe,
                subscribing: orderPageText.notification.subscribing,
                subscribedSuccess: orderPageText.notification.subscribedSuccess,
                notificationsSentTo: orderPageText.notification.notificationsSentTo,
                notificationsAccountEmail: orderPageText.notification.notificationsAccountEmail,
              }}
            />
          </div>

          {/* ========== DESKTOP LAYOUT ========== */}
          <div className="hidden md:flex flex-col gap-8">
            {/* Order Summary Bar */}
            <OrderSummary
              sendAmount={sendAmountFormatted}
              sendSymbol={sendInfo.symbol}
              sendNetwork={displaySendNetwork}
              sendDisplayName={sendInfo.displayName}
              sendIconUrl={sendIconUrl}
              receiveAmount={receiveAmountFormatted}
              receiveSymbol={receiveInfo.symbol}
              receiveNetwork={displayReceiveNetwork}
              receiveDisplayName={receiveInfo.displayName}
              receiveIconUrl={receiveIconUrl}
              youPayLabel="You Pay"
              youReceiveLabel="You Receive"
              status={getStatusLabel(order.internalStatus, isExpired)}
              statusType={getStatusType(order.internalStatus, isExpired)}
            />

            {/* Main Grid: Order Details | Deposit Address (50-50, top-aligned, equal height) */}
            <div className="grid grid-cols-2 gap-6 items-stretch">
              {/* Left Column: Order Details */}
              <div className="flex flex-col h-full min-h-0">
                <div className="text-[#94A3B8] text-xs mb-2 flex-shrink-0 min-h-[1.25rem]" aria-hidden="true" />
                <div className="flex-1 min-h-0 flex flex-col">
                  <OrderInfoQRCard
                    orderId={order.orderId}
                    timeRemaining={timeRemaining}
                    createdAt={createdAt}
                    orderType={order.rateMode === 'fixed' ? 'Fixed Rate' : 'Floating Rate'}
                    isExpired={isExpired}
                    showTimeRemaining={showTimer}
                    slim={isLg}
                    status={getOrderStatusLabel(order.internalStatus) || order.status}
                    feeLabel="Included in rate"
                    rateMode={order.rateMode}
                    providerRateLocked={order.providerRateLocked}
                  />
                </div>
              </div>

              {/* Right Column: Deposit Address */}
              <div className="flex flex-col h-full min-h-0">
                <div className="text-[#94A3B8] text-xs mb-2 flex-shrink-0 min-h-[1.25rem]">
                  You must send exactly: <span className="font-semibold text-white">{sendAmountFormatted} {sendInfo.symbol}</span>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <DepositAddressCard
                    depositAddress={order.payAddress || ""}
                    amount={sendAmountFormatted}
                    symbol={sendInfo.symbol}
                    internalStatus={order.internalStatus}
                    isExpired={isExpired}
                    onCopy={handleAddressCopy}
                    onViewQr={() => order.payAddress && setQrModalOpen(true)}
                    payoutTxHash={order.payoutHash}
                    outcomeNetwork={order.outcomeNetwork}
                    receivedAmount={receiveAmountFormatted}
                    receivedSymbol={receiveInfo.symbol}
                    receiveAddress={order.outcomeAddress}
                    receiveSymbol={receiveInfo.symbol}
                  />
                </div>
              </div>
            </div>

            {/* Progress Timeline */}
            <ProgressTimeline
              key={`timeline-${order.internalStatus}-${order.updatedAt}`}
              currentStep={timelineStep}
              isExpired={isExpired}
              isPaymentReceived={isPaymentReceived}
              internalStatus={order.internalStatus}
            />

            {/* Expired Help Section */}
            {isExpired && (
              <div className="rounded-[20px] border border-[#FFFFFF1A] bg-[#12161F] p-6 md:p-8">
                <h3 className="text-lg font-bold text-white mb-3 font-['Plus_Jakarta_Sans']">Need help?</h3>
                <p className="text-sm text-[#94A3B8] mb-6 leading-relaxed max-w-xl">
                  If you already sent funds or have a question about this order, we're here to help. 
                  Include your Order ID <span className="font-mono text-white bg-[#1A1F2B] px-2 py-0.5 rounded">{order.orderId}</span> when you contact us.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/support"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-semibold rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {orderPageText.generic.contactSupport}
                  </Link>
                  {reportSent ? (
                    <span className="inline-flex items-center gap-2 px-6 py-3 bg-[#22C55E33] border border-[#22C55E] text-[#22C55E] font-medium rounded-xl">
                      <Check className="w-4 h-4" />
                      {orderPageText.generic.reportSent}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1F2B] hover:bg-[#252B3B] border border-[#FFFFFF1A] text-[#94A3B8] font-medium rounded-xl transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                      {orderPageText.generic.reportIssue}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Info & Notifications */}
            <OrderInfo
              orderId={orderId}
              initialNotificationEmail={order?.notificationEmail ?? undefined}
              isLoggedIn={isLoggedIn}
              text={{
                instructionsTitle: orderPageText.information.sectionTitle,
                instructionsTitleShort: orderPageText.information.sectionTitleShort,
                confirmationsLabel: orderPageText.information.confirmationsLabel,
                confirmationsRequired: orderPageText.information.confirmationsRequired,
                networkSpeedLabel: orderPageText.information.networkSpeedLabel,
                networkSpeed: orderPageText.information.networkSpeed,
                notificationsTitle: orderPageText.notification.sectionTitle,
                notificationsTitleShort: orderPageText.notification.sectionTitleShort,
                stayUpdated: orderPageText.notification.stayUpdated,
                notificationDescription: orderPageText.notification.description,
                emailPlaceholder: orderPageText.notification.emailPlaceholder,
                subscribe: orderPageText.notification.subscribe,
                subscribing: orderPageText.notification.subscribing,
                subscribedSuccess: orderPageText.notification.subscribedSuccess,
                notificationsSentTo: orderPageText.notification.notificationsSentTo,
                notificationsAccountEmail: orderPageText.notification.notificationsAccountEmail,
              }}
            />
          </div>
        </div>
      </main>

      <CopyToast visible={showCopyToast} message={orderPageText.generic.copied} />

      {/* QR Modal */}
      <QRModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        address={order?.payAddress ?? ""}
        amount={sendAmountFormatted}
        symbol={sendInfo.symbol}
        imageUrl={sendIconUrl}
      />

      {/* Report Issue Modal */}
      {reportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E14CC]"
          onClick={() => setReportModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="rounded-[20px] border border-[#FFFFFF1A] bg-[#12161F] w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-2 font-['Plus_Jakarta_Sans']">{orderPageText.reportModal.title}</h2>
            <p className="text-sm text-[#94A3B8] mb-6">{orderPageText.reportModal.description}</p>
            
            <div className="space-y-3 mb-6">
              {reportIssueOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    reportIssueType === opt.id
                      ? "border-[#2563EB] bg-[#2563EB1A] text-white"
                      : "border-[#FFFFFF1A] bg-[#1A1F2B] text-[#94A3B8] hover:border-[#FFFFFF33]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportIssue"
                    value={opt.id}
                    checked={reportIssueType === opt.id}
                    onChange={() => setReportIssueType(opt.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    reportIssueType === opt.id ? "border-[#2563EB] bg-[#2563EB]" : "border-[#64748B]"
                  }`}>
                    {reportIssueType === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>

            {reportIssueType === "other" && (
              <textarea
                placeholder={orderPageText.reportModal.otherPlaceholder}
                value={reportOtherText}
                onChange={(e) => setReportOtherText(e.target.value)}
                className="w-full min-h-[100px] px-4 py-3 rounded-xl bg-[#0B0E14] border border-[#1E2533] text-white text-sm placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] mb-6 resize-none"
              />
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setReportModalOpen(false);
                  setReportIssueType(null);
                  setReportOtherText("");
                }}
                className="px-5 py-2.5 text-[#94A3B8] hover:text-white font-medium rounded-xl transition-colors"
              >
                {orderPageText.reportModal.cancel}
              </button>
              <button
                type="button"
                onClick={handleReportSubmit}
                disabled={!reportIssueType}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
                {orderPageText.reportModal.sendReport}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Sent Toast */}
      {reportSentToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl bg-[#22C55E33] border border-[#22C55E] text-[#22C55E] font-medium">
          <Check className="w-5 h-5" />
          {orderPageText.generic.reportSent}
        </div>
      )}
    </div>
  );
}
