"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, HelpCircle, Check } from "lucide-react";
import Header from "@/components/Header";
import OrderSummary from "@/components/OrderSummary";
import OrderInfoQRCard from "@/components/OrderInfoQRCard";
import HeroInstructionCard from "@/components/order/HeroInstructionCard";
import OrderQRCard from "@/components/order/OrderQRCard";
import PaymentReceivedHeroCard from "@/components/order/PaymentReceivedHeroCard";
import ProgressTimeline from "@/components/ProgressTimeline";
import OrderInfo from "@/components/OrderInfo";
import CopyToast from "@/components/CopyToast";
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

// Map internal_status to timeline step (0–3). Must match lib/status-mapping getCurrentStep.
// 0: Awaiting deposit | 1: Deposit received | 2: Exchanging | 3: Completed
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

export default function OrderPage({ params }: { params: { id: string } }) {
  const orderId = params.id;
  
  // SINGLE SOURCE OF TRUTH: One state for order data
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isLg, setIsLg] = useState(true);
  const [reportSent, setReportSent] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportIssueType, setReportIssueType] = useState<string | null>(null);
  const [reportOtherText, setReportOtherText] = useState("");
  const [reportSentToast, setReportSentToast] = useState(false);
  const confettiFiredRef = useRef(false);

  const reportIssueOptions = [
    { id: "timeout", label: "Payment was sent but order shows as expired or timed out" },
    { id: "not_detected", label: "Payment not detected or not credited to this order" },
    { id: "address_mistake", label: "Incorrect or wrong destination address used" },
    { id: "other", label: "Other issue" },
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
  
  // Set up polling: fetch order every 6 seconds (reduces server load)
  useEffect(() => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }
    
    // Initial fetch
    fetchOrder();
    
    // Poll every 6 seconds
    pollIntervalRef.current = setInterval(fetchOrder, 6000);
    
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

  // One-time confetti when payment is first detected as received (must run before any early return)
  useEffect(() => {
    if (!order) return;
    const received = [
      "CONFIRMING",
      "PAYMENT_CONFIRMED",
      "PROCESSING_BY_PROVIDER",
      "MANUAL_REVIEW",
      "DONE",
    ].includes(order.internalStatus);
    if (!received || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#4ade80", "#86efac", "#34d399"],
      });
    }).catch(() => {});
  }, [order?.internalStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white selection:bg-blue-500/30 selection:text-blue-200 relative">
        <Header />
        <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-3xl">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-gray-500">Loading order...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0b0e14] text-white selection:bg-blue-500/30 selection:text-blue-200 relative">
        <Header />
        <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-3xl">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="text-red-400 text-lg font-semibold">{error || 'Order not found'}</div>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-[#2563eb] hover:bg-[#3b82f6] rounded-xl text-white font-semibold transition-all"
              >
                Go to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Timer only until first confirmation (NEW / AWAITING_DEPOSIT). After payment is detected (CONFIRMING+), no time limit.
  const createdAt = new Date(order.createdAt);
  const defaultTimeLimit = 15 * 60; // 15 minutes
  const elapsed = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  const showTimer = order.internalStatus === 'NEW' || order.internalStatus === 'AWAITING_DEPOSIT';
  const timerExpired = showTimer && elapsed >= defaultTimeLimit;
  const isExpired =
    order.internalStatus === 'EXPIRED' ||
    !!(order.expiresAt && new Date(order.expiresAt) < new Date()) ||
    timerExpired;
  const timeRemaining = showTimer && !isExpired ? Math.max(0, defaultTimeLimit - elapsed) : 0;
  
  // Get asset metadata (normalized once)
  const sendMeta = getAssetMeta(order.payCurrency);
  const receiveMeta = getAssetMeta(order.outcomeCurrency);
  
  // Format amounts
  const sendAmountFormatted = formatCryptoAmount(order.payAmount, order.payCurrency);
  const receiveAmountFormatted = formatCryptoAmount(order.outcomeAmount, order.outcomeCurrency);
  
  // Get timeline step from internal_status (single source of truth)
  const timelineStep = getStepFromInternalStatus(order.internalStatus);

  // Payment received: CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, MANUAL_REVIEW, DONE
  const isPaymentReceived = [
    "CONFIRMING",
    "PAYMENT_CONFIRMED",
    "PROCESSING_BY_PROVIDER",
    "MANUAL_REVIEW",
    "DONE",
  ].includes(order.internalStatus);

  const sendSymbolShort = sendMeta.name.split(" ")[0].toUpperCase();

  const receiveSymbolShort = receiveMeta.name.split(" ")[0].toUpperCase();

  const handleAddressCopy = () => {
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white selection:bg-blue-500/30 selection:text-blue-200 relative font-sans" key={order.updatedAt}>
      <Header />
      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 flex justify-center overflow-visible">
        <div className="mx-auto max-w-6xl w-full flex flex-col space-y-10 lg:space-y-8 min-w-0 overflow-visible">
          {/* 1. You Send / You Receive Header */}
          <div className="relative z-10 min-w-0 shrink-0">
            <OrderSummary
            sendAmount={sendAmountFormatted}
            sendSymbol={sendSymbolShort}
            sendDisplayName={sendMeta.name}
            sendIconUrl={sendMeta.icon}
            receiveAmount={receiveAmountFormatted}
            receiveSymbol={receiveSymbolShort}
            receiveDisplayName={receiveMeta.name}
            receiveIconUrl={receiveMeta.icon}
          />
          </div>

          {/* 2. Three-column desktop: [Status | Action | QR]. When expired: only Instruction card; no Order details, no QR. */}
          <div className={`grid gap-10 lg:gap-6 items-stretch min-h-0 min-w-0 overflow-visible ${isExpired ? "grid-cols-1 lg:grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_2fr_1.2fr]"}`}>
            {/* Left: Status (Order ID + Time). Hidden when expired */}
            {!isExpired && (
              <div className="order-3 lg:order-1 flex flex-col items-center lg:items-stretch">
                <OrderInfoQRCard
                  orderId={order.orderId}
                  timeRemaining={timeRemaining}
                  createdAt={createdAt}
                  orderType="Fixed rate"
                  isExpired={false}
                  showTimeRemaining={showTimer}
                  slim={isLg}
                  status={order.status}
                  feeLabel="Included in rate"
                />
              </div>
            )}
            {/* Center: Instruction card (and QR when not expired) */}
            <div className={`order-2 lg:order-2 flex flex-col gap-6 lg:gap-6 min-h-0 items-center lg:items-stretch ${!isExpired ? "lg:col-span-2" : ""}`}>
              <AnimatePresence mode="wait">
                {!isPaymentReceived ? (
                  <motion.div
                    key="send-payment"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className={`grid gap-6 lg:gap-6 items-stretch min-h-0 w-full max-w-full [&>*]:min-w-0 ${isExpired ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[2fr_1.2fr]"}`}
                  >
                    <div className="min-w-0 min-h-0 flex flex-col">
                      <HeroInstructionCard
                      orderId={order.orderId}
                      sendAmount={sendAmountFormatted}
                      sendSymbol={sendSymbolShort}
                      depositAddress={order.payAddress || ""}
                      receiveSymbol={receiveSymbolShort}
                      receiveAddress={order.outcomeAddress || null}
                      isExpired={isExpired}
                      onCopy={handleAddressCopy}
                    />
                    </div>
                    {!isExpired && (
                      <div className="order-2 lg:order-2 flex flex-col items-center lg:items-stretch min-w-0 min-h-0">
                        <OrderQRCard
                          orderId={order.orderId}
                          address={order.payAddress || ""}
                          amount={sendAmountFormatted}
                          symbol={sendSymbolShort}
                          isExpired={false}
                        />
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="payment-received"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-6"
                  >
                    <PaymentReceivedHeroCard
                      depositAmount={sendAmountFormatted}
                      depositSymbol={sendSymbolShort}
                      outcomeAmount={receiveAmountFormatted}
                      outcomeSymbol={receiveSymbolShort}
                    />
                    {/* Next Steps */}
                    <div className="rounded-lg border border-white/5 bg-[#12161f] p-5 sm:p-6">
                      <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                        <span className="font-semibold text-slate-300">Next steps:</span>{" "}
                        You can safely close this page. We will notify you via email (if provided) once the {receiveSymbolShort} is sent to your destination address.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 3. Transaction Stepper – hidden when expired; show Report/Support card when expired */}
          {!isExpired && (
            <ProgressTimeline
              currentStep={timelineStep}
              isExpired={false}
              isPaymentReceived={isPaymentReceived}
            />
          )}
          {isExpired && (
            <div className="rounded-lg border border-white/5 bg-[#12161f] p-6 sm:p-8">
              <h3 className="text-base font-bold text-white mb-2 sm:mb-3">Need help?</h3>
              <p className="text-sm text-slate-400 mb-4 sm:mb-5 leading-relaxed">
                If you already sent funds or have a question about this order, we’re here to help. Include your Order ID <span className="font-mono text-slate-300">{order.orderId}</span> when you contact us.
              </p>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <Link
                  href="/support"
                  className="inline-flex items-center justify-center gap-2 min-w-[160px] sm:min-w-[180px] px-5 py-3 bg-[#2563eb] hover:bg-[#3b82f6] text-white font-semibold rounded-xl transition-colors"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  Contact support
                </Link>
                {reportSent ? (
                  <span className="inline-flex items-center justify-center gap-2 min-w-[160px] sm:min-w-[180px] px-5 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium rounded-xl">
                    <Check className="w-4 h-4 shrink-0" />
                    Report Sent
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 min-w-[160px] sm:min-w-[180px] px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium rounded-xl transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    Report an issue
                  </button>
                )}
              </div>
            </div>
          )}

          {!isExpired && !["DONE", "FAILED", "EXPIRED"].includes(order.internalStatus) && isSyncing && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 uppercase tracking-wider">
              <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              <span>Checking payment status...</span>
            </div>
          )}

          {!isExpired && <OrderInfo orderId={orderId} />}
        </div>
      </main>

      <CopyToast visible={showCopyToast} />

        {/* Report issue modal */}
        {reportModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setReportModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
          >
            <div
              className="rounded-xl border border-white/10 bg-[#12161f] w-full max-w-md shadow-xl p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="report-modal-title" className="text-lg font-bold text-white mb-1">Report an issue</h2>
              <p className="text-sm text-slate-400 mb-4">Please select the option that best describes your situation. Our team will review your report shortly.</p>
              <div className="space-y-2 mb-4">
                {reportIssueOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reportIssueType === opt.id
                        ? "border-blue-500/50 bg-blue-500/10 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
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
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
              {reportIssueType === "other" && (
                <textarea
                  placeholder="Please describe your issue (optional)"
                  value={reportOtherText}
                  onChange={(e) => setReportOtherText(e.target.value)}
                  className="w-full min-h-[80px] px-3 py-2.5 rounded-lg bg-[#0b0e14] border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 mb-4"
                  rows={3}
                />
              )}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReportModalOpen(false);
                    setReportIssueType(null);
                    setReportOtherText("");
                  }}
                  className="px-4 py-2.5 text-slate-400 hover:text-white font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReportSubmit}
                  disabled={!reportIssueType}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#3b82f6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  Send report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report sent notification */}
        {reportSentToast && (
          <div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium shadow-lg"
            role="status"
            aria-live="polite"
          >
            <Check className="w-4 h-4 shrink-0" />
            Report sent
          </div>
        )}
    </div>
  );
}
