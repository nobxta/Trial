"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState, useMemo } from "react";
import { ThumbsUp, Shield, Clock, ArrowUp } from "lucide-react";
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

// Get unique cryptocurrencies by symbol (preferring main networks)
function getUniqueCryptos(): SupportedCrypto[] {
  const allCryptos = getEnabledCryptos();
  const cryptoMap = new Map<string, SupportedCrypto>();

  allCryptos.forEach(crypto => {
    const symbol = crypto.symbol.toUpperCase();
    const existing = cryptoMap.get(symbol);
    
    if (!existing) {
      cryptoMap.set(symbol, crypto);
    } else {
      // Prefer main network versions
      const existingPriority = networkPriority[existing.network] || 999;
      const currentPriority = networkPriority[crypto.network] || 999;
      
      if (currentPriority < existingPriority) {
        cryptoMap.set(symbol, crypto);
      }
    }
  });

  // Sort by symbol for consistent display
  return Array.from(cryptoMap.values()).sort((a, b) => 
    a.symbol.localeCompare(b.symbol)
  );
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
  const supportedCurrencies = useMemo(() => getUniqueCryptos(), []);

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
          <div className="mb-12 sm:mb-16">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 text-center sm:text-left">
              Supported currencies
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base max-w-2xl">
              We support a wide range of cryptocurrencies and networks. Choose from popular coins and tokens across multiple blockchains.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {supportedCurrencies.map((currency, index) => (
              <div
                key={currency.id}
                className="group relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-xl p-4 sm:p-5 border border-white/5 hover:border-white/20 hover:from-white/[0.05] hover:to-white/[0.02] transition-all duration-300 cursor-default overflow-hidden"
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/5 transition-all duration-500 rounded-xl opacity-0 group-hover:opacity-100" />
                
                {/* Content */}
                <div className="relative flex flex-col items-center justify-center space-y-3">
                  {/* Icon container with glow effect */}
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CryptoIcon 
                      symbol={currency.symbol} 
                      imageUrl={currency.imageUrl}
                      className="w-full h-full relative z-10 group-hover:scale-110 transition-transform duration-300" 
                    />
                  </div>
                  
                  {/* Name and network */}
                  <div className="text-center w-full">
                    <div className="text-xs sm:text-sm font-semibold text-white mb-0.5 group-hover:text-blue-300 transition-colors duration-200">
                      {currency.name}
                    </div>
                    <div className="text-[10px] sm:text-xs text-neutral-500 font-medium">
                      {currency.symbol}
                    </div>
                    {currency.networkCode && currency.networkCode.toUpperCase() !== currency.symbol.toUpperCase() && (
                      <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-neutral-400">
                        {currency.networkCode}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

