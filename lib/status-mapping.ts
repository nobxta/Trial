/**
 * STATUS MAPPING SYSTEM
 * 
 * CRITICAL: Backend is the ONLY source of truth for status.
 * Frontend must NEVER guess or calculate status.
 * 
 * This file provides server-side functions to map:
 * - Internal status (admin-only) → User status (user-facing)
 * - Internal status → Progress step number
 * - Provider status → Internal status (with admin override protection)
 */

// ============================================================================
// INTERNAL STATUSES (Admin-only, technical truth)
// ============================================================================

export type InternalStatus =
  | 'NEW'
  | 'AWAITING_DEPOSIT'
  | 'CONFIRMING'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING_BY_PROVIDER'
  | 'MANUAL_REVIEW'
  | 'DONE'
  | 'FAILED'
  | 'EXPIRED';

// ============================================================================
// USER-FACING STATUSES (Crypto-native flow: Awaiting deposit → Confirming on Chain → Swap in Progress → Completed)
// ============================================================================

export type UserStatus =
  | 'Awaiting deposit'
  | 'Confirming on Chain'
  | 'Swap in Progress'
  | 'Completed'
  | 'Failed'
  | 'Expired';

// ============================================================================
// PROVIDER STATUSES (NOWPayments raw status, admin-only reference)
// ============================================================================

export type ProviderStatus =
  | 'waiting'
  | 'confirming'
  | 'confirmed'
  | 'sending'
  | 'partially_paid'
  | 'finished'
  | 'success'
  | 'failed'
  | 'expired'
  | 'refunded';

// ============================================================================
// STATUS SOURCE (Who/what changed the status)
// ============================================================================

export type StatusSource = 'webhook' | 'admin' | 'system';

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================

/**
 * Map internal status to user-facing status (crypto-native flow).
 * Flow: Awaiting deposit → Confirming on Chain → Swap in Progress → Completed.
 */
export function getUserFacingStatus(internalStatus: string | null): UserStatus {
  if (!internalStatus) {
    return 'Awaiting deposit';
  }

  const mapping: Record<InternalStatus, UserStatus> = {
    'NEW': 'Awaiting deposit',
    'AWAITING_DEPOSIT': 'Awaiting deposit',
    'CONFIRMING': 'Confirming on Chain',       // Payment detected, confirming on blockchain
    'PAYMENT_CONFIRMED': 'Swap in Progress',  // Confirmed; swap in progress
    'PROCESSING_BY_PROVIDER': 'Swap in Progress',
    'MANUAL_REVIEW': 'Swap in Progress',
    'DONE': 'Completed',
    'FAILED': 'Failed',
    'EXPIRED': 'Expired',
  };

  return mapping[internalStatus as InternalStatus] || 'Awaiting deposit';
}

/**
 * Get sublabel for the active timeline step (shown under the icon).
 * Used for crypto-native micro-copy (e.g. "Waiting for network confirmations...").
 */
export function getTimelineStepSublabel(
  internalStatus: string | null,
  stepIndex: number
): string | null {
  if (stepIndex === 0) {
    return internalStatus === 'NEW' || internalStatus === 'AWAITING_DEPOSIT'
      ? 'Send exact amount to the address below'
      : null;
  }
  if (stepIndex === 1) {
    return internalStatus === 'CONFIRMING'
      ? 'Confirmations: 1–3 • Waiting for network confirmations'
      : null;
  }
  if (stepIndex === 2) {
    return ['PAYMENT_CONFIRMED', 'PROCESSING_BY_PROVIDER', 'MANUAL_REVIEW'].includes(
      internalStatus || ''
    )
      ? 'Settling on-chain'
      : null;
  }
  return null;
}

/**
 * Get progress step number for UI (0-3)
 * Step 0: Awaiting deposit
 * Step 1: Confirming on Chain (payment detected, awaiting confirmations)
 * Step 2: Swap in Progress
 * Step 3: Completed
 */
