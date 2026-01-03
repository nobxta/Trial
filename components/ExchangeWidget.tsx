"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowDown, Copy, CheckCircle, BookOpen, X, Check, AlertTriangle } from "lucide-react";
import CryptoSelector from "./CryptoSelector";
import { applyFee } from "@/lib/pricing";
import { getDefaultNetwork, Network } from "@/lib/networks";
import { SupportedCrypto, getCryptoById, getNetworkChainFromSupportedCrypto, getCryptosBySymbol, getEnabledCryptos } from "@/lib/supported-cryptos";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

// MIN_AMOUNT is now fetched from NOWPayments API - no hardcoded value

// Format minimum amount for display - show appropriate precision
// Never round - show the REAL value from NOWPayments API
const formatMinAmount = (amount: number): string => {
  if (amount >= 1) {
    // For amounts >= 1, show up to 4 decimal places
    return amount.toFixed(4).replace(/\.?0+$/, '');
  } else if (amount >= 0.01) {
    // For amounts >= 0.01, show up to 6 decimal places
    return amount.toFixed(6).replace(/\.?0+$/, '');
  } else {
    // For small amounts (< 0.01), show up to 8 decimal places
    return amount.toFixed(8).replace(/\.?0+$/, '');
  }
};

// Get valid default crypto IDs - Default: ETH to BTC
const getValidDefaultCryptoIds = (): { sendId: string; receiveId: string } => {
  // Try to get ETH (prefer Ethereum main network) for sending
  const ethCryptos = getCryptosBySymbol("ETH");
  const sendCrypto = ethCryptos.find(c => c.network === "Ethereum") || ethCryptos[0];
  
  // Try to get BTC (prefer main network) for receiving
  const btcCryptos = getCryptosBySymbol("BTC");
  const receiveCrypto = btcCryptos.find(c => c.network === "Bitcoin") || btcCryptos[0];
  
  // Fallback to first two enabled cryptos if ETH/BTC not found
  const allCryptos = getEnabledCryptos();
  const sendId = sendCrypto?.id || allCryptos[0]?.id || "";
  // Ensure receive crypto is different from send crypto
  const receiveId = receiveCrypto?.id || allCryptos.find(c => c.id !== sendId)?.id || allCryptos[0]?.id || "";
  
  return { sendId, receiveId };
};

const getNetworkFee = (network: Network): number => {
  const chain = network.chain.toUpperCase();
  if (chain === 'BTC' || chain === 'LTC') return 4.50;
  if (chain === 'ERC20' || chain === 'ETH') return 3.00;
  if (chain === 'TRC20') return 1.00;
  if (chain === 'BEP20' || chain === 'BNB') return 0.50;
  if (chain === 'SOL') return 0.05;
  if (chain === 'POLYGON' || chain === 'MATIC') return 0.10;
  if (chain === 'TON') return 0.05;
  return 2.00;
};

const getETA = (sendNetwork: Network, receiveNetwork: Network): string => {
  const fastNetworks = ['SOL', 'POLYGON', 'MATIC', 'TON'];
  const mediumNetworks = ['TRC20', 'BEP20', 'BNB'];
  
  const sendChain = sendNetwork.chain.toUpperCase();
  const receiveChain = receiveNetwork.chain.toUpperCase();
  
  const isFast = fastNetworks.includes(sendChain) || fastNetworks.includes(receiveChain);
  const isMedium = mediumNetworks.includes(sendChain) || mediumNetworks.includes(receiveChain);
  
  if (isFast) return '~ 5 mins';
  if (isMedium) return '~ 10 mins';
  return '~ 20 mins';
};

const formatPreciseNumber = (num: number, maxDecimals: number = 8): string => {
  if (isNaN(num) || !isFinite(num)) return "0";
  const str = num.toFixed(maxDecimals);
  return str.replace(/\.?0+$/, '');
};

// Convert SupportedCrypto to Network object for compatibility
const cryptoToNetwork = (crypto: SupportedCrypto): Network => {
  const chain = getNetworkChainFromSupportedCrypto(crypto);
  return {
    id: crypto.id,
    name: crypto.name,
    chain: chain,
    symbol: crypto.symbol,
  };
};

