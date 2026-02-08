# Why Order Emails Might Not Send (and “Different Modes”)

## When do we try to send order emails?

- **Webhook (NOWPayments IPN):** When order status changes to **CONFIRMING**, **PAYMENT_CONFIRMED**, **PROCESSING_BY_PROVIDER**, **DONE**, or **EXPIRED** we call `notifyOrderStatus`. Email is sent only if all conditions below are met.
- **Admin “Mark completed”:** Same `notifyOrderStatus`; same conditions apply.
- **Modes:** Email is sent for **both** Sandbox and Live orders (no mode filter). “Different modes” = different **statuses** (e.g. CONFIRMING vs DONE); we now send for all the statuses above.

---

## Checklist: why email might not be sent

| Check | What to do |
|-------|------------|
| **Guest order** | Order created **without** being logged in has `user_id = null`. We **never** send email for guest orders (no user to email). User can track via **Order ID** on `/order/[id]`. |
| **User not found** | `user_id` points to a user that no longer exists in `users` → email skipped. |
| **Notifications disabled** | User’s `notifications_enabled` is `false` in `users` table. Have them enable in account/preferences if you expose that. |
| **Email not verified** | We only send to users with `email_verified = true`. Unverified users don’t get order emails. |
| **Order notifications off** | Admin setting **Order notifications** must be **On**. Go to **Admin → Settings → Email** and ensure “Order notifications” is enabled (`order_notifications_enabled = true` in `email_settings`). |
| **SMTP not configured** | Set **SMTP_USER** and **SMTP_PASS** (and optionally **EMAIL_FROM_TRANSACTIONAL**) in your environment (e.g. Vercel). Without these, no email is sent. |

---

## Log messages that explain skips

When email is skipped, the server logs one of:

- `Order status email skipped: guest order (no userId)` → anonymous/guest order.
- `Order status email skipped: user not found` → no user row for that `user_id`.
- `Order status email skipped: user notifications disabled` → user has notifications off.
- `Order status email skipped: email not verified` → user’s email not verified.
- `Order status email skipped: order_notifications_enabled is false (Admin → Settings → Email)` → turn on order notifications in admin.
- `Order status email skipped (idempotency): …` → we already sent that exact status for that order (no duplicate email).

If SMTP fails, you’ll see `[MintMove] Email failed to …` in logs.

---

## Quick fixes

1. **Logged-in user:** Create the order while **signed in** so the order has a `user_id` and we can send email.
2. **Verify email:** User must verify email (link from signup) so `email_verified = true`.
3. **Admin → Settings → Email:** Turn **Order notifications** on.
4. **Env:** Set **SMTP_USER**, **SMTP_PASS** (and **EMAIL_FROM_TRANSACTIONAL** if you use it) in production.

After that, status changes (CONFIRMING, PAYMENT_CONFIRMED, PROCESSING_BY_PROVIDER, DONE, EXPIRED) for **logged-in** orders will trigger email when the above conditions are met.
