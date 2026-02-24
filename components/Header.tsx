"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AuthButton from "./AuthButton";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/docs", label: "API" },
  { href: "/support", label: "Support" },
];

function NavLink({
  href,
  label,
  isActive,
  onClick,
  mobile,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  mobile?: boolean;
}) {
  const base =
    "relative font-medium transition-all duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";
  const desktopClass = isActive
    ? "text-white"
    : "text-gray-400 hover:text-white";
  const pill =
    "absolute inset-0 rounded-lg bg-white/5 scale-0 hover:scale-100 active:scale-[0.98] transition-transform duration-200 -z-10";
  const activePill = isActive ? "scale-100 bg-white/10" : "";

  if (mobile) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`block w-full py-3 px-4 rounded-xl text-base font-medium transition-colors ${
          isActive ? "bg-white/10 text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link href={href} className={`${base} ${desktopClass} group`}>
      <span className="relative z-10 px-3 py-2 inline-block">{label}</span>
      <span className={`${pill} ${activePill} group-hover:scale-100`} />
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#050505]/70 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between w-full gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 min-h-[44px] min-w-[44px] items-center justify-start rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        >
          <Image
            src="/logo/logo.png"
            alt="MintMove"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>

        <nav
          className="hidden md:flex items-center gap-1 text-sm"
          aria-label="Main navigation"
        >
          {navLinks.map(({ href, label }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              isActive={pathname === href || (href !== "/" && pathname.startsWith(href + "/"))}
            />
          ))}
        </nav>

        <div className="flex items-center gap-2 min-h-[44px] shrink-0">
          <AuthButton />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="hidden items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          mobileOpen ? "max-h-[calc(100vh-4rem)] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav
          className="flex flex-col gap-1 p-4 pb-8 bg-[#050505]/95 backdrop-blur-xl border-t border-white/[0.06]"
          aria-label="Mobile navigation"
        >
          {navLinks.map(({ href, label }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              isActive={pathname === href || (href !== "/" && pathname.startsWith(href + "/"))}
              onClick={() => setMobileOpen(false)}
              mobile
            />
          ))}
        </nav>
      </div>
    </header>
  );
}