// Helper function to find crypto ID from symbol and network string
// Supports formats like "XMR", "BTC", "ETH", "USDT_TRC20", "USDT_ERC20"
const findCryptoIdFromParam = (param: string): string | null => {
  if (!param) return null;
  
  // Handle network-specific formats like "USDT_TRC20" or "USDT_ERC20"
  if (param.includes('_')) {
    const [symbol, networkCode] = param.split('_');
    const networkMap: Record<string, string> = {
      'TRC20': 'Tron',
      'ERC20': 'Ethereum',
      'BSC': 'BNB Smart Chain',
      'BASE': 'Base',
      'ARB': 'Arbitrum',
      'POLYGON': 'Polygon',
      'OPTIMISM': 'Optimism',
      'SOL': 'Solana',
    };
    const network = networkMap[networkCode.toUpperCase()];
    if (network) {
      const cryptos = getCryptosBySymbol(symbol.toUpperCase());
      const crypto = cryptos.find(c => c.network === network);
      return crypto?.id || null;
    }
  }
  
  // Handle simple symbol formats like "XMR", "BTC", "ETH"
  const symbol = param.toUpperCase();
  const networkMap: Record<string, string> = {
    'XMR': 'Monero',
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'LTC': 'Litecoin',
    'DOGE': 'Dogecoin',
    'BCH': 'Bitcoin Cash',
    'DASH': 'Dash',
    'ZEC': 'Zcash',
  };
  
  const network = networkMap[symbol];
  if (network) {
    const cryptos = getCryptosBySymbol(symbol);
    const crypto = cryptos.find(c => c.network === network);
    return crypto?.id || null;
  }
  
  // Fallback: try to find any crypto with this symbol
  const cryptos = getCryptosBySymbol(symbol);
  return cryptos[0]?.id || null;
};

