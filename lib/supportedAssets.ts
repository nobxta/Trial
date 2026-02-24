/**
 * SUPPORTED ASSETS - SINGLE SOURCE OF TRUTH
 * 
 * This is the ONLY place where supported cryptocurrencies are defined.
 * All other files must import and use this module.
 * 
 * To add a new asset, edit this file ONLY.
 */

import supportedAssetsData from '../data/supportedAssets.json';

export interface SupportedAsset {
  symbol: string;
  name: string;
  networks: string[];
  coingeckoId: string;
  nowpaymentsId: string;
}

export interface SupportedAssetNetwork {
  id: string; // NOWPayments compatible ID (e.g., "usdterc20", "etharb")
  symbol: string;
  name: string;
  network: string; // Display name (e.g., "Ethereum", "Arbitrum")
  networkCode: string; // Code for internal use (e.g., "ERC20", "ARB", "BSC")
  coingeckoId: string;
  imageUrl: string;
  enabled: boolean;
}

// Network name to code mapping (for NOWPayments compatibility)
const NETWORK_CODE_MAP: Record<string, string> = {
  'Bitcoin': 'BTC',
  'Ethereum': 'ERC20',
  'Base': 'BASE',
  'Arbitrum': 'ARB',
  'BNB Smart Chain': 'BSC',
  'Tron': 'TRC20',
  'Solana': 'SOL',
  'Polygon': 'POLYGON',
  'Optimism': 'OPTIMISM',
  'Cardano': 'ADA',
  'Algorand': 'ALGO',
  'Aptos': 'APT',
  'Avalanche C-Chain': 'AVAX',
  'Dogecoin': 'DOGE',
  'Polkadot': 'DOT',
  'Litecoin': 'LTC',
  'Ripple': 'XRP',
  'Stellar': 'XLM',
  'Monero': 'XMR',
  'Zcash': 'ZEC',
  'Dash': 'DASH',
  'Bitcoin Cash': 'BCH',
  'Toncoin': 'TON',
  'Ton Network': 'TON',
  'Near Protocol': 'NEAR',
  'Sui Network': 'SUI',
  'VeChain': 'VET',
  'Terra': 'LUNA',
  'Injective': 'INJ',
  'Kaspa': 'KAS',
};

// Network code to NOWPayments suffix mapping
const NETWORK_SUFFIX_MAP: Record<string, string> = {
  'BTC': '',
  'ERC20': 'erc20',
  'BASE': 'base',
  'ARB': 'arb',
  'BSC': 'bsc',
  'TRC20': 'trc20',
  'SOL': 'sol',
  'POLYGON': 'polygon',
  'OPTIMISM': 'optimism',
  'ADA': '',
  'ALGO': '',
  'APT': '',
  'AVAX': '',
  'DOGE': '',
  'DOT': '',
  'LTC': '',
  'XRP': '',
  'XLM': '',
  'XMR': '',
  'ZEC': '',
  'DASH': '',
  'BCH': '',
  'TON': '',
  'NEAR': '',
  'SUI': '',
  'VET': '',
  'LUNA': '',
  'INJ': '',
  'KAS': '',
};

// Generate NOWPayments compatible ID
function generateNowPaymentsId(symbol: string, network: string, baseNowPaymentsId?: string): string {
  const lowerSymbol = symbol.toLowerCase();
  const networkCode = NETWORK_CODE_MAP[network] || network.toUpperCase();
  const suffix = NETWORK_SUFFIX_MAP[networkCode];
  
  // Special case: For Ethereum mainnet, NOWPayments uses base ID (e.g., "eth", "usdc", "usdt")
  // NOT network-specific IDs like "usdcerc20" - those are only for other networks
  if (network === 'Ethereum' && baseNowPaymentsId) {
    return baseNowPaymentsId;
  }
  
  // For mainnet coins with no suffix (e.g., Bitcoin -> "btc", LTC, DOGE, etc.)
  if (!suffix || suffix === '') {
    return baseNowPaymentsId || lowerSymbol;
  }
  
  // For multi-network assets on non-Ethereum networks, append network suffix
  // Use baseNowPaymentsId if provided, otherwise use symbol
  // Examples: usdttrc20, usdtbsc, etharb (if baseNowPaymentsId is "eth"), ethbase
  const baseId = baseNowPaymentsId || lowerSymbol;
  return `${baseId}${suffix}`;
}

