"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState, useMemo } from "react";
import { ThumbsUp, Shield, Clock, Search, X, ChevronDown } from "lucide-react";
import CryptoIcon from "@/components/CryptoIcon";
import { getEnabledCryptos, SupportedCrypto } from "@/lib/supported-cryptos";
import BlurTextAnimation from "@/components/ui/blur-text-animation";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

// Priority order for network selection (prefer main networks)
const networkPriority: Record<string, number> = {
  'Bitcoin': 1,
  'Ethereum': 1,
  'Solana': 1,
  'BNB Smart Chain': 2,
  'Cardano': 1,
  'Dogecoin': 1,
  'Litecoin': 1,
  'Ripple': 1,
  'Polygon': 1,
  'Polkadot': 1,
  'Avalanche C-Chain': 1,
  'Toncoin': 1,
  'Aptos': 1,
  'Arbitrum': 2,
  'Base': 2,
  'Tron': 2,
  'ERC20': 3,
  'TRC20': 3,
  'BSC': 3,
};

// Popular/Featured cryptocurrencies (top 6)
const POPULAR_SYMBOLS = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'BNB'];

// Group cryptocurrencies by symbol
interface GroupedCrypto {
  symbol: string;
  name: string;
  networks: SupportedCrypto[];
  primaryNetwork: SupportedCrypto; // The main/preferred network
}

function groupCryptosBySymbol(): GroupedCrypto[] {
  const allCryptos = getEnabledCryptos();
  const grouped = new Map<string, SupportedCrypto[]>();

  // Group by symbol
  allCryptos.forEach(crypto => {
    const symbol = crypto.symbol.toUpperCase();
    if (!grouped.has(symbol)) {
      grouped.set(symbol, []);
    }
    grouped.get(symbol)!.push(crypto);
  });

  // Convert to array and select primary network
  const result: GroupedCrypto[] = [];
  grouped.forEach((networks, symbol) => {
    // Sort networks by priority
    networks.sort((a, b) => {
      const aPriority = networkPriority[a.network] || 999;
      const bPriority = networkPriority[b.network] || 999;
      return aPriority - bPriority;
    });

    result.push({
      symbol,
      name: networks[0].name,
      networks,
      primaryNetwork: networks[0],
    });
  });

  // Sort: Popular first, then alphabetically
  return result.sort((a, b) => {
    const aPopular = POPULAR_SYMBOLS.indexOf(a.symbol);
    const bPopular = POPULAR_SYMBOLS.indexOf(b.symbol);
    
    if (aPopular !== -1 && bPopular !== -1) {
      return aPopular - bPopular;
    }
    if (aPopular !== -1) return -1;
    if (bPopular !== -1) return 1;
    
    return a.symbol.localeCompare(b.symbol);
  });
}

