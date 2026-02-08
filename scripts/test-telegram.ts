/**
 * One-off test script to verify the Telegram bot receives messages.
 * Bypasses the webhook (and sandbox/live check) and calls sendTelegramNotification directly.
 *
 * Usage:
 *   npx tsx scripts/test-telegram.ts
 * or (if you add a script to package.json):
 *   npm run test:telegram
 *
 * Requires in .env.local (or .env):
 *   TELEGRAM_BOT_TOKEN=...
 *   TELEGRAM_CHAT_ID=...
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local first, then .env (same precedence as Next.js)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.error('Missing env: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local (or .env)');
    process.exit(1);
  }

  // Dynamic import so path resolution works from scripts/
  const { sendTelegramNotification } = await import('../lib/telegram');

  const payload = {
    orderId: 'TEST-' + Date.now(),
    fromCurrency: 'btc',
    fromAmount: 0.001,
    toCurrency: 'eth',
    toAmount: 0.05,
    payinHash: null as string | null,
    fromNetwork: 'btc' as string | null,
    priceAmountUsd: 42.5,
    detectedAt: new Date().toISOString(),
  };

  console.log('Sending test swap alert to Telegram...');
  const sent = await sendTelegramNotification(payload);

  if (sent) {
    console.log('OK: Test message sent. Check your Telegram chat.');
  } else {
    console.error('Failed: Telegram API returned an error or env is wrong. Check logs above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
