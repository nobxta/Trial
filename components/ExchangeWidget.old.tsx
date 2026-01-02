"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Copy, CheckCircle } from "lucide-react";
import CurrencyNetworkSelector from "./CurrencyNetworkSelector";
import { getCurrencyName } from "@/lib/currencyNames";
import { applyFee, getExchangeRate } from "@/lib/pricing";
import { getDefaultNetwork, getNetworksForCurrency, Network } from "@/lib/networks";
import CryptoIcon from "./CryptoIcon";
import { useCoinGecko } from "@/hooks/useCoinGecko";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

interface Currency {
  symbol: string;
  name: string;
}

const defaultCurrencies: Currency[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "MATIC", name: "Polygon" },
];

const MIN_AMOUNT = 0.002;

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

export default function ExchangeWidget() {
  const router = useRouter();
  
  const [sendAmount, setSendAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_sendAmount');
      return saved || "0.1";
    }
    return "0.1";
  });
  const [availableCurrencySymbols, setAvailableCurrencySymbols] = useState<string[]>(defaultCurrencies.map(c => c.symbol));
  const getInitialSendCurrency = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_sendCurrency');
      return saved || "BTC";
    }
    return "BTC";
  };

  const getInitialReceiveCurrency = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_receiveCurrency');
      return saved || "ETH";
    }
    return "ETH";
  };

  const [sendCurrency, setSendCurrency] = useState<string>(getInitialSendCurrency);
  const [receiveCurrency, setReceiveCurrency] = useState<string>(getInitialReceiveCurrency);
  
  const getInitialSendNetwork = (): Network => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_sendNetwork');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.chain) return parsed;
        } catch {}
      }
    }
    return getDefaultNetwork(getInitialSendCurrency());
  };

  const getInitialReceiveNetwork = (): Network => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_receiveNetwork');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.chain) return parsed;
        } catch {}
      }
    }
    return getDefaultNetwork(getInitialReceiveCurrency());
  };

  const [sendNetwork, setSendNetwork] = useState<Network>(getInitialSendNetwork);
  const [receiveNetwork, setReceiveNetwork] = useState<Network>(getInitialReceiveNetwork);
  const [orderType, setOrderType] = useState<"fixed" | "float">("fixed");
  const [destination, setDestination] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const fixedRateFee = 1.0;
  const floatRateFee = 0.5;

  // Fetch coin market data using CoinGecko hook
  const { coins, loading: coinsLoading, error: coinsError, refresh: refreshCoins } = useCoinGecko({
    limit: 100,
    autoRefresh: true,
    refreshInterval: 60000, // 60 seconds
  });

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/currencies');
        if (response.ok) {
          const data = await response.json();
          const symbols = data.currencies.map((symbol: string) => symbol.toUpperCase());
          if (symbols.length > 0) {
            setAvailableCurrencySymbols(symbols);
          }
        }
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
      }
    };
    fetchCurrencies();
  }, []);

  useEffect(() => {
    const availableNetworks = getNetworksForCurrency(sendCurrency);
    const currentNetworkId = sendNetwork.id;
    const isValidNetwork = availableNetworks.some(n => n.id === currentNetworkId);
    if (!isValidNetwork) {
      const defaultNet = getDefaultNetwork(sendCurrency);
      setSendNetwork(defaultNet);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mintmove_sendNetwork', JSON.stringify(defaultNet));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendCurrency]);

  useEffect(() => {
    const availableNetworks = getNetworksForCurrency(receiveCurrency);
    const currentNetworkId = receiveNetwork.id;
    const isValidNetwork = availableNetworks.some(n => n.id === currentNetworkId);
    if (!isValidNetwork) {
      const defaultNet = getDefaultNetwork(receiveCurrency);
      setReceiveNetwork(defaultNet);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mintmove_receiveNetwork', JSON.stringify(defaultNet));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiveCurrency]);

  const handleSendSelect = useCallback((symbol: string, network: Network) => {
    setSendCurrency(symbol);
    setSendNetwork(network);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_sendCurrency', symbol);
      localStorage.setItem('mintmove_sendNetwork', JSON.stringify(network));
    }
  }, []);

  const handleReceiveSelect = useCallback((symbol: string, network: Network) => {
    setReceiveCurrency(symbol);
    setReceiveNetwork(network);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_receiveCurrency', symbol);
      localStorage.setItem('mintmove_receiveNetwork', JSON.stringify(network));
    }
  }, []);

  const receiveAmount = useMemo(() => {
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0 || exchangeRate === null) {
      return "0";
    }
    const feePercent = orderType === "fixed" ? fixedRateFee : floatRateFee;
    const calculated = applyFee(amount * exchangeRate, feePercent);
    return formatPreciseNumber(calculated, 8);
  }, [sendAmount, exchangeRate, orderType, fixedRateFee, floatRateFee]);

  const minAmountError = useMemo(() => {
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) return null;
    if (amount < MIN_AMOUNT) {
      return `Minimum amount is ${MIN_AMOUNT} ${sendCurrency}`;
    }
    return null;
  }, [sendAmount, sendCurrency]);

  const networkFee = useMemo(() => {
    return getNetworkFee(receiveNetwork);
  }, [receiveNetwork]);

  const eta = useMemo(() => {
    return getETA(sendNetwork, receiveNetwork);
  }, [sendNetwork, receiveNetwork]);

  // Get coin market data for selected currencies
  const sendCoinData = useMemo(() => {
    return coins.find(coin => coin.symbol.toLowerCase() === sendCurrency.toLowerCase());
  }, [coins, sendCurrency]);

  const receiveCoinData = useMemo(() => {
    return coins.find(coin => coin.symbol.toLowerCase() === receiveCurrency.toLowerCase());
  }, [coins, receiveCurrency]);

  // Calculate exchange rate from real-time prices
  useEffect(() => {
    const calculateRate = async () => {
      if (sendCoinData && receiveCoinData && sendCoinData.current_price > 0 && receiveCoinData.current_price > 0) {
        const rate = sendCoinData.current_price / receiveCoinData.current_price;
        setExchangeRate(rate);
      } else if (sendCurrency && receiveCurrency) {
        try {
          const rate = await getExchangeRate(sendCurrency, receiveCurrency);
          if (rate !== null && rate > 0) {
            setExchangeRate(rate);
          }
        } catch (error) {
          console.error('Failed to fetch exchange rate:', error);
        }
      }
    };

    calculateRate();
  }, [sendCoinData, receiveCoinData, sendCurrency, receiveCurrency]);

  const handleSwap = useCallback(() => {
    const tempCurrency = sendCurrency;
    const tempNetwork = sendNetwork;
    setSendCurrency(receiveCurrency);
    setReceiveCurrency(tempCurrency);
    setSendNetwork(receiveNetwork);
    setReceiveNetwork(tempNetwork);
    setSendAmount(receiveAmount);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_sendCurrency', receiveCurrency);
      localStorage.setItem('mintmove_receiveCurrency', tempCurrency);
      localStorage.setItem('mintmove_sendNetwork', JSON.stringify(receiveNetwork));
      localStorage.setItem('mintmove_receiveNetwork', JSON.stringify(tempNetwork));
    }
  }, [sendCurrency, receiveCurrency, sendNetwork, receiveNetwork, receiveAmount]);

  const validateAddress = (address: string, network: Network): boolean => {
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
  };

  const isDestinationValid = validateAddress(destination, receiveNetwork);

  // Show loading state if coins are being fetched
  if (coinsLoading && coins.length === 0) {
    return (
      <div className="relative">
        <div className="glass-panel rounded-xl sm:rounded-2xl shadow-2xl shadow-black/50 overflow-visible relative z-10 p-8">
          <LoadingSpinner size="lg" text="Loading cryptocurrency prices..." />
        </div>
      </div>
    );
  }

  // Show error state if API fails (but allow using cached data if available)
  const showError = coinsError && coins.length === 0;

  return (
    <div className="relative">
      {showError && (
        <div className="mb-4">
          <ErrorMessage 
            error={coinsError} 
            onRetry={refreshCoins}
            title="Failed to load prices"
          />
        </div>
      )}
      <div className="glass-panel rounded-xl sm:rounded-2xl shadow-2xl shadow-black/50 overflow-visible relative z-10">
        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setOrderType("fixed")}
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
            onClick={() => setOrderType("float")}
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
              <span>Min: {MIN_AMOUNT} {sendCurrency}</span>
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
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('mintmove_sendAmount', value);
                    }
                  }
                }}
                className="w-full bg-transparent border-none text-white text-lg sm:text-xl md:text-2xl font-medium px-2 sm:px-3 md:px-4 focus:ring-0 placeholder-neutral-600 outline-none"
                placeholder="0.0"
              />
              <CurrencyNetworkSelector
                currencies={availableCurrencySymbols}
                selectedSymbol={sendCurrency}
                selectedNetwork={sendNetwork}
                onSelect={handleSendSelect}
                excludeSymbol={receiveCurrency}
                coinMarketData={coins}
                selectorId="send"
              />
            </div>
            {minAmountError && (
              <div className="text-[10px] sm:text-xs text-red-400 px-2">
                {minAmountError}
              </div>
            )}
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
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="hidden sm:inline">Reserve Available</span>
                <span className="sm:hidden">Available</span>
              </span>
            </div>
            <div className="input-group rounded-lg sm:rounded-xl flex items-center p-1">
              <input
                type="text"
                value={receiveAmount}
                readOnly
                className="w-full bg-transparent border-none text-white text-lg sm:text-xl md:text-2xl font-medium px-2 sm:px-3 md:px-4 focus:ring-0 placeholder-neutral-600 outline-none cursor-default"
              />
              <CurrencyNetworkSelector
                currencies={availableCurrencySymbols}
                selectedSymbol={receiveCurrency}
                selectedNetwork={receiveNetwork}
                onSelect={handleReceiveSelect}
                excludeSymbol={sendCurrency}
                coinMarketData={coins}
                selectorId="receive"
              />
            </div>
          </div>

          {/* Destination Address */}
          <div className="pt-1 sm:pt-2">
            <label className="block text-[10px] sm:text-xs text-neutral-400 mb-1.5 sm:mb-2">
              Your {receiveCurrency} Address
            </label>
            <div className="input-group rounded-lg sm:rounded-xl flex items-center p-2 sm:p-3">
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-transparent border-none text-white text-xs sm:text-sm focus:ring-0 placeholder-neutral-600 outline-none"
                placeholder={`Paste address (${receiveNetwork.chain === 'ERC20' || receiveNetwork.chain === 'BEP20' ? '0x...' : receiveNetwork.chain === 'TRC20' ? 'T...' : 'address...'})`}
              />
              <button
                onClick={() => navigator.clipboard.readText().then(text => setDestination(text))}
                className="text-neutral-500 hover:text-white transition-colors flex-shrink-0 ml-2"
              >
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Details Summary */}
          <div className="bg-white/5 rounded-lg p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-neutral-500">Rate</span>
              <span className="text-neutral-300 text-right break-words">
                {exchangeRate !== null ? (
                  <>1 {sendCurrency} ≈ {exchangeRate.toFixed(6)} {receiveCurrency}</>
                ) : (
                  <span className="text-neutral-500">Calculating...</span>
                )}
              </span>
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
            onClick={async () => {
              try {
                const amount = parseFloat(sendAmount);
                if (!sendAmount || isNaN(amount) || amount <= 0) {
                  alert('Please enter a valid amount to send');
                  return;
                }
                if (!destination.trim()) {
                  alert('Please enter a destination address');
                  return;
                }
                if (!isDestinationValid) {
                  alert(`Please enter a valid ${receiveNetwork.chain} address`);
                  return;
                }

                if (exchangeRate === null) {
                  alert('Exchange rate is still being calculated. Please wait a moment.');
                  return;
                }

                const feePercent = orderType === "fixed" ? fixedRateFee : floatRateFee;
                const expectedReceive = applyFee(amount * exchangeRate, feePercent);
                const orderId = Math.random().toString(36).substring(2, 8).toUpperCase();
                
                const response = await fetch('/api/payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: "exchange",
                    send_asset: sendCurrency.toLowerCase(),
                    send_network: sendNetwork.chain,
                    send_amount: amount,
                    receive_asset: receiveCurrency.toLowerCase(),
                    receive_network: receiveNetwork.chain,
                    expected_receive: expectedReceive,
                    rate_type: orderType,
                    destination: destination.trim(),
                    order_id: orderId,
                    price_amount: expectedReceive,
                    price_currency: 'usd',
                    pay_currency: sendCurrency.toLowerCase(),
                    payout_address: destination.trim(),
                    payout_currency: receiveCurrency.toLowerCase(),
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
                  sendCurrency,
                  sendNetwork: sendNetwork.chain,
                  receiveAmount,
                  receiveCurrency,
                  receiveNetwork: receiveNetwork.chain,
                  destination,
                  orderType,
                  exchangeRate,
                };
                
                localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
                router.push(`/order/${orderId}`);
              } catch (error: any) {
                console.error('Exchange order creation error:', error);
                alert(error.message || 'Failed to create exchange order');
              }
            }}
            disabled={!isDestinationValid || !sendAmount || parseFloat(sendAmount) <= 0 || parseFloat(sendAmount) < MIN_AMOUNT || exchangeRate === null || coinsLoading || !!minAmountError}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
