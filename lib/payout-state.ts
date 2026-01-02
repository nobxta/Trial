/**
 * Payout status type
 */
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * PAYOUT STATE MACHINE
 * 
 * Defines valid state transitions for payouts.
 * Enforces strict state machine to prevent illegal transitions.
 * 
 * State Flow:
 * pending → processing → completed
 *                    ↓
 *                  failed
 */

// Define valid transitions for each state
const PAYOUT_STATE_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  // Initial state: Payout requested
  'pending': [
    'processing',
  ],
  
  // Being processed (approved, sending funds)
  'processing': [
    'completed',
    'failed',
  ],
  
  // Terminal states - no transitions allowed
  'completed': [],
  'failed': [],
};

/**
 * Check if a payout status transition is valid according to the state machine
 * 
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is valid, false otherwise
 */
export function canTransitionPayout(from: PayoutStatus, to: PayoutStatus): boolean {
  // Same status is always valid (idempotent)
  if (from === to) {
    return true;
  }
  
  // Check if from status is valid
  if (!PAYOUT_STATE_TRANSITIONS[from]) {
    console.warn(`⚠️  Unknown from status: ${from}`);
    return false;
  }
  
  // Check if to status is valid
  if (!PAYOUT_STATE_TRANSITIONS[to]) {
    console.warn(`⚠️  Unknown to status: ${to}`);
    return false;
  }
  
  // Check if transition is allowed
  const allowedTransitions = PAYOUT_STATE_TRANSITIONS[from];
  const isValid = allowedTransitions.includes(to);
  
  return isValid;
}

/**
 * Get allowed transitions for a given payout status
 * Useful for debugging and admin UI
 */
export function getAllowedPayoutTransitions(from: PayoutStatus): PayoutStatus[] {
  return PAYOUT_STATE_TRANSITIONS[from] || [];
}

/**
 * Check if payout status is a terminal state (no transitions allowed)
 */
export function isTerminalPayoutStatus(status: PayoutStatus): boolean {
  return ['completed', 'failed'].includes(status);
}

