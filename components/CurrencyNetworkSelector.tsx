"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";
import CryptoIcon from "./CryptoIcon";
import { getNetworksForCurrency, Network } from "@/lib/networks";
import { getCurrencyName } from "@/lib/currencyNames";
import { CoinMarketData } from "@/lib/coingecko";

interface CurrencyNetwork {
  symbol: string;
  network: Network;
  displayName: string;
}

interface CurrencyNetworkSelectorProps {
  currencies: string[]; // List of currency symbols from API
  selectedSymbol: string;
  selectedNetwork: Network;
  onSelect: (symbol: string, network: Network) => void;
  excludeSymbol?: string;
  placeholder?: string;
  disabled?: boolean;
  coinMarketData?: CoinMarketData[]; // Optional CoinGecko market data
  selectorId?: string;
}

// Helper function to format network display name (e.g., "USDT (ERC20)", "USDC (BSC)")
const formatNetworkDisplayName = (symbol: string, network: Network): string => {
  const chain = network.chain.toUpperCase();
  
  // For native networks (BTC, ETH native, SOL, etc.), just show the symbol
  if (chain === symbol.toUpperCase() || chain === 'BTC' || chain === 'ETH' || chain === 'SOL' || chain === 'LTC' || chain === 'XRP' || chain === 'ADA' || chain === 'DOGE' || chain === 'DOT' || chain === 'AVAX' || chain === 'TON' || chain === 'ATOM' || chain === 'APT') {
    return symbol.toUpperCase();
  }
  
  // Map network chains to display names
  const networkDisplayNames: Record<string, string> = {
    'ERC20': 'ERC20',
    'TRC20': 'TRC20',
    'BEP20': 'BSC',
    'POLYGON': 'Polygon',
    'OPT': 'Optimism',
    'ARB': 'Arbitrum',
    'LN': 'Lightning',
    'AVAX-CCHAIN': 'Avalanche C-Chain',
  };
  
  const displayChain = networkDisplayNames[chain] || chain;
  return `${symbol.toUpperCase()} (${displayChain})`;
};

// Helper function to get network badge text
const getNetworkBadge = (network: Network): string => {
  const chain = network.chain.toUpperCase();
  const badgeMap: Record<string, string> = {
    'ERC20': 'ERC20',
    'TRC20': 'TRC20',
    'BEP20': 'BSC',
    'POLYGON': 'MATIC',
    'SOL': 'SOL',
    'BTC': 'BTC',
    'ETH': 'ETH',
    'OPT': 'OPT',
    'ARB': 'ARB',
    'LN': 'LN',
    'AVAX-CCHAIN': 'AVAX',
  };
  return badgeMap[chain] || chain;
};

