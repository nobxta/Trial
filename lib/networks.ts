/**
 * Network/Chain definitions for cryptocurrency exchanges
 * 
 * This module now uses supportedAssets.ts as the source of truth.
 * Networks are generated from the master asset configuration.
 */

import { getEnabledAssetNetworks, getAssetNetworksBySymbol } from './supportedAssets';

export interface Network {
  id: string;
  name: string;
  chain: string;
  symbol: string;
  explorer?: string;
}

// Network code to display name mapping
const NETWORK_DISPLAY_NAMES: Record<string, string> = {
  'BTC': 'Bitcoin',
  'ERC20': 'Ethereum',
  'BASE': 'Base',
  'ARB': 'Arbitrum',
  'BSC': 'BNB Smart Chain',
  'TRC20': 'Tron',
  'SOL': 'Solana',
  'POLYGON': 'Polygon',
  'OPTIMISM': 'Optimism',
  'ADA': 'Cardano',
  'ALGO': 'Algorand',
  'APT': 'Aptos',
  'AVAX': 'Avalanche C-Chain',
  'DOGE': 'Dogecoin',
  'DOT': 'Polkadot',
  'LTC': 'Litecoin',
  'XRP': 'Ripple',
  'XLM': 'Stellar',
  'XMR': 'Monero',
  'ZEC': 'Zcash',
  'DASH': 'Dash',
  'BCH': 'Bitcoin Cash',
  'TON': 'Toncoin',
  'NEAR': 'Near Protocol',
  'SUI': 'Sui Network',
  'VET': 'VeChain',
  'LUNA': 'Terra',
  'INJ': 'Injective',
  'KAS': 'Kaspa',
};

// Convert SupportedAssetNetwork to Network format
function assetNetworkToNetwork(asset: any): Network {
  return {
    id: asset.id,
    name: NETWORK_DISPLAY_NAMES[asset.networkCode] || asset.network,
    chain: asset.networkCode,
    symbol: asset.symbol,
  };
}

// Get networks for a currency symbol (from master config)
export function getNetworksForCurrency(symbol: string): Network[] {
  const assetNetworks = getAssetNetworksBySymbol(symbol);
  return assetNetworks.map(assetNetworkToNetwork);
}

// Get default network for a currency
export function getDefaultNetwork(symbol: string): Network {
  const networks = getNetworksForCurrency(symbol);
  if (networks.length > 0) {
    return networks[0];
  }
  // Fallback (should not happen with proper config)
  return {
    id: symbol.toLowerCase(),
    name: symbol,
    chain: symbol.toUpperCase(),
    symbol: symbol.toUpperCase(),
  };
}

// Parse network ID to extract symbol and chain
export function parseNetworkId(networkId: string): { symbol: string; chain: string } {
  // Try to find the asset network by ID first
  const { getAssetNetworkById } = require('./supportedAssets');
  const asset = getAssetNetworkById(networkId);
  
  if (asset) {
    return {
      symbol: asset.symbol,
      chain: asset.networkCode,
    };
  }
  
  // Fallback parsing
  const parts = networkId.split(/(?=[A-Z])/);
  if (parts.length === 1) {
    return { symbol: parts[0].toUpperCase(), chain: parts[0].toUpperCase() };
  }
  
  // Try to extract symbol and network code
  const symbol = parts[0].toUpperCase();
  const networkCode = parts.slice(1).join('').toUpperCase();
  return { symbol, chain: networkCode };
}

// Legacy NETWORKS constant for backward compatibility (deprecated - use getNetworksForCurrency instead)
export const NETWORKS: Record<string, Network[]> = (() => {
  const networks: Record<string, Network[]> = {};
  const assets = getEnabledAssetNetworks();
  
  for (const asset of assets) {
    const symbol = asset.symbol.toUpperCase();
    if (!networks[symbol]) {
      networks[symbol] = [];
    }
    networks[symbol].push(assetNetworkToNetwork(asset));
  }
  
  return networks;
})();
