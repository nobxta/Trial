"use client";

import Image from "next/image";
import Link from "next/link";
import { Twitter, Github, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050505]/95 backdrop-blur-sm relative">
      {/* Protected Background Image */}
      <div 
        className="absolute inset-0 protected-bg opacity-20"
        style={{
          backgroundImage: 'url(/images/night-sky-scene-art-2q.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      <div className="absolute inset-0 bg-[#050505]/90 z-0"></div>
      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo/logo.png"
                alt="MintMove"
                width={100}
                height={26}
                className="h-6 w-auto"
              />
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              The world&apos;s most reliable non-custodial crypto exchange service. Secure, private, and limitless.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Exchange</h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li><Link href="/" className="hover:text-blue-400 transition-colors">Buy Crypto</Link></li>
              <li><Link href="/" className="hover:text-blue-400 transition-colors">Sell Crypto</Link></li>
              <li><Link href="/" className="hover:text-blue-400 transition-colors">Swap Pairs</Link></li>
              <li><Link href="/docs/rate-limits" className="hover:text-blue-400 transition-colors">Fees & Limits</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li><Link href="/about" className="hover:text-blue-400 transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-blue-400 transition-colors">Blog</Link></li>
              <li><Link href="/faq" className="hover:text-blue-400 transition-colors">FAQ</Link></li>
              <li><Link href="/docs" className="hover:text-blue-400 transition-colors">API</Link></li>
              <li><Link href="/support" className="hover:text-blue-400 transition-colors">Support</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2 text-xs text-neutral-400">
              <li><Link href="/privacy-policy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/docs/security" className="hover:text-blue-400 transition-colors">AML/KYC</Link></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
          <p className="text-[10px] text-neutral-600">© 2024 MintMove Technologies. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <div className="flex gap-3 text-xs text-neutral-400">
              <Link href="/sign-in" className="hover:text-blue-400 transition-colors">Sign in</Link>
              <span className="text-neutral-600">/</span>
              <Link href="/sign-up" className="hover:text-blue-400 transition-colors">Sign up</Link>
            </div>
            <div className="w-px h-4 bg-white/10"></div>
            <div className="flex gap-4 text-neutral-500">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

