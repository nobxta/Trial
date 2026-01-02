import { type InternalStatus } from './status-mapping';

/**
 * ORDER STATE MACHINE
 * 
 * Defines valid state transitions for orders.
 * Enforces strict state machine to prevent illegal transitions.
 * 
 * State Flow:
 * NEW → AWAITING_DEPOSIT → CONFIRMING → PAYMENT_CONFIRMED → PROCESSING_BY_PROVIDER/MANUAL_REVIEW → DONE
 *                                                                                              ↓
 *                                                                                          FAILED/EXPIRED
 */

// Define valid transitions for each state
const STATE_TRANSITIONS: Record<InternalStatus, InternalStatus[]> = {
  // Initial state: Order created
  'NEW': [
    'AWAITING_DEPOSIT',
    'CONFIRMING',
    'EXPIRED',
    'FAILED',
  ],
  
  // Waiting for user to deposit funds
  'AWAITING_DEPOSIT': [
    'CONFIRMING',
    'EXPIRED',
    'FAILED',
  ],
  
  // Payment is being confirmed on blockchain
  'CONFIRMING': [
    'PAYMENT_CONFIRMED',
    'EXPIRED',
    'FAILED',
  ],
  
  // Payment confirmed, ready for processing
  'PAYMENT_CONFIRMED': [
    'PROCESSING_BY_PROVIDER',
    'MANUAL_REVIEW',
    'EXPIRED',
    'FAILED',
  ],
  
  // Being processed by payment provider
  'PROCESSING_BY_PROVIDER': [
    'DONE',
    'FAILED',
    'EXPIRED',
  ],
  
  // Requires admin review/intervention
  'MANUAL_REVIEW': [
    'DONE',
    'FAILED',
    'EXPIRED',
  ],
  
  // Terminal states - no transitions allowed
  'DONE': [],
  'FAILED': [],
  'EXPIRED': [],
};

/**
 * Check if a status transition is valid according to the state machine
 * 
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is valid, false otherwise
 */
export function canTransition(from: InternalStatus | string, to: InternalStatus | string): boolean {
  // Normalize to InternalStatus type
  const fromStatus = from as InternalStatus;
  const toStatus = to as InternalStatus;
  
  // Same status is always valid (idempotent)
  if (fromStatus === toStatus) {
    return true;
  }
  
  // Check if from status is valid
  if (!STATE_TRANSITIONS[fromStatus]) {
    console.warn(`⚠️  Unknown from status: ${fromStatus}`);
    return false;
  }
  
  // Check if to status is valid
  if (!STATE_TRANSITIONS[toStatus] && !['DONE', 'FAILED', 'EXPIRED'].includes(toStatus)) {
    console.warn(`⚠️  Unknown to status: ${toStatus}`);
    return false;
  }
  
  // Check if transition is allowed
  const allowedTransitions = STATE_TRANSITIONS[fromStatus];
  const isValid = allowedTransitions.includes(toStatus);
  
  return isValid;
}

/**
 * Get allowed transitions for a given status
 * Useful for debugging and admin UI
 */
export function getAllowedTransitions(from: InternalStatus | string): InternalStatus[] {
  const fromStatus = from as InternalStatus;
  return STATE_TRANSITIONS[fromStatus] || [];
}

/**
 * Check if status is a terminal state (no transitions allowed)
 */
export function isTerminalState(status: InternalStatus | string): boolean {
  const statusEnum = status as InternalStatus;
  return ['DONE', 'FAILED', 'EXPIRED'].includes(statusEnum);
}