export function getCurrentStep(internalStatus: string | null): number {
  if (!internalStatus) {
    return 0;
  }

  const stepMap: Record<InternalStatus, number> = {
    'NEW': 0,
    'AWAITING_DEPOSIT': 0,
    'CONFIRMING': 1,           // Webhook hit, awaiting confirmations
    'PAYMENT_CONFIRMED': 2,    // Admin performs exchange
    'PROCESSING_BY_PROVIDER': 2,
    'MANUAL_REVIEW': 2,
    'DONE': 3,                 // Admin sent funds – completed
    'FAILED': 0,
    'EXPIRED': 0,
  };

  return stepMap[internalStatus as InternalStatus] || 0;
}

/**
 * Map provider status to internal status
 * Used by webhook handler to convert NOWPayments status
 * 
 * CRITICAL: In manual mode, this should NOT auto-advance to DONE
 * Manual mode handling is done in webhook handler, not here
 */
export function mapProviderStatusToInternal(
  providerStatus: string | null | undefined
): InternalStatus {
  if (!providerStatus) {
    return 'NEW';
  }

  const statusLower = providerStatus.toLowerCase().trim();

  const mapping: Record<string, InternalStatus> = {
    'waiting': 'AWAITING_DEPOSIT',
    'confirming': 'CONFIRMING',
    'confirmed': 'PAYMENT_CONFIRMED',
    'sending': 'PROCESSING_BY_PROVIDER',
    'partially_paid': 'PAYMENT_CONFIRMED',
    'finished': 'DONE',
    'success': 'DONE',
    'failed': 'FAILED',
    'expired': 'EXPIRED',
    'refunded': 'EXPIRED',
  };

  return mapping[statusLower] || 'NEW';
}

/**
 * Validate status transition
 * Prevents invalid status changes (e.g., DONE → FAILED)
 * 
 * NOTE: This function now uses the strict state machine from order-state.ts
 * Kept for backward compatibility, but delegates to canTransition()
 */
export function isValidStatusTransition(
  currentStatus: InternalStatus | string,
  newStatus: InternalStatus | string
): boolean {
  // Import here to avoid circular dependencies
  const { canTransition } = require('./order-state');
  return canTransition(currentStatus, newStatus);
}

/**
 * Get status label for admin panel (shows internal status)
 */
export function getAdminStatusLabel(internalStatus: string | null): string {
  if (!internalStatus) {
    return 'NEW';
  }
  return internalStatus;
}

/**
 * Status priority for monotonic progression (higher = more advanced).
 * Status must NEVER downgrade: we only allow transitions to same or higher priority.
 * Used by RPC and polling to reject provider/polling updates that would regress state.
 */
export const STATUS_PRIORITY: Record<InternalStatus, number> = {
  'NEW': 0,
  'AWAITING_DEPOSIT': 1,
  'CONFIRMING': 2,
  'PAYMENT_CONFIRMED': 3,
  'PROCESSING_BY_PROVIDER': 4,
  'MANUAL_REVIEW': 4,
  'DONE': 5,
  'FAILED': 5,
  'EXPIRED': 5,
};

/**
 * Get numeric priority for an internal status (for no-downgrade checks).
 * Unknown statuses get 0 (allow upgrade from anything).
 */
export function getStatusPriority(internalStatus: string | null | undefined): number {
  if (!internalStatus) return 0;
  return STATUS_PRIORITY[internalStatus as InternalStatus] ?? 0;
}

/**
 * Returns true if transitioning from current to new would be a downgrade.
 * Used to block polling/webhook from overwriting a higher status with a lower one.
 */
export function isStatusDowngrade(
  currentInternalStatus: string | null | undefined,
  newInternalStatus: string | null | undefined
): boolean {
  const current = getStatusPriority(currentInternalStatus);
  const next = getStatusPriority(newInternalStatus);
  return next < current;
}

/**
 * Check if order is in final state
 */
export function isFinalStatus(status: string | null): boolean {
  if (!status) {
    return false;
  }
  return ['DONE', 'FAILED', 'EXPIRED'].includes(status);
}

/**
 * Check if order requires admin action
 */
export function requiresAdminAction(status: string | null): boolean {
  if (!status) {
    return false;
  }
  return ['PAYMENT_CONFIRMED', 'MANUAL_REVIEW'].includes(status);
}

