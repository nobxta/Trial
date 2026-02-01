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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 to-[#12161f] p-8 sm:p-10 text-center overflow-hidden"
      style={{
        boxShadow: "0 0 30px rgba(34, 197, 94, 0.2), 0 0 60px rgba(34, 197, 94, 0.08)",
      }}
    >
      {/* Subtle pulse glow */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          boxShadow: "inset 0 0 80px rgba(34, 197, 94, 0.06)",
        }}
        animate={{
          boxShadow: [
            "inset 0 0 80px rgba(34, 197, 94, 0.06)",
            "inset 0 0 100px rgba(34, 197, 94, 0.12)",
            "inset 0 0 80px rgba(34, 197, 94, 0.06)",
          ],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Large animated green checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center mb-6"
          style={{
            boxShadow: "0 0 40px rgba(34, 197, 94, 0.3)",
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <Check className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 stroke-[2.5]" />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="text-xl sm:text-2xl font-bold text-white mb-3"
        >
          Payment Received Successfully!
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="text-slate-300 text-sm sm:text-base max-w-md leading-relaxed"
        >
          We have detected your deposit of{" "}
          <span className="font-semibold text-white">
            {depositAmount} {depositSymbol}
          </span>
          . Your exchange to{" "}
          <span className="font-semibold text-white">
            {outcomeAmount} {outcomeSymbol}
          </span>{" "}
          is now being processed.
        </motion.p>
      </div>
    </motion.div>
  );
}
