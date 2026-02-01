# ORDER STATUS SYSTEM REBUILD - IMPLEMENTATION PROGRESS

## ✅ COMPLETED (Backend Foundation)

### 1. Database Schema ✅
- **File:** `supabase/migrations/028_rebuild_order_status_system.sql`
- **Status:** Complete
- **Changes:**
  - Added `internal_status` (admin-only technical status)
  - Added `user_status` (user-facing simplified status)
  - Added `provider_status` (raw NOWPayments status, admin-only)
  - Added `status_source` and `status_updated_by` (audit trail)
  - Added rate fields (`provider_rate`, `expected_receive`, `rate_timestamp`, `rate_deviation_percent`)
  - Added transaction hash fields (`payin_hash`, `payout_hash`, `payout_hash_entered_by`, `payout_hash_entered_at`)
  - Added manual review fields (`manual_review_required`, `manual_review_reason`, `manual_review_assigned_to`)
  - Updated existing orders with proper status mapping

### 2. Status Mapping Functions ✅
- **File:** `lib/status-mapping.ts`
- **Status:** Complete
- **Functions:**
  - `getUserFacingStatus()` - Maps internal status to user-friendly status
  - `getCurrentStep()` - Returns progress step (0-4) from backend
  - `mapProviderStatusToInternal()` - Maps NOWPayments status to internal status
  - `isValidStatusTransition()` - Validates status transitions
  - Helper functions for admin panel

### 3. Database Functions ✅
- **File:** `lib/db-orders.ts`
- **Status:** Complete
- **Changes:**
  - Updated `Order` interface with new status fields
  - Added `mapOrderRow()` helper for consistent mapping
  - Updated `createOrder()` to use new status system
  - Updated `updateOrderStatus()` to use `InternalStatus` and calculate `user_status`
  - All query functions now return proper status fields
  - Status transition validation uses new mapping functions

### 4. Webhook Handler ✅
- **File:** `app/api/webhook/nowpayments/route.ts`
- **Status:** Complete
- **Changes:**
  - Uses `mapProviderStatusToInternal()` instead of old mapping
  - In manual mode, stops at `PAYMENT_CONFIRMED` or `MANUAL_REVIEW` (not DONE)
  - Stores `provider_status` in database for admin reference
  - Proper status source tracking ('webhook')

### 5. Order API Endpoint ✅
- **File:** `app/api/order/[id]/route.ts`
- **Status:** Complete
- **Changes:**
  - Returns `user_status` instead of internal status
  - Returns `currentStep` from backend (not frontend calculation)
  - Database is source of truth (no provider status override)
  - Removed provider polling from this endpoint

### 6. Payment Creation ✅
- **File:** `app/api/payment/route.ts`
- **Status:** Complete (rate validation basic implementation)
- **Changes:**
  - Uses new `createOrder()` with `internalStatus: 'NEW'`
  - Stores rate information (basic implementation)
  - TODO: Full rate validation against market rates

---

## 🚧 IN PROGRESS / TODO

### 7. Admin Order Actions ⏳
- **Files:** `app/api/admin/orders/[id]/actions/route.ts`
- **Status:** Needs update
- **Required:**
  - Update to use `InternalStatus` type
  - Add "Verify Payment" action (read-only provider check)
  - Add "Override Status" action (admin can force any status)
  - Add "Enter Payout Hash" action (for manual mode)
  - Update "Mark Completed" to work with new status system

### 8. Admin Orders Panel ⏳
- **Files:** `components/admin/OrdersTable.tsx`, `components/admin/OrderDetailPanel.tsx`
- **Status:** Needs update
- **Required:**
  - Show `internal_status` for admin (not user_status)
  - Show `provider_status` for reference
  - Default filter: `PAYMENT_CONFIRMED` and `MANUAL_REVIEW`
  - Hide unpaid/spam orders by default
  - Add manual review queue view

