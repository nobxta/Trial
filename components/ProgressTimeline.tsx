"use client";

import { Wallet, Hourglass, ArrowRightLeft, CheckCircle2, Clock } from "lucide-react";

interface ProgressTimelineProps {
  currentStep: number;
  isExpired?: boolean;
  /** When true, active step uses vibrant green instead of blue to signal positive progress */
  isPaymentReceived?: boolean;
}

const STEPS = [
  { id: 0, label: "Awaiting deposit", sublabel: null, icon: Wallet },
  { id: 1, label: "Deposit received", sublabel: null, icon: Hourglass },
  { id: 2, label: "Exchanging", sublabel: null, icon: ArrowRightLeft },
  { id: 3, label: "Completed", sublabel: null, icon: CheckCircle2 },
];

export default function ProgressTimeline({ currentStep, isExpired = false, isPaymentReceived = false }: ProgressTimelineProps) {
  const stepIndex = Math.min(Math.max(0, currentStep), 3);

  const activeStepStyle = isPaymentReceived
    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_24px_rgba(34,197,94,0.35)]"
    : "border-blue-500/50 bg-blue-500/20 text-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.35)]";

  const activeLabelStyle = isPaymentReceived ? "text-emerald-400" : "text-blue-400";

  return (
    <div className="rounded-lg border border-white/5 bg-[#12161f] p-6 sm:p-8 overflow-visible">
      <div className="flex items-center justify-center w-full overflow-visible">
        <div className="flex items-center justify-between gap-0 sm:gap-4 w-full max-w-2xl overflow-visible">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = !isExpired && stepIndex === index;
            const isCompleted = !isExpired && stepIndex > index;
            const isLast = index === STEPS.length - 1;
            const isExpiredAtFirst = isExpired && index === 0;
            const label = isExpiredAtFirst ? "Expired" : step.label;

            return (
              <div key={step.id} className="flex flex-1 items-center min-w-0 overflow-visible">
                <div className="flex flex-col items-center flex-1 min-w-0 overflow-visible">
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                      isExpiredAtFirst
                        ? "border-slate-500/40 bg-slate-500/10 text-slate-500"
                        : isActive
                        ? activeStepStyle
                        : isCompleted
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                        : "border-white/10 bg-white/5 text-slate-500/80"
                    }`}
                  >
                    {isExpiredAtFirst ? (
                      <Clock className="w-6 h-6 text-slate-500" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[80px] sm:max-w-none ${
                      isExpiredAtFirst ? "text-slate-500" : isActive ? activeLabelStyle : isCompleted ? "text-emerald-500" : "text-slate-500"
                    }`}
                    title={step.sublabel ? `${label} — ${step.sublabel}` : label}
                  >
                    {label}
                  </span>
                  {step.sublabel && (isActive || isCompleted) && (
                    <span className="mt-0.5 text-[9px] sm:text-[10px] text-slate-500 text-center">
                      {step.sublabel}
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div className="flex-1 h-[1px] min-w-[8px] sm:min-w-[16px] mx-1 sm:mx-2 bg-slate-600/60 self-start mt-6" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