export default function ExchangeWidget() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [sendAmount, setSendAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_sendAmount');
      return saved || "0.1";
    }
    return "0.1";
  });

  // Get initial crypto IDs from localStorage or defaults (URL params handled in useEffect)
  const getInitialSendCryptoId = (): string => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_sendCryptoId');
      if (saved && getCryptoById(saved)) return saved;
    }
    const defaults = getValidDefaultCryptoIds();
    return defaults.sendId;
  };

  const getInitialReceiveCryptoId = (): string => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_receiveCryptoId');
      if (saved && getCryptoById(saved)) return saved;
    }
    const defaults = getValidDefaultCryptoIds();
    return defaults.receiveId;
  };

  const [sendCryptoId, setSendCryptoId] = useState<string>(getInitialSendCryptoId);
  const [receiveCryptoId, setReceiveCryptoId] = useState<string>(getInitialReceiveCryptoId);
  
  // Get crypto objects first (before fetching prices)
  // Always return a valid crypto, fallback to defaults if not found
  const sendCrypto = useMemo(() => {
    const crypto = getCryptoById(sendCryptoId);
    if (crypto) return crypto;
    const defaults = getValidDefaultCryptoIds();
    return getCryptoById(defaults.sendId);
  }, [sendCryptoId]);
  
  const receiveCrypto = useMemo(() => {
    const crypto = getCryptoById(receiveCryptoId);
    if (crypto) return crypto;
    const defaults = getValidDefaultCryptoIds();
    return getCryptoById(defaults.receiveId);
  }, [receiveCryptoId]);

  // Handle URL parameters - react to changes in pathname and searchParams
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check URL parameters from both sources to ensure we catch all changes
    const params = new URLSearchParams(window.location.search);
    const fromParam = searchParams.get('from') || params.get('from');
    const toParam = searchParams.get('to') || params.get('to');
    
    if (fromParam) {
      const cryptoId = findCryptoIdFromParam(fromParam);
      if (cryptoId && getCryptoById(cryptoId)) {
        setSendCryptoId(cryptoId);
        localStorage.setItem('mintmove_sendCryptoId', cryptoId);
      }
    }
    
    if (toParam) {
      const cryptoId = findCryptoIdFromParam(toParam);
      if (cryptoId && getCryptoById(cryptoId)) {
        setReceiveCryptoId(cryptoId);
        localStorage.setItem('mintmove_receiveCryptoId', cryptoId);
      }
    }
  }, [searchParams, pathname]); // React to both searchParams and pathname changes

  // Ensure valid cryptos are always selected (fixes stuck loading state)
  useEffect(() => {
    // Only fix if crypto is undefined but ID is set (invalid ID scenario)
    if ((!sendCrypto && sendCryptoId) || (!receiveCrypto && receiveCryptoId)) {
      const defaults = getValidDefaultCryptoIds();
      
      if (!sendCrypto && sendCryptoId && defaults.sendId && defaults.sendId !== sendCryptoId) {
        setSendCryptoId(defaults.sendId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mintmove_sendCryptoId', defaults.sendId);
        }
      }
      
      if (!receiveCrypto && receiveCryptoId && defaults.receiveId && defaults.receiveId !== receiveCryptoId) {
        setReceiveCryptoId(defaults.receiveId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mintmove_receiveCryptoId', defaults.receiveId);
        }
      }
    }
  }, [sendCrypto, receiveCrypto, sendCryptoId, receiveCryptoId]);

  // Only fetch prices for the cryptos we're actually displaying
  const coinGeckoIdsToFetch = useMemo(() => {
    const ids: string[] = [];
    if (sendCrypto?.coingeckoId) ids.push(sendCrypto.coingeckoId);
    if (receiveCrypto?.coingeckoId && receiveCrypto.coingeckoId !== sendCrypto?.coingeckoId) {
      ids.push(receiveCrypto.coingeckoId);
    }
    return ids;
  }, [sendCrypto?.coingeckoId, receiveCrypto?.coingeckoId]);

  // Fetch prices only for displayed cryptos
  const { prices, loading: pricesLoading } = useCryptoPrices(true, 20000, coinGeckoIdsToFetch);
  const [orderType, setOrderType] = useState<"fixed" | "float">("fixed");
  const [destination, setDestination] = useState("");
  const [liveExchangeRate, setLiveExchangeRate] = useState<number | null>(null);
  const [lockedExchangeRate, setLockedExchangeRate] = useState<number | null>(null);
  const fixedRateFee = 1.0;
  const floatRateFee = 0.5;
  
  // Address book state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [addressBookLoading, setAddressBookLoading] = useState(false);
  const [addressValidationWarning, setAddressValidationWarning] = useState<string | null>(null);
  
  // Exchange limits state
  const [exchangeLimits, setExchangeLimits] = useState<{ min_amount: number; max_amount?: number } | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  
  // Track if user has interacted with the amount input
  const [hasUserTyped, setHasUserTyped] = useState(false);
  
  // Use locked rate for fixed, live rate for float
  const exchangeRate = useMemo(() => {
    if (orderType === "fixed") {
      return lockedExchangeRate || liveExchangeRate;
    }
    return liveExchangeRate;
  }, [orderType, lockedExchangeRate, liveExchangeRate]);

  // Convert to Network objects for compatibility
  // Always return valid networks, never null
  const sendNetwork = useMemo(() => {
    if (sendCrypto) return cryptoToNetwork(sendCrypto);
    const defaults = getValidDefaultCryptoIds();
    const defaultCrypto = getCryptoById(defaults.sendId);
    return defaultCrypto ? cryptoToNetwork(defaultCrypto) : getDefaultNetwork('BTC');
  }, [sendCrypto]);

  const receiveNetwork = useMemo(() => {
    if (receiveCrypto) return cryptoToNetwork(receiveCrypto);
    const defaults = getValidDefaultCryptoIds();
    const defaultCrypto = getCryptoById(defaults.receiveId);
    return defaultCrypto ? cryptoToNetwork(defaultCrypto) : getDefaultNetwork('ETH');
  }, [receiveCrypto]);

  // Address validation function
  const validateAddress = useCallback((address: string, network: Network): boolean => {
    if (!address.trim()) return false;
    if (network.chain === 'ERC20' || network.id.includes('ERC20')) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    if (network.chain === 'TRC20' || network.id.includes('TRC20')) {
      return /^T[A-Za-z1-9]{33}$/.test(address);
    }
    if (network.chain === 'BEP20' || network.id.includes('BEP20')) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    if (network.symbol === 'BTC') {
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
    }
    return address.length > 10;
  }, []);

  // Validate destination address
  const isDestinationValid = useMemo(() => {
    return validateAddress(destination, receiveNetwork);
  }, [destination, receiveNetwork, validateAddress]);

  // Track previous crypto pair to detect changes
  const prevCryptoPair = useRef<string>('');
  
  // Calculate live exchange rate from prices (always update for float mode)
  useEffect(() => {
    if (!sendCrypto || !receiveCrypto) {
      // Reset rate if cryptos are invalid, but don't block UI
      setLiveExchangeRate(null);
      return;
    }
    
    const currentPair = `${sendCrypto.id}-${receiveCrypto.id}`;
    const pairChanged = prevCryptoPair.current !== currentPair;
    prevCryptoPair.current = currentPair;
    
    const sendPrice = prices[sendCrypto.coingeckoId]?.usd;
    const receivePrice = prices[receiveCrypto.coingeckoId]?.usd;
    
    if (sendPrice && receivePrice && sendPrice > 0 && receivePrice > 0) {
      const rate = sendPrice / receivePrice;
      setLiveExchangeRate(rate);
      
      // Reset locked rate if pair changed or in float mode or no locked rate exists
      if (pairChanged || orderType === "float" || lockedExchangeRate === null) {
        setLockedExchangeRate(rate);
      }
    } else {
      setLiveExchangeRate(null);
    }
  }, [sendCrypto, receiveCrypto, prices, orderType, lockedExchangeRate]);
  
  // Lock rate when switching to fixed mode
  const handleOrderTypeChange = useCallback((newType: "fixed" | "float") => {
    if (newType === "fixed" && liveExchangeRate !== null) {
      // Lock the current live rate when switching to fixed
      setLockedExchangeRate(liveExchangeRate);
    }
    setOrderType(newType);
  }, [orderType, liveExchangeRate, lockedExchangeRate]);

  const receiveAmount = useMemo(() => {
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0 || exchangeRate === null) {
      return "0";
    }
    const feePercent = orderType === "fixed" ? fixedRateFee : floatRateFee;
    const calculated = applyFee(amount * exchangeRate, feePercent);
    return formatPreciseNumber(calculated, 8);
  }, [sendAmount, exchangeRate, orderType, fixedRateFee, floatRateFee]);

  // Fetch exchange limits when pair changes
  useEffect(() => {
    if (!sendCrypto || !receiveCrypto) {
      // Keep previous limits if available, don't clear them
      // setExchangeLimits(null);
      return;
    }

    const fetchLimits = async () => {
      setLimitsLoading(true);
      setLimitsError(null);
      
      try {
        const isFixedRate = orderType === 'fixed';
        const response = await fetch(
          `/api/exchange/limits?send_asset=${encodeURIComponent(sendCrypto.id)}&receive_asset=${encodeURIComponent(receiveCrypto.id)}&is_fixed_rate=${isFixedRate}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch exchange limits');
        }
        
        const data = await response.json();
        if (data.success && data.limits) {
          setExchangeLimits(data.limits);
        } else {
          throw new Error(data.error || 'Failed to fetch exchange limits');
        }
      } catch (error: any) {
        console.error('Failed to fetch exchange limits:', error);
        // Provide user-friendly error message
        let errorMessage = error.message || 'Failed to load limits';
        if (errorMessage.toLowerCase().includes('not convertable') || 
            errorMessage.toLowerCase().includes('not supported')) {
          errorMessage = 'This currency pair is not available for exchange. Please try a different pair.';
        }
        setLimitsError(errorMessage);
        setExchangeLimits(null);
      } finally {
        setLimitsLoading(false);
      }
    };

    fetchLimits();
  }, [sendCrypto?.id, receiveCrypto?.id, orderType]);

  // Validation using real limits from NOWPayments
  // Show errors in real-time when amount changes or limits are available
  const amountValidationError = useMemo(() => {
    const amount = parseFloat(sendAmount);
    
    // Don't show error for empty or invalid input (handled by button state)
    if (!sendAmount || isNaN(amount) || amount <= 0) {
      return null;
    }
    
    if (!exchangeLimits) {
      // If limits not loaded yet, don't show error (will be validated on submit)
      return null;
    }
    
    if (amount < exchangeLimits.min_amount) {
      return {
        type: 'min',
        message: `Minimum amount is ${formatMinAmount(exchangeLimits.min_amount)} ${sendCrypto?.symbol || ''}`,
        minAmount: exchangeLimits.min_amount,
      };
    }
    
    if (exchangeLimits.max_amount && amount > exchangeLimits.max_amount) {
      return {
        type: 'max',
        message: `Maximum amount is ${formatMinAmount(exchangeLimits.max_amount)} ${sendCrypto?.symbol || ''}`,
        maxAmount: exchangeLimits.max_amount,
      };
    }
    
    return null;
  }, [sendAmount, exchangeLimits, sendCrypto]);

  // Destination address validation error
  const destinationValidationError = useMemo(() => {
    if (!destination.trim()) {
      return null; // Empty is handled by button state
    }
    
    if (!isDestinationValid) {
      return `Please enter a valid ${receiveNetwork.chain} address`;
    }
    
    return null;
  }, [destination, isDestinationValid, receiveNetwork]);

  // Exchange rate validation error
  const exchangeRateError = useMemo(() => {
    if (exchangeRate === null && !pricesLoading) {
      return 'Exchange rate is still being calculated. Please wait a moment.';
    }
    return null;
  }, [exchangeRate, pricesLoading]);

  const networkFee = useMemo(() => {
    return getNetworkFee(receiveNetwork);
  }, [receiveNetwork]);

  const eta = useMemo(() => {
    return getETA(sendNetwork, receiveNetwork);
  }, [sendNetwork, receiveNetwork]);

  const handleSendSelect = useCallback((crypto: SupportedCrypto) => {
    setSendCryptoId(crypto.id);
    setHasUserTyped(true); // Mark as typed so validation shows immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_sendCryptoId', crypto.id);
    }
  }, []);

  const handleReceiveSelect = useCallback((crypto: SupportedCrypto) => {
    setReceiveCryptoId(crypto.id);
    setHasUserTyped(true); // Mark as typed so validation shows immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_receiveCryptoId', crypto.id);
    }
  }, []);

  const handleSwap = useCallback(() => {
    const tempCryptoId = sendCryptoId;
    setSendCryptoId(receiveCryptoId);
    setReceiveCryptoId(tempCryptoId);
    setSendAmount(receiveAmount);
    setHasUserTyped(true); // Mark as typed so validation shows immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_sendCryptoId', receiveCryptoId);
      localStorage.setItem('mintmove_receiveCryptoId', tempCryptoId);
    }
  }, [sendCryptoId, receiveCryptoId, receiveAmount]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setIsLoggedIn(data.success || false);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  // Load addresses when logged in and receive crypto changes
  const loadAddresses = useCallback(async () => {
    if (!isLoggedIn || !receiveCrypto) return;
    
    setAddressBookLoading(true);
    try {
      const res = await fetch("/api/account/addresses");
      const data = await res.json();
      
      if (data.success && data.addresses) {
        // Filter addresses by receive crypto symbol and network
        const filteredAddresses = data.addresses.filter((addr: any) => {
          // Match by currency symbol
          if (addr.currency !== receiveCrypto.symbol) return false;
          
          // If network is specified, match it
          if (addr.network && receiveCrypto.networkCode) {
            return addr.network.toUpperCase() === receiveCrypto.networkCode.toUpperCase();
          }
          
          // If no network specified in address, allow it (for backward compatibility)
          return true;
        });
        
        setAddresses(filteredAddresses);
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
      setAddresses([]);
    } finally {
      setAddressBookLoading(false);
    }
  }, [isLoggedIn, receiveCrypto]);

  useEffect(() => {
    if (isLoggedIn && receiveCrypto) {
      loadAddresses();
    } else {
      setAddresses([]);
    }
  }, [isLoggedIn, receiveCrypto, loadAddresses]);

  // Validate address against saved addresses
  useEffect(() => {
    if (!destination.trim() || !isLoggedIn || addresses.length === 0) {
      setAddressValidationWarning(null);
      return;
    }

    const trimmedDest = destination.trim().toLowerCase();
    const matchingAddress = addresses.find(
      (addr) => addr.address.toLowerCase() === trimmedDest
    );

    if (!matchingAddress) {
      setAddressValidationWarning(
        "This address is not in your address book. Please verify it's correct."
      );
    } else {
      setAddressValidationWarning(null);
    }
  }, [destination, addresses, isLoggedIn]);

  // Close address book when clicking outside
  useEffect(() => {
    if (!showAddressBook) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const addressBookElement = document.querySelector('[data-address-book]');
      const addressBookButton = (event.target as HTMLElement).closest('[data-address-book-button]');
      
      if (addressBookElement && !addressBookElement.contains(target) && !addressBookButton) {
        setShowAddressBook(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddressBook]);

  const handleSelectAddress = (address: string) => {
    setDestination(address);
    setShowAddressBook(false);
  };

  // Always ensure we have valid cryptos - use defaults if missing
  // This ensures the UI always renders, never shows blank screen
  const displaySendCrypto = useMemo((): SupportedCrypto | null => {
    const sendCryptoImageUrl = sendCrypto?.imageUrl;
    if (sendCrypto) return sendCrypto;
    const defaults = getValidDefaultCryptoIds();
    const defaultCrypto = getCryptoById(defaults.sendId);
    
    return defaultCrypto ?? null;
  }, [sendCrypto, sendCryptoId]);
  
  const displayReceiveCrypto = useMemo((): SupportedCrypto | null => {
    if (receiveCrypto) return receiveCrypto;
    const defaults = getValidDefaultCryptoIds();
    const defaultCrypto = getCryptoById(defaults.receiveId);

    return defaultCrypto ?? null;
  }, [receiveCrypto, receiveCryptoId]);

  return (
    <div className="relative">
      <div className="glass-panel rounded-xl sm:rounded-2xl shadow-2xl shadow-black/50 overflow-visible relative z-10">
        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => handleOrderTypeChange("fixed")}
            className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
              orderType === "fixed"
                ? "text-white border-blue-500 bg-white/5"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
          >
            Fixed Rate
            <span className="ml-1 sm:ml-1.5 text-[10px] sm:text-xs text-neutral-400 bg-white/5 px-1 sm:px-1.5 py-0.5 rounded border border-white/5">
              {fixedRateFee}%
            </span>
          </button>
          <button
            onClick={() => handleOrderTypeChange("float")}
            className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
              orderType === "float"
                ? "text-white border-blue-500 bg-white/5"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
          >
            Floating Rate
            <span className="ml-1 sm:ml-1.5 text-[10px] sm:text-xs text-neutral-500 bg-white/5 px-1 sm:px-1.5 py-0.5 rounded border border-white/5">
              {floatRateFee}%
            </span>
          </button>
        </div>

        <div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
          {/* Send Input */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex justify-between text-[10px] sm:text-xs text-neutral-400">
              <span>You Send</span>
              {limitsLoading ? (
                <span className="text-neutral-500 inline-flex items-center gap-1">
                  <span className="inline-block w-2 h-2 border border-neutral-500 border-t-transparent rounded-full animate-spin"></span>
                  <span className="hidden sm:inline">Updating limits...</span>
                </span>
              ) : exchangeLimits ? (
                <span>
                  Min: {formatMinAmount(exchangeLimits.min_amount)} {displaySendCrypto?.symbol || '—'}
                  {exchangeLimits.max_amount && ` • Max: ${formatMinAmount(exchangeLimits.max_amount)} ${displaySendCrypto?.symbol || '—'}`}
                </span>
              ) : (
                limitsError ? (
                  <span className="text-red-400">Limits unavailable</span>
                ) : (
                  <span className="text-neutral-500">Limits updating...</span>
                )
              )}
            </div>
            <div className="input-group rounded-lg sm:rounded-xl flex items-center p-1">
              <input
                type="number"
                step="any"
                value={sendAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setSendAmount(value);
                    setHasUserTyped(true); // Mark that user has interacted with the input
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('mintmove_sendAmount', value);
                    }
                  }
                }}
                className="w-full bg-transparent border-none text-white text-lg sm:text-xl md:text-2xl font-medium px-2 sm:px-3 md:px-4 focus:ring-0 placeholder-neutral-600 outline-none"
                placeholder="0.0"
              />
              <CryptoSelector
                selectedCryptoId={displaySendCrypto?.id || sendCryptoId}
                onSelect={handleSendSelect}
                excludeCryptoId={receiveCryptoId}
                prices={prices}
              />
            </div>
            {/* Error message container - reserved space to prevent layout shift */}
            <div className="min-h-[20px] px-2">
              {amountValidationError && (
                <div className="text-[10px] sm:text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="flex-1">{amountValidationError.message}</span>
                  {amountValidationError.type === 'min' && exchangeLimits && (
                    <button
                      type="button"
                      onClick={() => {
                        const minValue = formatMinAmount(exchangeLimits.min_amount);
                        setSendAmount(minValue);
                        setHasUserTyped(true);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('mintmove_sendAmount', minValue);
                        }
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 underline transition-colors flex-shrink-0"
                    >
                      Use minimum
                    </button>
                  )}
                </div>
              )}
              {limitsError && !exchangeLimits && !limitsLoading && (
                <div className="text-[10px] sm:text-xs text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {limitsError}
                </div>
              )}
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center -my-1 sm:-my-2 relative z-10">
            <button
              onClick={handleSwap}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Receive Input */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex justify-between text-[10px] sm:text-xs text-neutral-400">
              <span>You Get (Estimated)</span>
            </div>
            <div className="input-group rounded-lg sm:rounded-xl flex items-center p-1 relative">
              <input
                type="text"
                value={receiveAmount}
                readOnly
                className={`w-full bg-transparent border-none text-white text-lg sm:text-xl md:text-2xl font-medium px-2 sm:px-3 md:px-4 focus:ring-0 placeholder-neutral-600 outline-none cursor-default transition-opacity duration-200 ${
                  exchangeRate === null && pricesLoading ? 'opacity-60' : 'opacity-100'
                }`}
              />
              {exchangeRate === null && pricesLoading && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg sm:rounded-xl">
                  <div className="h-full w-32 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                </div>
              )}
              <CryptoSelector
                selectedCryptoId={displayReceiveCrypto?.id || receiveCryptoId}
                onSelect={handleReceiveSelect}
                excludeCryptoId={sendCryptoId}
                prices={prices}
              />
            </div>
          </div>

          {/* Destination Address */}
          <div className="pt-1 sm:pt-2">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label className="block text-[10px] sm:text-xs text-neutral-400">
                Your {displayReceiveCrypto?.symbol || '—'} Address
              </label>
              {isLoggedIn && (
              <button
                type="button"
                data-address-book-button
                onClick={() => setShowAddressBook(!showAddressBook)}
                className="text-[10px] sm:text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                <BookOpen className="w-3 h-3" />
                Address Book
              </button>
              )}
            </div>
            <div className="relative">
              <div className="input-group rounded-lg sm:rounded-xl flex items-center p-2 sm:p-3">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-transparent border-none text-white text-xs sm:text-sm focus:ring-0 placeholder-neutral-600 outline-none"
                  placeholder={`Paste address (${receiveNetwork.chain === 'ERC20' || receiveNetwork.chain === 'BEP20' ? '0x...' : receiveNetwork.chain === 'TRC20' ? 'T...' : 'address...'})`}
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.readText().then(text => setDestination(text))}
                  className="text-neutral-500 hover:text-white transition-colors flex-shrink-0"
                  title="Paste from clipboard"
                >
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
              
              {/* Address Book Dropdown */}
              {showAddressBook && isLoggedIn && (
                <div 
                  data-address-book
                  className="absolute z-50 mt-2 w-full bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 max-h-64 overflow-y-auto"
                >
                  {addressBookLoading ? (
                    <div className="p-4 text-center text-neutral-400 text-sm">
                      Loading addresses...
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-neutral-400 text-sm mb-2">
                        No addresses saved for {receiveCrypto?.symbol || 'this currency'}
                      </p>
                      <p className="text-neutral-500 text-xs">
                        Please paste your address manually or add it to your address book
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressBook(false);
                          router.push("/account/addresses");
                        }}
                        className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Go to Address Book
                      </button>
                    </div>
                  ) : (
                    <div className="py-2">
                      {addresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectAddress(addr.address)}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-white font-medium truncate">
                                {addr.label}
                              </span>
                              {addr.isDefault && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-400 font-mono truncate">
                              {addr.address.length > 30
                                ? `${addr.address.substring(0, 15)}...${addr.address.substring(addr.address.length - 15)}`
                                : addr.address}
                            </div>
                            {addr.network && (
                              <div className="text-[10px] text-neutral-500 mt-0.5">
                                {addr.network}
                              </div>
                            )}
                          </div>
                          <Check className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Address Validation Warning */}
              {addressValidationWarning && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-xs text-yellow-400">
                    {addressValidationWarning}
                  </p>
                </div>
              )}
              
              {/* Destination validation error - reserved space */}
              <div className="min-h-[20px] mt-1.5">
                {destinationValidationError && (
                  <div className="text-[10px] sm:text-xs text-red-400 px-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {destinationValidationError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Summary */}
          <div className="bg-white/5 rounded-lg p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-neutral-500">Rate</span>
              <span className="text-neutral-300 text-right break-words relative">
                {exchangeRate !== null ? (
                  <span className="transition-opacity duration-200">
                    1 {displaySendCrypto?.symbol || '—'} ≈ {exchangeRate.toFixed(6)} {displayReceiveCrypto?.symbol || '—'}
                    {orderType === "fixed" && (
                      <span className="ml-1 text-[9px] text-green-400">(Locked)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-neutral-500 inline-flex items-center gap-1">
                    {pricesLoading && Object.keys(prices).length === 0 ? (
                      <>
                        <span className="inline-block w-2 h-2 border border-neutral-500 border-t-transparent rounded-full animate-spin"></span>
                        <span className="relative">
                          <span className="opacity-0">0.000000</span>
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></span>
                        </span>
                      </>
                    ) : (
                      'Calculating...'
                    )}
                  </span>
                )}
              </span>
            </div>
            {/* Exchange rate error - reserved space */}
            <div className="min-h-[16px]">
              {exchangeRateError && (
                <div className="text-[10px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {exchangeRateError}
                </div>
              )}
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-neutral-500">Network Fee</span>
              <span className="text-neutral-300">~ ${networkFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-neutral-500">ETA</span>
              <span className="text-neutral-300">{eta}</span>
            </div>
          </div>

          {/* CTA */}
          <button
            disabled={
              !sendAmount ||
              isNaN(parseFloat(sendAmount)) ||
              parseFloat(sendAmount) <= 0 ||
              !!amountValidationError ||
              !destination.trim() ||
              !isDestinationValid ||
              exchangeRate === null ||
              limitsLoading ||
              (!exchangeLimits && !limitsError) || // Disable if limits not loaded yet (unless there's an error)
              !!exchangeRateError ||
              !!destinationValidationError
            }
            onClick={async () => {
              try {
                const amount = parseFloat(sendAmount);
                
                // All validation is now handled inline - button is disabled if invalid
                // These checks are just safety nets, but should never trigger due to button state
                if (!sendAmount || isNaN(amount) || amount <= 0) {
                  return; // Button should be disabled, but return silently if somehow clicked
                }
                
                // Validate against real limits (safety check)
                if (exchangeLimits) {
                  if (amount < exchangeLimits.min_amount || amount > (exchangeLimits.max_amount || Infinity)) {
                    return; // Button should be disabled, but return silently if somehow clicked
                  }
                }
                
                if (!destination.trim() || !isDestinationValid) {
                  return; // Button should be disabled, but return silently if somehow clicked
                }

                if (exchangeRate === null) {
                  return; // Button should be disabled, but return silently if somehow clicked
                }

                const feePercent = orderType === "fixed" ? fixedRateFee : floatRateFee;
                const expectedReceive = applyFee(amount * exchangeRate, feePercent);
                const orderId = Math.random().toString(36).substring(2, 8).toUpperCase();
                
                // Use the id field for NOWPayments compatibility
                const response = await fetch('/api/payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: "exchange",
                    send_asset: displaySendCrypto?.id || sendCryptoId, // Use id field for NOWPayments
                    send_network: sendNetwork.chain,
                    send_amount: amount,
                    receive_asset: displayReceiveCrypto?.id || receiveCryptoId, // Use id field for NOWPayments
                    receive_network: receiveNetwork.chain,
                    expected_receive: expectedReceive,
                    rate_type: orderType,
                    destination: destination.trim(),
                    order_id: orderId,
                    price_amount: expectedReceive,
                    price_currency: 'usd',
                    pay_currency: displaySendCrypto?.id || sendCryptoId, // Use id field for NOWPayments
                    payout_address: destination.trim(),
                    payout_currency: displayReceiveCrypto?.id || receiveCryptoId, // Use id field for NOWPayments
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                  throw new Error(errorData.error || `Failed to create exchange order`);
                }

                const paymentData = await response.json();
                if (!paymentData.pay_address) {
                  throw new Error('Exchange order created but no deposit address received');
                }
                
                const orderData = {
                  ...paymentData,
                  sendAmount,
                  sendCurrency: displaySendCrypto?.symbol || '',
                  sendCryptoId: displaySendCrypto?.id || sendCryptoId,
                  sendNetwork: sendNetwork.chain,
                  receiveAmount,
                  receiveCurrency: displayReceiveCrypto?.symbol || '',
                  receiveCryptoId: displayReceiveCrypto?.id || receiveCryptoId,
                  receiveNetwork: receiveNetwork.chain,
                  destination,
                  orderType,
                  exchangeRate,
                };
                
                localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
                router.push(`/order/${orderId}`);
              } catch (error: any) {
                console.error('Exchange order creation error:', error);
                // Show error inline instead of alert
                // For now, we'll just log it - could add an error state if needed
                // The button will remain disabled if validation fails
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            Exchange Now
          </button>
          
          <p className="text-center text-[9px] sm:text-[10px] text-neutral-600 mt-2 sm:mt-3">
            By clicking Exchange, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}

