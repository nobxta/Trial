"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Copy, CheckCircle } from "lucide-react";
import CryptoSelector from "./CryptoSelector";
import { applyFee } from "@/lib/pricing";
import { MIN_AMOUNT_BUFFER } from "@/lib/db-exchange-limits";
import { getDefaultNetwork, Network } from "@/lib/networks";
import { SupportedCrypto, getCryptoById, getNetworkChainFromSupportedCrypto } from "@/lib/supported-cryptos";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

// MIN_AMOUNT is now fetched from NOWPayments API - no hardcoded value

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

export default function ExchangeWidget() {
  const router = useRouter();
  
  // Fetch prices using the new hook
  const { prices, loading: pricesLoading } = useCryptoPrices(true, 20000);
  
  const [sendAmount, setSendAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_sendAmount');
      return saved || "0.1";
    }
    return "0.1";
  });

  // Get initial crypto IDs from localStorage or defaults
  const getInitialSendCryptoId = (): string => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_sendCryptoId');
      if (saved && getCryptoById(saved)) return saved;
    }
    return "btc";
  };

  const getInitialReceiveCryptoId = (): string => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mintmove_receiveCryptoId');
      if (saved && getCryptoById(saved)) return saved;
    }
    return "eth";
  };

  const [sendCryptoId, setSendCryptoId] = useState<string>(getInitialSendCryptoId);
  const [receiveCryptoId, setReceiveCryptoId] = useState<string>(getInitialReceiveCryptoId);
  const [orderType, setOrderType] = useState<"fixed" | "float">("fixed");
  const [destination, setDestination] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [feeSettings, setFeeSettings] = useState<{ fixedFeePercent: number; floatingFeePercent: number }>({
    fixedFeePercent: 1.0,
    floatingFeePercent: 0.5,
  });
  const fixedRateFee = feeSettings.fixedFeePercent;
  const floatRateFee = feeSettings.floatingFeePercent;

  // Exchange limits state
  const [exchangeLimits, setExchangeLimits] = useState<{ min_amount: number; max_amount?: number } | null>(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  
  // Track if user has interacted with the amount input
  const [hasUserTyped, setHasUserTyped] = useState(false);

  // Get crypto objects
  const sendCrypto = useMemo(() => getCryptoById(sendCryptoId), [sendCryptoId]);
  const receiveCrypto = useMemo(() => getCryptoById(receiveCryptoId), [receiveCryptoId]);

  // Convert to Network objects for compatibility
  const sendNetwork = useMemo(() => {
    if (!sendCrypto) return getDefaultNetwork('BTC');
    return cryptoToNetwork(sendCrypto);
  }, [sendCrypto]);

  const receiveNetwork = useMemo(() => {
    if (!receiveCrypto) return getDefaultNetwork('ETH');
    return cryptoToNetwork(receiveCrypto);
  }, [receiveCrypto]);

  // Calculate exchange rate from prices
  useEffect(() => {
    if (!sendCrypto || !receiveCrypto) return;
    
    const sendPrice = prices[sendCrypto.coingeckoId]?.usd;
    const receivePrice = prices[receiveCrypto.coingeckoId]?.usd;
    
    if (sendPrice && receivePrice && sendPrice > 0 && receivePrice > 0) {
      const rate = sendPrice / receivePrice;
      setExchangeRate(rate);
    } else {
      setExchangeRate(null);
    }
  }, [sendCrypto, receiveCrypto, prices]);

  // Fetch exchange fee % from backend
  useEffect(() => {
    let cancelled = false;
    fetch('/api/exchange-fees')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        setFeeSettings({
          fixedFeePercent: typeof data.fixedFeePercent === 'number' ? data.fixedFeePercent : 1.0,
          floatingFeePercent: typeof data.floatingFeePercent === 'number' ? data.floatingFeePercent : 0.5,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
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

  // Fetch exchange limits when pair changes
  useEffect(() => {
    if (!sendCrypto || !receiveCrypto) {
      setExchangeLimits(null);
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
        setLimitsError(error.message || 'Failed to load limits');
        setExchangeLimits(null);
      } finally {
        setLimitsLoading(false);
      }
    };

    fetchLimits();
  }, [sendCrypto, receiveCrypto, orderType]);

  // Format minimum amount for display
  const formatMinAmount = (amount: number): string => {
    if (amount >= 1) {
      return amount.toFixed(4).replace(/\.?0+$/, '');
    } else if (amount >= 0.01) {
      return amount.toFixed(6).replace(/\.?0+$/, '');
    } else {
      return amount.toFixed(8).replace(/\.?0+$/, '');
    }
  };

  // Validation using real limits from NOWPayments
  // Only show errors if user has typed something
  const minAmountError = useMemo(() => {
    // Don't show any error until user has typed something
    if (!hasUserTyped) return null;
    
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) return null;
    
    if (!exchangeLimits) {
      // If limits not loaded yet, don't show error (will be validated on submit)
      return null;
    }
    
    const effectiveMin = exchangeLimits.min_amount * (1 + MIN_AMOUNT_BUFFER);
    if (amount < effectiveMin) {
      return `Minimum amount is ${formatMinAmount(effectiveMin)} ${sendCrypto?.symbol || ''}`;
    }
    
    if (exchangeLimits.max_amount && amount > exchangeLimits.max_amount) {
      return `Maximum amount is ${formatMinAmount(exchangeLimits.max_amount)} ${sendCrypto?.symbol || ''}`;
    }
    
    return null;
  }, [sendAmount, exchangeLimits, sendCrypto, hasUserTyped]);

  const networkFee = useMemo(() => {
    return getNetworkFee(receiveNetwork);
  }, [receiveNetwork]);

  const eta = useMemo(() => {
    return getETA(sendNetwork, receiveNetwork);
  }, [sendNetwork, receiveNetwork]);

  const handleSendSelect = useCallback((crypto: SupportedCrypto) => {
    setSendCryptoId(crypto.id);
    setHasUserTyped(false); // Reset interaction flag when changing currency
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_sendCryptoId', crypto.id);
    }
  }, []);

  const handleReceiveSelect = useCallback((crypto: SupportedCrypto) => {
    setReceiveCryptoId(crypto.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_receiveCryptoId', crypto.id);
    }
  }, []);

  const handleSwap = useCallback(() => {
    const tempCryptoId = sendCryptoId;
    setSendCryptoId(receiveCryptoId);
    setReceiveCryptoId(tempCryptoId);
    setSendAmount(receiveAmount);
    setHasUserTyped(false); // Reset interaction flag on swap
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintmove_sendCryptoId', receiveCryptoId);
      localStorage.setItem('mintmove_receiveCryptoId', tempCryptoId);
    }
  }, [sendCryptoId, receiveCryptoId, receiveAmount]);

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

  // Show loading state if prices are being fetched
  if (pricesLoading && Object.keys(prices).length === 0) {
    return (
      <div className="relative">
        <div className="glass-panel rounded-xl sm:rounded-2xl shadow-2xl shadow-black/50 overflow-visible relative z-10 p-8">
          <div className="text-center text-white">Loading cryptocurrency prices...</div>
        </div>
      </div>
    );
  }

  if (!sendCrypto || !receiveCrypto) {
    return (
      <div className="relative">
        <div className="glass-panel rounded-xl sm:rounded-2xl shadow-2xl shadow-black/50 overflow-visible relative z-10 p-8">
          <div className="text-center text-white">Loading cryptocurrencies...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
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
              {limitsLoading ? (
                <span className="text-neutral-500">Fetching limits...</span>
              ) : exchangeLimits ? (
                <span>
                  Min: {formatMinAmount(exchangeLimits.min_amount * (1 + MIN_AMOUNT_BUFFER))} {sendCrypto.symbol}
                  {exchangeLimits.max_amount && ` • Max: ${formatMinAmount(exchangeLimits.max_amount)} ${sendCrypto.symbol}`}
                </span>
              ) : (
                limitsError ? (
                  <span className="text-red-400">Limits unavailable</span>
                ) : (
                  <span className="text-neutral-500">Limits unavailable</span>
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
                selectedCryptoId={sendCryptoId}
                onSelect={handleSendSelect}
                excludeCryptoId={receiveCryptoId}
                prices={prices}
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
              <CryptoSelector
                selectedCryptoId={receiveCryptoId}
                onSelect={handleReceiveSelect}
                excludeCryptoId={sendCryptoId}
                prices={prices}
              />
            </div>
          </div>

          {/* Destination Address */}
          <div className="pt-1 sm:pt-2">
            <label className="block text-[10px] sm:text-xs text-neutral-400 mb-1.5 sm:mb-2">
              Your {receiveCrypto.symbol} Address
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
                  <>1 {sendCrypto.symbol} ≈ {exchangeRate.toFixed(6)} {receiveCrypto.symbol}</>
                ) : (
                  <span className="text-neutral-500">Calculating...</span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-neutral-500" title="Estimated by network; may vary">Network Fee (est.)</span>
              <span className="text-neutral-300">~ ${networkFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-neutral-500" title="Estimated time; actual time depends on confirmations">ETA (est.)</span>
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
                
                // Use the id field for NOWPayments compatibility
                const response = await fetch('/api/payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: "exchange",
                    send_asset: sendCrypto.id, // Use id field for NOWPayments
                    send_network: sendNetwork.chain,
                    send_amount: amount,
                    receive_asset: receiveCrypto.id, // Use id field for NOWPayments
                    receive_network: receiveNetwork.chain,
                    expected_receive: expectedReceive,
                    rate_type: orderType === 'float' ? 'floating' : 'fixed',
                    destination: destination.trim(),
                    order_id: orderId,
                    price_amount: expectedReceive,
                    price_currency: 'usd',
                    pay_currency: sendCrypto.id, // Use id field for NOWPayments
                    payout_address: destination.trim(),
                    payout_currency: receiveCrypto.id, // Use id field for NOWPayments
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
                  sendCurrency: sendCrypto.symbol,
                  sendCryptoId: sendCrypto.id,
                  sendNetwork: sendNetwork.chain,
                  receiveAmount,
                  receiveCurrency: receiveCrypto.symbol,
                  receiveCryptoId: receiveCrypto.id,
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
            disabled={
              !isDestinationValid || 
              !sendAmount || 
              parseFloat(sendAmount) <= 0 || 
              !!minAmountError || 
              exchangeRate === null || 
              pricesLoading || 
              limitsLoading ||
              (!exchangeLimits && !limitsError) // Disable if limits not loaded yet (unless there's an error)
            }
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

