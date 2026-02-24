/**
 * Get block explorer transaction URL for a given network and tx hash.
 * Used for "View on Explorer" on completed orders.
 */
export function getExplorerTxUrl(network: string | null, txHash: string): string {
  if (!txHash) return "#";
  const n = (network || "").toLowerCase();
  if (n.includes("bsc") || n === "bnb") return `https://bscscan.com/tx/${txHash}`;
  if (n.includes("sol") || n === "solana") return `https://solscan.io/tx/${txHash}`;
  if (n.includes("polygon") || n === "matic") return `https://polygonscan.com/tx/${txHash}`;
  if (n.includes("tron") || n === "trx") return `https://tronscan.org/#/transaction/${txHash}`;
  if (n.includes("btc") || n.includes("litecoin")) return `https://mempool.space/tx/${txHash}`;
  return `https://etherscan.io/tx/${txHash}`;
}
