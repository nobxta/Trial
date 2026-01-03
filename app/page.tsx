import Header from "@/components/Header";
import ExchangeWidget from "@/components/ExchangeWidget";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import ProtectedBackground from "@/components/ProtectedBackground";
import RecentTransactions from "@/components/RecentTransactions";
import { Zap, Lock, TrendingUp, CheckCircle } from "lucide-react";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200 relative overflow-hidden">
      <ScrollFadeIn />
      <div className="relative z-10">
        <Header />
        
        <main className="flex-grow relative overflow-hidden">
          {/* Hero Section - Above the Fold */}
          <section className="relative px-4 pt-20 sm:pt-24 pb-8 sm:pb-12 bg-[#050505] overflow-hidden">
            <ProtectedBackground
              backgroundImage="/images/outer-space-background-with-planets-and-stars-free-vector.jpg"
              opacity={0.60}
              zIndex={1}
            />
            <div className="absolute inset-0 bg-[#050505]/90 z-[2]"></div>
            
            <div className="max-w-4xl mx-auto relative z-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-2 sm:mb-3">
                Lightning-fast cryptocurrency exchange
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 text-center mb-6 sm:mb-8">
                Instant swaps. Best rates. No registration required.
              </p>
              
              <div className="w-full">
                <Suspense fallback={<div className="h-[600px] flex items-center justify-center"><div className="text-neutral-400">Loading exchange...</div></div>}>
                  <ExchangeWidget />
                </Suspense>
              </div>
            </div>
          </section>

          {/* Trust Badge Row - Blank with Animation */}
          <section className="relative px-4 py-6 sm:py-8 bg-[#000000] border-y border-white/5 overflow-hidden">
            {/* Animated Elements */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
              <div className="absolute top-3/4 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl animate-float"></div>
              <svg className="absolute top-1/3 right-1/3 w-20 h-20 text-blue-500/20 animate-rotate-slow" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
                <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.4"/>
              </svg>
            </div>
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="scroll-fade-in flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Trusted since 2018</span>
                </div>
                <div className="w-px h-4 bg-white/10"></div>
                <div className="flex items-center gap-2 text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>99.9% Uptime</span>
                </div>
                <div className="w-px h-4 bg-white/10"></div>
                <div className="flex items-center gap-2 text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>No KYC Required</span>
                </div>
              </div>
            </div>
          </section>

          {/* 3 Key Benefits */}
          <section className="relative py-8 sm:py-12 md:py-16 px-4 bg-[#000000]">
            <ProtectedBackground
              backgroundImage="/images/istockphoto-1197202388-612x612.jpg"
              opacity={0.05}
              zIndex={0}
            />
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="scroll-fade-in glass-panel border border-white/5 rounded-xl p-4 sm:p-6" style={{ animationDelay: '0s' }}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-blue-400 mb-3 sm:mb-4">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Lightning Speed</h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    Process transactions in seconds. Fully automated system with no manual delays.
                  </p>
                </div>
                <div className="scroll-fade-in glass-panel border border-white/5 rounded-xl p-4 sm:p-6" style={{ animationDelay: '0.1s' }}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-green-400 mb-3 sm:mb-4">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Best Rates</h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    Competitive exchange rates with transparent pricing. No hidden fees or surprises.
                  </p>
                </div>
                <div className="scroll-fade-in glass-panel border border-white/5 rounded-xl p-4 sm:p-6 sm:col-span-2 lg:col-span-1" style={{ animationDelay: '0.2s' }}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400 mb-3 sm:mb-4">
                    <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Complete Privacy</h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    No registration. No KYC. Your funds stay in your control throughout the exchange.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Live Stats / Proof - Blank with Animation */}
          <section className="relative py-8 sm:py-12 md:py-16 px-4 bg-[#000000] border-t border-white/5 overflow-hidden">
            {/* Animated Elements */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="absolute top-1/3 left-1/3 w-36 h-36 bg-green-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-1/4 right-1/3 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }}></div>
              <svg className="absolute top-1/2 left-1/4 w-16 h-16 text-green-500/20 animate-rotate-slow" style={{ animationDirection: 'reverse' }} viewBox="0 0 100 100">
                <polygon points="50,10 61,35 88,35 68,52 79,77 50,60 21,77 32,52 12,35 39,35" fill="currentColor" opacity="0.3"/>
              </svg>
              <svg className="absolute bottom-1/3 right-1/4 w-24 h-24 text-cyan-500/15 animate-float" viewBox="0 0 100 100">
                <rect x="25" y="25" width="50" height="50" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" transform="rotate(45 50 50)"/>
                <circle cx="50" cy="50" r="15" fill="currentColor" opacity="0.2"/>
              </svg>
            </div>
            <div className="max-w-7xl mx-auto relative z-10">
              <div className="scroll-fade-in grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">$4.2B+</p>
                  <p className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-wider">Volume</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">0.5s</p>
                  <p className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-wider">Avg Time</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">2M+</p>
                  <p className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-wider">Users</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">500+</p>
                  <p className="text-[10px] sm:text-xs text-neutral-400 uppercase tracking-wider">Assets</p>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Transactions Section */}
          <section className="relative py-8 sm:py-12 md:py-16 px-4 bg-[#000000] border-t border-white/5 overflow-hidden">
            <ProtectedBackground
              backgroundImage="/images/istockphoto-1197202388-612x612.jpg"
              opacity={0.03}
              zIndex={0}
            />
            <div className="max-w-6xl mx-auto relative z-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-6 sm:mb-8 scroll-fade-in">
                Recent Transactions
              </h2>
              <div className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
                <RecentTransactions />
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="relative py-12 sm:py-16 md:py-20 px-4 bg-[#000000] border-t border-white/5">
            <ProtectedBackground
              backgroundImage="/images/space-background-with-planet-landscape-and-stars-free-vector.jpg"
              opacity={0.05}
              zIndex={0}
            />
            <div className="max-w-4xl mx-auto relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-8 sm:mb-12 scroll-fade-in">
                Frequently Asked Questions
              </h2>
              <div className="glass-panel rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-white/10">
                <FAQ />
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
