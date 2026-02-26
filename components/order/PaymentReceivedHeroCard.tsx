"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface PaymentReceivedHeroCardProps {
  /** Deposit amount (e.g. "3.10") */
  depositAmount: string;
  /** Deposit currency symbol (e.g. "BTC") */
  depositSymbol: string;
  /** Outcome amount (e.g. "98.46") */
  outcomeAmount: string;
  /** Outcome currency symbol (e.g. "ETH") */
  outcomeSymbol: string;
}

export default function PaymentReceivedHeroCard({
  depositAmount,
  depositSymbol,
  outcomeAmount,
  outcomeSymbol,
}: PaymentReceivedHeroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 to-[#12161f] p-8 sm:p-10 text-center overflow-hidden"
      style={{
        boxShadow: "0 0 30px rgba(34, 197, 94, 0.15)",
      }}
    >
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 stroke-[2.5]" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
          Payment received
        </h2>

        <p className="text-slate-300 text-sm sm:text-base max-w-md leading-relaxed">
          We have detected your deposit of{" "}
          <span className="font-semibold text-white">
            {depositAmount} {depositSymbol}
          </span>
          . Your exchange to{" "}
          <span className="font-semibold text-white">
            {outcomeAmount} {outcomeSymbol}
          </span>{" "}
          is being processed.
        </p>
      </div>
    </motion.div>
  );
}
