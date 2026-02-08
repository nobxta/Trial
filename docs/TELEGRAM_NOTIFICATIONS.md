# Telegram Swap Alerts

Swap alerts are sent to a Telegram bot when a **real** (live) order first hits **confirming** or **confirmed** on-chain.

---

## Required environment variables

Add these to your `.env` or `.env.local` for the bot to function:

```bash
TELEGRAM_BOT_TOKEN=your_token_from_botfather
TELEGRAM_CHAT_ID=your_personal_chat_id_or_group_id
```

- **TELEGRAM_BOT_TOKEN**: From [@BotFather](https://t.me/BotFather). Create a bot and copy the token.
- **TELEGRAM_CHAT_ID**: Your user or group chat ID. Send a message to your bot, then call `https://api.telegram.org/bot<TOKEN>/getUpdates` to see `chat.id`.

If either is missing, Telegram notifications are skipped (no error; webhook still returns 200).

---

## How the notification flow works

1. **Detection**: NOWPayments sees the first confirmation on-chain and sends a POST to `/api/webhook/nowpayments`.
2. **Verification**: The backend verifies the IPN signature (HMAC over sorted JSON) and loads the order by `payment_id`.
3. **Filtering**:
   - Only orders **in the database** are processed (orphan webhooks return 503).
   - **Sandbox/test** orders (`payment_mode === 'sandbox'`) are **not** sent to Telegram.
   - Notification runs only when status **changes** to **CONFIRMING** or **PAYMENT_CONFIRMED** (first on-chain hit).
4. **Trigger**: After the DB is updated, `sendTelegramNotification()` is called with order and payload data.
5. **Delivery**: The bot sends a Markdown message to `TELEGRAM_CHAT_ID`. Failures are logged; the webhook response is not affected.

---

## Message format (Markdown)

- **Header**: 🚀 Swap Hit!
- **Pair**: e.g. `BTC ➡️ ETH`
- **Value**: USD (if in payload) and crypto amounts (~X.XX BTC → ~Y.YY ETH)
- **Blockchain link**: Clickable link to the payin transaction on a block explorer (mempool.space, etherscan, solscan, etc.)
- **Detected**: Time the payment was detected
- **Order**: Order ID

---

## Implementation

- **Utility**: `lib/telegram.ts` — `sendTelegramNotification(payload)`. Reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` at send time; logs API errors without throwing.
- **Webhook**: `app/api/webhook/nowpayments/route.ts` — After atomic status update, if `statusChanged` and `newStatus` is `CONFIRMING` or `PAYMENT_CONFIRMED` and `order.paymentMode !== 'sandbox'`, calls `sendTelegramNotification` in a try/catch. Failures are logged only.
