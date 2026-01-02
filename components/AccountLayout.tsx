"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import AccountSidebar from "./AccountSidebar";

interface AccountLayoutProps {
  children: ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo/logo.png"
                alt="MintMove"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </nav>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AccountSidebar onLogout={handleLogout} />
        </div>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={closeMobileMenu}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-[#0a0a0a] border-r border-white/5 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <span className="text-white font-semibold">Menu</span>
            <button
              onClick={closeMobileMenu}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <AccountSidebar onLogout={handleLogout} onNavigate={closeMobileMenu} />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

