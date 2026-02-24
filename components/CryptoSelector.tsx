"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";
import CryptoIcon from "./CryptoIcon";
import { SupportedCrypto, getEnabledCryptos, getPopularCryptos, searchCryptos } from "@/lib/supported-cryptos";

interface CryptoPrice {
  usd: number;
  usd_24h_change?: number;
}

interface CryptoSelectorProps {
  selectedCryptoId: string;
  onSelect: (crypto: SupportedCrypto) => void;
  excludeCryptoId?: string;
  placeholder?: string;
  disabled?: boolean;
  prices?: Record<string, CryptoPrice>;
}

// Format network badge text
const getNetworkBadge = (network: string, networkCode?: string): string => {
  // Use networkCode if available (from new system), otherwise parse network name
  if (networkCode) {
    const networkMap: Record<string, string> = {
      'BTC': '',
      'ERC20': 'ERC20',
      'BASE': 'BASE',
      'ARB': 'ARB',
      'BSC': 'BSC',
      'TRC20': 'TRC20',
      'SOL': 'SOL',
      'POLYGON': 'POLYGON',
      'OPTIMISM': 'OPT',
      'TON': 'TON',
    };
    return networkMap[networkCode.toUpperCase()] || networkCode.toUpperCase();
  }
  
  // Fallback for old format
  const networkMap: Record<string, string> = {
    'MAINNET': '',
    'TRC20': 'TRC20',
    'ERC20': 'ERC20',
    'BSC': 'BSC',
  };
  return networkMap[network.toUpperCase()] || network.toUpperCase();
};

// Format price with proper decimals
// Returns placeholder (—) if price is missing or invalid (never shows 0.0000)
const formatPrice = (price: number | undefined): string => {
  if (price === undefined || price === null || price <= 0) return '—';
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
};

