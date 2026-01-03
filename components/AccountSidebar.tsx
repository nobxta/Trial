"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, FileText, BookOpen, Link2, Wallet, Code, LogOut } from "lucide-react";

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

interface AccountSidebarProps {
  onLogout: () => void;
  onNavigate?: () => void;
}

export default function AccountSidebar({ onLogout, onNavigate }: AccountSidebarProps) {
  const pathname = usePathname();

  const sidebarItems: SidebarItem[] = [
    { icon: User, label: "Personal data", href: "/account/personal" },
    { icon: FileText, label: "Orders history", href: "/account/orders" },
    { icon: BookOpen, label: "Address book", href: "/account/addresses" },
    { icon: Link2, label: "Affiliate program", href: "/account/affiliate" },
    { icon: Wallet, label: "Payouts", href: "/account/payouts" },
    { icon: Code, label: "API management", href: "/account/api" },
  ];

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside className="w-full h-full border-r border-white/5 bg-[#0a0a0a]/50 min-h-[calc(100vh-4rem)] p-4 flex flex-col">
      <nav className="space-y-1 flex-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Logout Button */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <button
          onClick={() => {
            onNavigate?.();
            onLogout();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