// Load and expand assets into network-specific entries
let _supportedAssetNetworks: SupportedAssetNetwork[] | null = null;

function loadSupportedAssetNetworks(): SupportedAssetNetwork[] {
  if (_supportedAssetNetworks) {
    return _supportedAssetNetworks;
  }

  const assets = supportedAssetsData as SupportedAsset[];
  const networks: SupportedAssetNetwork[] = [];

  for (const asset of assets) {
    for (const networkName of asset.networks) {
      const networkCode = NETWORK_CODE_MAP[networkName] || networkName.toUpperCase();
      // Use nowpaymentsId from JSON if available (e.g., "eth" for Ethereum mainnet)
      // Otherwise generate from symbol and network
      const id = generateNowPaymentsId(asset.symbol, networkName, asset.nowpaymentsId);
      
      networks.push({
        id,
        symbol: asset.symbol,
        name: asset.name,
        network: networkName,
        networkCode,
        coingeckoId: asset.coingeckoId,
        // NOWPayments coin images are keyed by the NOWPayments currency id (e.g. usdttrc20, eth, btc)
        // NOT always by symbol. Using `id` fixes missing logos for many assets/networks.
        imageUrl: `https://nowpayments.io/images/coins/${id}.svg`,
        enabled: true,
      });
    }
  }

  _supportedAssetNetworks = networks;
  return networks;
}

// Public API
export function getSupportedAssetNetworks(): SupportedAssetNetwork[] {
  return loadSupportedAssetNetworks();
}

/**
 * Clear the internal cache (useful for testing or forcing a refresh)
 * Note: In Next.js dev mode, modules are hot-reloaded automatically
 */
export function clearSupportedAssetNetworksCache(): void {
  _supportedAssetNetworks = null;
}

export function getEnabledAssetNetworks(): SupportedAssetNetwork[] {
  return getSupportedAssetNetworks().filter(asset => asset.enabled);
}

export function getAssetNetworkById(id: string): SupportedAssetNetwork | undefined {
  return getSupportedAssetNetworks().find(asset => asset.id === id);
}

export function getAssetNetworksBySymbol(symbol: string): SupportedAssetNetwork[] {
  return getEnabledAssetNetworks().filter(asset => 
    asset.symbol.toUpperCase() === symbol.toUpperCase()
  );
}

export function getAssetNetworkBySymbolAndNetwork(symbol: string, network: string): SupportedAssetNetwork | undefined {
  return getEnabledAssetNetworks().find(asset => 
    asset.symbol.toUpperCase() === symbol.toUpperCase() &&
    (asset.network === network || asset.networkCode.toUpperCase() === network.toUpperCase())
  );
}

export function getUniqueCoinGeckoIds(): string[] {
  const ids = new Set<string>();
  getEnabledAssetNetworks().forEach(asset => {
    if (asset.coingeckoId) {
      ids.add(asset.coingeckoId);
    }
  });
  return Array.from(ids);
}

export function getPopularAssetNetworks(limit: number = 7): SupportedAssetNetwork[] {
  // Top crypto order for selector: BTC, ETH, SOL, BSC (BNB), Tron (TRX), Litecoin, Doge
  const popularIdOrder = ['btc', 'eth', 'sol', 'bnb', 'trx', 'ltc', 'doge'];
  const enabled = getEnabledAssetNetworks();
  return popularIdOrder
    .map(id => enabled.find(a => a.id === id))
    .filter((asset): asset is SupportedAssetNetwork => asset != null)
    .slice(0, limit);
}

