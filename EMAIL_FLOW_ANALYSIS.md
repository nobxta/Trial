# Email Sending Flow Analysis - MintMove Crypto Exchange

**Date:** Analysis Date  
**Type:** Read-only technical analysis  
**Status:** Complete

---

## Executive Summary

The MintMove project uses a **hybrid email system**:
- **Development:** Emails send **immediately** (synchronous) via SMTP
- **Production:** Emails are **queued** in a database and processed asynchronously by a cron job

**⚠️ CRITICAL FINDING:** The email queue processing cron job is **NOT configured** in `vercel.json`, meaning emails queued in production will **NOT be sent automatically** unless the cron endpoint is manually triggered or configured.

---

## 1. Initial Trigger Functions

### 1.1 Account Verification Emails

**Function:** `sendVerificationEmail(email, token, request?)`  
**Location:** `lib/email.ts:118-198`

**Called from:**
- `app/api/auth/signup/route.ts:57` - User signup (non-blocking, fire-and-forget)
- `app/api/auth/resend-verification/route.ts:44` - Resend verification (awaiting)

**Behavior:**
- Checks if verification emails are enabled via `email_settings` table
- In **development** (`NODE_ENV === 'development'`): Sends immediately via `sendEmailViaSMTP()`
- In **production**: Queues email via `queueEmail()`

### 1.2 Order Status & Generic Emails

**Function:** `sendGenericEmail(to, subject, html, text?, request?)`  
**Location:** `lib/email.ts:207-233`

**Called from:**
- `lib/notifications.ts:68` - Order status notifications
- `lib/notifications.ts:82` - Generic notifications (promotions, affiliate earnings)

**Behavior:**
- **Always queues** emails (no immediate send, regardless of environment)
- Only logs to console if SMTP not configured

**Notification Flow:**
```
Order Status Update (webhook/admin)
  → notifyOrderStatus()
    → sendNotification()
      → sendGenericEmail()
        → queueEmail()
```

**Triggered from:**
- `app/api/webhook/nowpayments/route.ts:454` - NOWPayments webhook (DONE, EXPIRED, PROCESSING_BY_PROVIDER)
- `app/api/admin/orders/[id]/actions/route.ts:294,470` - Admin order actions

---

## 2. Queue Implementation

### 2.1 Queue Function

**Function:** `queueEmail({to, subject, html, text})`  
**Location:** `lib/email.ts:14-52`

**What it does:**
1. Inserts email record into `email_queue` table (PostgreSQL/Supabase)
2. Sets status to `'pending'`
3. Sets `attempts` to `0`
4. Sets `scheduled_at` to current timestamp
5. **Logs:** `📬 Email queued for {to}: {subject}` ← **This is where your log message comes from**

**Database Schema:** `supabase/migrations/000_final_schema.sql:349-362`

