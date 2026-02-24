/**
 * ASSET NORMALIZATION HELPER
 * 
 * Normalizes raw asset codes (e.g., "usdttrc20") into display-friendly format
 * with symbol, network, display name, and icon URL.
 * 
 * Works with ANY token - uses smart parsing when not in database.
 */

import { getSupportedAssetNetworks } from './supportedAssets';

export interface NormalizedAsset {
  symbol: string;        // e.g., "USDT"
  network: string;       // e.g., "TRC20" or "Tron"
  networkShort: string;  // e.g., "TRC20"
  displayName: string;   // e.g., "USDT"
  fullName: string;      // e.g., "Tether"
  iconUrl: string;
  rawCode: string;
}

// Known token symbols for smart parsing
const KNOWN_SYMBOLS: Record<string, { fullName: string; iconBase?: string }> = {
  'usdt': { fullName: 'Tether' },
  'usdc': { fullName: 'USD Coin' },
  'dai': { fullName: 'Dai' },
  'busd': { fullName: 'Binance USD' },
  'tusd': { fullName: 'TrueUSD' },
  'usdp': { fullName: 'Pax Dollar' },
  'frax': { fullName: 'Frax' },
  'lusd': { fullName: 'Liquity USD' },
  'gusd': { fullName: 'Gemini Dollar' },
  'eth': { fullName: 'Ethereum' },
  'btc': { fullName: 'Bitcoin' },
  'bnb': { fullName: 'BNB' },
  'sol': { fullName: 'Solana' },
  'trx': { fullName: 'Tron' },
  'matic': { fullName: 'Polygon' },
  'pol': { fullName: 'Polygon' },
  'avax': { fullName: 'Avalanche' },
  'ftm': { fullName: 'Fantom' },
  'arb': { fullName: 'Arbitrum' },
  'op': { fullName: 'Optimism' },
  'ltc': { fullName: 'Litecoin' },
  'doge': { fullName: 'Dogecoin' },
  'xrp': { fullName: 'XRP' },
  'ada': { fullName: 'Cardano' },
  'dot': { fullName: 'Polkadot' },
  'link': { fullName: 'Chainlink' },
  'uni': { fullName: 'Uniswap' },
  'shib': { fullName: 'Shiba Inu' },
  'atom': { fullName: 'Cosmos' },
  'near': { fullName: 'NEAR Protocol' },
  'apt': { fullName: 'Aptos' },
  'sui': { fullName: 'Sui' },
  'xlm': { fullName: 'Stellar' },
  'algo': { fullName: 'Algorand' },
  'xtz': { fullName: 'Tezos' },
  'hbar': { fullName: 'Hedera' },
  'vet': { fullName: 'VeChain' },
  'fil': { fullName: 'Filecoin' },
  'sand': { fullName: 'The Sandbox' },
  'mana': { fullName: 'Decentraland' },
  'axs': { fullName: 'Axie Infinity' },
  'gala': { fullName: 'Gala' },
  'ape': { fullName: 'ApeCoin' },
  'crv': { fullName: 'Curve' },
  'aave': { fullName: 'Aave' },
  'mkr': { fullName: 'Maker' },
  'snx': { fullName: 'Synthetix' },
  'comp': { fullName: 'Compound' },
  'ldo': { fullName: 'Lido DAO' },
  'rpl': { fullName: 'Rocket Pool' },
  'wbtc': { fullName: 'Wrapped Bitcoin' },
  'weth': { fullName: 'Wrapped Ethereum' },
  'steth': { fullName: 'Lido Staked ETH' },
  'reth': { fullName: 'Rocket Pool ETH' },
  'cbeth': { fullName: 'Coinbase Wrapped ETH' },
  'pepe': { fullName: 'Pepe' },
  'floki': { fullName: 'Floki' },
  'pyusd': { fullName: 'PayPal USD' },
  'bonk': { fullName: 'Bonk' },
  'wif': { fullName: 'dogwifhat' },
  'ton': { fullName: 'Toncoin' },
  'kas': { fullName: 'Kaspa' },
  'inj': { fullName: 'Injective' },
  'sei': { fullName: 'Sei' },
  'tia': { fullName: 'Celestia' },
  'jup': { fullName: 'Jupiter' },
  'pyth': { fullName: 'Pyth Network' },
  'render': { fullName: 'Render' },
  'fet': { fullName: 'Fetch.ai' },
  'ocean': { fullName: 'Ocean Protocol' },
  'xmr': { fullName: 'Monero' },
  'zec': { fullName: 'Zcash' },
  'dash': { fullName: 'Dash' },
  'bch': { fullName: 'Bitcoin Cash' },
  'etc': { fullName: 'Ethereum Classic' },
  'xem': { fullName: 'NEM' },
  'xym': { fullName: 'Symbol' },
  'iota': { fullName: 'IOTA' },
  'egld': { fullName: 'MultiversX' },
  'flow': { fullName: 'Flow' },
  'kava': { fullName: 'Kava' },
  'rose': { fullName: 'Oasis Network' },
  'one': { fullName: 'Harmony' },
  'celo': { fullName: 'Celo' },
  'cusd': { fullName: 'Celo Dollar' },
};

