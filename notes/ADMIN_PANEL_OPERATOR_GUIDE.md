# Admin Panel: Complete Operator's Guide

## 1. START FROM ZERO: User Creates an Exchange Order

### Step-by-Step Flow

**User Side:**
1. User visits the website and selects currencies (e.g., BTC → USDT)
2. Enters amount and wallet address
3. Submits the order
4. Receives a payment address and order ID
5. Sends crypto to the payment address

**Backend (Automatic):**
1. Order is created in the database with status `NEW`
2. Payment provider (NOWPayments) generates a payment address
3. Order is linked to a `payment_id` from NOWPayments
4. User is notified of the payment address

**Admin View (Dashboard):**
- New order appears in the Orders table with status `NEW`
- Payment ID is visible
- Order shows: from currency, to currency, amounts, user info, created timestamp

**What Happens Next:**

**Scenario A: Payment Confirmed (Normal Flow)**
1. User sends crypto to the payment address
2. NOWPayments detects the payment
3. NOWPayments sends a webhook to `/api/webhook/nowpayments`
4. Webhook updates order status: `NEW` → `CONFIRMING` → `PENDING` → `EXCHANGE` → `DONE`
5. Admin sees status changes in real time in the Orders table
6. Order moves to `DONE` when complete
7. User receives their exchanged crypto

**Scenario B: Payment Stuck (Admin Action Needed)**
1. Order stays in `CONFIRMING` for >30 minutes
2. Dashboard shows "Payment Delays" count
3. Admin opens the order detail page
4. Admin clicks "Re-sync Status" to manually check with NOWPayments
5. If payment is confirmed but status is wrong, admin can "Replay Webhook"
6. Order status updates to the correct state

**Scenario C: Payment Failed (Admin Investigation)**
1. Order status becomes `EXPIRED` or `FAILED`
2. Admin checks the order detail page
3. Admin reviews:
   - Payment ID status in Payments page
   - Webhook logs for processing errors
   - Order status history timeline
4. Admin can add internal notes explaining the failure
5. If it's a false failure, admin can manually update status (with proper permissions)

---

## 2. SUPPORT / DISPUTES FLOW

### User Opens a Dispute

**User Side:**
1. User contacts support or opens a dispute
2. Provides order ID and description

**Admin Side - Where It Appears:**
- Disputes / Support page shows the new dispute with status `open`
- Dispute is linked to:
  - Order ID (clickable link to order detail)
  - User ID (if available)
  - Title and description
  - Priority (low, medium, high, urgent)
  - Refund required flag

### Admin Investigation Workflow

**Step 1: Review Dispute Details**
- Open the Disputes page
- Click the dispute to see full description
- Check linked order ID (opens order detail)

**Step 2: Check Order Status**
- Click the order ID link
- Review:
  - Current status
  - Payment ID
  - Amounts (sent vs received)
  - Timeline of status changes
  - Internal notes (if any)

**Step 3: Verify Payment**
- Go to Payments page
- Search by Payment ID from the order
- Click "Verify" to check current status with NOWPayments
- Compare DB status vs provider status
- If mismatch, click "Re-sync Status"

**Step 4: Check Webhook Logs**
- Go to Webhooks & Logs page
- Search by Payment ID or Order ID
- Review:
  - All webhook events for this payment
  - Processing timestamps
  - Any failed webhooks
- Click "Details" to see full webhook payload
- If webhook failed, click "Replay" (Super Admin only)

**Step 5: Add Internal Notes**
- In Order Detail or Dispute Detail, add notes:
  - Investigation findings
  - Communication with user
  - Resolution plan
  - Notes are admin-only

**Step 6: Update Dispute Status**
- Change status: `open` → `investigating` → `resolved` → `closed`
- Each status change is logged

**Step 7: Resolution Actions**

**If Refund Required:**
1. Mark dispute as "Refund Required"
2. Enter refund amount
3. Go to Wallets / Payouts page
4. Create manual payout (Super Admin only)
5. Update dispute status to `resolved`

**If Issue Resolved:**
1. Add final note explaining resolution
2. Change status to `resolved`
3. Close dispute when user confirms

**If False Claim:**
1. Add note explaining why
2. Change status to `resolved`
3. Close dispute

### Data Connections in Disputes

