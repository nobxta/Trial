"use client";

import { Clock, ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";

interface ProgressTimelineProps {
  currentStep: number;
  isExpired?: boolean;
}

const steps = [
  { id: 0, label: "Waiting for payment", icon: Clock },
  { id: 1, label: "Waiting for confirmation", icon: Loader2 },
  { id: 2, label: "Payment confirmed", icon: ArrowRight },
  { id: 3, label: "Processing", icon: Loader2 },
  { id: 4, label: "Completed", icon: CheckCircle2 },
];

export default function ProgressTimeline({ currentStep, isExpired = false }: ProgressTimelineProps) {
  return (
    <div className="bg-gradient-to-br from-[#0f1115] to-[#141820] rounded-2xl border border-[#1e2329]/60 shadow-lg p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = !isExpired && currentStep === step.id;
          const isCompleted = !isExpired && currentStep > step.id;
          const isLast = index === steps.length - 1;
          const isPending = !isActive && !isCompleted;

          return (
            <div key={step.id} className="flex items-center flex-1 w-full sm:w-auto">
              <div className="flex flex-col items-center flex-1 sm:flex-initial">
                <div
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all ${
                    isExpired
                      ? "bg-[#1e2329] border-2 border-red-500/30"
                      : isActive
                      ? "bg-[#3b82f6] text-white shadow-lg shadow-blue-500/30 scale-110"
                      : isCompleted
                      ? "bg-[#10b981] text-white"
                      : "bg-[#1e2329] border border-[#2a2f36] text-[#6b7280]"
                  }`}
                >
                  {isExpired && index === 0 ? (
                    <XCircle className="w-7 h-7 text-red-400" />
                  ) : (
                    <Icon
                      className={`w-7 h-7 sm:w-8 sm:h-8 ${
                        isActive ? "animate-pulse" : ""
                      }`}
                    />
                  )}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-[#3b82f6] animate-ping opacity-20" />
                  )}
                </div>
                <div
                  className={`mt-4 text-xs sm:text-sm font-semibold text-center max-w-[120px] ${
                    isExpired && index === 0
                      ? "text-red-400"
                      : isActive
                      ? "text-[#3b82f6]"
                      : isCompleted
                      ? "text-[#10b981]"
                      : "text-[#6b7280]"
                  }`}
                >
                  {step.label}
                </div>
              </div>
              {!isLast && (
                <div
                  className={`hidden sm:block flex-1 h-0.5 mx-4 transition-colors ${
                    isExpired
                      ? "bg-[#1e2329]"
                      : isCompleted
                      ? "bg-[#10b981]"
                      : "bg-[#1e2329]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

