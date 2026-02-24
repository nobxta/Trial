# How MintMove Works — Plain Overview

This document explains how the MintMove website works from end to end: email, payments, admin, exchange, logos, support chat, database, pages, and the full user flow. Written so any reader can follow it; technical names (APIs, env vars) are included where useful.

---

## 1. What MintMove Is

MintMove is a **cryptocurrency exchange website**. You pick what you want to send (e.g. Bitcoin) and what you want to receive (e.g. USDT), enter an amount and your receive address, and the site creates an order. You pay to a deposit address; when the payment is confirmed, the site (via its payment partner) sends the converted crypto to your address. No account is required to create an order; you can also sign up to get email updates and manage orders.

---

## 2. Website Design and Main Pages

**Design:** Dark theme (dark background, light text), hero section with “Lightning-Fast Cryptocurrency Exchange,” trust strip (No KYC, instant, trusted since 2018, etc.), and a central **exchange widget** where you choose currencies and amount.

**Main pages you see as a user:**

- **Home** (`/`) — Exchange widget, benefits, FAQ, recent transactions.
- **Order page** (`/order/[id]`) — After you create an order, you land here. Shows: what to send, how much, deposit address (and QR), what you’ll receive, countdown timer, progress steps (Awaiting deposit → Confirming → Exchanging → Completed), and links to track or get help.
- **Track order** (`/track-order`) — Enter order ID (and optionally email) to see status.
- **Sign up / Sign in** (`/sign-up`, `/sign-in`) — Account creation and login.
- **Verify email** (`/verify-email`) — Page opened from the link in the verification email.
- **Account** — Orders, API key, addresses, payouts, affiliate, personal settings (when logged in).
- **Support** (`/support`) — Contact options: email addresses (support, affiliate, compliance, legal, API, etc.) and **in-page support chat** (start a chat, get a chat ID, exchange messages with support).
- **About, Blog, FAQ, Docs** — Info, guides, and API documentation.
- **Docs** — How the API works, authentication, endpoints (create order, get order, exchange rate, QR codes, etc.).

So: **website design** is a dark, modern marketing site with the exchange and order flow at the center; **pages** cover home, order, track, account, support, and docs.

---

## 3. Email Sending (SMTP)

**How it works:** The site sends emails through **SMTP** (standard email-sending). It uses **Nodemailer** and your server’s SMTP settings. No separate “email service” name in code — it’s whatever you configure.

**Configuration (environment variables):**

- `SMTP_HOST` — e.g. `smtp.gmail.com` (default if not set).
- `SMTP_PORT` — e.g. `587`.
- `SMTP_USER` and `SMTP_PASS` — SMTP login. In production these are required.

**What gets sent:**

1. **Verification email** — When you sign up, the site sends a “verify your email” link (to `/verify-email?token=...`). Sent **immediately** via SMTP from the signup and resend-verification flows.
2. **Order status emails** — When an order moves to a meaningful status (e.g. payment confirming, completed, expired), the site can send an email like “Order XYZ – Status Update” with a link to the order page. This only happens if: you’re logged in, your email is verified, you have notifications enabled, and the admin hasn’t turned off “order notifications” in **Admin → Settings → Email**. These are sent **immediately** via SMTP when the status changes (e.g. when the payment webhook is processed).
3. **Email queue** — There is also an **email queue** in the database (`email_queue` table). A scheduled job (cron) runs **Process Email Queue** (`/api/cron/process-email-queue`) and sends any pending emails in that queue via the same SMTP. So: some emails go out immediately (verification, order status); others can be queued and sent by the cron.

**Summary:** One email system: **SMTP** (Nodemailer). Verification and order-status emails go out straight away; other bulk/generic emails can go through the queue and be sent by the cron job.

---

## 4. NowPayments (Payments and Payouts)

**What it is:** The site uses **NOWPayments** as the payment provider. NOWPayments creates the “pay this amount to this address” (deposit) and, when you choose automatic payout, sends the converted crypto to your address.

**Flow in short:**