```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**"Queued" means:** Stored in **database** (PostgreSQL), NOT memory, NOT Redis, NOT a background worker queue.

---

## 3. Email Processing Worker/Cron

### 3.1 Cron Endpoint

**Location:** `app/api/cron/process-email-queue/route.ts`  
**Methods:** GET, POST (POST forwards to GET)

**What it does:**
1. Fetches up to 10 pending emails where `status = 'pending'` and `scheduled_at <= now()`
2. Processes each email via `sendEmailViaSMTP()`
3. On success: Updates status to `'sent'`, sets `sent_at`
4. On failure: Increments `attempts`, reschedules with exponential backoff
   - Attempt 1 → retry in 5 minutes
   - Attempt 2 → retry in 15 minutes
   - Attempt 3 → marks as `'failed'`, stores error in `last_error`

**Security:**
- Protected by `CRON_SECRET` environment variable (optional but recommended)
- Verifies `Authorization: Bearer {CRON_SECRET}` header

### 3.2 ⚠️ CRITICAL ISSUE: Cron Not Configured

**File:** `vercel.json`

**Current configuration:**
```json
{
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/update-exchange-limits",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Problem:** The email queue processing cron (`/api/cron/process-email-queue`) is **NOT listed** in `vercel.json`.

**Impact:** 
- Emails queued in production will **sit in the database forever** as `pending`
- They will **never be sent** unless:
  1. The endpoint is manually called (GET/POST to `/api/cron/process-email-queue`)
  2. A cron job is added to `vercel.json`
  3. An external cron service calls the endpoint

**Recommended fix:**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-email-queue",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    },
    // ... existing crons
  ]
}
```

---

## 4. Actual SMTP Send Function

**Function:** `sendEmailViaSMTP({to, subject, html, text, headers?, messageId?})`  
**Location:** `lib/email.ts:58-96`

**Provider:** **Nodemailer** (NOT Resend, NOT SendGrid, NOT SendGrid)

**SMTP Configuration:**
- Initialized at module load time (`lib/email.ts:98-116`)
- Only creates transporter if `SMTP_USER` and `SMTP_PASS` env vars are set
- Uses credentials from environment variables:
  - `SMTP_HOST` (default: `smtp.gmail.com`)
  - `SMTP_PORT` (default: `587`)
  - `SMTP_SECURE` (auto-determined: `true` for port 465, else `false`)
  - `SMTP_USER` (required)
  - `SMTP_PASS` (required)
  - `SMTP_FROM` (default: `SMTP_USER` or `noreply@mintmove.com`)
  - `SMTP_FROM_NAME` (default: `MintMove`)

**Environment Variables Location:**
- Loaded from `.env.local` (local development)
- Set in Vercel project settings (production)
- Documentation: `notes/README.md:55-61`, `notes/README_SUPABASE.md:50-56`

**Connection Settings:**
- Connection timeout: 5000ms
- Greeting timeout: 5000ms
- Socket timeout: 5000ms

---

## 5. Failure Handling

### 5.1 Retry Logic

**Implementation:** `app/api/cron/process-email-queue/route.ts:104-148`

**Retry Strategy:**
- **Max attempts:** 3
- **Exponential backoff:**
  - After 1st failure: reschedule for 5 minutes later
  - After 2nd failure: reschedule for 15 minutes later
  - After 3rd failure: mark as `'failed'` (permanent failure)

**Rescheduling:**
- Updates `scheduled_at` to future timestamp
- Increments `attempts` counter
- Stores error message in `last_error` field
- Status remains `'pending'` until max attempts reached

### 5.2 Failed Email Logs

**Storage:**
- Failed emails remain in `email_queue` table with `status = 'failed'`
- `last_error` field contains error message
- `attempts` field shows number of failed attempts (3)

**Viewing:**
- Admin email logs page: `app/admin/email-logs/page.tsx` (queries `email_queue` table)
- Database queries: `SELECT * FROM email_queue WHERE status = 'failed'`

### 5.3 Status Updates

**Status Flow:**
```
pending → (processing) → sent (success)
                      → pending (retry, increments attempts)
                      → failed (after 3 attempts)
```

**Fields:**
- `status`: `'pending' | 'sent' | 'failed'`
- `attempts`: Integer (0-3)
- `last_error`: Error message (on failure)
- `scheduled_at`: When to process (used for retry delays)
- `sent_at`: Timestamp when successfully sent

---

## 6. Flow Diagram

### 6.1 Development Mode (Verification Emails)

```
User Action (Signup/Resend)
  ↓
sendVerificationEmail()
  ↓
[NODE_ENV === 'development'] → TRUE
  ↓
sendEmailViaSMTP() ← IMMEDIATE SEND (synchronous)
  ↓
Nodemailer → SMTP Server
  ↓
✅ Email sent immediately
  OR
❌ Error logged, fallback console log
```

### 6.2 Production Mode (All Emails)

```
User Action (Signup/Order Update/etc)
  ↓
sendVerificationEmail() OR sendGenericEmail()
  ↓
queueEmail()
  ↓
INSERT INTO email_queue (status='pending', attempts=0, scheduled_at=NOW())
  ↓
✅ Log: "📬 Email queued for {email}: {subject}"
  ↓
[EMAIL SITS IN DATABASE - status='pending']
  ↓
❌ PROBLEM: No cron job configured!
  ↓
[WAITING FOR CRON JOB TO RUN...]
  ↓
/api/cron/process-email-queue (GET/POST) ← MUST BE CALLED EXTERNALLY
  ↓
SELECT * FROM email_queue WHERE status='pending' AND scheduled_at <= NOW() LIMIT 10
  ↓
For each email:
  ↓
sendEmailViaSMTP()
  ↓
Nodemailer → SMTP Server
  ↓
Success → UPDATE status='sent', sent_at=NOW()
  OR
Failure → UPDATE attempts++, scheduled_at=NOW()+backoff, last_error=error
  ↓
