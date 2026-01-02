/**
 * Currency name mapping for display
 * ONLY includes supported assets from supportedAssets.ts
 */

import { getEnabledAssetNetworks } from './supportedAssets';

// Build currency names from supported assets
const _currencyNames: Record<string, string> = {};

function buildCurrencyNames(): Record<string, string> {
  if (Object.keys(_currencyNames).length > 0) {
    return _currencyNames;
  }

  const assets = getEnabledAssetNetworks();
  const names: Record<string, string> = {};

  for (const asset of assets) {
    const key = asset.symbol.toLowerCase();
    if (!names[key]) {
      names[key] = asset.name;
    }
  }

  Object.assign(_currencyNames, names);
  return names;
}

// Get currency name, fallback to formatted symbol if not found
export function getCurrencyName(symbol: string): string {
  const names = buildCurrencyNames();
  const normalizedSymbol = symbol.toLowerCase();
  return names[normalizedSymbol] || symbol.toUpperCase();
}
