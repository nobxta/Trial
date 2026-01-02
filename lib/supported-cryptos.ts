/**
 * Supported Cryptocurrencies - Source of Truth
 * 
 * This module now uses the master supportedAssets.ts as the single source of truth.
 * All crypto-related functionality should use this module.
 */

import {
  SupportedAssetNetwork,
  getSupportedAssetNetworks,
  getEnabledAssetNetworks,
  getAssetNetworkById,
  getAssetNetworksBySymbol,
  getAssetNetworkBySymbolAndNetwork,
  getUniqueCoinGeckoIds,
  getPopularAssetNetworks,
  searchAssetNetworks,
  isValidAssetNetwork,
  isValidAssetNetworkId,
  getNetworkLabel,
  getNetworkCode,
} from './supportedAssets';

// Re-export for backward compatibility
export type SupportedCrypto = SupportedAssetNetwork;

export {
  getSupportedAssetNetworks as getSupportedCryptos,
  getEnabledAssetNetworks as getEnabledCryptos,
  getAssetNetworkById as getCryptoById,
  getAssetNetworksBySymbol as getCryptosBySymbol,
  getAssetNetworkBySymbolAndNetwork as getCryptoBySymbolAndNetwork,
  getUniqueCoinGeckoIds,
  getPopularAssetNetworks as getPopularCryptos,
  searchAssetNetworks as searchCryptos,
  isValidAssetNetwork,
  isValidAssetNetworkId,
  getNetworkLabel,
  getNetworkCode,
};

// Legacy compatibility functions
export function mapNetworkToNOWPayments(network: string): string {
  const networkMap: Record<string, string> = {
    'ERC20': 'erc20',
    'TRC20': 'trc20',
    'BSC': 'bsc',
    'BASE': 'base',
    'ARB': 'arb',
    'OPTIMISM': 'optimism',
    'SOL': 'sol',
    'POLYGON': 'polygon',
    'BTC': 'btc',
    'ETH': 'eth',
    'TON': 'ton',
  };
  
  return networkMap[network.toUpperCase()] || network.toLowerCase();
}

export function getNetworkChainFromSupportedCrypto(crypto: SupportedCrypto): string {
  return crypto.networkCode;
}

export function getCryptoImageUrl(crypto: SupportedCrypto): string {
  return crypto.imageUrl;
}
