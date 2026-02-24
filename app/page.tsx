import Header from "@/components/Header";
import ExchangeWidget from "@/components/ExchangeWidget";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import ProtectedBackground from "@/components/ProtectedBackground";
import RecentTransactions from "@/components/RecentTransactions";
import NewsSection from "@/components/NewsSection";
import GuidesSection from "@/components/GuidesSection";
import { getBlogPostsByCategory } from "@/lib/blog";
import Image from "next/image";
import { Suspense } from "react";

export default function Home() {
  const newsPosts = getBlogPostsByCategory("news").slice(0, 5);
  const guidePosts = getBlogPostsByCategory("guides").slice(0, 4);
  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200 relative overflow-hidden">
      <ScrollFadeIn />
      <div className="relative z-10">
        <Header />

        <main className="flex-grow relative overflow-hidden">
          {/* Unified Hero + Trusted block: shared space aesthetic, no hard break */}
          <div className="relative">
            {/* Shared star field – spans hero and trusted for continuous flow */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{ minHeight: "140vh" }} aria-hidden>
              {[
                3, 8, 14, 22, 31, 39, 47, 55, 63, 71, 79, 88, 96, 11, 28, 45, 62, 84, 17, 34, 51, 68, 86,
                5, 19, 36, 52, 69, 91, 12, 29, 46, 64, 81, 2, 24, 41, 58, 73, 94, 9, 33, 57, 76, 93,
              ].map((left, i) => {
                const top = (left * 11 + i * 13) % 100;
                const opacity = 0.2 + (i % 4) * 0.15;
                return (
                  <div
                    key={i}
                    className="absolute w-0.5 h-0.5 rounded-full bg-white animate-pulse"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      opacity,
                      animationDuration: `${3 + (i % 4)}s`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                );
              })}
            </div>

            {/* Hero Section – no bottom border; fades into next */}
            <section className="relative px-4 pt-20 sm:pt-24 pb-20 sm:pb-28 bg-[#050505] overflow-visible">
              <ProtectedBackground
                backgroundImage="/images/outer-space-background-with-planets-and-stars-free-vector.jpg"
                opacity={1}
                zIndex={1}
              />
              <div className="absolute inset-0 bg-[#050505]/90 z-[2]" aria-hidden />
              {/* Bottom gradient fade – hero color into trusted section color */}
              <div
                className="absolute bottom-0 left-0 right-0 h-48 sm:h-56 z-[2] pointer-events-none"
                style={{
                  background: "linear-gradient(to top, #0a0a12 0%, #0a0a12 30%, transparent 100%)",
                }}
                aria-hidden
              />
              {/* Shared glow at junction – extends into Trusted section */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[min(100%,640px)] h-72 rounded-full blur-[120px] pointer-events-none z-[3] opacity-50 animate-pulse-glow"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(59,130,246,0.28) 0%, rgba(88,28,135,0.14) 45%, transparent 70%)",
                }}
                aria-hidden
              />

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

            {/* Transition: curved wave + glass haze – no hard line; subtle motion */}
            <div className="relative h-20 sm:h-24 -mt-12 sm:-mt-16 z-10 pointer-events-none animate-float opacity-95" style={{ animationDuration: "45s" }} aria-hidden>
              <svg
                viewBox="0 0 1440 120"
                className="absolute inset-0 w-full h-full object-cover"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="hero-trusted-wave" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0a0a12" stopOpacity="0" />
                    <stop offset="40%" stopColor="#0a0a12" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0a0a12" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 Q360,20 720,80 T1440,80 L1440,120 L0,120 Z"
                  fill="url(#hero-trusted-wave)"
                />
              </svg>
              <div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent"
                aria-hidden
              />
            </div>

            {/* Trusted since 2018 – overlaps up; same design system */}
            <section
              className="relative -mt-8 sm:-mt-12 pt-14 sm:pt-20 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 overflow-hidden"
              aria-label="Trusted since 2018 – benefits"
              style={{
                background: "linear-gradient(to bottom, transparent 0%, #0a0a12 8%, #0a0a12 100%)",
              }}
            >
              {/* Subtle floating haze at top */}
              <div
                className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none z-0"
                aria-hidden
              />
              <div className="max-w-6xl mx-auto relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-10 sm:mb-14 scroll-fade-in">
                Trusted since 2018
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                {/* Card 1: image IS the card + bottom gradient + text overlay */}
                <div
                  className="scroll-fade-in group relative h-[320px] sm:h-[340px] rounded-[14px] overflow-hidden border border-white/[0.12] bg-[#0a0a12] transition-all duration-300 hover:-translate-y-2 hover:border-white/20 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.08)]"
                  style={{ animationDelay: "0s" }}
                >
                  <Image
                    src="/images/trust-save-time.png"
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A12] via-[#0A0A12]/60 to-transparent pointer-events-none" aria-hidden />
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex flex-col justify-end text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">Save time</h3>
                    <p className="text-sm text-white/80 leading-relaxed">
                      Maximum exchange speed due to the full automation
                    </p>
                  </div>
                </div>
                {/* Card 2 */}
                <div
                  className="scroll-fade-in group relative h-[320px] sm:h-[340px] rounded-[14px] overflow-hidden border border-white/[0.12] bg-[#0a0a12] transition-all duration-300 hover:-translate-y-2 hover:border-white/20 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.08)]"
                  style={{ animationDelay: "0.1s" }}
                >
                  <Image
                    src="/images/trust-make-exchange.png"
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A12] via-[#0A0A12]/60 to-transparent pointer-events-none" aria-hidden />
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex flex-col justify-end text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">Make an exchange</h3>
                    <p className="text-sm text-white/80 leading-relaxed">
                      Pick the right strategy and make favourable trades
                    </p>
                  </div>
                </div>
                {/* Card 3 */}
                <div
                  className="scroll-fade-in group relative h-[320px] sm:h-[340px] rounded-[14px] overflow-hidden border border-white/[0.12] bg-[#0a0a12] transition-all duration-300 hover:-translate-y-2 hover:border-white/20 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.08)]"
                  style={{ animationDelay: "0.2s" }}
                >
                  <Image
                    src="/images/trust-save-money.png"
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A12] via-[#0A0A12]/60 to-transparent pointer-events-none" aria-hidden />
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex flex-col justify-end text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">Save money</h3>
                    <p className="text-sm text-white/80 leading-relaxed">
                      Best exchange rates and minimum commissions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
          </div>

          {/* Recent Transactions Section - space theme */}
          <section className="relative py-8 sm:py-12 md:py-16 px-4 bg-[#0a0a12] border-t border-white/5 overflow-hidden">
            <ProtectedBackground
              backgroundImage="/images/outer-space-background-with-planets-and-stars-free-vector.jpg"
              opacity={0.25}
              zIndex={0}
            />
            {/* Small star decorations around title */}
            <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
              {[12, 28, 45, 78, 88, 15, 52, 65, 92, 8, 35, 72].map((left, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-white/60"
                  style={{
                    left: `${left}%`,
                    top: `${(left * 3 + i * 7) % 24}%`,
                    opacity: 0.4 + (i % 3) * 0.2,
                  }}
                />
              ))}
            </div>
            <div className="max-w-6xl mx-auto relative z-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-6 sm:mb-8 scroll-fade-in text-center">
                Recent transactions
              </h2>
              <div className="relative">
                <RecentTransactions />
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#0A0F18] border-t border-white/5 overflow-hidden">
            {/* Starry dots background - fixed positions for stable layout */}
            <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
              <div className="absolute inset-0 opacity-60">
                {[
                  5, 12, 18, 25, 33, 41, 48, 55, 62, 70, 78, 85, 92, 8, 22, 37,
                  52, 67, 82, 15, 30, 45, 60, 75, 90, 3, 28, 53, 72, 97, 11, 36,
                  61, 86, 19, 44, 69, 94, 7, 24, 51, 76, 14, 39, 64, 89, 21, 46,
                  71, 96, 9, 34, 59, 84, 17, 42, 67, 92, 2, 27, 52, 77, 13, 38,
                  63, 88, 23, 48, 73, 98, 6, 31, 56, 81, 16, 41, 66, 91,
                ].map((left, i) => {
                  const top = (left * 7 + i * 11) % 100;
                  const opacity = 0.25 + (i % 5) * 0.12;
                  return (
                    <div
                      key={i}
                      className="absolute w-0.5 h-0.5 rounded-full bg-white"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        opacity,
                      }}
                    />
                  );
                })}
              </div>
            </div>
            {/* Top-right decorative blob */}
            <div
              className="absolute -top-24 -right-24 w-80 h-80 sm:w-96 sm:h-96 rounded-full opacity-20 z-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            <div className="max-w-4xl mx-auto relative z-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-8 sm:mb-10 scroll-fade-in">
                FAQ
              </h2>
              <div className="relative">
                <FAQ />
              </div>
            </div>
          </section>

          {/* News Section - posts from /blog */}
          <NewsSection posts={newsPosts} />

          {/* Guides Section - posts from /blog */}
          <GuidesSection posts={guidePosts} />
        </main>

        <Footer />
      </div>
    </div>
  );
}