export default function CurrencyNetworkSelector({
  currencies,
  selectedSymbol,
  selectedNetwork,
  onSelect,
  excludeSymbol,
  placeholder = "Select currency",
  disabled = false,
  coinMarketData = [],
  selectorId = "unknown",
}: CurrencyNetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Popular coins configuration - uses supported assets only
  const POPULAR_COINS = useMemo(() => {
    const { getPopularAssetNetworks } = require('@/lib/supportedAssets');
    const popular = getPopularAssetNetworks(6);
    return popular.map((asset: { symbol: string; networkCode: string }) => ({
      symbol: asset.symbol,
      networkChain: asset.networkCode,
    }));
  }, []);

  // Memoized coin data lookup map for O(1) access
  const coinDataMap = useMemo(() => {
    const map = new Map<string, CoinMarketData>();
    coinMarketData.forEach(coin => {
      map.set(coin.symbol.toLowerCase(), coin);
    });
    return map;
  }, [coinMarketData]);

  // Memoized helper to get market data
  const getCoinData = useCallback((symbol: string): CoinMarketData | undefined => {
    return coinDataMap.get(symbol.toLowerCase());
  }, [coinDataMap]);

  // Memoized: Build all currency+network combinations
  const allOptions = useMemo(() => {
    const options = currencies
      .filter(symbol => symbol.toUpperCase() !== excludeSymbol?.toUpperCase())
      .flatMap(symbol => {
        const networks = getNetworksForCurrency(symbol);
        return networks.map(network => ({
          symbol: symbol.toUpperCase(),
          network,
          displayName: formatNetworkDisplayName(symbol, network),
        }));
      });
    return options;
  }, [currencies, excludeSymbol]);

  // Memoized: Build popular coins options
  const popularOptions = useMemo((): CurrencyNetwork[] => {
    return POPULAR_COINS
      .filter((pop: { symbol: string; networkChain: string }) => pop.symbol.toUpperCase() !== excludeSymbol?.toUpperCase())
      .map((pop: { symbol: string; networkChain: string }): CurrencyNetwork | null => {
        const symbol = pop.symbol.toUpperCase();
        const networks = getNetworksForCurrency(symbol);
        const network = networks.find((n: Network) => n.chain === pop.networkChain) || networks[0];
        if (!network) return null;
        return {
          symbol,
          network,
          displayName: formatNetworkDisplayName(symbol, network),
        };
      })
      .filter((opt: CurrencyNetwork | null): opt is CurrencyNetwork => opt !== null);
  }, [excludeSymbol, POPULAR_COINS]);

  // Get popular option IDs for filtering
  const popularOptionIds = useMemo(() => {
    return new Set(popularOptions.map((opt: CurrencyNetwork) => `${opt.symbol}-${opt.network.id}`));
  }, [popularOptions]);

  // Memoized: Get all other options (excluding popular ones)
  const otherOptions = useMemo(() => {
    return allOptions.filter(option => {
      const optionId = `${option.symbol}-${option.network.id}`;
      return !popularOptionIds.has(optionId);
    });
  }, [allOptions, popularOptionIds]);

  // Memoized: Filter options based on search with text highlighting
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allOptions.filter((option) => {
      const symbolMatch = option.symbol.toLowerCase().includes(query);
      const nameMatch = getCurrencyName(option.symbol).toLowerCase().includes(query);
      const networkMatch = option.network.chain.toLowerCase().includes(query) ||
                          getNetworkBadge(option.network).toLowerCase().includes(query);
      return symbolMatch || nameMatch || networkMatch;
    });
  }, [allOptions, searchQuery]);

  // Highlight matching text in search results
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-blue-500/20 text-blue-300 px-0.5 rounded">{part}</mark>
      ) : part
    );
  };

  // Calculate position immediately from button ref
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return null;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minWidth = 400;
    const maxWidth = Math.min(minWidth, viewportWidth - 32);
    const gap = 8;
    
    let left = rect.left;
    if (left + maxWidth > viewportWidth - 16) {
      left = viewportWidth - maxWidth - 16;
    }
    left = Math.max(16, left);
    
    let top = rect.bottom + gap;
    const dropdownHeight = 500;
    if (top + dropdownHeight > viewportHeight - 16) {
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      if (spaceAbove > spaceBelow && spaceAbove > 200) {
        top = rect.top - dropdownHeight - gap;
      } else {
        top = Math.max(16, viewportHeight - dropdownHeight - 16);
      }
    }
    
    return { top, left, width: maxWidth };
  }, []);

  useEffect(() => {
    if (isOpen && dropdownPosition) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      const handleResize = () => {
        const position = calculatePosition();
        if (position) {
          setDropdownPosition(position);
        }
      };
      
      window.addEventListener("resize", handleResize);

      return () => {
        const savedScrollY = document.body.style.top;
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = '';
        document.body.style.top = '';
        if (savedScrollY) {
          const scrollValue = parseInt(savedScrollY.replace('-', '') || '0');
          window.scrollTo(0, scrollValue);
        }
        window.removeEventListener("resize", handleResize);
      };
    } else if (!isOpen) {
      setDropdownPosition(null);
      setFocusedIndex(-1);
    }
  }, [isOpen, dropdownPosition, calculatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery("");
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    const isSearching = searchQuery.trim().length > 0;
    const options = isSearching ? filteredOptions : [...popularOptions, ...otherOptions];
    const totalOptions = options.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < totalOptions - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      const selectedOption = options[focusedIndex];
      if (selectedOption) {
        handleSelect(selectedOption.symbol, selectedOption.network);
      }
    }
  }, [isOpen, searchQuery, popularOptions, otherOptions, filteredOptions, focusedIndex]);

  const handleSelect = useCallback((symbol: string, network: Network) => {
    onSelect(symbol, network);
    setIsOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
  }, [onSelect]);

  const selectedDisplayName = formatNetworkDisplayName(selectedSymbol, selectedNetwork);

  // Memoized render function for coin option
  const renderCoinOption = useCallback((option: CurrencyNetwork, index: number, isPopular = false) => {
    const isSelected = option.symbol === selectedSymbol && option.network.id === selectedNetwork.id;
    const isFocused = focusedIndex === index;
    const coinData = getCoinData(option.symbol);
    const currencyName = getCurrencyName(option.symbol);
    const networkBadge = getNetworkBadge(option.network);
    
    return (
      <button
        key={`${isPopular ? 'popular-' : ''}${option.symbol}-${option.network.id}-${index}`}
        type="button"
        onClick={() => handleSelect(option.symbol, option.network)}
        onMouseEnter={() => setFocusedIndex(index)}
        className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 group relative ${
          isSelected 
            ? 'bg-blue-500/10 border-l-2 border-blue-500' 
            : isFocused
            ? 'bg-white/5'
            : 'bg-transparent hover:bg-white/5'
        }`}
        style={{
          transform: isFocused ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        {/* LEFT: Logo */}
        <div className="flex-shrink-0 relative">
          <CryptoIcon 
            symbol={option.symbol} 
            image={coinData?.image}
            className="w-10 h-10"
          />
        </div>

        {/* CENTER: Symbol + Name */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
              {searchQuery.trim() ? highlightText(option.symbol, searchQuery) : option.symbol}
            </span>
            {isSelected && (
              <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <div className="text-xs text-neutral-400 truncate">
            {searchQuery.trim() ? (
              <span>{highlightText(currencyName, searchQuery)} · {highlightText(option.network.chain, searchQuery)}</span>
            ) : (
              <span>{currencyName} · {option.network.chain}</span>
            )}
          </div>
        </div>

        {/* RIGHT: Network Badge */}
        <div className="flex-shrink-0">
          <span className="px-2 py-1 text-[10px] font-medium text-neutral-300 bg-white/5 border border-white/10 rounded-md">
            {networkBadge}
          </span>
        </div>

        {/* Hover glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </button>
    );
  }, [selectedSymbol, selectedNetwork, getCoinData, handleSelect, focusedIndex, searchQuery]);

  const showPopular = !searchQuery.trim();
  const isSearching = searchQuery.trim().length > 0;

  const dropdownContent = isOpen && dropdownPosition && typeof window !== "undefined" ? (
    <div
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      className="fixed z-[9999] flex flex-col overflow-hidden dropdown-fade-in"
      style={{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${Math.min(dropdownPosition.width || 400, window.innerWidth - 32)}px`,
        maxHeight: `${Math.min(500, window.innerHeight - dropdownPosition.top - 16)}px`,
      }}
    >
      {/* Glassmorphism Container */}
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-white/5 sticky top-0 bg-black/60 backdrop-blur-sm z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              placeholder="Search coin or network"
              className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFocusedIndex(-1);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Currency List */}
        <div 
          ref={listRef}
          className="overflow-y-auto flex-1 custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
          }}
        >
          {isSearching ? (
            // Search mode: Show filtered results
            filteredOptions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-neutral-400 text-sm">No currencies found</p>
                <p className="text-neutral-500 text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="py-2">
                {filteredOptions.map((option, index) => renderCoinOption(option, index, false))}
              </div>
            )
          ) : (
            // Normal mode: Show popular first, then all others
            <>
              {/* Popular Section */}
              {popularOptions.length > 0 && (
                <>
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Popular</p>
                  </div>
                  {popularOptions.map((option, index) => renderCoinOption(option, index, true))}
                  {otherOptions.length > 0 && (
                    <div className="border-t border-white/5 my-2"></div>
                  )}
                </>
              )}
              
              {/* All Other Currencies */}
              {otherOptions.length > 0 && (
                <>
                  {popularOptions.length > 0 && (
                    <div className="px-4 pt-2 pb-2">
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">All Currencies</p>
                    </div>
                  )}
                  <div className="pb-2">
                    {otherOptions.map((option, index) => renderCoinOption(option, index + popularOptions.length, false))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          if (!disabled) {
            if (!isOpen) {
              const clickedButton = e.currentTarget;
              const rect = clickedButton.getBoundingClientRect();
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              const isMobile = viewportWidth < 640; // sm breakpoint
              const minWidth = isMobile ? Math.min(viewportWidth - 16, 360) : 400;
              const maxWidth = Math.min(minWidth, viewportWidth - 32);
              const gap = 8;
              
              let left = rect.left;
              if (left + maxWidth > viewportWidth - 16) {
                left = viewportWidth - maxWidth - 16;
              }
              left = Math.max(16, left);
              
              let top = rect.bottom + gap;
              const dropdownHeight = 500;
              if (top + dropdownHeight > viewportHeight - 16) {
                const spaceAbove = rect.top;
                const spaceBelow = viewportHeight - rect.bottom;
                if (spaceAbove > spaceBelow && spaceAbove > 200) {
                  top = rect.top - dropdownHeight - gap;
                } else {
                  top = Math.max(16, viewportHeight - dropdownHeight - 16);
                }
              }
              
              const position = { top, left, width: maxWidth };
              setDropdownPosition(position);
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
          }
        }}
        disabled={disabled}
        className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-lg border border-white/10 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CryptoIcon 
          symbol={selectedSymbol} 
          image={getCoinData(selectedSymbol)?.image}
          className="w-6 h-6 flex-shrink-0" 
        />
        <span className="font-medium text-sm">{selectedSymbol}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {typeof window !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}
