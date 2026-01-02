"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountLayout from "@/components/AccountLayout";
import { HelpCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function PayoutsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [earned, setEarned] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  const [minPayout, setMinPayout] = useState(0.001);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      
      if (!data.success) {
        router.push("/sign-in");
        return;
      }

      setLoading(false);
    } catch (error) {
      router.push("/sign-in");
    }
  };

  if (loading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <h1 className="text-2xl md:text-3xl font-semibold text-white mb-6 md:mb-8">Payout</h1>

          {/* Payout Card */}
          <div className="mb-6 md:mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 p-4 md:p-8">
            {/* Space background elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 right-8 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-4 left-8 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl"></div>
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full"></div>
              <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>

            <div className="relative z-10">
              <p className="text-sm text-neutral-400 mb-4">Earned</p>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-bold text-white">{earned}</span>
                <div className="relative">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors">
                    <span className="font-medium">{selectedCurrency}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              {earned < minPayout && (
                <p className="text-sm text-red-400">
                  less than the minimum {minPayout} {selectedCurrency}.
                </p>
              )}
            </div>
          </div>

          {/* Last Payouts */}
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-4 md:mb-6">Last payouts</h2>
          <div className="glass-panel rounded-2xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        DATE
                        <HelpCircle className="w-4 h-4 text-neutral-500" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        STATUS
                        <HelpCircle className="w-4 h-4 text-neutral-500" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        AMOUNT
                        <HelpCircle className="w-4 h-4 text-neutral-500" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        ADDRESS
                        <HelpCircle className="w-4 h-4 text-neutral-500" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                      No data
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Mobile View */}
            <div className="md:hidden p-4 text-center text-neutral-500">
              No data
            </div>
            <div className="px-4 md:px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <span>Show</span>
                <select className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white">
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                <span>entries</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  1
                </button>
                <button className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
    </AccountLayout>
  );
}

