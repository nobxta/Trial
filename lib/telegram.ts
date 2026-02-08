/**
 * Telegram bot notifications for swap alerts.
 * Uses TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from environment.
 * Logs API failures without throwing so webhook response is not affected.
 */

export interface SwapAlertPayload {
  orderId: string;
  fromCurrency: string;
  fromAmount: number;
  toCurrency: string;
  toAmount: number;
  /** Transaction hash (payin) for block explorer link */
  payinHash: string | null;
  /** Network/chain for explorer (e.g. btc, eth, sol) */
  fromNetwork: string | null;
  /** Optional USD value from payment payload */
  priceAmountUsd?: number;
  /** When the payment was detected (ISO string or Date) */
  detectedAt: string;
}

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Get block explorer URL for a given network/currency and tx hash.
 * Supports common chains; add more as needed.
 */
function getBlockExplorerUrl(networkOrCurrency: string | null, txHash: string): string | null {
  if (!txHash || !networkOrCurrency) return null;
  const n = networkOrCurrency.toLowerCase().trim();
  const hash = txHash.trim();
  if (!hash) return null;

  const explorers: Record<string, string> = {
    btc: 'https://mempool.space/tx/',
    bitcoin: 'https://mempool.space/tx/',
    eth: 'https://etherscan.io/tx/',
    ethereum: 'https://etherscan.io/tx/',
    sol: 'https://solscan.io/tx/',
    solana: 'https://solscan.io/tx/',
    trx: 'https://tronscan.org/#/transaction/',
    tron: 'https://tronscan.org/#/transaction/',
    matic: 'https://polygonscan.com/tx/',
    polygon: 'https://polygonscan.com/tx/',
    bnb: 'https://bscscan.com/tx/',
    bsc: 'https://bscscan.com/tx/',
    ton: 'https://tonscan.org/tx/',
    doge: 'https://blockchair.com/dogecoin/transaction/',
    ltc: 'https://blockchair.com/litecoin/transaction/',
  };

  const base = explorers[n] ?? `https://blockchair.com/${n}/transaction/`;
  return `${base}${hash}`;
}

/**
 * Build Markdown message for a swap hit notification.
 */
function buildSwapHitMessage(p: SwapAlertPayload): string {
  const pair = `${p.fromCurrency.toUpperCase()} ➡️ ${p.toCurrency.toUpperCase()}`;
  const valueCrypto = `~${p.fromAmount.toFixed(4)} ${p.fromCurrency.toUpperCase()} → ~${p.toAmount.toFixed(4)} ${p.toCurrency.toUpperCase()}`;
  const valueUsd = p.priceAmountUsd != null
    ? `$${p.priceAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
    : null;

  let valueLine = valueCrypto;
  if (valueUsd) valueLine = `${valueUsd} and ${valueCrypto}`;

  const detectedTime = new Date(p.detectedAt).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  let blocks: string[] = [
    '*🚀 Swap Hit!*',
    '',
    `*Pair:* ${pair}`,
    `*Value:* ${valueLine}`,
  ];

  if (p.payinHash) {
    const url = getBlockExplorerUrl(p.fromNetwork || p.fromCurrency, p.payinHash);
    if (url) {
      blocks.push(`*Blockchain:* [View transaction](${url})`);
    } else {
      blocks.push(`*Tx hash:* \`${p.payinHash.slice(0, 16)}…\``);
    }
  }

  blocks.push(`*Detected:* ${detectedTime}`);
  blocks.push(`*Order:* \`${p.orderId}\``);

  return blocks.join('\n');
}

/**
 * Send a swap alert to Telegram. Does not throw; logs errors only.
 * Returns true if sent, false if skipped or failed.
 */
export async function sendTelegramNotification(payload: SwapAlertPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return false;
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
  const text = buildSwapHitMessage(payload);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[Telegram] sendMessage failed:', res.status, errBody);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[Telegram] sendMessage error:', err?.message ?? err);
    return false;
  }
}