// Common aliases and alternative names for better search
const ASSET_ALIASES: Record<string, string[]> = {
  'BTC': ['bitcoin', 'btc', 'bit coin'],
  'ETH': ['ethereum', 'eth', 'ether'],
  'USDT': ['tether', 'usdt', 'tether usd', 'usd tether'],
  'USDC': ['usd coin', 'usdc', 'usd coin', 'circle usd'],
  'BNB': ['binance coin', 'bnb', 'binance'],
  'SOL': ['solana', 'sol'],
  'XRP': ['ripple', 'xrp'],
  'ADA': ['cardano', 'ada'],
  'DOGE': ['dogecoin', 'doge', 'dog coin'],
  'DOT': ['polkadot', 'dot'],
  'MATIC': ['polygon', 'matic', 'polygon matic'],
  'AVAX': ['avalanche', 'avax'],
  'LTC': ['litecoin', 'ltc', 'lite coin'],
  'TRX': ['tron', 'trx', 'tronix'],
  'XLM': ['stellar', 'xlm', 'stellar lumens'],
  'XMR': ['monero', 'xmr'],
  'ZEC': ['zcash', 'zec'],
  'DASH': ['dash', 'darkcoin'],
  'BCH': ['bitcoin cash', 'bch', 'bcash'],
  'TON': ['toncoin', 'ton', 'the open network', 'telegram open network'],
  'NEAR': ['near protocol', 'near'],
  'SUI': ['sui', 'sui network'],
  'VET': ['vechain', 'vet'],
  'LUNA': ['terra', 'luna', 'terra luna'],
  'INJ': ['injective', 'inj'],
  'KAS': ['kaspa', 'kas'],
  'ARB': ['arbitrum', 'arb'],
  'APT': ['aptos', 'apt'],
  'ALGO': ['algorand', 'algo'],
  'AAVE': ['aave', 'aave protocol'],
  'UNI': ['uniswap', 'uni'],
  'LINK': ['chainlink', 'link'],
  'SHIB': ['shiba inu', 'shib', 'shiba'],
  'PEPE': ['pepe', 'pepe coin'],
  'FLOKI': ['floki', 'floki inu'],
  'MANA': ['decentraland', 'mana'],
  'GALA': ['gala', 'gala games'],
  'APE': ['apecoin', 'ape', 'ape coin'],
  'TRUMP': ['trump', 'trump coin'],
  'NOT': ['notcoin', 'not', 'not coin'],
  'HMSTR': ['hamster kombat', 'hmstr', 'hamster'],
  'PYUSD': ['paypal usd', 'pyusd', 'paypal'],
  'TUSD': ['trueusd', 'tusd', 'true usd'],
  'BABYDOGE': ['babydoge', 'baby doge'],
  '1INCH': ['1inch', '1 inch'],
};

// Normalize search query for better matching
function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

// Check if query matches asset (with aliases)
function matchesAsset(asset: SupportedAssetNetwork, normalizedQuery: string): boolean {
  const symbol = asset.symbol.toLowerCase();
  const name = asset.name.toLowerCase();
  const network = asset.network.toLowerCase();
  const networkCode = asset.networkCode.toLowerCase();
  
  // Direct matches
  if (symbol.includes(normalizedQuery) || 
      name.includes(normalizedQuery) ||
      network.includes(normalizedQuery) ||
      networkCode.includes(normalizedQuery)) {
    return true;
  }
  
  // Check aliases
  const aliases = ASSET_ALIASES[asset.symbol.toUpperCase()] || [];
  for (const alias of aliases) {
    if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
      return true;
    }
  }
  
  // Partial word matching (e.g., "bit" matches "bitcoin", "lite" matches "litecoin")
  const queryWords = normalizedQuery.split(' ');
  const nameWords = name.split(' ');
  const symbolWords = symbol.split(' ');
  
  // Check if all query words appear in name or symbol
  const allWordsMatch = queryWords.every(qWord => 
    nameWords.some(nWord => nWord.includes(qWord) || qWord.includes(nWord)) ||
    symbolWords.some(sWord => sWord.includes(qWord) || qWord.includes(sWord))
  );
  
  if (allWordsMatch && queryWords.length > 0) {
    return true;
  }
  
  return false;
}

export function searchAssetNetworks(query: string): SupportedAssetNetwork[] {
  if (!query || query.trim().length === 0) {
    return getEnabledAssetNetworks();
  }
  
  const normalizedQuery = normalizeSearchQuery(query);
  
  const results = getEnabledAssetNetworks().filter(asset => matchesAsset(asset, normalizedQuery));
  
  return results;
}

// Validation
export function isValidAssetNetwork(symbol: string, network: string): boolean {
  return getAssetNetworkBySymbolAndNetwork(symbol, network) !== undefined;
}

export function isValidAssetNetworkId(id: string): boolean {
  return getAssetNetworkById(id) !== undefined;
}

// Get network label for display
export function getNetworkLabel(network: string): string {
  return network; // Network names are already display-friendly
}

// Get network code from network name
export function getNetworkCode(network: string): string {
  return NETWORK_CODE_MAP[network] || network.toUpperCase();
}

