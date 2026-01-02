"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";
import {
  Building2,
  ArrowLeftRight,
  Package,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  Rocket,
  Wallet,
  Search,
  RefreshCw,
  XCircle,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "about-mintmove",
    title: "About MintMove",
    icon: Building2,
    items: [
      {
        id: "what-is-mintmove",
        question: "What is MintMove?",
        answer:
          "MintMove is a professional cryptocurrency exchange platform that enables fast, secure, and transparent digital asset exchanges. We provide an automated exchange service that allows users to swap cryptocurrencies without registration, KYC, or lengthy verification processes. Our platform uses smart contracts and blockchain technology to ensure secure and transparent transactions.",
        icon: HelpCircle,
      },
      {
        id: "why-smartest-way",
        question: "Why MintMove is the smartest way to exchange cryptocurrency?",
        answer:
          "MintMove offers several advantages: instant exchanges without registration, competitive rates with transparent fees, support for 100+ cryptocurrencies, automated processing for maximum speed, and enhanced security through blockchain technology. Our platform combines ease of use with professional-grade security, making it the smart choice for both beginners and experienced traders.",
        icon: Sparkles,
      },
      {
        id: "why-trust",
        question: "Why should I trust MintMove?",
        answer:
          "MintMove has been operating since 2018 with thousands of successful transactions. We use automated smart contracts and blockchain technology to ensure secure, transparent exchanges. All transactions are publicly verifiable on the blockchain. We don't store your funds - exchanges are processed automatically through secure protocols. Our platform has a proven track record of reliability and security.",
        icon: Shield,
      },
      {
        id: "how-does-it-work",
        question: "How does it work?",
        answer:
          "The process is simple: 1) Select the cryptocurrencies you want to exchange, 2) Enter the amount and choose between fixed or float rates, 3) Provide your wallet address for receiving funds, 4) Send the payment to our address, 5) Our automated system processes the exchange, 6) You receive your funds in the specified cryptocurrency. The entire process is automated and typically completes within minutes.",
        icon: Zap,
      },
    ],
  },
  {
    id: "about-exchange",
    title: "About exchange",
    icon: ArrowLeftRight,
    items: [
      {
        id: "fixed-vs-float",
        question: "What is the difference between a fixed and a float rates?",
        answer:
          "Fixed rate locks in the exchange rate at the time of order creation, protecting you from market volatility. The rate is guaranteed for the duration of the order. Float rate uses the current market rate at the time of exchange processing, which may result in a better or worse rate depending on market movements. Fixed rate has a 1.0% fee, while float rate has a 0.5% fee. Choose fixed for predictability, or float for potentially better rates if you're comfortable with market fluctuations.",
        icon: TrendingUp,
      },
      {
        id: "fees",
        question: "What are MintMove fees?",
        answer:
          "MintMove charges transparent fees based on your rate selection: Fixed rate exchanges have a 1.0% fee, while Float rate exchanges have a 0.5% fee. There are no hidden fees, no registration costs, and no additional charges. The fee is clearly displayed before you confirm your exchange. Network fees (blockchain transaction fees) are separate and depend on the cryptocurrency network you're using.",
        icon: DollarSign,
      },
      {
        id: "exchange-time",
        question: "How long does the exchange take?",
        answer:
          "Exchange time varies depending on the cryptocurrencies involved and network congestion. Typically, exchanges complete within 5-30 minutes after we receive your payment. Some networks like Bitcoin may take longer during high congestion periods, while faster networks like Solana or TON can complete in just a few minutes. You can track your order status in real-time on our platform.",
        icon: Clock,
      },
      {
        id: "low-fees",
        question: "What happens if I set low transactions fees?",
        answer:
          "If you set low transaction fees when sending cryptocurrency, your transaction may take significantly longer to be confirmed by the network. In extreme cases, very low fees can result in transactions being stuck for hours or even days. This delays the exchange process. We recommend using the network's recommended fee or allowing your wallet to set fees automatically to ensure timely processing.",
        icon: AlertCircle,
      },
      {
        id: "speed-up",
        question: "What can I do to speed up the transaction?",
        answer:
          "To speed up your transaction: 1) Use the network's recommended transaction fees (not the minimum), 2) Choose cryptocurrencies with faster networks (like Solana, TON, or Polygon), 3) Avoid peak network congestion times, 4) Ensure you're using the correct network for your cryptocurrency, 5) Double-check the receiving address before sending. Using adequate fees is the most important factor for transaction speed.",
        icon: Rocket,
      },
      {
        id: "why-slow",
        question: "Why does sending a transaction take so long?",
        answer:
          "Transaction speed depends on several factors: network congestion (more users = slower processing), transaction fees (lower fees = lower priority), blockchain type (some networks are inherently faster), and network maintenance. Bitcoin and Ethereum can be slower during peak times, while newer networks like Solana and TON are designed for speed. You can check network status on blockchain explorers before sending.",
        icon: Clock,
      },
      {
        id: "invalid-address",
        question: "Why is my wallet address recognized as invalid?",
        answer:
          "An address may be invalid if: 1) It's for a different cryptocurrency network (e.g., using an Ethereum address for Bitcoin), 2) The address format is incorrect or contains typos, 3) The address is for a different network version (e.g., mainnet vs testnet), 4) The address uses an unsupported format. Always double-check that you're using the correct address format for the specific cryptocurrency and network you're exchanging to.",
        icon: Wallet,
      },
    ],
  },
  {
    id: "about-orders",
    title: "About orders",
    icon: Package,
    items: [
      {
        id: "track-order",
        question: "How can I track my order?",
        answer:
          "You can track your order in three ways: 1) By email - if you provided your email address, you'll receive updates at each stage, 2) On our website - if your browser accepts cookies, your order will be saved and you can access it from the same device, 3) By blockchain - use the transaction links provided in your order to view the transactions directly on blockchain explorers. You can also bookmark your order page URL for easy access.",
        icon: Search,
      },
      {
        id: "expired-order",
        question: "What should I do if my order expired?",
        answer:
          "If your order expired before you sent the payment, you'll need to create a new order. Expired orders cannot be reactivated. If you already sent payment to an expired order, contact our support team immediately with your order ID and transaction hash. We'll investigate and help resolve the situation. To avoid expiration, complete your payment within the specified time limit shown on the order page.",
        icon: RefreshCw,
      },
      {
        id: "closed-site",
        question: "I accidentally closed the MintMove site, what should I do?",
        answer:
          "If you closed the site but haven't completed your exchange, you can recover your order if: 1) You saved or bookmarked the order page URL - simply reopen it, 2) You provided an email address - check your email for order updates and links, 3) You have the order ID - contact support with it. If you already sent payment, your exchange will still process automatically. Always save your order URL or enable email notifications for important exchanges.",
        icon: XCircle,
      },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(itemId)) {
      newOpenItems.delete(itemId);
    } else {
      newOpenItems.add(itemId);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200">
      <Header />

      <main className="relative z-10 pt-24 pb-12 px-4">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 sm:mb-8">
              <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6">
              FAQ
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto">
              Find answers to common questions about MintMove cryptocurrency exchange platform
            </p>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
          <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12">
            {faqCategories.map((category, categoryIndex) => {
              const CategoryIcon = category.icon;
              return (
                <div key={category.id} className="space-y-4 sm:space-y-6">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                      {category.title}
                    </h2>
                  </div>

                  {/* FAQ Items */}
                  <div className="space-y-3 sm:space-y-4">
                    {category.items.map((item, itemIndex) => {
                      const ItemIcon = item.icon;
                      const isOpen = openItems.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="w-full text-left p-5 sm:p-6 lg:p-8 hover:bg-white/[0.02] transition-colors duration-200"
                          >
                            <div className="flex items-start gap-4 sm:gap-5">
                              {/* Icon */}
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <ItemIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                              </div>

                              {/* Question */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white mb-2 pr-8 sm:pr-12">
                                  {item.question}
                                </h3>
                              </div>

                              {/* Chevron */}
                              <div className="flex-shrink-0 mt-1">
                                {isOpen ? (
                                  <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500" />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Answer */}
                          {isOpen && (
                            <div className="px-5 sm:px-6 lg:px-8 pb-5 sm:pb-6 lg:pb-8">
                              <div className="ml-14 sm:ml-16 lg:ml-20 pr-4 sm:pr-8">
                                <div className="h-px bg-white/5 mb-4 sm:mb-5"></div>
                                <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
                                  {item.answer}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Category Separator */}
                  {categoryIndex < faqCategories.length - 1 && (
                    <div className="pt-8 sm:pt-12">
                      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/[0.02] rounded-2xl p-8 sm:p-10 lg:p-12 border border-white/5 text-center">
              <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-blue-400 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                Still have questions?
              </h2>
              <p className="text-base sm:text-lg text-neutral-400 mb-6 sm:mb-8 max-w-2xl mx-auto">
                Our support team is here to help you 24/7. Contact us for any additional questions or assistance.
              </p>
              <a
                href="/support"
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