function StaticStars() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const starArray: Star[] = [];
    for (let i = 0; i < 60; i++) {
      starArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }
    setStars(starArray);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.6)`,
          }}
        />
      ))}
    </div>
  );
}

export default function AboutPage() {
  const groupedCryptos = useMemo(() => groupCryptosBySymbol(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Category definitions (static)
  const categoryDefinitions = useMemo(() => {
    const layer1 = ["BTC", "ETH", "SOL", "ADA", "DOT", "AVAX", "ATOM", "NEAR", "APT", "SUI", "TON"];
    const defi = ["AAVE", "UNI", "LINK", "1INCH"];
    const stablecoins = ["USDT", "USDC", "TUSD", "PYUSD"];
    const memes = ["DOGE", "SHIB", "PEPE", "FLOKI", "BABYDOGE"];
    
    return [
      { id: "all", label: "All", symbols: null },
      { id: "layer1", label: "Layer 1", symbols: layer1 },
      { id: "defi", label: "DeFi", symbols: defi },
      { id: "stablecoins", label: "Stablecoins", symbols: stablecoins },
      { id: "memes", label: "Memes", symbols: memes },
    ];
  }, []);

  // Get unique networks for filter
  const allNetworks = useMemo(() => {
    const networks = new Set<string>();
    groupedCryptos.forEach(group => {
      group.networks.forEach(network => {
        networks.add(network.network);
      });
    });
    return Array.from(networks).sort();
  }, [groupedCryptos]);

  // Filter and search
  const filteredCryptos = useMemo(() => {
    return groupedCryptos.filter(group => {
      // Search filter
      const matchesSearch = 
        group.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Network filter
      if (selectedNetwork !== "all") {
        const hasNetwork = group.networks.some(network => network.network === selectedNetwork);
        if (!hasNetwork) return false;
      }

      // Category filter
      if (selectedCategory !== "all") {
        const category = categoryDefinitions.find(c => c.id === selectedCategory);
        if (category && category.symbols) {
          if (!category.symbols.includes(group.symbol)) return false;
        }
      }
      
      return true;
    });
  }, [groupedCryptos, searchQuery, selectedNetwork, selectedCategory, categoryDefinitions]);

  const popularCryptos = useMemo(() => {
    const set = new Set(POPULAR_SYMBOLS);
    return filteredCryptos.filter((c) => set.has(c.symbol));
  }, [filteredCryptos]);

  const otherCryptos = useMemo(() => {
    const set = new Set(POPULAR_SYMBOLS);
    return filteredCryptos.filter((c) => !set.has(c.symbol));
  }, [filteredCryptos]);

  // Category definitions with dynamic counts
  const categories = useMemo(() => {
    return categoryDefinitions.map(cat => ({
      ...cat,
      count: cat.symbols 
        ? filteredCryptos.filter(c => cat.symbols!.includes(c.symbol)).length
        : filteredCryptos.length
    }));
  }, [categoryDefinitions, filteredCryptos]);


  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200">
      <StaticStars />
      <Header />

      <main className="relative z-10 pt-24 pb-12 px-4">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* About Us Section */}
        <section className="w-full py-16 sm:py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 sm:mb-8">
                About us
              </h1>
              <div className="w-full">
                <BlurTextAnimation
                  text="Cryptocurrencies open new opportunities for achieving financial freedom. The bigger the user base, the greater the competitive advantages that emerging distributed ledger technologies provide. MintMove gives you the tools to make full use of your digital assets through an easy and accessible exchange platform. We believe in the transformative power of blockchain technology and its ability to democratize financial services. Our platform is designed with security, speed, and user experience at its core, ensuring that both beginners and experienced traders can navigate the crypto world with confidence. Whether you're looking to exchange major cryptocurrencies or explore emerging tokens, MintMove provides a seamless and transparent process. We continuously work to expand our supported networks and currencies, staying ahead of the curve in the rapidly evolving digital asset landscape. Join thousands of users who trust MintMove for their cryptocurrency exchange needs and experience the future of digital finance today."
                  className="min-h-[200px]"
                  fontSize="text-base sm:text-lg md:text-xl"
                  fontFamily="font-sans"
                  textColor="text-neutral-400"
                  animationDelay={4000}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Advantages Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            <div className="bg-white/[0.02] rounded-xl p-6 sm:p-8 border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 sm:mb-6">
                <ThumbsUp className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                Ease of exchange
              </h3>
              <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
                The maximum ease of making an exchange and the ability to choose a strategy will allow you to make a profitable exchange.
              </p>
            </div>

            <div className="bg-white/[0.02] rounded-xl p-6 sm:p-8 border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 sm:mb-6">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                Secure exchange
              </h3>
              <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
                We provide a secure exchange. You do not risk anything and you can immediately see the size of the commission.
              </p>
            </div>

            <div className="bg-white/[0.02] rounded-xl p-6 sm:p-8 border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 sm:mb-6">
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                Maximum speed
              </h3>
              <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
                You can make automatic exchange with maximum speed on any devices.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="relative w-full py-16 sm:py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center">
              <div className="relative w-full max-w-[500px] sm:max-w-[600px] md:max-w-[700px] aspect-square">
                {/* Circular container with shader background inside */}
                <div className="absolute inset-0 rounded-full bg-white/[0.02] border border-white/10 p-6 sm:p-8 md:p-12 shadow-2xl overflow-hidden">
                  {/* Shader Background - Only inside the circle */}
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    {/* Animated gradient orbs matching codebase style */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/15 rounded-full blur-[80px] animate-pulse"></div>
                    <div className="absolute top-1/3 right-1/4 w-3/4 h-3/4 bg-purple-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '4s' }}></div>
                    <div className="absolute bottom-1/4 left-1/3 w-2/3 h-2/3 bg-blue-400/10 rounded-full blur-[50px] animate-pulse" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
                    {/* Gradient overlay matching codebase colors */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-blue-500/5"></div>
                  </div>
                  
                  {/* Animated gradient border glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 blur-xl opacity-50 animate-pulse"></div>
                  
                  {/* Inner star field */}
                  <div className="absolute inset-6 sm:inset-8 md:inset-12 rounded-full overflow-hidden">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          width: `${0.5 + Math.random() * 1}px`,
                          height: `${0.5 + Math.random() * 1}px`,
                          opacity: 0.4 + Math.random() * 0.4,
                        }}
                      />
                    ))}
                  </div>

                  {/* Content inside circle - centered */}
                  <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 md:p-8">
                    {/* Robotic hands illustration */}
                    <div className="mb-4 sm:mb-6 md:mb-8">
                      <svg
                        viewBox="0 0 200 200"
                        className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48"
                      >
                        {/* Left hand */}
                        <g transform="translate(40, 80)">
                          <rect
                            x="0"
                            y="0"
                            width="30"
                            height="50"
                            rx="15"
                            fill="rgba(59, 130, 246, 0.3)"
                            stroke="rgba(59, 130, 246, 0.6)"
                            strokeWidth="2"
                          />
                          <rect
                            x="5"
                            y="5"
                            width="8"
                            height="15"
                            rx="4"
                            fill="rgba(59, 130, 246, 0.5)"
                          />
                          <rect
                            x="17"
                            y="5"
                            width="8"
                            height="15"
                            rx="4"
                            fill="rgba(59, 130, 246, 0.5)"
                          />
                          <rect
                            x="11"
                            y="25"
                            width="8"
                            height="20"
                            rx="4"
                            fill="rgba(59, 130, 246, 0.5)"
                          />
                        </g>

                        {/* Central exchange icon */}
                        <circle
                          cx="100"
                          cy="100"
                          r="35"
                          fill="rgba(59, 130, 246, 0.2)"
                          stroke="rgba(59, 130, 246, 0.8)"
                          strokeWidth="3"
                        />
                        <path
                          d="M 100 85 L 100 115 M 85 100 L 115 100"
                          stroke="rgba(59, 130, 246, 1)"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <circle cx="100" cy="100" r="8" fill="rgba(59, 130, 246, 1)" />

                        {/* Right hand */}
                        <g transform="translate(130, 80)">
                          <rect
                            x="0"
                            y="0"
                            width="30"
                            height="50"
                            rx="15"
                            fill="rgba(59, 130, 246, 0.3)"
                            stroke="rgba(59, 130, 246, 0.6)"
                            strokeWidth="2"
                          />
                          <rect
                            x="5"
                            y="5"
                            width="8"
                            height="15"
                            rx="4"
                            fill="rgba(59, 130, 246, 0.5)"
                          />
                          <rect
                            x="17"
                            y="5"
                            width="8"
                            height="15"
                            rx="4"
                            fill="rgba(59, 130, 246, 0.5)"
                          />
                          <rect
                            x="11"
                            y="25"
                            width="8"
                            height="20"
                            rx="4"
                            fill="rgba(59, 130, 246, 0.5)"
                          />
                        </g>
                      </svg>
                    </div>

                    {/* Mission heading and text inside circle */}
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 md:mb-6">
                      Mission
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-neutral-400 leading-relaxed max-w-[280px] sm:max-w-[320px] md:max-w-md mx-auto px-2 sm:px-4">
                      We are long-term players with a vision and want to become your reliable and trusted partners 
                      in the world of digital assets. Our mission is to simplify the process of exchange through 
                      practical and scalable solutions that make the crypto economy work for you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Currencies Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="mb-12">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 text-center sm:text-left">
                  Supported currencies
                </h2>
                <p className="text-neutral-400 text-sm sm:text-base max-w-2xl mb-8">
                  We support a wide range of cryptocurrencies and networks. Choose from popular coins and tokens across multiple blockchains.
                </p>
              </div>

              {/* Compact search icon (top-right) */}
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen((v) => !v)}
                  className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>

                {isSearchOpen && (
                  <div className="absolute right-0 mt-3 w-[260px] sm:w-[320px] rounded-2xl border border-white/10 bg-[#0b0b0b]/90 backdrop-blur-xl shadow-2xl p-3 z-20">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search the coin"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/30 transition-all"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-neutral-500">
                        {filteredCryptos.length} result{filteredCryptos.length === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSearchOpen(false)}
                        className="text-xs text-neutral-400 hover:text-white transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Glassmorphism Toolbar */}
            <div className="glass-panel rounded-2xl p-6 mb-8 border border-white/10 backdrop-blur-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {categories.map((category) => {
                    const isActive = selectedCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                            : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-neutral-300 hover:border-white/20'
                        }`}
                      >
                        {category.label}
                        {category.count !== undefined && (
                          <span className="ml-2 text-xs opacity-70">({category.count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Network dropdown */}
                <div className="w-full lg:w-64">
                  <div className="relative">
                    <select
                      value={selectedNetwork}
                      onChange={(e) => setSelectedNetwork(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/30 transition-all"
                    >
                      <option value="all">All networks</option>
                      {allNetworks.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Results Count */}
            {filteredCryptos.length > 0 && (
              <p className="text-sm text-neutral-400 mb-6">
                Showing {filteredCryptos.length} {filteredCryptos.length === 1 ? 'currency' : 'currencies'}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            )}
          </div>

          {/* Card Grid Layout (7 per row on xl) */}
          <div className="space-y-10">
            {/* Popular */}
            {popularCryptos.length > 0 && (
              <div>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white">Popular coins</h3>
                    <p className="text-sm text-neutral-500 mt-1">Quick picks.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:gap-4">
                  {popularCryptos.map((group) => {
                    const displayNetwork = group.primaryNetwork;

                    return (
                      <div
                        key={`popular-${group.symbol}`}
                        className="group relative rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:bg-white/[0.04] hover:border-blue-500/30 hover:shadow-[0_22px_70px_rgba(0,0,0,0.45)]"
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="absolute -inset-10 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10 blur-2xl" />
                        </div>

                        <div className="relative p-3.5 h-[96px] flex flex-col items-center justify-center">
                          <CryptoIcon
                            symbol={displayNetwork.symbol}
                            imageUrl={displayNetwork.imageUrl}
                            className="w-9 h-9 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                          />
                          <div className="mt-2 text-[11px] font-medium text-neutral-200 text-center leading-tight truncate w-full px-1">
                            {group.name}{" "}
                            <span className="text-neutral-500">({group.symbol})</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All assets */}
            <div>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">All assets</h3>
                  <p className="text-sm text-neutral-500 mt-1">Browse everything we support.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:gap-4">
                {otherCryptos.map((group) => {
                  const displayNetwork = group.primaryNetwork;

                  return (
                    <div
                      key={`all-${group.symbol}`}
                      className="group relative rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:bg-white/[0.04] hover:border-blue-500/30 hover:shadow-[0_22px_70px_rgba(0,0,0,0.45)]"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute -inset-10 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10 blur-2xl" />
                      </div>

                      <div className="relative p-3.5 h-[96px] flex flex-col items-center justify-center">
                        <CryptoIcon
                          symbol={displayNetwork.symbol}
                          imageUrl={displayNetwork.imageUrl}
                          className="w-9 h-9 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                        />
                        <div className="mt-2 text-[11px] font-medium text-neutral-200 text-center leading-tight truncate w-full px-1">
                          {group.name}{" "}
                          <span className="text-neutral-500">({group.symbol})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>


          {/* No Results */}
          {filteredCryptos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400 text-lg mb-2">No currencies found</p>
              <p className="text-neutral-500 text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

