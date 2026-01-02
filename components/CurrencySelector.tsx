"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import CryptoIcon from "./CryptoIcon";

interface Currency {
  symbol: string;
  name: string;
}

interface CurrencySelectorProps {
  currencies: Currency[];
  selectedCurrency: Currency;
  onSelect: (currency: Currency) => void;
  excludeSymbol?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function CurrencySelector({
  currencies,
  selectedCurrency,
  onSelect,
  excludeSymbol,
  placeholder = "Select currency",
  disabled = false,
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter currencies based on search and exclusion
  const filteredCurrencies = currencies.filter((currency) => {
    const matchesSearch =
      currency.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notExcluded = currency.symbol !== excludeSymbol;
    return matchesSearch && notExcluded;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (currency: Currency) => {
    onSelect(currency);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative currency-dropdown" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 bg-background rounded-lg hover:bg-background-secondary transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CryptoIcon symbol={selectedCurrency.symbol} className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
        <span className="text-text-primary font-medium text-sm sm:text-base hidden sm:inline">
          {selectedCurrency.symbol}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-secondary flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 sm:left-auto mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-background-secondary border border-border rounded-lg shadow-xl z-50 currency-dropdown max-h-[400px] flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b border-border sticky top-0 bg-background-secondary">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search currency..."
                className="w-full pl-10 pr-8 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Currency List */}
          <div className="overflow-y-auto flex-1">
            {filteredCurrencies.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-sm">
                No currencies found
              </div>
            ) : (
              filteredCurrencies.map((currency) => (
                <button
                  key={currency.symbol}
                  type="button"
                  onClick={() => handleSelect(currency)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-background-tertiary transition-colors text-left border-b border-border/30 last:border-b-0"
                >
                  <CryptoIcon symbol={currency.symbol} className="w-6 h-6 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-text-primary font-medium">{currency.symbol}</div>
                    <div className="text-xs text-text-muted truncate">{currency.name}</div>
                  </div>
                  {selectedCurrency.symbol === currency.symbol && (
                    <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