- Order → Payment ID → Webhook Logs (all linked)
- Dispute → Order → Payment → Webhook (full chain visible)
- Admin Notes → Order (persistent investigation trail)
- Dispute Status → Admin Action Logs (audit trail)

---

## 3. ORDERS ↔ PAYMENTS ↔ WEBHOOKS CONNECTION

### How They Connect

**Order Creation:**
1. User creates order → Order record created with `order_id`
2. Payment provider generates payment → `payment_id` assigned
3. Order links to payment via `payment_id` field
4. Order status starts as `NEW`

**Payment Processing:**
1. User sends crypto to payment address
2. NOWPayments detects payment
3. NOWPayments sends webhook to your server
4. Webhook contains `payment_id` and `payment_status`

**Webhook Processing:**
1. Webhook arrives at `/api/webhook/nowpayments`
2. System finds order by `payment_id`
3. Maps NOWPayments status to internal status:
   - `waiting` → `NEW`
   - `confirming` → `CONFIRMING`
   - `confirmed` → `PENDING`
   - `sending` → `EXCHANGE`
   - `finished` → `DONE`
   - `failed` → `EXPIRED`
4. Updates order status in database
5. Records webhook in `webhook_idempotency` table (prevents duplicates)

**Admin Verification Flow:**

**When Order Status Seems Wrong:**
1. Go to Orders page → Find order
2. Check Payment ID
3. Go to Payments page → Search by Payment ID
4. Click "Verify" → Fetches current status from NOWPayments
5. Compare:
   - DB status (what you see)
   - Provider status (what NOWPayments says)
6. If different:
   - Click "Re-sync Status" (updates order from provider)
   - Or "Replay Webhook" (re-processes webhook)

**When Webhook Might Have Failed:**
1. Go to Webhooks & Logs page
2. Search by Payment ID or Order ID
3. Review all webhook events:
   - First webhook (initial payment)
   - Status update webhooks
   - Any duplicate webhooks (idempotency prevents reprocessing)
4. If webhook is missing:
   - Check if NOWPayments sent it (provider dashboard)
   - If sent but not processed, click "Replay" (Super Admin only)
5. If webhook shows error:
   - Check webhook details (signature verification, payload)
   - Replay if safe

**When to Use Each Tool:**

**Re-sync Status:**
- Order status doesn't match reality
- Payment confirmed but order still `CONFIRMING`
- Quick check with provider

**Replay Webhook:**
- Webhook was sent but not processed
- Order stuck due to webhook failure
- Super Admin only (logged)

**Manual Verification:**
- Suspicious payment
- Dispute investigation
- Pre-refund verification

### Dependency Chain

```
User Payment
    ↓
NOWPayments Detects
    ↓
Webhook Sent → Your Server
    ↓
Webhook Updates Order Status
    ↓
Order Status Change → User Notified
    ↓
Admin Sees Update in Real-Time
```

**If Webhook Fails:**
- Order status doesn't update
- Admin sees mismatch in Payments page
- Admin manually verifies and re-syncs
- Or replays webhook if needed

---

## 4. WALLETS & PAYOUTS FLOW

### Wallet Management

**What Wallets Are:**
- Hot wallets: Active wallets for receiving payments
- Cold wallets: Storage wallets (read-only tracking)
- Payout wallets: Wallets used to send crypto to users

**When Wallets Are Used:**
- Hot wallets receive user payments (via NOWPayments)
- Payout wallets send exchanged crypto to users
- Admin tracks balances per network/currency

**Adding a Wallet:**
1. Go to Wallets / Payouts page
2. Click "Add Wallet"
3. Enter:
   - Network (Ethereum, BSC, Polygon, Tron, Bitcoin)
   - Currency (BTC, USDT, ETH, etc.)
   - Address
   - Label (optional, e.g., "Main Hot Wallet")
   - Type (hot, cold, payout)
4. Save → Wallet appears in table
5. Balance updates when synced (manual or automatic)

### Payout Flow

**Automatic Payouts (Normal):**
1. Order reaches `DONE` status
2. System initiates payout to user's wallet address
3. Payout record created with status `pending`
4. Payout processed → Status `processing` → `completed`
5. TX hash recorded when transaction confirmed

**Manual Payouts (Admin-Initiated):**
1. Go to Wallets / Payouts page
2. Click "Initiate Manual Payout" (Super Admin only)
3. Enter:
   - Order ID (if linked to order)
   - Network and currency
   - Amount
   - Recipient address
