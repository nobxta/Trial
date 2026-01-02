# CORRECTED ORDER LIFECYCLE DIAGRAM

## System Architecture: Backend → Admin → User

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Database)                       │
│                    Single Source of Truth                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Updates
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN PANEL (Technical)                     │
│              Sees: Internal Status + Provider Status             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Mapped Status
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE (Simple)                     │
│              Sees: User-Friendly Status Only                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## BACKEND STATUS FLOW (Internal - Database Only)

```
┌─────────┐
│   NEW   │  Order created, waiting for payment
└────┬────┘
     │
     │ [Webhook: payment detected]
     ▼
┌─────────────────────┐
│ AWAITING_DEPOSIT    │  Payment address generated
└────┬────────────────┘
     │
     │ [Webhook: payment received]
     ▼
┌─────────────────────┐
│ CONFIRMING          │  Waiting for blockchain confirmations
└────┬────────────────┘
     │
     │ [Webhook: confirmations complete]
     ▼
┌─────────────────────┐
│ PAYMENT_CONFIRMED   │  Payment fully confirmed
└────┬────────────────┘
     │
     ├─────────────────────────────────────┐
     │                                     │
     │ [Automatic Mode]                    │ [Manual Mode]
     ▼                                     ▼
┌─────────────────────┐          ┌─────────────────────┐
│ PROCESSING_BY_      │          │ MANUAL_REVIEW       │
│ PROVIDER           │          │                     │
└────┬────────────────┘          │ Admin must:         │
     │                           │ - Send funds        │
     │ [Webhook: provider done]  │ - Enter TX hash     │
     │                           │ - Mark completed    │
     ▼                           └────┬────────────────┘
┌─────────────────────┐                │
│ DONE                │◄───────────────┘
└─────────────────────┘
     │
     │ [Can occur at any non-final state]
     ▼
┌─────────────────────┐
│ FAILED              │  Admin marked as failed
└─────────────────────┘

┌─────────────────────┐
│ EXPIRED             │  Timeout or admin action
└─────────────────────┘
```

---

## ADMIN VIEW (What Admin Sees)

### Status Display:
```
┌─────────────────────────────────────────────────────────────┐
│ Order: ABC123                                                │
│                                                              │
│ Internal Status: PAYMENT_CONFIRMED                          │
│ Provider Status: confirmed (from NOWPayments)              │
│ User Status: "Payment confirmed"                          │
│                                                              │
│ Rate Information:                                           │
│   - Frontend Rate: 0.05 ETH/BTC                            │
│   - Provider Rate: 0.051 ETH/BTC                           │
│   - Deviation: 2%                                           │
│                                                              │
│ Transaction Hashes:                                         │
│   - Payin: 0x1234...                                        │
│   - Payout: [Not set - manual mode]                        │
│                                                              │
│ Status History:                                             │
│   - NEW → AWAITING_DEPOSIT (webhook)                       │
│   - AWAITING_DEPOSIT → CONFIRMING (webhook)                 │
│   - CONFIRMING → PAYMENT_CONFIRMED (webhook)                │
│                                                              │
│ Actions:                                                    │
│   [Verify Payment] [Override Status] [Mark Completed]       │
│   [Enter Payout Hash] [Move to Review] [Mark Failed]        │
└─────────────────────────────────────────────────────────────┘
```

### Admin Actions Available:
1. **Verify Payment** - Re-check provider, show comparison, don't change status
2. **Override Status** - Force any status (with audit log)
3. **Mark Completed** - Only in manual mode, requires payout hash
4. **Enter Payout Hash** - For manual mode, record transaction
5. **Move to Review** - Move to MANUAL_REVIEW queue
6. **Mark Failed** - Mark as FAILED with reason

---

## USER VIEW (What User Sees)

### Status Display:
```
┌─────────────────────────────────────────────────────────────┐
│ Order: ABC123                                                │
│                                                              │
│ Status: Payment confirmed                                    │
│                                                              │
│ You are sending: 0.1 ETH                                    │
│ You will receive: 0.005 BTC                                 │
│                                                              │
│ Progress:                                                   │
│   ● Waiting for payment          [Completed]                │
│   ● Waiting for confirmation      [Completed]                │
│   ● Payment confirmed             [Current]                 │
│   ○ Processing your exchange      [Pending]                 │
│   ○ Completed                     [Pending]                 │
│                                                              │
│ Deposit Address: 0x1234...                                  │
│                                                              │
│ Note: Your exchange is being processed.                    │
│      You will receive your funds once processing completes. │
└─────────────────────────────────────────────────────────────┘
```

