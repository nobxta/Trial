"use client";

import Image from "next/image";
import Link from "next/link";
import AuthButton from "./AuthButton";

export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/logo.png"
              alt="MintMove"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
          <Link href="/docs" className="hover:text-white transition-colors">API</Link>
          <Link href="/support" className="hover:text-white transition-colors">Support</Link>
        </nav>

        <div className="flex items-center gap-3">
          {/* Language selector removed - not implemented */}
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
