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
// USER-FACING STATUSES (Simplified, human-friendly)
// ============================================================================

export type UserStatus =
  | 'Waiting for payment'
  | 'Waiting for confirmation'
  | 'Payment confirmed'
  | 'Processing'
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
 * Map internal status to user-facing status
 * This is the ONLY function frontend should use to display status
 */
export function getUserFacingStatus(internalStatus: string | null): UserStatus {
  if (!internalStatus) {
    return 'Waiting for payment';
  }

  const mapping: Record<InternalStatus, UserStatus> = {
    'NEW': 'Waiting for payment',
    'AWAITING_DEPOSIT': 'Waiting for payment',
    'CONFIRMING': 'Waiting for confirmation',
    'PAYMENT_CONFIRMED': 'Payment confirmed',
    'PROCESSING_BY_PROVIDER': 'Processing',
    'MANUAL_REVIEW': 'Processing',
    'DONE': 'Completed',
    'FAILED': 'Failed',
    'EXPIRED': 'Expired',
  };

  return mapping[internalStatus as InternalStatus] || 'Waiting for payment';
}

/**
 * Get progress step number for UI (0-4)
 * Frontend should use this number directly, not calculate it
 */
export function getCurrentStep(internalStatus: string | null): number {
  if (!internalStatus) {
    return 0;
  }

  const stepMap: Record<InternalStatus, number> = {
    'NEW': 0,
    'AWAITING_DEPOSIT': 0,
    'CONFIRMING': 1,
    'PAYMENT_CONFIRMED': 2,
    'PROCESSING_BY_PROVIDER': 3,
    'MANUAL_REVIEW': 3,
    'DONE': 4,
    'FAILED': 0, // Show at beginning with error styling
    'EXPIRED': 0, // Show at beginning with error styling
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