1. You submit an exchange on the site (send currency, receive currency, amount, receive address).
2. The site calls **NOWPayments API** to create a payment (our backend calls `createPayment` in `lib/nowpayments.ts`). NOWPayments returns a deposit address, amount, and payment ID.
3. The site saves an **order** in the database (with that payment ID and deposit details) and shows you the **order page** with the deposit address and QR.
4. You send crypto to that address. NOWPayments detects it and sends a **webhook** (instant payment notification) to our server.
5. Our **webhook endpoint** is `POST /api/webhook/nowpayments`. It receives the status (e.g. “waiting” → “confirming” → “finished” or “expired”). We verify the request with a **signature** (HMAC) using a secret (`NOWPAYMENTS_IPN_SECRET_LIVE` or `NOWPAYMENTS_IPN_SECRET_SANDBOX`).
6. For each webhook we update the order status in the database, and if the user is logged in and notifications are on, we trigger an **order status email** (see Email section).
7. When the payment is “finished,” we may send a **Telegram** notification (if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set) for operator awareness.

**Modes:**

- **Live vs Sandbox:** Admin can switch between **Live** (real money) and **Sandbox** (test payments). Sandbox can be set to simulate success, failed, expired, or partially_paid. Stored in `exchange_settings` and used when creating payments.
- **Payout mode (Manual vs Automatic):**
  - **Manual:** When we create the payment with NOWPayments we don’t send your receive address. Funds go to the merchant balance; an admin later sends the payout to you (or handles it manually).
  - **Automatic:** We send your receive address (and currency) to NOWPayments; when the payment is confirmed, NOWPayments sends the converted crypto to your address automatically.

Admin switches **payment mode** (live/sandbox) and **payout mode** (manual/automatic) from **Admin → Settings**. APIs used: `GET/POST /api/admin/settings/payment-mode` and `GET/POST /api/admin/settings/payout-mode`.

**APIs we use with NOWPayments (conceptually):** create payment, get payment status, get minimum amount (and limits). Base URL and keys come from env: `NOWPAYMENTS_API_KEY_LIVE`, `NOWPAYMENTS_IPN_SECRET_LIVE`, and sandbox equivalents; `NOWPAYMENTS_API_URL` for the API host.

---

## 5. Exchange Function and Related APIs

**On the homepage:** The **exchange widget** lets you pick “send” and “receive” crypto, enter amount and receive address (and optionally email for notifications). When you click to continue, the frontend calls **POST /api/payment** with the exchange details.

**What POST /api/payment does:**

- Validates the request (amount, currencies, addresses).
- Checks **min/max limits** for that pair (from our cache or from NOWPayments via `getExchangeLimitsWithFallback`).
- Reads current **payment mode** (live/sandbox) and **payout mode** (manual/automatic).
- Calls NOWPayments to **create the payment**, then creates an **order** in the database (with deposit address, amounts, expiration, etc.).
- Returns order ID and whatever the client needs to redirect you to the **order page**.

**Limits and logos:**

- **Exchange limits:** Min (and sometimes max) amount per pair are stored in the `exchange_limits` table and refreshed by a cron that calls NOWPayments (e.g. `/api/cron/update-exchange-limits`). The **exchange widget** and the payment API use the same source (e.g. **GET /api/exchange/limits** for the UI).
- **Logos (crypto icons):** Coin logos are **not** stored on our server. They are loaded from **NOWPayments’ public image URLs**:  
  `https://nowpayments.io/images/coins/{asset}.svg`  
  For example `usdttrc20` → `https://nowpayments.io/images/coins/usdttrc20.svg`. The site builds the asset code (e.g. currency + network) and uses it in that URL. So “API” for logos = these fixed URLs; no separate logo API key.

**Other exchange-related APIs (for docs/API users):**

- **GET /api/order/[id]** — Get order details (for the order page and for API clients).
- **GET /api/exchange/limits** — Min/max for pairs (used by widget and payment flow).
- **GET /api/currencies** (or similar) — Supported currencies for the dropdowns.

So: **exchange function** = form on home → **POST /api/payment** → create payment with NOWPayments + create order → redirect to order page. **Logos** = NOWPayments coin image URLs; **limits** = our DB + NOWPayments, exposed via **/api/exchange/limits**.

---

## 6. Admin Side