After 3 failures → UPDATE status='failed'
```

---

## 7. Final Verdict

### 7.1 Instant Send vs Queued Send

**Development Environment:**
- ✅ **Instant send** for verification emails
- ✅ Queue system available but not used for verification emails
- ✅ Generic emails always queue (even in dev)

**Production Environment:**
- ❌ **Queued send only** (NO instant sends)
- ⚠️ **BUT:** Queue processor cron is NOT configured
- ❌ **Result:** Emails are queued but **NEVER processed** unless cron is manually triggered

### 7.2 Email Delivery Guarantee

**Current State:**
- ❌ **NOT guaranteed** - emails are queued but cron is not running
- ❌ **Dependent on external trigger** - requires manual cron configuration or external service

**If Cron is Configured:**
- ✅ **Eventually guaranteed** (within 5 minutes if cron runs every 5 min)
- ✅ **Retry logic** ensures resilience (3 attempts with backoff)
- ✅ **Not immediate** - up to 5 minutes delay (depending on cron frequency)

---

## 8. Bugs, Risks, and Misleading Logs

### 8.1 🚨 CRITICAL BUG: Missing Cron Configuration

**Issue:** Email queue cron job not in `vercel.json`  
**Impact:** Production emails never sent  
**Severity:** CRITICAL  
**Location:** `vercel.json` (missing entry)

**Fix Required:**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-email-queue",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 8.2 Misleading Log Message

**Message:** `📬 Email queued for {email}: {subject}`  
**Location:** `lib/email.ts:46`

**Issue:** 
- Log says "queued" which is technically correct
- But doesn't indicate that emails won't be sent without cron configuration
- User might think email is "on its way" when it's actually stuck in database

**Recommendation:** Add warning log if in production:
```typescript
console.log(`📬 Email queued for ${to}: ${subject}`);
if (process.env.NODE_ENV === 'production') {
  console.warn('⚠️  Ensure /api/cron/process-email-queue is configured to process emails');
}
```

### 8.3 Development vs Production Inconsistency

**Issue:** 
- Verification emails send immediately in development
- But queue in production
- Different behavior makes testing harder

**Risk:** Developers test in dev, assume production works the same way, but production behavior is different (and broken due to missing cron).

### 8.4 No Immediate Send Option in Production

**Issue:** 
- `sendGenericEmail()` ALWAYS queues, even if you want immediate send
- No way to force immediate send in production

**Risk:** If queue processing fails or is delayed, critical emails (like order confirmations) are delayed.

### 8.5 Silent Failures

**Issue:**
- `sendVerificationEmail()` always returns `true` (even on queue failure)
- `sendGenericEmail()` returns boolean but failures are silent to user
- User action completes successfully even if email queueing fails

**Risk:** Users think email was sent, but it wasn't even queued.

**Evidence:**
```typescript
// lib/email.ts:188-197
if (!queued) {
  console.log('\n=== EMAIL VERIFICATION (Queue Failed - Fallback) ===');
  // ... logs to console only
}
return true; // Always returns true, even if queue failed
```

### 8.6 No Queue Monitoring/Alerting

**Issue:**
- No monitoring of queue depth
- No alerts if queue processing fails
- No alerts if emails are failing permanently

**Risk:** Queue could be broken and nobody notices until users complain.

---

## 9. Code Locations Summary

| Component | File | Lines |
|-----------|------|-------|
| Queue function | `lib/email.ts` | 14-52 |
| Log message source | `lib/email.ts` | 46 |
| SMTP send function | `lib/email.ts` | 58-96 |
| Verification email | `lib/email.ts` | 118-198 |
| Generic email | `lib/email.ts` | 207-233 |
| Cron processor | `app/api/cron/process-email-queue/route.ts` | 1-211 |
| Database schema | `supabase/migrations/000_final_schema.sql` | 349-362 |
| Cron config (missing) | `vercel.json` | - |
| Signup trigger | `app/api/auth/signup/route.ts` | 57 |
| Resend trigger | `app/api/auth/resend-verification/route.ts` | 44 |
| Order notifications | `lib/notifications.ts` | 96-137 |
| Webhook trigger | `app/api/webhook/nowpayments/route.ts` | 454 |
| Admin trigger | `app/api/admin/orders/[id]/actions/route.ts` | 294, 470 |

---

## 10. Recommendations (Analysis Only - Not Implemented)

1. **URGENT:** Add email queue cron to `vercel.json`
2. Add monitoring/alerting for queue depth and failures
3. Consider adding immediate send option for critical emails
4. Add queue status endpoint for health checks
5. Consider adding email delivery status tracking
6. Add user-facing error messages if email queueing fails (optional)
7. Document the difference between dev and production behavior

---

**End of Analysis**


