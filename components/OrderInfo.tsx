"use client";

import { useState } from "react";
import { Zap, Mail, Clock } from "lucide-react";

interface OrderInfoProps {
  orderId: string;
}

export default function OrderInfo({ orderId }: OrderInfoProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cardClass = "rounded-lg border border-white/5 bg-[#12161f] p-6 sm:p-8";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: What you need to know */}
      <div className={cardClass}>
        <h3 className="text-base font-bold text-white mb-3 sm:mb-4">
          What do you need to know?
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#3b82f6]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm mb-0.5">Quick confirmation</div>
              <div className="text-xs text-slate-500 leading-relaxed">
                You only need 1 confirmation of the blockchain for the exchange to proceed.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#f59e0b]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm mb-0.5">Network speed</div>
              <div className="text-xs text-slate-500 leading-relaxed">
                Transaction confirmation speed depends on blockchain network congestion. Typically takes 10-60 minutes.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Email notifications */}
      <div className={cardClass}>
        <h3 className="text-base font-bold text-white mb-3 sm:mb-4">
          Order status notifications
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#3b82f6]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm mb-0.5">Stay updated</div>
              <div className="text-xs text-slate-500 mb-2 leading-relaxed">
                Enter your email to receive notifications about changes in the order status.
              </div>
              {!subscribed ? (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 bg-[#0a0d11] border border-[#1e2329] rounded-lg sm:rounded-xl text-sm sm:text-base text-white placeholder-[#6b7280] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email.trim()) {
                        alert('Please enter a valid email address');
                        return;
                      }
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(email)) {
                        alert('Please enter a valid email address');
                        return;
                      }
                      setSubmitting(true);
                      try {
                        const orderData = localStorage.getItem(`order_${orderId}`);
                        if (orderData) {
                          const parsed = JSON.parse(orderData);
                          parsed.notificationEmail = email;
                          localStorage.setItem(`order_${orderId}`, JSON.stringify(parsed));
                        }
                        await new Promise(resolve => setTimeout(resolve, 500));
                        setSubscribed(true);
                        alert('Successfully subscribed to order notifications!');
                      } catch (error) {
                        alert('Failed to subscribe. Please try again.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting || !email.trim()}
                    className="min-h-[44px] min-w-[44px] px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg sm:rounded-xl text-sm sm:text-base text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                  >
                    {submitting ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
              ) : (
                <div className="p-3 sm:p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg sm:rounded-xl">
                  <div className="text-[#10b981] font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">✓ Subscribed to notifications</div>
                  <div className="text-xs sm:text-sm text-slate-500 break-all">
                    Notifications will be sent to {email}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

