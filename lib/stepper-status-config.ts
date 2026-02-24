/**
 * TransactionStepper status config — event-driven labels.
 * BEFORE Hit (Awaiting) | AFTER Hit (Processing) | COMPLETE (Success)
 * No sub-text; single source for professional copy.
 */

import type { LucideIcon } from "lucide-react";
import { Wallet, Shield, ArrowRightLeft, Send } from "lucide-react";

export type StepperStepKey = "deposit" | "network" | "exchange" | "payout";

export type StepDisplayState = "pending" | "active" | "completed" | "expired";

export interface StepperStepConfig {
  stepKey: StepperStepKey;
  /** BEFORE Hit — shown when step is current but still awaiting the event */
  beforeHit: string;
  /** AFTER Hit — shown when step is current and processing (event received) */
  afterHit: string;
  /** COMPLETE — shown when step is done */
  complete: string;
  icon: LucideIcon;
}

/** Event-driven label mapping. Zero sub-text. */
export const STEPPER_STATUS_CONFIG: StepperStepConfig[] = [
  {
    stepKey: "deposit",
    beforeHit: "Waiting for Payment",
    afterHit: "Payment Detected",
    complete: "Deposit Verified",
    icon: Wallet,
  },
  {
    stepKey: "network",
    beforeHit: "Awaiting Network",
    afterHit: "Confirming on Chain",
    complete: "Block Confirmed",
    icon: Shield,
  },
  {
    stepKey: "exchange",
    beforeHit: "Exchange Pending",
    afterHit: "Swapping Assets",
    complete: "Exchange Finalized",
    icon: ArrowRightLeft,
  },
  {
    stepKey: "payout",
    beforeHit: "Payout Queued",
    afterHit: "Sending to Wallet",
    complete: "Transfer Successful",
    icon: Send,
  },
];

export type StepperStatusKey =
  | "awaiting_deposit"
  | "confirming"
  | "exchanging"
  | "completed"
  | "expired";

export function getStepperStatusKey(internalStatus: string | null): StepperStatusKey {
  if (!internalStatus) return "awaiting_deposit";
  const s = internalStatus.toUpperCase();
  if (s === "NEW" || s === "AWAITING_DEPOSIT") return "awaiting_deposit";
  if (s === "CONFIRMING") return "confirming";
  if (["PAYMENT_CONFIRMED", "PROCESSING_BY_PROVIDER", "MANUAL_REVIEW"].includes(s)) return "exchanging";
  if (s === "DONE") return "completed";
  if (s === "EXPIRED" || s === "FAILED") return "expired";
  return "awaiting_deposit";
}

export function getStepperStepIndex(internalStatus: string | null): number {
  if (!internalStatus) return 0;
  const s = internalStatus.toUpperCase();
  if (s === "NEW" || s === "AWAITING_DEPOSIT") return 0;
  if (s === "CONFIRMING") return 1;
  if (["PAYMENT_CONFIRMED", "PROCESSING_BY_PROVIDER", "MANUAL_REVIEW"].includes(s)) return 2;
  if (s === "DONE") return 3;
  return 0;
}

export function getStepDisplayState(
  stepIndex: number,
  currentStep: number,
  isExpired: boolean
): StepDisplayState {
  if (isExpired && stepIndex === 0) return "expired";
  if (currentStep > stepIndex) return "completed";
  if (currentStep === stepIndex) return "active";
  return "pending";
}

/** Resolve label: completed → complete; active → beforeHit for step 0 (waiting), afterHit for 1–3 (processing); pending → beforeHit. */
export function getStepLabel(
  config: StepperStepConfig,
  state: StepDisplayState,
  stepIndex: number
): string {
  if (state === "expired") return "Expired";
  if (state === "completed") return config.complete;
  if (state === "active") return stepIndex === 0 ? config.beforeHit : config.afterHit;
  return config.beforeHit;
}
