"use client";

import { Wallet, Search, Repeat, Check, Clock, AlertCircle } from "lucide-react";

interface ProgressTimelineProps {
  currentStep?: number;
  internalStatus?: string | null;
  isExpired?: boolean;
  isPaymentReceived?: boolean;
}

const STEPS = [
  { 
    key: "awaiting", 
    label: "Awaiting Deposit", 
    desc: "Waiting for funds",
    icon: Wallet,
  },
  { 
    key: "confirming", 
    label: "Confirming", 
    desc: "Network verification",
    icon: Search,
  },
  { 
    key: "exchanging", 
    label: "Exchanging", 
    desc: "Processing swap",
    icon: Repeat,
  },
  { 
    key: "completed", 
    label: "Completed", 
    desc: "Funds sent",
    icon: Check,
  },
];

function getStepFromStatus(internalStatus: string | null): number {
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
      return -1;
    default:
      return 0;
  }
}

export default function ProgressTimeline({
  currentStep: currentStepProp,
  internalStatus = null,
  isExpired = false,
}: ProgressTimelineProps) {
  const activeStep = isExpired ? -1 : Math.min(
    Math.max(0, currentStepProp ?? getStepFromStatus(internalStatus)),
    3
  );

  const displayStep = isExpired ? 0 : activeStep + 1;

  return (
    <div className="rounded-[20px] border border-white/10 bg-[#12161F] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-base" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Transaction Progress
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded ${isExpired ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`} />
          <span className="text-[#94A3B8] text-[13px] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isExpired ? 'Expired' : `Step ${displayStep} of 4`}
          </span>
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="flex items-start">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = !isExpired && activeStep === index;
          const isCompleted = !isExpired && activeStep > index;
          const isPending = !isExpired && activeStep < index;
          const isExpiredState = isExpired;

          return (
            <div key={step.key} className="flex items-start flex-1">
              {/* Step Column */}
              <div className="flex flex-col items-center flex-1">
                {/* Circle with Icon */}
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${isCompleted 
                      ? "bg-gradient-to-br from-[#22C55E] to-[#4ADE80] shadow-[0_0_20px_rgba(34,197,94,0.4)]" 
                      : isActive 
                        ? "bg-gradient-to-br from-[#22C55E] to-[#4ADE80] shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                        : isExpiredState && index === 0
                          ? "bg-[#1A1F2B] border-2 border-[#EF4444]"
                          : "bg-[#1A1F2B] border-2 border-[#1E2533]"
                    }
                  `}
                >
                  {isExpiredState && index === 0 ? (
                    <Clock className="w-[22px] h-[22px] text-[#EF4444]" />
                  ) : isCompleted || isActive ? (
                    <StepIcon className="w-[22px] h-[22px] text-white" />
                  ) : (
                    <StepIcon className="w-[22px] h-[22px] text-[#64748B]" />
                  )}
                </div>

                {/* Labels */}
                <div className="flex flex-col items-center mt-3 gap-1">
                  <span
                    className={`text-[13px] font-semibold text-center`}
                    style={{ 
                      fontFamily: 'Inter, sans-serif',
                      color: isExpiredState && index === 0
                        ? '#EF4444'
                        : isCompleted || isActive 
                          ? '#FFFFFF' 
                          : '#64748B'
                    }}
                  >
                    {isExpiredState && index === 0 ? 'Expired' : step.label}
                  </span>
                  <span
                    className="text-[11px] text-center"
                    style={{ 
                      fontFamily: 'Inter, sans-serif',
                      color: isExpiredState && index === 0 
                        ? '#EF4444' 
                        : isActive 
                          ? '#64748B' 
                          : '#475569'
                    }}
                  >
                    {isExpiredState && index === 0 ? 'Time limit reached' : step.desc}
                  </span>
                </div>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className="w-20 h-1 rounded-sm mt-[22px] mx-1"
                  style={{
                    background: isCompleted 
                      ? 'linear-gradient(90deg, #22C55E 0%, #1E2533 100%)' 
                      : isActive
                        ? 'linear-gradient(90deg, #22C55E 0%, #1E2533 50%)'
                        : '#1E2533'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