// Network suffixes to detect - ordered by length (longest first for accurate matching)
const NETWORK_PATTERNS: { suffix: string; network: string; short: string }[] = [
  // Long suffixes first
  { suffix: 'polygon', network: 'Polygon', short: 'MATIC' },
  { suffix: 'mainnet', network: 'Mainnet', short: '' },
  { suffix: 'optimism', network: 'Optimism', short: 'OP' },
  { suffix: 'arbitrum', network: 'Arbitrum', short: 'ARB' },
  { suffix: 'avalanche', network: 'Avalanche', short: 'AVAX' },
  { suffix: 'fantom', network: 'Fantom', short: 'FTM' },
  { suffix: 'solana', network: 'Solana', short: 'SOL' },
  // Medium suffixes
  { suffix: 'trc20', network: 'Tron', short: 'TRC20' },
  { suffix: 'erc20', network: 'Ethereum', short: 'ERC20' },
  { suffix: 'bep20', network: 'BNB Chain', short: 'BEP20' },
  { suffix: 'bep2', network: 'BNB Beacon', short: 'BEP2' },
  { suffix: 'base', network: 'Base', short: 'BASE' },
  { suffix: 'poly', network: 'Polygon', short: 'MATIC' },
  { suffix: 'matic', network: 'Polygon', short: 'MATIC' },
  { suffix: 'avax', network: 'Avalanche', short: 'AVAX' },
  // Short suffixes
  { suffix: 'bsc', network: 'BNB Chain', short: 'BEP20' },
  { suffix: 'arb', network: 'Arbitrum', short: 'ARB' },
  { suffix: 'opt', network: 'Optimism', short: 'OP' },
  { suffix: 'ftm', network: 'Fantom', short: 'FTM' },
  { suffix: 'sol', network: 'Solana', short: 'SOL' },
  { suffix: 'trx', network: 'Tron', short: 'TRC20' },
  { suffix: 'trc', network: 'Tron', short: 'TRC20' },
  { suffix: 'eth', network: 'Ethereum', short: 'ERC20' },
  { suffix: 'op', network: 'Optimism', short: 'OP' },
  { suffix: 'ln', network: 'Lightning', short: 'LN' },
];

// Native token networks (tokens that are the native currency of their chain)
const NATIVE_NETWORKS: Record<string, { network: string; short: string }> = {
  'btc': { network: 'Bitcoin', short: 'BTC' },
  'eth': { network: 'Ethereum', short: 'ETH' },
  'bnb': { network: 'BNB Chain', short: 'BNB' },
  'sol': { network: 'Solana', short: 'SOL' },
  'trx': { network: 'Tron', short: 'TRX' },
  'matic': { network: 'Polygon', short: 'MATIC' },
  'pol': { network: 'Polygon', short: 'POL' },
  'avax': { network: 'Avalanche', short: 'AVAX' },
  'ftm': { network: 'Fantom', short: 'FTM' },
  'ltc': { network: 'Litecoin', short: 'LTC' },
  'doge': { network: 'Dogecoin', short: 'DOGE' },
  'xrp': { network: 'XRP Ledger', short: 'XRP' },
  'ada': { network: 'Cardano', short: 'ADA' },
  'dot': { network: 'Polkadot', short: 'DOT' },
  'atom': { network: 'Cosmos', short: 'ATOM' },
  'near': { network: 'NEAR', short: 'NEAR' },
  'apt': { network: 'Aptos', short: 'APT' },
  'sui': { network: 'Sui', short: 'SUI' },
  'xlm': { network: 'Stellar', short: 'XLM' },
  'algo': { network: 'Algorand', short: 'ALGO' },
  'xtz': { network: 'Tezos', short: 'XTZ' },
  'hbar': { network: 'Hedera', short: 'HBAR' },
  'vet': { network: 'VeChain', short: 'VET' },
  'fil': { network: 'Filecoin', short: 'FIL' },
  'egld': { network: 'MultiversX', short: 'EGLD' },
  'flow': { network: 'Flow', short: 'FLOW' },
  'kava': { network: 'Kava', short: 'KAVA' },
  'rose': { network: 'Oasis', short: 'ROSE' },
  'one': { network: 'Harmony', short: 'ONE' },
  'celo': { network: 'Celo', short: 'CELO' },
  'xmr': { network: 'Monero', short: 'XMR' },
  'zec': { network: 'Zcash', short: 'ZEC' },
  'dash': { network: 'Dash', short: 'DASH' },
  'bch': { network: 'Bitcoin Cash', short: 'BCH' },
  'etc': { network: 'Ethereum Classic', short: 'ETC' },
  'ton': { network: 'TON', short: 'TON' },
  'kas': { network: 'Kaspa', short: 'KAS' },
  'arb': { network: 'Arbitrum', short: 'ARB' },
  'op': { network: 'Optimism', short: 'OP' },
  'inj': { network: 'Injective', short: 'INJ' },
  'sei': { network: 'Sei', short: 'SEI' },
  'tia': { network: 'Celestia', short: 'TIA' },
};

