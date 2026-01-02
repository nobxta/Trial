import Link from "next/link";
import { ArrowRight, Key, Book, Code } from "lucide-react";

export const metadata = {
  title: "MintMove API Documentation",
  description: "Programmatic access to crypto exchange, pricing, and order management",
};

export default function DocsHome() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <h1 className="text-5xl font-bold text-white">
          MintMove API
        </h1>
        <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
          Programmatic access to crypto exchange, pricing, and order management
        </p>
      </div>

      {/* What You Can Do */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-white">What You Can Do</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 hover:bg-white/[0.04] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-3">
              Fetch Exchange Rates
            </h3>
            <p className="text-neutral-400">
              Get real-time and fixed exchange rates for any cryptocurrency pair
              across multiple blockchain networks. Support for both fixed and
              floating rate types.
            </p>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 hover:bg-white/[0.04] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-3">
              Create & Track Orders
            </h3>
            <p className="text-neutral-400">
              Programmatically create exchange orders, monitor their status in
              real-time, and handle the complete order lifecycle from creation
              to completion.
            </p>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 hover:bg-white/[0.04] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-3">
              Handle Emergencies
            </h3>
            <p className="text-neutral-400">
              Manage emergency situations with options to refund, recalculate,
              or cancel orders when unexpected conditions occur during
              processing.
            </p>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5 hover:bg-white/[0.04] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-3">
              Generate QR Codes
            </h3>
            <p className="text-neutral-400">
              Automatically generate QR codes for payment addresses with
              embedded amounts, supporting multiple formats for easy
              integration.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Get Started</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Link
            href="/docs/get-api-key"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg p-6 border border-blue-500/20 transition-all group"
          >
            <Key className="w-8 h-8 text-white mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Get API Key
            </h3>
            <p className="text-blue-100 mb-4">
              Generate your API credentials to start integrating
            </p>
            <div className="flex items-center text-white group-hover:translate-x-1 transition-transform">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/docs/introduction"
            className="bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] rounded-lg p-4 md:p-6 border border-white/5 transition-all group"
          >
            <Book className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Quick Start
            </h3>
            <p className="text-neutral-400 mb-4">
              Learn the basics and make your first API call
            </p>
            <div className="flex items-center text-blue-400 group-hover:translate-x-1 transition-transform">
              Read Guide <ArrowRight className="ml-2 w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/docs/api/available-currencies"
            className="bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] rounded-lg p-4 md:p-6 border border-white/5 transition-all group"
          >
            <Code className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              API Reference
            </h3>
            <p className="text-neutral-400 mb-4">
              Complete endpoint documentation and examples
            </p>
            <div className="flex items-center text-blue-400 group-hover:translate-x-1 transition-transform">
              Browse API <ArrowRight className="ml-2 w-4 h-4" />
            </div>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Key Features</h2>
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 md:p-6 border border-white/5">
          <ul className="space-y-3 text-sm md:text-base text-neutral-400">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">REST API</strong> - Standard
                HTTP methods with JSON responses
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">HTTPS Only</strong> - All
                communications encrypted end-to-end
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Multiple Networks</strong> -
                Support for ERC20, TRC20, BEP20, and native blockchains
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Rate Types</strong> - Choose
                between fixed and floating exchange rates
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Official SDKs</strong> - Ready-to-use
                libraries for JavaScript, Python, and PHP
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Webhook Support</strong> - Real-time
                notifications for order status changes
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