### 9. User Order Page ⏳
- **File:** `app/order/[id]/page.tsx`
- **Status:** Needs complete rewrite
- **Required:**
  - Remove `getCurrentStep()` function (use backend `currentStep`)
  - Remove status mapping logic
  - Remove provider polling
  - Remove localStorage fallback
  - Use `user_status` from API
  - Use `currentStep` from API

### 10. Progress Timeline Component ⏳
- **File:** `components/ProgressTimeline.tsx`
- **Status:** Needs update
- **Required:**
  - Remove fake "Perform exchange" step
  - Use `currentStep` from backend (prop)
  - Update step labels to be user-friendly

### 11. UI Text Cleanup ⏳
- **Files:** Multiple components
- **Status:** Needs update
- **Required:**
  - Remove "Perform exchange" text
  - Remove "Converting funds" text
  - Remove "network confirmation" technical terms
  - Replace with simple, honest language
  - Remove provider names and developer language

### 12. Rate Validation Enhancement ⏳
- **File:** `app/api/payment/route.ts`
- **Status:** Basic implementation done, needs enhancement
- **Required:**
  - Fetch market rate from CoinGecko
  - Compare provider rate to market rate
  - Block order if deviation > 5%
  - Store deviation percentage

---

## 📋 NEXT STEPS

### Phase 1: Backend ✅ (COMPLETE)
1. ✅ Database migration
2. ✅ Status mapping functions
3. ✅ Database functions update
4. ✅ Webhook handler update
5. ✅ Order API update
6. ✅ Payment creation update

### Phase 2: Admin Panel (NEXT)
1. Update admin order actions API
2. Update admin orders table
3. Update admin order detail panel
4. Add manual review queue
5. Add payment verification button

### Phase 3: User UI (AFTER ADMIN)
1. Remove frontend status guessing
2. Remove fake progress timeline
3. Remove provider polling
4. Remove localStorage fallback
5. Clean up UI text

### Phase 4: Testing
1. Test order creation with new status system
2. Test webhook updates
3. Test admin overrides
4. Test manual mode workflow
5. Test user-facing status display

---

## 🔑 KEY CHANGES SUMMARY

### Status Flow (New)
```
Provider Status → Internal Status → User Status
(waiting)       → (NEW)            → "Waiting for payment"
(confirmed)     → (PAYMENT_CONFIRMED) → "Payment confirmed"
(sending)       → (PROCESSING_BY_PROVIDER) → "Processing"
```

### Manual Mode (Default)
```
PAYMENT_CONFIRMED → MANUAL_REVIEW → (Admin action) → DONE
```

### Automatic Mode (If enabled)
```
PAYMENT_CONFIRMED → PROCESSING_BY_PROVIDER → (Webhook) → DONE
```

---

## ⚠️ CRITICAL NOTES

1. **Database Migration Required:** Run `028_rebuild_order_status_system.sql` before deploying
2. **Backward Compatibility:** Legacy `status` field is kept but deprecated
3. **Manual Mode Default:** System defaults to manual payouts (safest)
4. **No Frontend Status Logic:** All status mapping is server-side only
5. **Admin Override Wins:** Admin decisions override provider status

---

## 📝 FILES MODIFIED

### Created:
- `supabase/migrations/028_rebuild_order_status_system.sql`
- `lib/status-mapping.ts`
- `IMPLEMENTATION_PROGRESS.md`

### Updated:
- `lib/db-orders.ts` (major rewrite)
- `app/api/webhook/nowpayments/route.ts`
- `app/api/order/[id]/route.ts`
- `app/api/payment/route.ts`

### Needs Update:
- `app/api/admin/orders/[id]/actions/route.ts`
- `components/admin/OrdersTable.tsx`
- `components/admin/OrderDetailPanel.tsx`
- `app/order/[id]/page.tsx`
- `components/ProgressTimeline.tsx`
- Various UI text files

---

**Last Updated:** 2024
**Status:** Backend foundation complete, frontend updates pending