**Access:** Admin area is under **/admin** (e.g. `/admin`, `/admin/orders`, `/admin/settings`). Access is controlled by **admin roles** (e.g. viewer, super_admin); login is separate from normal user login (e.g. **/api/admin/auth/signin**).

**What admins can do (high level):**

- **Orders** — List orders, open an order, see events, add notes, trigger “force provider sync” or “verify payment runtime,” change status or take other actions (depending on routes like **/api/admin/orders/[id]/actions**).
- **Payments** — List payments, verify a payment (**/api/admin/payments/[id]/verify**), flag, etc.
- **Settings** — **Payment mode:** switch Live / Sandbox (**/api/admin/settings/payment-mode**). **Payout mode:** switch Manual / Automatic (**/api/admin/settings/payout-mode**). **Webhook:** rotate webhook secret, view webhook diagnostics (**/api/admin/system/webhook-diagnostics**). **Email:** turn verification or order notifications on/off (stored and read via **/api/admin/settings/email**).
- **Users** — List users, view a user, block/unflag, see activity, orders, payments, disputes.
- **Disputes / Support chats** — List disputes (order disputes and live chats), open a dispute, see messages, reply, change status (open/waiting/closed/deleted). APIs like **/api/admin/disputes**, **/api/admin/disputes/[id]**, **/api/admin/disputes/[id]/messages**, **/api/admin/disputes/[id]/message**, **/api/admin/disputes/[id]/status**.
- **Webhooks** — List webhook events, replay a webhook (**/api/admin/webhooks/[id]/replay**), export.
- **System** — Health (**/api/admin/system/health**), webhook diagnostics, maintenance.
- **Rates, analytics, wallets, payouts, email logs, security (blocked IPs, admin users), exchange (pause, pairs, simulate)** — Various other admin pages and APIs under **/api/admin/...**.

So: **admin side** = everything under **/admin** and **/api/admin**: orders, payments, **switch payment mode (live/sandbox)** and **payout mode (manual/autopayout)**, email settings, users, support chats/disputes, webhooks, system, and the rest.

---

## 7. Support Chat

**Where:** **Support page** (`/support`). The page shows contact emails (support, affiliate, compliance, legal, API, etc.) and a **chat widget**.

**How chat works:**

- You start a conversation (e.g. describe your issue). The site creates a **support chat** in the database and gives you a **chat ID** (shown on the page so you can return to the same thread).
- Messages are stored in the **disputes** and **dispute_sessions** / **dispute_messages** (or equivalent) tables. Chats can be type **order_dispute** (linked to an order) or **live_chat** (general support).
- **APIs:** Create chat: **POST /api/support/chat/create**. Get chat: **GET /api/support/chat/[chatId]**. Send message: **POST /api/support/chat/[chatId]/message** (or similar). Admin reads and replies via **/api/admin/disputes/...** (list disputes, get messages, post message, set status).
- So: **support chat** = in-app chat on the Support page, backed by our database and admin dispute UI; no third-party chat product name in the flow you asked about — it’s our own chat tied to “disputes.”

---

## 8. Database (What We Store)

The app uses **Supabase** (PostgreSQL). Main concepts:

- **users** — Normal users (email, password hash, email verified, notification preferences, etc.).
- **admin_users** — Admin accounts and roles.
- **orders** — Each exchange order: order_id, payment_id, payment_mode, payout_mode, status fields (internal_status, user_status, provider_status), amounts, currencies, networks, addresses, payin/payout hashes, expiration, timestamps.
- **order_status_history** — History of status changes for an order.
- **webhook_idempotency** — So we don’t process the same NOWPayments webhook twice.
- **exchange_limits** — Min/max amounts per currency pair (synced from NOWPayments).
- **exchange_settings** — Payment mode (live/sandbox), sandbox case, payout mode (manual/automatic).
- **email_queue** — Pending emails to be sent by the email-queue cron.
- **email_settings** (or similar) — Admin toggles for verification and order notifications.
- **disputes** — Support tickets / live chats (type: order_dispute or live_chat, chat_id, status).
- **dispute_sessions** / **dispute_messages** — Chat sessions and messages.
- **ledger_entries** — Internal ledger for accounting (e.g. when an order completes).
- **idempotency_keys** — For safe retries (e.g. sending one order-status email per status).
- **cron_runs** — Last run times for cron jobs (e.g. email queue, reconcile orders, update limits).
- **blocked_ips**, **admin logs**, etc. — Security and audit.

