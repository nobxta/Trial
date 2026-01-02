"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";

const sidebarItems = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs/introduction", label: "Introduction" },
      { href: "/docs/authentication", label: "Authentication" },
      { href: "/docs/get-api-key", label: "Getting the API Key" },
    ],
  },
  {
    title: "Requests & Limits",
    items: [
      { href: "/docs/requests", label: "Request Format & Examples" },
      { href: "/docs/rate-limits", label: "Request Limits" },
    ],
  },
  {
    title: "SDKs & Libraries",
    items: [
      { href: "/docs/libraries", label: "Official SDKs" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { href: "/docs/api/available-currencies", label: "Available Currencies" },
      { href: "/docs/api/exchange-rate", label: "Exchange Rate" },
      { href: "/docs/api/create-order", label: "Create Order" },
      { href: "/docs/api/get-order", label: "Get Order Details" },
      { href: "/docs/api/emergency", label: "Emergency Action" },
      { href: "/docs/api/notifications", label: "Notifications" },
      { href: "/docs/api/qr-codes", label: "QR Code Images" },
    ],
  },
  {
    title: "Data Feeds",
    items: [
      { href: "/docs/xml/rates", label: "XML Export of Rates" },
    ],
  },
  {
    title: "Guides",
    items: [
      { href: "/docs/how-it-works", label: "How It Works" },
      { href: "/docs/errors", label: "Errors & Status Codes" },
      { href: "/docs/security", label: "Security & Best Practices" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] selection:bg-blue-500/30 selection:text-blue-200">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <Link href="/docs" className="text-xl font-bold text-white">
            MintMove API Docs
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white p-2"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Fixed and Sticky */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed top-0 left-0 h-screen w-80 bg-[#050505]/95 backdrop-blur-sm border-r border-white/5 overflow-y-auto z-40 transition-transform duration-300`}
        >
          <div className="p-6">
            <Link
              href="/docs"
              className="text-2xl font-bold text-white mb-8 block"
            >
              MintMove API
            </Link>
            <nav className="space-y-6">
              {sidebarItems.map((section) => (
                <div key={section.title}>
                  <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? "bg-blue-600 text-white"
                                : "text-neutral-400 hover:bg-white/[0.04] hover:text-white"
                            }`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            {isActive && (
                              <ChevronRight size={16} className="text-blue-300" />
                            )}
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-80">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