4. Payout created with status `pending`
5. Admin or system processes payout
6. Admin updates status: `completed` or `failed`

**Payout Status Management:**
- `pending`: Created, not processed
- `processing`: Transaction sent, waiting confirmation
- `completed`: Transaction confirmed, TX hash recorded
- `failed`: Transaction failed, reason recorded
- `cancelled`: Payout cancelled before processing

**When Payout Fails:**
1. Admin sees payout with status `failed`
2. Checks failed reason (recorded in payout record)
3. Verifies recipient address is correct
4. Checks wallet balance (sufficient funds?)
5. If address wrong: Cancel payout, create new one with correct address
6. If insufficient funds: Add funds to wallet, retry payout
7. If network issue: Wait and retry, or mark as failed and investigate

**Pausing Payouts (Emergency):**
1. Click "Pause Payouts" button
2. All new payouts are blocked
3. Existing payouts continue processing
4. Use when:
   - Wallet balance low
   - Network issues
   - Security concern
   - Maintenance
5. Resume by clicking "Resume Payouts" (if implemented)

### Money Flow (Real Example)

**Scenario: User Exchanges 0.1 BTC → 5000 USDT**

1. User sends 0.1 BTC to payment address
2. BTC received in hot wallet (tracked in Wallets page)
3. Order status: `CONFIRMING` → `PENDING` → `EXCHANGE`
4. System initiates payout: 5000 USDT to user's address
5. Payout created in Payouts table (status `pending`)
6. System sends 5000 USDT from payout wallet
7. Payout status: `processing` → `completed`
8. TX hash recorded
9. Order status: `DONE`
10. User receives 5000 USDT

**Admin Monitoring:**
- Hot wallet balance decreases (BTC received)
- Payout wallet balance decreases (USDT sent)
- Payout record shows completed status
- Order shows DONE status
- All linked and traceable

---

## 5. RATES, FEES & EXCHANGE ENGINE FLOW

### How Rates Affect Orders

**Global Fee Percentage:**
- Default fee applied to all exchanges
- Example: 1% global fee
- User sends 100 USDT → System takes 1 USDT fee → User receives 99 USDT worth of target currency

**Per-Pair Fee Override:**
- Specific pairs can have different fees
- Example: BTC → USDT: 0.5% fee (lower than global)
- Example: ETH → USDT: 2% fee (higher than global)
- Override takes precedence over global fee

**Emergency Fee Multiplier:**
- Temporary multiplier for all fees
- Example: Emergency multiplier = 1.5x
- Global 1% fee becomes 1.5% during emergency
- Use during high volatility or risk periods

**Rate Type (Fixed vs Float):**
- Float: Exchange rate changes with market (default)
- Fixed: Exchange rate locked at order creation
- Admin sets this globally

### When Admin Changes Fees

**Normal Fee Adjustment:**
1. Go to Rates & Fees page
2. Update Global Fee Percentage (e.g., 1% → 1.5%)
3. Or update specific pair fee
4. Click "Save Changes"
5. New fee applies to all new orders
6. Existing orders keep their original fee
7. Change is logged in admin action logs

**Emergency Fee Increase:**
1. Go to Rates & Fees page
2. Increase Emergency Fee Multiplier (e.g., 1.0 → 1.5)
3. Save
4. All new orders have 1.5x fee
5. Remove multiplier when emergency ends

### Exchange Engine Controls

**Enabling/Disabling Pairs:**
1. Go to Exchange Engine page
2. See all exchange pairs (BTC → USDT, ETH → USDT, etc.)
3. Toggle "Enabled" button to enable/disable pair
4. Disabled pairs:
   - Don't appear to users
   - Existing orders continue processing
   - New orders blocked for this pair

**Min/Max Amount Limits:**
1. Each pair has min/max amounts
2. Example: BTC → USDT: Min 0.001 BTC, Max 10 BTC
3. Users can't create orders below min or above max
4. Admin can edit min/max amounts

**Simulation Mode (Critical Feature):**
1. Before changing min/max or disabling pair, click "Preview"
2. System shows:
   - How many active orders would be affected
   - How many pending orders would be blocked
   - Impact of min/max changes
3. Admin reviews impact
4. If safe, proceed with actual change
5. If risky, cancel and adjust plan

