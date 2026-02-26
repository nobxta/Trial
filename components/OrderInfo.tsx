"use client";

import { useState, useEffect } from "react";
import { Info, Check, Zap, Bell, Mail, Loader2 } from "lucide-react";

interface OrderInfoProps {
  orderId: string;
  /** If order already has a notification email (from API), show subscribed state */
  initialNotificationEmail?: string | null;
  /** When true, hide email form and show account-email message */
  isLoggedIn?: boolean;
  text: {
    instructionsTitle: string;
    instructionsTitleShort?: string;
    confirmationsLabel: string;
    confirmationsRequired: string;
    networkSpeedLabel: string;
    networkSpeed: string;
    notificationsTitle: string;
    notificationsTitleShort?: string;
    stayUpdated: string;
    notificationDescription: string;
    emailPlaceholder: string;
    subscribe: string;
    subscribing: string;
    subscribedSuccess: string;
    notificationsSentTo: string;
    notificationsAccountEmail?: string;
  };
}

export default function OrderInfo({ orderId, initialNotificationEmail, isLoggedIn, text }: OrderInfoProps) {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (initialNotificationEmail?.trim()) {
      setEmail(initialNotificationEmail.trim());
      setIsSubscribed(true);
    }
  }, [initialNotificationEmail]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || isSubscribing || isSubscribed) return;

    setIsSubscribing(true);
    try {
      const res = await fetch(`/api/order/${encodeURIComponent(orderId)}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsSubscribed(true);
        if (data.email) setEmail(data.email);
      } else {
        setIsSubscribed(false);
      }
    } catch {
      setIsSubscribed(false);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 min-w-0 max-w-full overflow-hidden">
      {/* What You Need to Know Card */}
      <div className="rounded-[20px] border border-white/10 bg-[#12161F] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.2)] min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}
          >
            <Info className="w-5 h-5 text-[#2563EB]" />
          </div>
          <h3 
            className="text-white font-bold text-base"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {text.instructionsTitle}
          </h3>
        </div>

        {/* Info Items */}
        <div className="flex flex-col gap-4">
          {/* Network Confirmations */}
          <div className="flex items-start gap-3">
            <div 
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
            >
              <Check className="w-3 h-3 text-[#22C55E]" />
            </div>
            <div className="flex flex-col gap-1">
              <span 
                className="text-sm font-semibold text-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {text.confirmationsLabel}
              </span>
              <span 
                className="text-xs"
                style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8' }}
              >
                {text.confirmationsRequired}
              </span>
            </div>
          </div>

          {/* Processing Speed */}
          <div className="flex items-start gap-3">
            <div 
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
            >
              <Zap className="w-3 h-3 text-[#F59E0B]" />
            </div>
            <div className="flex flex-col gap-1">
              <span 
                className="text-sm font-semibold text-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {text.networkSpeedLabel}
              </span>
              <span 
                className="text-xs"
                style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8' }}
              >
                {text.networkSpeed}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Card */}
      <div className="rounded-[20px] border border-white/10 bg-[#12161F] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.2)] min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          >
            <Bell className="w-5 h-5 text-[#22C55E]" />
          </div>
          <h3 
            className="text-white font-bold text-base truncate min-w-0"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {text.notificationsTitle}
          </h3>
        </div>

        {/* Description */}
        <p 
          className="text-[13px] mb-5 break-words"
          style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8' }}
        >
          {text.notificationDescription}
        </p>

        {/* Logged in: no email form */}
        {isLoggedIn ? (
          <div 
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
            >
              <Check className="w-4 h-4 text-[#22C55E]" />
            </div>
            <span 
              className="text-sm text-[#94A3B8] min-w-0 break-words"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {text.notificationsAccountEmail ?? "Notifications will be sent to your account email."}
            </span>
          </div>
        ) : isSubscribed ? (
          <div 
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
            >
              <Check className="w-4 h-4 text-[#22C55E]" />
            </div>
            <div className="flex flex-col">
              <span 
                className="text-sm font-semibold text-[#22C55E]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {text.subscribedSuccess}
              </span>
              <span 
                className="text-xs"
                style={{ fontFamily: 'Inter, sans-serif', color: '#94A3B8' }}
              >
                {text.notificationsSentTo} {email}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 min-w-0">
            <div 
              className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#0B0E14]"
              style={{ border: '1px solid #1E2533' }}
            >
              <Mail className="w-[18px] h-[18px] text-[#64748B] shrink-0" />
              <input
                type="email"
                placeholder={text.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-[#64748B] outline-none w-full"
                style={{ fontFamily: 'Inter, sans-serif' }}
                disabled={isSubscribing}
              />
            </div>
            <button
              type="submit"
              disabled={isSubscribing || !email.includes("@")}
              className="shrink-0 px-6 py-3.5 bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {text.subscribing}
                </>
              ) : (
                text.subscribe
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