export default function CryptoSelector({
  selectedCryptoId,
  onSelect,
  excludeCryptoId,
  placeholder = "Select cryptocurrency",
  disabled = false,
  prices = {},
}: CryptoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Get all enabled cryptos
  const allCryptos = useMemo(() => {
    const cryptos = getEnabledCryptos().filter(crypto => crypto.id !== excludeCryptoId);
    return cryptos;
  }, [excludeCryptoId, selectedCryptoId]);

  // Get popular cryptos
  const popularCryptos = useMemo(() => {
    return getPopularCryptos(7).filter(crypto => crypto.id !== excludeCryptoId);
  }, [excludeCryptoId]);

  // Get popular crypto IDs for filtering
  const popularCryptoIds = useMemo(() => {
    return new Set(popularCryptos.map(crypto => crypto.id));
  }, [popularCryptos]);

  // Get other cryptos (excluding popular ones)
  const otherCryptos = useMemo(() => {
    return allCryptos.filter(crypto => !popularCryptoIds.has(crypto.id));
  }, [allCryptos, popularCryptoIds]);

  // Filter cryptos based on search
  const filteredCryptos = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchCryptos(searchQuery).filter(crypto => crypto.id !== excludeCryptoId);
  }, [searchQuery, excludeCryptoId]);

  // Get selected crypto
  const selectedCrypto = useMemo(() => {
    const found = allCryptos.find(c => c.id === selectedCryptoId);
    const result = found || allCryptos[0];
    return result;
  }, [allCryptos, selectedCryptoId]);

  // Get price for a crypto
  const getCryptoPrice = useCallback((crypto: SupportedCrypto): number | undefined => {
    const priceData = prices[crypto.coingeckoId];
    return priceData?.usd;
  }, [prices]);

  // Calculate dropdown position — always open toward bottom for better mobile/desktop usability
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return null;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 640;
    const minWidth = isMobile ? Math.min(viewportWidth - 16, 360) : 400;
    const maxWidth = Math.min(minWidth, viewportWidth - 32);
    const gap = 8;
    // Cap height so dropdown always fits when anchored to bottom
    const dropdownHeight = Math.min(500, viewportHeight - 32);
    
    let left = rect.left;
    if (left + maxWidth > viewportWidth - 16) {
      left = viewportWidth - maxWidth - 16;
    }
    left = Math.max(16, left);
    
    // Prefer opening below the button; if not enough space, anchor to viewport bottom (never open upward)
    let top = rect.bottom + gap;
    if (top + dropdownHeight > viewportHeight - 16) {
      top = Math.max(16, viewportHeight - dropdownHeight - 16);
    }
    
    return { top, left, width: maxWidth };
  }, []);

  // Handle dropdown open/close
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

  // Handle click outside and escape key
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
    const options = isSearching ? filteredCryptos : [...popularCryptos, ...otherCryptos];
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
        handleSelect(selectedOption);
      }
    }
  }, [isOpen, searchQuery, popularCryptos, otherCryptos, filteredCryptos, focusedIndex]);

  const handleSelect = useCallback((crypto: SupportedCrypto) => {
    onSelect(crypto);
    setIsOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
  }, [onSelect]);

  // Render crypto option
  const renderCryptoOption = useCallback((crypto: SupportedCrypto, index: number, isPopular = false) => {
    const isSelected = crypto.id === selectedCryptoId;
    const isFocused = focusedIndex === index;
    const networkBadge = getNetworkBadge(crypto.network, (crypto as any).networkCode);
    const price = getCryptoPrice(crypto);
    
    return (
      <button
        key={`${isPopular ? 'popular-' : ''}${crypto.id}-${index}`}
        type="button"
        onClick={() => handleSelect(crypto)}
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
            symbol={crypto.symbol} 
            imageUrl={crypto.imageUrl}
            className="w-10 h-10"
          />
        </div>

        {/* CENTER: Symbol + Name + Network */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
              {crypto.symbol}
            </span>
            {isSelected && (
              <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <div className="text-xs text-neutral-400 truncate">
            {crypto.name}
            {networkBadge && ` • ${networkBadge}`}
          </div>
        </div>

        {/* RIGHT: Price */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-medium text-white">
            {formatPrice(price)}
          </div>
        </div>
      </button>
    );
  }, [selectedCryptoId, getCryptoPrice, handleSelect, focusedIndex]);

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
        minHeight: 0,
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
          className="overflow-y-auto flex-1 custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
          }}
        >
          {isSearching ? (
            // Search mode: Show filtered results
            filteredCryptos.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-neutral-400 text-sm">No cryptocurrencies found</p>
                <p className="text-neutral-500 text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="py-2">
                {filteredCryptos.map((crypto, index) => renderCryptoOption(crypto, index, false))}
              </div>
            )
          ) : (
            // Normal mode: Show popular first, then all others
            <>
              {/* Popular Section */}
              {popularCryptos.length > 0 && (
                <>
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Popular</p>
                  </div>
                  {popularCryptos.map((crypto, index) => renderCryptoOption(crypto, index, true))}
                  {otherCryptos.length > 0 && (
                    <div className="border-t border-white/5 my-2"></div>
                  )}
                </>
              )}
              
              {/* All Other Cryptocurrencies */}
              {otherCryptos.length > 0 && (
                <>
                  {popularCryptos.length > 0 && (
                    <div className="px-4 pt-2 pb-2">
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">All Cryptocurrencies</p>
                    </div>
                  )}
                  <div className="pb-2">
                    {otherCryptos.map((crypto, index) => renderCryptoOption(crypto, index + popularCryptos.length, false))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  if (!selectedCrypto) {
    return null;
  }

  const selectedPrice = getCryptoPrice(selectedCrypto);
  const networkBadge = getNetworkBadge(selectedCrypto.network);

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
              const isMobile = viewportWidth < 640;
              const minWidth = isMobile ? Math.min(viewportWidth - 16, 360) : 400;
              const maxWidth = Math.min(minWidth, viewportWidth - 32);
              const gap = 8;
              const dropdownHeight = Math.min(500, viewportHeight - 32);
              
              let left = rect.left;
              if (left + maxWidth > viewportWidth - 16) {
                left = viewportWidth - maxWidth - 16;
              }
              left = Math.max(16, left);
              
              // Always open toward bottom: below button, or anchored to viewport bottom (never upward)
              let top = rect.bottom + gap;
              if (top + dropdownHeight > viewportHeight - 16) {
                top = Math.max(16, viewportHeight - dropdownHeight - 16);
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
          symbol={selectedCrypto.symbol} 
          imageUrl={selectedCrypto.imageUrl}
          className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" 
        />
        <div className="flex flex-col items-start min-w-0">
          <span className="font-medium text-sm">{selectedCrypto.symbol}</span>
          {networkBadge && (
            <span className="text-[10px] text-neutral-400">{networkBadge}</span>
          )}
        </div>
        {selectedPrice && (
          <span className="text-xs text-neutral-400 ml-auto hidden sm:inline">
            {formatPrice(selectedPrice)}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {typeof window !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}