**Example Simulation:**
- Admin wants to disable BTC → USDT pair
- Clicks "Preview"
- System shows: "5 active orders would be affected"
- Admin sees this is risky
- Admin waits for active orders to complete
- Then disables pair safely

### Maintenance Mode

**What It Does:**
- Disables all write operations:
  - Order creation (blocked)
  - Exchange pair changes (blocked)
  - Fee changes (blocked)
  - Payout initiation (blocked)
- Allows read operations:
  - View orders
  - View payments
  - View webhooks
  - View analytics
- Shows maintenance banner in admin UI

**When to Use:**
- Provider outage (NOWPayments down)
- Webhook system failure
- Rate feed issues
- Security incident
- Planned maintenance

**How to Enable:**
1. Go to Settings page
2. Toggle Maintenance Mode
3. System blocks all write operations
4. Admin can still investigate and monitor
5. Disable when issue resolved

---

## 6. ROLES & PERMISSIONS

### Viewer Role

**What They Can Do:**
- View all pages (Dashboard, Orders, Payments, Users, etc.)
- Read all data (orders, payments, webhooks, analytics)
- Search and filter data
- Export data (webhooks, etc.)
- View order details, payment details, webhook details

**What They Cannot Do:**
- Modify orders (lock, mark failed, re-sync)
- Change exchange pairs
- Update fees
- Create payouts
- Replay webhooks
- Manage admin users
- Change settings

**Why This Role Exists:**
- Support staff who need to investigate but not make changes
- Auditors who need read-only access
- Analysts who need data access without risk

### Operator Role

**What They Can Do:**
- Everything Viewer can do, plus:
- Modify orders:
  - Lock orders
  - Re-sync order status
  - Mark orders as failed
  - Add internal notes
- Manage payments:
  - Verify payments
  - Flag suspicious payments
- Manage disputes:
  - Update dispute status
  - Add notes
  - Mark refund required
- Manage exchange pairs:
  - Enable/disable pairs
  - Edit min/max amounts
  - Use simulation mode
- View webhook details

**What They Cannot Do:**
- Replay webhooks (Super Admin only)
- Create/delete admin users
- Change global fees (Super Admin only)
- Initiate manual payouts (Super Admin only)
- Rotate webhook secrets (Super Admin only)
- Toggle maintenance mode (Super Admin only)

**Why This Role Exists:**
- Day-to-day operations staff
- Support managers who resolve issues
- Operations team who manage orders and payments

### Super Admin Role

**What They Can Do:**
- Everything Operator can do, plus:
- Replay webhooks (dangerous - can duplicate processing)
- Manage admin users:
  - Create new admin users
  - Edit admin roles
  - Delete admin users
  - Reset passwords
- Change global fees and emergency multipliers
- Initiate manual payouts
- Rotate webhook secrets
- Toggle maintenance mode
- Access all settings

**Why This Role Exists:**
- System administrators
- Founders/owners
- Senior technical staff
- Emergency access for critical situations

**Dangerous Actions (Super Admin Only):**
- Replay webhook: Can cause duplicate order updates if not careful
- Delete admin user: Permanent, cannot undo
- Rotate webhook secret: Must update environment variable immediately
- Manual payout: Direct money movement, must verify carefully

---

## 7. DAILY ADMIN ROUTINE

### Morning Checks (9:00 AM)

**1. Dashboard Overview (5 minutes)**
- Check KPIs:
  - Total volume (24h)
  - Success rate (should be >95%)
  - Pending orders count
  - Payment delays count
- Red flags:
  - Success rate <90% → Investigate
  - Payment delays >5 → Check stuck orders
  - Volume drop >50% → Check if pairs disabled

**2. Orders Review (10 minutes)**
- Filter orders by status: `CONFIRMING`, `PENDING`, `EXCHANGE`
- Check orders older than 1 hour in these statuses
- For each stuck order:
  - Open order detail
  - Check payment status
  - Click "Re-sync Status" if needed
  - Add note if action taken

**3. Payment Delays (5 minutes)**
- Go to Payments page
- Filter by status: `CONFIRMING`
- Check orders with `CONFIRMING` >30 minutes
- Verify payment with NOWPayments
- Update status if payment confirmed

### Mid-Day Monitoring (2:00 PM)