So: **database** = **Supabase (PostgreSQL)** with tables for users, admins, orders, status history, webhook idempotency, exchange limits and settings, email queue and settings, disputes and chat messages, ledger, and cron/security.

---

## 9. Overall User Flow (From Visit to Completed Order)

1. **Visit** — You open the site (home page). You see the exchange widget, trust strip, FAQ, etc.
2. **Set up exchange** — You choose “send” and “receive” crypto, amount, and your receive wallet address. Optionally you enter an email (for status emails if you have an account and notifications on).
3. **Create order** — You submit. The site calls **POST /api/payment**; the server checks limits, creates a payment with NOWPayments, creates an order in the database, and redirects you to **/order/[id]**.
4. **Order page** — You see: what to send, how much, **deposit address and QR**, what you’ll get, and a countdown. You can copy address/amount; the page may poll **GET /api/order/[id]** to refresh status.
5. **You pay** — You send crypto from your wallet to the deposit address (within the time limit).
6. **NOWPayments** — Detects the payment and sends a webhook to **POST /api/webhook/nowpayments**. We verify the signature, update the order status, and optionally send an order-status email (and a Telegram alert).
7. **Order page updates** — Status moves: Awaiting deposit → Confirming → Exchanging → Completed (or Expired/Failed). If payout mode is **automatic**, NOWPayments sends the converted crypto to your address; if **manual**, an admin handles the payout.
8. **Done** — You see “Completed” and (in automatic mode) you receive the crypto. You can close the page or use “Track order” later with the order ID.

**If you need help:** You can go to **Support** and use the contact emails or the **support chat** (start a chat, save the chat ID, message back and forth; admin sees it in Admin → Disputes).

---

## 10. Order Page in One Paragraph

The **order page** (`/order/[id]`) is where you complete the exchange: it shows the send amount and currency (with logo from NOWPayments coin URL), the **deposit address and QR code**, the receive amount and currency, and a countdown. A **progress timeline** shows steps (Awaiting deposit → Confirming → Exchanging → Completed). The page gets data from **GET /api/order/[id]** and updates as NOWPayments webhooks update the order. If the order expires or fails, you see a clear state and a note to contact support with your order ID; there are links to “Track order” and “Support.” So: one page that shows everything you need to pay and to see when the swap is done, with status driven by the webhook and our database.

---

## 11. Quick Reference: Important APIs and Config

| What | Where |
|------|--------|
| Create order (exchange) | **POST /api/payment** |
| Get order | **GET /api/order/[id]** |
| Track order | **GET /api/order/track** (with orderId, optional email) |
| Exchange limits | **GET /api/exchange/limits** |
| Crypto logos | `https://nowpayments.io/images/coins/{asset}.svg` |
| NOWPayments webhook | **POST /api/webhook/nowpayments** |
| Admin: payment mode | **GET/POST /api/admin/settings/payment-mode** |
| Admin: payout mode (manual/autopayout) | **GET/POST /api/admin/settings/payout-mode** |
| Admin: email toggles | **/api/admin/settings/email** (and email settings in DB) |
| Support chat | **POST /api/support/chat/create**, **GET /api/support/chat/[chatId]**, **POST /api/support/chat/[chatId]/message** |
| SMTP | **SMTP_HOST**, **SMTP_PORT**, **SMTP_USER**, **SMTP_PASS** |
| Database | **Supabase** (PostgreSQL): users, orders, exchange_limits, exchange_settings, email_queue, disputes, etc. |

---

This is how the website works from email (SMTP), to NowPayments (payments and webhook), to the admin side (switching payment and payout modes), to the exchange (widget → **/api/payment** and **/api/exchange/limits**), to logos (NOWPayments coin URLs), support chat (our disputes/chat and **/api/support/chat/...**), database (Supabase), design and pages, and the full user and order flow.
