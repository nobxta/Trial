"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface InstructionsAndTimeCardProps {
  amount: string;
  symbol: string;
  timeRemaining: number;
  isExpired: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function InstructionsAndTimeCard({
  amount,
  symbol,
  timeRemaining: initialTimeRemaining,
  isExpired,
}: InstructionsAndTimeCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);

  useEffect(() => {
    if (isExpired) {
      setTimeRemaining(0);
      return;
    }
    const interval = setInterval(() => setTimeRemaining((p) => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(interval);
  }, [isExpired]);

  const timeStr = formatTime(timeRemaining);
  const isZeroTime = !isExpired && timeRemaining === 0;

  return (
    <div className="rounded-2xl border border-white/5 border-slate-800/50 bg-[#1a1d23]/40 backdrop-blur-md p-4 sm:p-5 shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-card-enter">
      <h3 className="text-base font-bold text-white mb-3 sm:mb-4">Instructions and time</h3>
      <div className="space-y-3 text-sm">
        <p className="text-slate-400">
          Send exactly{" "}
          <span className="font-semibold text-white">
            {amount} {symbol}
          </span>{" "}
          to the deposit address above.
        </p>
        <div className="flex justify-between items-center gap-3">
          <span className="text-slate-500 uppercase tracking-wide text-xs">Time remaining</span>
          <span
            className={`font-mono inline-flex items-center gap-1.5 ${
              isExpired || isZeroTime ? "text-red-500/80" : "text-amber-500"
            }`}
          >
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            {isExpired ? "Expired" : timeStr}
          </span>
        </div>
      </div>
    </div>
  );
}
