/**
 * Centralized text configuration for the Order Details Page.
 * Replace or extend these strings for premium wording or i18n.
 *
 * Route: /order/:orderId
 */

export const orderPageText = {
  // ─── 1. Swap Summary Card ─────────────────────────────────────────────
  swapSummary: {
    youPay: "YOU PAY",
    youReceive: "YOU RECEIVE",
  },

  // ─── 2. Order Details Section ────────────────────────────────────────
  orderDetails: {
    sectionTitle: "Order details",
    orderId: "Order ID",
    timeRemaining: "Time remaining",
    orderType: "Order type",
    orderTypeFixed: "Fixed",
    orderTypeFloating: "Floating",
    created: "Created",
    status: "Status",
    fee: "Fee",
    feeIncludedInRate: "Included in rate",
    expired: "Expired",
  },

  // ─── 3. Deposit Instruction Section ───────────────────────────────────
  depositInstruction: {
    /** Single H3 in deposit card: "Deposit {amount} {currency}" */
    sendExactToAddressBelow: "Deposit {amount} {currency}",
    depositAddress: "Deposit address",
    copyAddress: "Copy address",
    showLess: "Show less",
    showMore: "Show more",
    viewQr: "View QR",
    tapToScan: "Tap to scan",
    rateFixedAfterConfirmation: "The exchange rate will be fixed after receiving 1 network confirmation.",
  },

  // ─── 4. Receiving Address Section ─────────────────────────────────────
  receivingAddress: {
    label: "Receiving address",
    viewFull: "View full",
    copy: "Copy",
  },

  // ─── 5. Order Progress Stepper ───────────────────────────────────────
  progressStepper: {
    step1: "Awaiting Deposit",
    step2: "Confirming on Chain",
    step3: "Swap in Progress",
    step4: "Completed",
    step1Completed: "Deposit Sent",
    step2Completed: "Payment Confirmed",
    step3Completed: "Assets Swapped",
    step4Completed: "Completed",
    sublabelSendExact: "Send exact amount to the address below",
    sublabelConfirmations: "Confirmations: 1–3 • Waiting for network confirmations",
    sublabelSettling: "Settling on-chain",
  },

  // ─── 6. Information Section ───────────────────────────────────────────
  information: {
    sectionTitle: "Transaction Insights",
    sectionTitleShort: "Instructions",
    confirmationsRequired: "Est. Arrival: 1 Confirmation",
    confirmationsLabel: "Confirmations",
    networkSpeed: "Usually 5–30 minutes.",
    networkSpeedLabel: "Network speed",
    statusExplanation: {
      awaiting: "Send the exact amount to the deposit address before the timer expires.",
      confirming: "Your payment is detected. We are waiting for network confirmations.",
      swapping: "Your exchange is being processed.",
      completed: "Your exchange is complete. Funds have been sent to your receiving address.",
      expired: "The payment window has closed. If you already sent funds, contact support with your Order ID.",
      failed: "This order could not be completed. Contact support with your Order ID.",
    },
  },

  // ─── 7. Notification Subscription ─────────────────────────────────────
  notification: {
    sectionTitle: "Order Status Notifications",
    sectionTitleShort: "Notifications",
    description: "Get real-time status alerts",
    emailPlaceholder: "you@email.com",
    subscribe: "Subscribe",
    subscribing: "Subscribing...",
    subscribedSuccess: "Subscribed to notifications",
    notificationsSentTo: "Notifications will be sent to",
    /** When user is logged in: no email form, show this instead */
    notificationsAccountEmail: "Notifications will be sent to your account email.",
    stayUpdated: "Track your swap",
  },

  // ─── Generic / Page-level ─────────────────────────────────────────────
  generic: {
    loading: "Loading order...",
    orderNotFound: "Order not found",
    goToHome: "Go to Home",
    copied: "Copied",
    payExactly: "Pay {amount} {symbol} exactly",
    nextSteps: "Next steps",
    nextStepsBody: "You can close this page. We will notify you via email when {symbol} is sent to your destination address.",
    needHelp: "Need help?",
    needHelpBody: "If you already sent funds or have a question about this order, we're here to help. Include your Order ID {orderId} when you contact us.",
    contactSupport: "Contact support",
    reportIssue: "Report an issue",
    reportSent: "Report sent",
    backToHome: "Back to Home",
    orderExpired: "Order Expired. The payment window has closed.",
    paymentWindowClosed: "Payment window closed",
    ifYouSentFunds: "If you have already sent funds, please contact support with your Order ID:",
    checkingPayment: "Checking payment status...",
    scanToPay: "Scan to pay",
    sendExactly: "Send exactly {amount} {symbol}",
  },

  // ─── Payment received / Success ───────────────────────────────────────
  paymentReceived: {
    title: "Payment Received Successfully!",
    body: "We have detected your deposit of {depositAmount} {depositSymbol}. Your exchange to {outcomeAmount} {outcomeSymbol} is now being processed.",
  },

  // ─── Report modal ────────────────────────────────────────────────────
  reportModal: {
    title: "Report an issue",
    description: "Please select the option that best describes your situation. Our team will review your report shortly.",
    cancel: "Cancel",
    sendReport: "Send report",
    options: {
      timeout: "Payment was sent but order shows as expired or timed out",
      notDetected: "Payment not detected or not credited to this order",
      addressMistake: "Incorrect or wrong destination address used",
      other: "Other issue",
    },
    otherPlaceholder: "Please describe your issue (optional)",
  },
} as const;

