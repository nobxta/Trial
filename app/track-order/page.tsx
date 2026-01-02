"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderSummary from "@/components/OrderSummary";
import ProgressTimeline from "@/components/ProgressTimeline";
import { Search, AlertTriangle, Copy, Check } from "lucide-react";

interface OrderData {
  order_id: string;
  status: string;
  type: string;
  created_at: string;
  expires_in: number;
  from: {
    coin: string;
    network: string;
    amount: string;
    address: string;
    confirmations: number;
    required_confirmations: number;
  };
  to: {
    coin: string;
    network: string;
    amount: string;
    address: string;
  };
  tx: {
    deposit_tx: string | null;
    withdraw_tx: string | null;
  };
  timeline: string[];
}

interface EmergencyData {
  show: boolean;
  order_id: string;
  token: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  NEW: { label: "Waiting for payment", color: "text-yellow-400", bgColor: "bg-yellow-500/10 border-yellow-500/20" },
  PENDING: { label: "Payment received", color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20" },
  CONFIRMING: { label: "Confirmations in progress", color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/20" },
  EXCHANGE: { label: "Converting funds", color: "text-indigo-400", bgColor: "bg-indigo-500/10 border-indigo-500/20" },
  WITHDRAW: { label: "Sending funds", color: "text-cyan-400", bgColor: "bg-cyan-500/10 border-cyan-500/20" },
  DONE: { label: "Completed", color: "text-green-400", bgColor: "bg-green-500/10 border-green-500/20" },
  EXPIRED: { label: "Order expired", color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/20" },
  EMERGENCY: { label: "Action required", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20" },
};

const TIMELINE_STEPS = [
  { id: "ORDER_CREATED", label: "Order created" },
  { id: "PAYMENT_RECEIVED", label: "Payment received" },
  { id: "CONFIRMING", label: "Confirmations" },
  { id: "EXCHANGE_IN_PROGRESS", label: "Exchange" },
  { id: "WITHDRAW_COMPLETE", label: "Sending funds" },
  { id: "COMPLETED", label: "Completed" },
];

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [emergency, setEmergency] = useState<EmergencyData>({ show: false, order_id: "", token: "" });
  const [emergencyChoice, setEmergencyChoice] = useState<"CONTINUE" | "REFUND">("CONTINUE");
  const [refundAddress, setRefundAddress] = useState("");
  const [submittingEmergency, setSubmittingEmergency] = useState(false);

  // Allow tracking by orderId alone (standard for crypto exchanges)
  // Email and token are optional
  const isValid = orderId.trim().length > 0;

  const handleTrack = async () => {
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setOrderData(null);

    try {
      const response = await fetch("/api/order/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId.trim().toUpperCase(),
          email: email.trim() || undefined,
          token: token.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.error === "ORDER_NOT_FOUND") {
          setError("Order not found. Please check your Order ID and try again.");
        } else if (data.error === "INVALID_CREDENTIALS") {
          setError("Invalid email or token. Please verify your credentials or try tracking with just the Order ID.");
        } else {
          setError(data.message || data.error || "Failed to track order. Please try again.");
        }
        setLoading(false);
        return;
      }

      setOrderData(data.data);
      
      // If status is EMERGENCY, show emergency UI
      if (data.data.status === "EMERGENCY") {
        setEmergency({
          show: true,
          order_id: data.data.order_id,
          token: token.trim() || "",
        });
      }
    } catch (err: any) {
      setError("Network error. Please check your connection and try again.");
      console.error("Track order error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyAction = async () => {
    if (!emergency.token) {
      setError("Security token is required for emergency actions.");
      return;
    }

    if (emergencyChoice === "REFUND" && !refundAddress.trim()) {
      setError("Refund address is required.");
      return;
    }

    setSubmittingEmergency(true);
    setError(null);

    try {
      const response = await fetch("/api/order/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: emergency.order_id,
          token: emergency.token,
          choice: emergencyChoice,
          refund_address: emergencyChoice === "REFUND" ? refundAddress.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || data.error || "Failed to process emergency action.");
        setSubmittingEmergency(false);
        return;
      }

      // Refresh order data
      await handleTrack();
      setEmergency({ show: false, order_id: "", token: "" });
    } catch (err: any) {
      setError("Network error. Please try again.");
      console.error("Emergency action error:", err);
    } finally {
      setSubmittingEmergency(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [key]: true });
      setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const maskAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const getCurrentStep = (): number => {
    if (!orderData) return 0;
    
    const statusMap: Record<string, number> = {
      NEW: 0,
      PENDING: 1,
      CONFIRMING: 2,
      EXCHANGE: 3,
      WITHDRAW: 4,
      DONE: 5,
    };
    
    return statusMap[orderData.status] || 0;
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Expired";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200">
      <Header />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              Track Your Order
            </h1>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Enter your Order ID to view the current status of your exchange. Email and token are optional.
            </p>
          </div>

          {/* Track Form */}
          {!orderData && (
            <div className="bg-gradient-to-br from-[#141418] via-[#0f0f14] to-[#0a0a0f] rounded-2xl border border-[#1a1a1f]/50 p-6 sm:p-8 mb-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Order ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                    placeholder="MM8X2A"
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors font-mono"
                    onKeyDown={(e) => e.key === "Enter" && isValid && handleTrack()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Email Address <span className="text-neutral-500 text-xs">(optional - for additional verification)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com (optional)"
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#0f0f14] text-neutral-500">OR</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Order Token <span className="text-neutral-500 text-xs">(optional - for additional verification)</span>
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ORDERTOKEN123 (optional)"
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors font-mono"
                  />
                </div>
                
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-300">
                    💡 You can track your order using just the Order ID. Email and token are optional and only used for additional verification.
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleTrack}
                  disabled={!isValid || loading}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Tracking...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Track Order
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Order Display */}
          {orderData && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className={`rounded-2xl border p-6 ${STATUS_CONFIG[orderData.status]?.bgColor || STATUS_CONFIG.NEW.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-400 mb-1">Order Status</div>
                    <div className={`text-2xl font-semibold ${STATUS_CONFIG[orderData.status]?.color || STATUS_CONFIG.NEW.color}`}>
                      {STATUS_CONFIG[orderData.status]?.label || orderData.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-neutral-400 mb-1">Order ID</div>
                    <div className="text-lg font-mono font-semibold text-white">{orderData.order_id}</div>
                  </div>
                </div>
              </div>

              {/* Emergency Alert */}
              {orderData.status === "EMERGENCY" && emergency.show && (
                <div className="bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-orange-500/5 rounded-2xl border border-orange-500/30 p-6 sm:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-orange-400 mb-2">Action Required</h3>
                      <p className="text-neutral-300 mb-6">
                        Your transaction amount does not match the order. Please choose how to proceed.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="emergency-choice"
                              value="CONTINUE"
                              checked={emergencyChoice === "CONTINUE"}
                              onChange={(e) => setEmergencyChoice(e.target.value as "CONTINUE" | "REFUND")}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-neutral-300">Continue exchange at market rate</span>
                          </label>
                        </div>
                        
                        <div className="flex gap-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="emergency-choice"
                              value="REFUND"
                              checked={emergencyChoice === "REFUND"}
                              onChange={(e) => setEmergencyChoice(e.target.value as "CONTINUE" | "REFUND")}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-neutral-300">Request refund</span>
                          </label>
                        </div>

                        {emergencyChoice === "REFUND" && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                              Refund Address <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={refundAddress}
                              onChange={(e) => setRefundAddress(e.target.value)}
                              placeholder="0x..."
                              className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors font-mono"
                            />
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={handleEmergencyAction}
                            disabled={submittingEmergency || (emergencyChoice === "REFUND" && !refundAddress.trim())}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
                          >
                            {submittingEmergency ? "Processing..." : "Submit"}
                          </button>
                          <button
                            onClick={() => {
                              setOrderData(null);
                              setEmergency({ show: false, order_id: "", token: "" });
                            }}
                            className="px-6 py-3 bg-background-secondary hover:bg-background-tertiary rounded-xl text-neutral-300 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exchange Summary */}
              <OrderSummary
                sendAmount={orderData.from.amount}
                sendSymbol={orderData.from.coin}
                receiveAmount={orderData.to.amount}
                receiveSymbol={orderData.to.coin}
              />

              {/* Order Details */}
              <div className="bg-gradient-to-br from-[#141418] via-[#0f0f14] to-[#0a0a0f] rounded-2xl border border-[#1a1a1f]/50 p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-white mb-6">Order Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-sm text-neutral-400 mb-2">Order Type</div>
                    <div className="text-lg font-medium text-white">{orderData.type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-400 mb-2">Created At</div>
                    <div className="text-lg font-medium text-white">
                      {new Date(orderData.created_at).toLocaleString()}
                    </div>
                  </div>
                  {orderData.expires_in > 0 && (
                    <div>
                      <div className="text-sm text-neutral-400 mb-2">Time Remaining</div>
                      <div className="text-lg font-medium text-white">{formatTime(orderData.expires_in)}</div>
                    </div>
                  )}
                </div>

                {/* Deposit Information */}
                <div className="mb-6 p-4 bg-background-secondary/50 rounded-xl border border-border/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Deposit Information</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-neutral-400 mb-1">Deposit Address</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono text-white break-all">
                          {maskAddress(orderData.from.address)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(orderData.from.address, "deposit-address")}
                          className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
                        >
                          {copied["deposit-address"] ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-neutral-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-neutral-400 mb-1">Required Confirmations</div>
                        <div className="text-base font-medium text-white">{orderData.from.required_confirmations}</div>
                      </div>
                      <div>
                        <div className="text-sm text-neutral-400 mb-1">Current Confirmations</div>
                        <div className="text-base font-medium text-white">{orderData.from.confirmations}</div>
                      </div>
                    </div>
                    {orderData.tx.deposit_tx && (
                      <div>
                        <div className="text-sm text-neutral-400 mb-1">Deposit Transaction</div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-blue-400 break-all">
                            {maskAddress(orderData.tx.deposit_tx)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(orderData.tx.deposit_tx!, "deposit-tx")}
                            className="p-1.5 hover:bg-background-tertiary rounded transition-colors"
                          >
                            {copied["deposit-tx"] ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-neutral-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payout Information */}
                <div className="p-4 bg-background-secondary/50 rounded-xl border border-border/30">
                  <h3 className="text-lg font-semibold text-white mb-4">Payout Information</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-neutral-400 mb-1">Destination Address</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono text-white break-all">
                          {maskAddress(orderData.to.address)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(orderData.to.address, "payout-address")}
                          className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
                        >
                          {copied["payout-address"] ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-neutral-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    {orderData.tx.withdraw_tx && (
                      <div>
                        <div className="text-sm text-neutral-400 mb-1">Withdrawal Transaction</div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-green-400 break-all">
                            {maskAddress(orderData.tx.withdraw_tx)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(orderData.tx.withdraw_tx!, "withdraw-tx")}
                            className="p-1.5 hover:bg-background-tertiary rounded transition-colors"
                          >
                            {copied["withdraw-tx"] ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-neutral-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="mt-6">
                <ProgressTimeline currentStep={getCurrentStep()} />
              </div>

              {/* Back to Track Another */}
              <div className="text-center pt-6">
                <button
                  onClick={() => {
                    setOrderData(null);
                    setOrderId("");
                    setEmail("");
                    setToken("");
                    setError(null);
                    setEmergency({ show: false, order_id: "", token: "" });
                  }}
                  className="px-6 py-3 bg-background-secondary hover:bg-background-tertiary rounded-xl text-neutral-300 font-medium transition-colors"
                >
                  Track Another Order
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

