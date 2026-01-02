/**
 * ASSET NORMALIZATION HELPER
 * 
 * Normalizes raw asset codes (e.g., "usdttrc20") into display-friendly format
 * with symbol, network, display name, and icon URL.
 */

import { getSupportedAssetNetworks } from './supportedAssets';

export interface NormalizedAsset {
  symbol: string;
  network: string;
  displayName: string;
  iconUrl: string;
  rawCode: string;
}

/**
 * Normalize a raw asset code to a display-friendly format
 * 
 * @param rawCode - Raw asset code from NOWPayments (e.g., "usdttrc20", "etharb")
 * @returns Normalized asset info or null if not found
 */
export function normalizeAsset(rawCode: string): NormalizedAsset | null {
  if (!rawCode) return null;

  const lowerCode = rawCode.toLowerCase().trim();
  
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/asset-normalize.ts:normalizeAsset',message:'normalizeAsset entry',data:{rawCode,lowerCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Get all supported asset networks
  const supportedNetworks = getSupportedAssetNetworks();
  
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/asset-normalize.ts:normalizeAsset',message:'Searching supported networks',data:{lowerCode,supportedNetworksCount:supportedNetworks.length,firstFewIds:supportedNetworks.slice(0,5).map(a=>a.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Try to find exact match first
  const exactMatch = supportedNetworks.find(
    asset => asset.id.toLowerCase() === lowerCode
  );
  
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/66ee821c-d601-4539-8e2a-0508b8f23f7e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/asset-normalize.ts:normalizeAsset',message:'Exact match result',data:{hasExactMatch:!!exactMatch,exactMatchId:exactMatch?.id,exactMatchSymbol:exactMatch?.symbol,exactMatchImageUrl:exactMatch?.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (exactMatch) {
    return {
      symbol: exactMatch.symbol.toUpperCase(),
      network: exactMatch.network,
      displayName: `${exactMatch.symbol.toUpperCase()} (${exactMatch.network})`,
      iconUrl: exactMatch.imageUrl,
      rawCode: rawCode,
    };
  }
  
  // Fallback: Try to extract symbol and network from code
  // Common patterns:
  // - usdttrc20 -> USDT, TRC20
  // - etharb -> ETH, Arbitrum
  // - btc -> BTC, Bitcoin
  
  // Extract symbol (usually first 3-5 chars before network suffix)
  const networkSuffixes = ['trc20', 'erc20', 'arb', 'bsc', 'base', 'polygon', 'optimism', 'sol'];
  let symbol = '';
  let network = '';
  
  for (const suffix of networkSuffixes) {
    if (lowerCode.endsWith(suffix)) {
      symbol = lowerCode.slice(0, -suffix.length).toUpperCase();
      network = suffix.toUpperCase();
      
      // Map network codes to display names
      const networkMap: Record<string, string> = {
        'TRC20': 'TRC20',
        'ERC20': 'ERC20',
        'ARB': 'Arbitrum',
        'BSC': 'BNB Smart Chain',
        'BASE': 'Base',
        'POLYGON': 'Polygon',
        'OPTIMISM': 'Optimism',
        'SOL': 'Solana',
      };
      
      network = networkMap[network] || network;
      break;
    }
  }
  
  // If no network suffix found, assume it's a base asset (e.g., "btc", "eth")
  if (!symbol) {
    symbol = lowerCode.toUpperCase();
    // Try to infer network from symbol
    if (symbol === 'BTC') network = 'Bitcoin';
    else if (symbol === 'ETH') network = 'Ethereum';
    else if (symbol === 'SOL') network = 'Solana';
    else network = symbol; // Fallback
  }
  
  // Generate icon URL (NOWPayments format)
  const iconUrl = `https://nowpayments.io/images/coins/${symbol.toLowerCase()}.svg`;
  
  return {
    symbol,
    network,
    displayName: network ? `${symbol} (${network})` : symbol,
    iconUrl,
    rawCode: rawCode,
  };
}

/**
 * Get display name for an asset code
 * Falls back to raw code if normalization fails
 */
export function getAssetDisplayName(rawCode: string): string {
  const normalized = normalizeAsset(rawCode);
  return normalized?.displayName || rawCode.toUpperCase();
}

/**
 * Get symbol only (for icon lookup)
 */
export function getAssetSymbol(rawCode: string): string {
  const normalized = normalizeAsset(rawCode);
  return normalized?.symbol || rawCode.toUpperCase();
}

/**
 * Get icon URL for an asset
 */
export function getAssetIconUrl(rawCode: string): string {
  const normalized = normalizeAsset(rawCode);
  return normalized?.iconUrl || `https://nowpayments.io/images/coins/${rawCode.toLowerCase()}.svg`;
}