### User NEVER Sees:
- ❌ Internal status names (NEW, EXCHANGE, etc.)
- ❌ Provider status names (waiting, sending, etc.)
- ❌ Technical terms (confirmations, blockchain, etc.)
- ❌ Provider names (NOWPayments, etc.)
- ❌ Developer language
- ❌ Rate calculations
- ❌ Transaction hashes (unless completed)

---

## STATUS MAPPING (Backend Function)

```typescript
// lib/status-mapping.ts

// Internal statuses (admin-only)
type InternalStatus = 
  | 'NEW'
  | 'AWAITING_DEPOSIT'
  | 'CONFIRMING'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING_BY_PROVIDER'
  | 'MANUAL_REVIEW'
  | 'DONE'
  | 'FAILED'
  | 'EXPIRED';

// User-facing statuses (mapped, simplified)
type UserStatus = 
  | 'Waiting for payment'
  | 'Waiting for confirmation'
  | 'Payment confirmed'
  | 'Processing your exchange'
  | 'Completed'
  | 'Failed'
  | 'Expired';

function getUserFacingStatus(internalStatus: InternalStatus): UserStatus {
  const mapping: Record<InternalStatus, UserStatus> = {
    'NEW': 'Waiting for payment',
    'AWAITING_DEPOSIT': 'Waiting for payment',
    'CONFIRMING': 'Waiting for confirmation',
    'PAYMENT_CONFIRMED': 'Payment confirmed',
    'PROCESSING_BY_PROVIDER': 'Processing your exchange',
    'MANUAL_REVIEW': 'Processing your exchange',
    'DONE': 'Completed',
    'FAILED': 'Failed',
    'EXPIRED': 'Expired',
  };
  return mapping[internalStatus] || 'Processing your exchange';
}

function getCurrentStep(internalStatus: InternalStatus): number {
  const stepMap: Record<InternalStatus, number> = {
    'NEW': 0,
    'AWAITING_DEPOSIT': 0,
    'CONFIRMING': 1,
    'PAYMENT_CONFIRMED': 2,
    'PROCESSING_BY_PROVIDER': 3,
    'MANUAL_REVIEW': 3,
    'DONE': 4,
    'FAILED': 0, // Show at beginning with error
    'EXPIRED': 0, // Show at beginning with error
  };
  return stepMap[internalStatus] || 0;
}
```

---

## WEBHOOK → DATABASE → USER FLOW

```
┌─────────────────┐
│ NOWPayments     │
│ Webhook         │
└────────┬────────┘
         │
         │ POST /api/webhook/nowpayments
         ▼
┌─────────────────┐
│ Backend Handler │
│ - Verify sig    │
│ - Check idempotency
│ - Map status    │
└────────┬────────┘
         │
         │ updateOrderStatus()
         ▼
┌─────────────────┐
│ Database        │
│ - Update status │
│ - Record history
│ - Log source    │
└────────┬────────┘
         │
         │ GET /api/order/[id]
         ▼
┌─────────────────┐
│ API Endpoint    │
│ - Read from DB  │
│ - Map to user   │
│ - Return status │
└────────┬────────┘
         │
         │ { user_status, current_step }
         ▼
┌─────────────────┐
│ Frontend        │
│ - Display status│
│ - Show progress │
│ - No guessing!  │
└─────────────────┘
```

---

## MANUAL vs AUTOMATIC MODE

### Automatic Mode:
```
PAYMENT_CONFIRMED
    ↓
PROCESSING_BY_PROVIDER  (webhook updates)
    ↓
DONE  (webhook: provider finished)
```

### Manual Mode:
```
PAYMENT_CONFIRMED
    ↓
MANUAL_REVIEW  (admin must act)
    ↓
[Admin sends funds externally]
[Admin enters payout hash]
[Admin marks DONE]
    ↓
DONE
```

**User sees the same status in both modes** - they never know which mode is used.

---

## KEY PRINCIPLES

1. **Database is Source of Truth**
   - All status changes go through database
   - Frontend never invents status
   - Provider status is reference only

2. **Admin is Final Authority**
   - Admin can override any status
   - Admin decisions override provider
   - All admin actions are logged

3. **User Sees Simple Language**
   - No technical terms
   - No provider names
   - No internal statuses
   - Clear, human-friendly messages

4. **No Fake States**
   - If system doesn't control it, don't describe it
   - No "Perform exchange" if provider does it
   - No animations implying internal engine

5. **Rate Validation**
   - Validate before order creation
   - Store provider rate in DB
   - Block impossible conversions
   - Admin sees rate comparison

---

**END OF DIAGRAM**