/** Status display labels (for backend status → UI). Supports both internal and lowercase API styles. */
export const orderStatusLabels: Record<string, string> = {
  // Internal (current API)
  NEW: "Awaiting deposit",
  AWAITING_DEPOSIT: "Awaiting deposit",
  CONFIRMING: "Confirming on Chain",
  PAYMENT_CONFIRMED: "Swap in Progress",
  PROCESSING_BY_PROVIDER: "Swap in Progress",
  MANUAL_REVIEW: "Swap in Progress",
  DONE: "Completed",
  FAILED: "Failed",
  EXPIRED: "Expired",
  // Lowercase (alternative API)
  awaiting_deposit: "Awaiting deposit",
  confirming: "Confirming on Chain",
  swapping: "Swap in Progress",
  completed: "Completed",
  expired: "Expired",
  failed: "Failed",
};

/** Get display label for a backend status (internal or lowercase). */
export function getOrderStatusLabel(status: string | null): string {
  if (!status) return orderStatusLabels.NEW ?? "Awaiting deposit";
  const key = status.toUpperCase().replace(/-/g, "_");
  return orderStatusLabels[key] ?? orderStatusLabels[status] ?? status;
}

/** Status → color class for status badge (theme-safe). */
export function getOrderStatusColorClass(status: string | null): string {
  if (!status) return "text-slate-400";
  const s = status.toUpperCase();
  if (s === "DONE" || s === "COMPLETED") return "text-emerald-400";
  if (s === "EXPIRED" || s === "FAILED") return "text-red-400";
  if (s === "CONFIRMING" || s === "PAYMENT_CONFIRMED" || s === "PROCESSING_BY_PROVIDER" || s === "MANUAL_REVIEW")
    return "text-blue-400";
  return "text-slate-300";
}

export type OrderPageText = typeof orderPageText;

// ─── Order state text mapping (swap strings here for premium wording) ───
export type OrderStateKey =
  | "STATE_AWAITING_DEPOSIT"
  | "STATE_CONFIRMING"
  | "STATE_EXCHANGING"
  | "STATE_COMPLETED"
  | "STATE_EXPIRED";

export const ORDER_STATE_TEXT: Record<
  OrderStateKey,
  {
    /** Main heading or status line */
    title: string;
    /** Short notice / subtitle under the main content */
    notice?: string;
    /** Optional CTA (e.g. "View on Explorer") */
    ctaLabel?: string;
    /** For completed: template for final amount, e.g. "You received {amount} {symbol}" */
    bodyTemplate?: string;
  }
> = {
  STATE_AWAITING_DEPOSIT: {
    title: "Deposit {amount} {currency}",
    notice: "Est. Arrival: 1 Confirmation",
  },
  STATE_CONFIRMING: {
    title: "Payment Detected",
    notice: "Waiting for confirmations...",
  },
  STATE_EXCHANGING: {
    title: "Converting your assets",
    notice: "Exchange in progress.",
  },
  STATE_COMPLETED: {
    title: "Exchange complete",
    bodyTemplate: "You received {amount} {symbol}.",
    ctaLabel: "View on Explorer",
  },
  STATE_EXPIRED: {
    title: "Order expired",
    notice: "The 12-minute payment window has ended.",
  },
};

/** Map backend internalStatus to ORDER_STATE_TEXT key. */
export function getOrderStateKey(internalStatus: string | null): OrderStateKey {
  if (!internalStatus) return "STATE_AWAITING_DEPOSIT";
  const s = internalStatus.toUpperCase();
  if (s === "NEW" || s === "AWAITING_DEPOSIT") return "STATE_AWAITING_DEPOSIT";
  if (s === "CONFIRMING") return "STATE_CONFIRMING";
  if (["PAYMENT_CONFIRMED", "PROCESSING_BY_PROVIDER", "MANUAL_REVIEW"].includes(s)) return "STATE_EXCHANGING";
  if (s === "DONE") return "STATE_COMPLETED";
  if (s === "EXPIRED" || s === "FAILED") return "STATE_EXPIRED";
  return "STATE_AWAITING_DEPOSIT";
}