/**
 * Smart parse any asset code into symbol + network
 * Works with patterns like: usdttrc20, ethbsc, btcln, etc.
 */
function smartParseAssetCode(code: string): { symbol: string; network: string; networkShort: string; fullName: string } {
  const lowerCode = code.toLowerCase().trim();
  
  // Try to match network suffix patterns (longest first)
  for (const pattern of NETWORK_PATTERNS) {
    if (lowerCode.endsWith(pattern.suffix)) {
      const symbolPart = lowerCode.slice(0, -pattern.suffix.length);
      if (symbolPart.length >= 2) {
        const symbol = symbolPart.toUpperCase();
        const knownToken = KNOWN_SYMBOLS[symbolPart];
        return {
          symbol,
          network: pattern.network,
          networkShort: pattern.short,
          fullName: knownToken?.fullName || symbol,
        };
      }
    }
  }
  
  // No network suffix found - check if it's a native token
  const nativeInfo = NATIVE_NETWORKS[lowerCode];
  if (nativeInfo) {
    const knownToken = KNOWN_SYMBOLS[lowerCode];
    return {
      symbol: lowerCode.toUpperCase(),
      network: nativeInfo.network,
      networkShort: nativeInfo.short,
      fullName: knownToken?.fullName || lowerCode.toUpperCase(),
    };
  }
  
  // Check if it's a known token without network suffix
  const knownToken = KNOWN_SYMBOLS[lowerCode];
  if (knownToken) {
    return {
      symbol: lowerCode.toUpperCase(),
      network: 'Mainnet',
      networkShort: '',
      fullName: knownToken.fullName,
    };
  }
  
  // Complete fallback - unknown token, no network detected
  return {
    symbol: lowerCode.toUpperCase(),
    network: '',
    networkShort: '',
    fullName: lowerCode.toUpperCase(),
  };
}

/**
 * Normalize a raw asset code for parsing and icon URL.
 * Strips underscores so "floki_erc20" and "flokierc20" both match NOWPayments/widget format.
 */
function normalizeCodeForLookup(code: string): string {
  return code.toLowerCase().trim().replace(/_/g, '');
}

/**
 * Normalize a raw asset code to a display-friendly format
 * Works with ANY token code - uses smart parsing. Underscores are removed so
 * "floki_erc20" and "flokierc20" both resolve to the same symbol/network/icon.
 */
export function normalizeAsset(rawCode: string): NormalizedAsset | null {
  if (!rawCode) return null;

  const normalizedCode = normalizeCodeForLookup(rawCode);
  const parsed = smartParseAssetCode(normalizedCode);

  // Use normalized id for icon (e.g. flokierc20) so it matches crypto selector and NOWPayments coins
  const iconUrl = `https://nowpayments.io/images/coins/${normalizedCode}.svg`;

  return {
    symbol: parsed.symbol,
    network: parsed.network,
    networkShort: parsed.networkShort,
    displayName: parsed.symbol,
    fullName: parsed.fullName,
    iconUrl,
    rawCode,
  };
}

/**
 * Get display name for an asset code
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
 * Get icon URL for an asset. Pass optional network so every coin uses the same logo as the selector (e.g. USDC + TRC20 → usdctrc20.svg).
 */
export function getAssetIconUrl(rawCode: string, network?: string | null): string {
  const code = network?.trim() ? `${(rawCode || '').trim()}${network.trim()}`.replace(/\s/g, '').replace(/_/g, '') : (rawCode || '').trim();
  if (!code) return `https://nowpayments.io/images/coins/default.svg`;
  const normalized = normalizeAsset(code);
  const lookupCode = normalizeCodeForLookup(code);
  return normalized?.iconUrl || `https://nowpayments.io/images/coins/${lookupCode}.svg`;
}

/**
 * Get network for an asset
 */
export function getAssetNetwork(rawCode: string): string {
  const normalized = normalizeAsset(rawCode);
  return normalized?.network || '';
}

/**
 * Get short network for an asset
 */
export function getAssetNetworkShort(rawCode: string): string {
  const normalized = normalizeAsset(rawCode);
  return normalized?.networkShort || '';
}