**4. Disputes Check (15 minutes)**
- Go to Disputes / Support page
- Filter by status: `open`, `investigating`
- For each open dispute:
  - Review description
  - Check linked order
  - Verify payment status
  - Check webhook logs
  - Add investigation notes
  - Update status to `investigating` if started

**5. Webhook Health (5 minutes)**
- Go to Webhooks & Logs page
- Check recent webhooks (last 2 hours)
- Look for:
  - Failed webhooks
  - Duplicate webhooks (idempotency working?)
  - Webhooks with long processing times
- If issues found, investigate and replay if needed

**6. Wallet Balances (5 minutes)**
- Go to Wallets / Payouts page
- Check hot wallet balances
- Check payout wallet balances
- Low balance alert:
  - If <10% of daily volume → Add funds soon
  - If <5% of daily volume → Add funds immediately
  - Pause payouts if critically low

### Afternoon Operations (4:00 PM)

**7. Stuck Orders Resolution (20 minutes)**
- Review all orders stuck >2 hours
- For each:
  - Check payment status
  - Check webhook logs
  - Verify with provider
  - Take action (re-sync, replay, manual update)
  - Add notes

**8. Dispute Resolution (30 minutes)**
- Review disputes in `investigating` status
- Complete investigation
- Communicate with users (if needed)
- Update dispute status
- Process refunds if required (Super Admin)

**9. Exchange Engine Check (10 minutes)**
- Go to Exchange Engine page
- Review all pairs:
  - Are popular pairs enabled?
  - Are min/max limits reasonable?
  - Any pairs need fee adjustment?
- Use simulation mode before making changes

### End-of-Day Review (6:00 PM)

**10. Analytics Review (10 minutes)**
- Go to Analytics page
- Review:
  - Volume over time (trends?)
  - Success rate (improving or declining?)
  - Coin failure rates (any problematic pairs?)
  - Fee revenue (meeting targets?)
- Note any trends for tomorrow

**11. Action Logs Review (5 minutes)**
- Go to Admin & Security page (Super Admin)
- Review admin actions today:
  - Who did what?
  - Any unusual actions?
  - Any mistakes that need correction?

**12. Final Checks (5 minutes)**
- Dashboard: Any red flags?
- Orders: Any still stuck?
- Disputes: Any urgent ones?
- Wallets: Balances OK for tomorrow?

---

## 8. FAILURE & EMERGENCY SCENARIOS

### Scenario 1: Webhook Failure

**Symptoms:**
- Orders stuck in `CONFIRMING` or `PENDING`
- Payments confirmed on NOWPayments but order status not updated
- Webhook logs show no recent webhooks

**Investigation:**
1. Go to Webhooks & Logs page
2. Check last webhook timestamp
3. If no webhooks in last hour → Webhook system down
4. Go to Payments page
5. Find stuck orders
6. Click "Verify" on each payment
7. Compare DB status vs provider status

**Resolution:**
1. Enable Maintenance Mode (Super Admin)
2. Manually verify all stuck payments
3. Manually update order statuses if safe
4. Check webhook endpoint health
5. If webhook endpoint down:
   - Check server logs
   - Restart webhook service if needed
   - Test webhook endpoint
6. Once webhooks working:
   - Replay missed webhooks (Super Admin)
   - Or manually update statuses
7. Disable Maintenance Mode

**Prevention:**
- Monitor webhook logs daily
- Set up alerts for webhook failures
- Regular health checks

### Scenario 2: Payment Stuck

**Symptoms:**
- Order in `CONFIRMING` status >1 hour
- Payment shows confirmed on blockchain
- NOWPayments shows payment received
- Order status not updating

**Investigation:**
1. Open order detail page
2. Check Payment ID
3. Go to Payments page → Search by Payment ID
4. Click "Verify" → Check NOWPayments status
5. Go to Webhooks & Logs → Search by Payment ID
6. Check if webhook was received and processed

**Resolution:**
1. If webhook received but not processed:
   - Check webhook details for errors
   - Replay webhook (Super Admin)
2. If webhook not received:
   - Check NOWPayments dashboard (did they send it?)
   - If sent but not received: Check server/firewall
   - If not sent: Contact NOWPayments support
3. If webhook processed but status wrong:
   - Manually update order status (with proper permissions)
   - Add note explaining why
4. Verify order updates correctly

### Scenario 3: Exchange Provider Down

