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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: What you need to know */}
      <div className="bg-gradient-to-br from-[#0f1115] to-[#141820] rounded-2xl border border-[#1e2329]/60 shadow-lg p-6 sm:p-8">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">
          What do you need to know?
        </h3>
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <div className="flex-1 pt-1">
              <div className="text-white font-semibold mb-2">
                Quick confirmation
              </div>
              <div className="text-sm text-[#8b949e] leading-relaxed">
                You only need 1 confirmation of the blockchain for the exchange to proceed.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#f59e0b]" />
            </div>
            <div className="flex-1 pt-1">
              <div className="text-white font-semibold mb-2">
                Network speed
              </div>
              <div className="text-sm text-[#8b949e] leading-relaxed">
                Transaction confirmation speed depends on blockchain network congestion. Typically takes 10-60 minutes.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Email notifications */}
      <div className="bg-gradient-to-br from-[#0f1115] to-[#141820] rounded-2xl border border-[#1e2329]/60 shadow-lg p-6 sm:p-8">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">
          Order status notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold mb-2">
                Stay updated
              </div>
              <div className="text-sm text-[#8b949e] mb-5 leading-relaxed">
                Enter your email to receive notifications about changes in the order status.
              </div>
              {!subscribed ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-3 bg-[#0a0d11] border border-[#1e2329] rounded-xl text-white placeholder-[#6b7280] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    disabled={submitting}
                  />
                  <button
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
                        // Save email to localStorage (in production, send to your backend)
                        const orderData = localStorage.getItem(`order_${orderId}`);
                        if (orderData) {
                          const parsed = JSON.parse(orderData);
                          parsed.notificationEmail = email;
                          localStorage.setItem(`order_${orderId}`, JSON.stringify(parsed));
                        }
                        
                        // Simulate API call
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
                    className="px-6 py-3 bg-[#3b82f6] hover:bg-[#2563eb] rounded-xl text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                  >
                    {submitting ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl">
                  <div className="text-[#10b981] font-semibold mb-1">✓ Subscribed to notifications</div>
                  <div className="text-sm text-[#8b949e]">
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