**Symptoms:**
- NOWPayments API returns errors
- New orders failing to create
- Payment verification failing
- Webhooks not arriving

**Investigation:**
1. Try to create test order → Fails
2. Check NOWPayments status page
3. Check system health indicators
4. Verify API key is valid

**Resolution:**
1. Enable Maintenance Mode immediately (Super Admin)
2. Disable all exchange pairs (prevent new orders)
3. Monitor existing orders (let them complete)
4. Contact NOWPayments support
5. Wait for provider to restore service
6. Once restored:
   - Verify API connectivity
   - Re-enable exchange pairs
   - Disable Maintenance Mode
7. Check for missed webhooks during outage
8. Replay webhooks if needed (Super Admin)

### Scenario 4: Wrong Rate Configuration

**Symptoms:**
- Users reporting incorrect exchange amounts
- Revenue significantly different than expected
- Analytics showing unusual fee patterns

**Investigation:**
1. Go to Rates & Fees page
2. Check global fee percentage
3. Check per-pair fees
4. Check emergency multiplier (is it still active?)
5. Go to Analytics → Fee Revenue chart
6. Compare expected vs actual revenue

**Resolution:**
1. If emergency multiplier still active:
   - Remove it if emergency ended
   - Save changes
2. If per-pair fee wrong:
   - Correct the fee
   - Save changes
3. If global fee wrong:
   - Correct global fee (Super Admin)
   - Save changes
4. Verify new orders use correct fees
5. Note: Existing orders keep their original fees
6. Add note in admin logs explaining correction

**Prevention:**
- Use simulation mode before fee changes
- Double-check fee values before saving
- Review fee revenue daily

### Scenario 5: Payout Failure

**Symptoms:**
- Payouts stuck in `pending` or `processing`
- Users not receiving crypto
- Payout wallet balance low
- Transaction failures

**Investigation:**
1. Go to Wallets / Payouts page
2. Filter payouts by status: `pending`, `processing`, `failed`
3. Check payout wallet balances
4. Review failed payouts (check failure reason)
5. Check network status (is blockchain congested?)

**Resolution:**
1. If wallet balance low:
   - Add funds to payout wallet
   - Retry failed payouts
2. If address wrong:
   - Cancel payout
   - Create new payout with correct address
3. If network issue:
   - Wait for network to stabilize
   - Retry payouts
4. If transaction failed:
   - Check failure reason
   - Verify recipient address
   - Retry if safe
5. If critical issue:
   - Pause all payouts
   - Investigate root cause
   - Fix issue
   - Resume payouts

### Scenario 6: Security Incident

**Symptoms:**
- Unusual admin actions in logs
- Unexpected order status changes
- Suspicious payments
- Unauthorized access attempts

**Investigation:**
1. Go to Admin & Security page
2. Review admin action logs (last 24 hours)
3. Look for:
   - Unusual admin actions
   - Actions from unknown IPs
   - Mass status changes
   - Unauthorized role changes
4. Go to Orders page
5. Check for suspicious orders (unusual amounts, patterns)
6. Go to Payments page
7. Check for flagged payments

**Resolution:**
1. Enable Maintenance Mode immediately (Super Admin)
2. Disable affected admin accounts
3. Review all recent admin actions
4. Revert unauthorized changes if safe
5. Change admin passwords
6. Review security logs
7. Contact security team if needed
8. Once secure:
   - Re-enable admin accounts
   - Disable Maintenance Mode
9. Document incident in admin logs

---

## Summary: Admin Panel as a Control System

The admin panel connects:
- Orders (what users want)
- Payments (money received)
- Webhooks (status updates)
- Wallets (money storage)
- Payouts (money sent)
- Disputes (user problems)
- Analytics (system health)

**Key Principle:**
Every action is logged, every change is traceable, and every decision is auditable. Money safety comes first, so critical actions require proper permissions and confirmations.

**Daily Focus:**
- Monitor dashboard for red flags
- Resolve stuck orders quickly
- Investigate disputes thoroughly
- Verify payments and webhooks
- Maintain wallet balances
- Review analytics for trends

**Emergency Response:**
- Enable Maintenance Mode immediately
- Investigate root cause
- Fix issue safely
- Verify fix works
- Disable Maintenance Mode
- Document everything

This system is designed for operators who need to move fast while maintaining safety and auditability. Every feature serves a real operational need, and every action can be traced back to who did what and when.

