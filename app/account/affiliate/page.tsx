"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountLayout from "@/components/AccountLayout";
import { Loader2, Copy, Check, ExternalLink } from "lucide-react";

interface Affiliate {
  id: string;
  referralCode: string;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  commissionRate: number;
}

interface Referral {
  id: string;
  referredUserEmail: string;
  signedUpAt: string | null;
  convertedAt: string | null;
  commissionAmount: number | null;
  status: string;
}

interface Earnings {
  id: string;
  commissionAmount: number;
  convertedAt: string | null;
  status: string;
}

export default function AffiliatePage() {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earnings, setEarnings] = useState<Earnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

      await loadData();
    } catch (error) {
      router.push("/sign-in");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [affiliateRes, referralsRes, earningsRes] = await Promise.all([
        fetch("/api/account/affiliate"),
        fetch("/api/account/affiliate/referrals"),
        fetch("/api/account/affiliate/earnings"),
      ]);

      const affiliateData = await affiliateRes.json();
      const referralsData = await referralsRes.json();
      const earningsData = await earningsRes.json();

      if (affiliateData.success) {
        setAffiliate(affiliateData.affiliate);
      }
      if (referralsData.success) {
        setReferrals(referralsData.referrals);
      }
      if (earningsData.success) {
        setEarnings(earningsData.earnings);
      }
    } catch (error) {
      console.error("Failed to load affiliate data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!affiliate) return;
    const referralUrl = `${window.location.origin}?ref=${affiliate.referralCode}`;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const conversionRate = affiliate && affiliate.totalClicks > 0
    ? ((affiliate.totalConversions / affiliate.totalClicks) * 100).toFixed(2)
    : "0.00";

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
      <h1 className="text-2xl md:text-3xl font-semibold text-white mb-6 md:mb-8">Affiliate Program</h1>

      {affiliate && (
        <>
          {/* Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-neutral-400 text-sm mb-2">Total Earnings</p>
              <p className="text-2xl font-bold text-white">
                ${affiliate.totalEarnings.toFixed(2)}
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-neutral-400 text-sm mb-2">Total Clicks</p>
              <p className="text-2xl font-bold text-white">{affiliate.totalClicks}</p>
            </div>
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-neutral-400 text-sm mb-2">Conversions</p>
              <p className="text-2xl font-bold text-white">{affiliate.totalConversions}</p>
            </div>
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-neutral-400 text-sm mb-2">Conversion Rate</p>
              <p className="text-2xl font-bold text-white">{conversionRate}%</p>
            </div>
          </div>

          {/* Referral Link */}
          <div className="glass-panel rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Your Referral Link</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs sm:text-sm break-all">
                {typeof window !== 'undefined' && `${window.location.origin}?ref=${affiliate.referralCode}`}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-neutral-400 text-sm mt-2">
              Commission Rate: {(affiliate.commissionRate * 100).toFixed(1)}%
            </p>
          </div>

          {/* Referrals Table */}
          <div className="glass-panel rounded-2xl overflow-hidden mb-6 md:mb-8">
            <div className="p-4 md:p-6 border-b border-white/10">
              <h2 className="text-lg md:text-xl font-semibold text-white">Referrals</h2>
            </div>
            {referrals.length === 0 ? (
              <div className="p-8 md:p-12 text-center text-neutral-400">
                No referrals yet
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase">
                        Sign Up Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase">
                        Commission
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref) => (
                      <tr key={ref.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-6 py-4 text-white">{ref.referredUserEmail}</td>
                        <td className="px-6 py-4 text-neutral-400 text-sm">
                          {ref.signedUpAt
                            ? new Date(ref.signedUpAt).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              ref.status === "completed"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            }`}
                          >
                            {ref.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white">
                          {ref.commissionAmount
                            ? `$${ref.commissionAmount.toFixed(2)}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-white/5">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="text-white text-sm font-medium break-all">{ref.referredUserEmail}</p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                            ref.status === "completed"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          }`}
                        >
                          {ref.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-neutral-400 text-xs">Sign Up</p>
                          <p className="text-white">
                            {ref.signedUpAt
                              ? new Date(ref.signedUpAt).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-400 text-xs">Commission</p>
                          <p className="text-white">
                            {ref.commissionAmount
                              ? `$${ref.commissionAmount.toFixed(2)}`
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Earnings History */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 md:p-6 border-b border-white/10">
              <h2 className="text-lg md:text-xl font-semibold text-white">Earnings History</h2>
            </div>
            {earnings.length === 0 ? (
              <div className="p-8 md:p-12 text-center text-neutral-400">
                No earnings yet
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-400 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((earning) => (
                      <tr key={earning.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-6 py-4 text-neutral-400 text-sm">
                          {earning.convertedAt
                            ? new Date(earning.convertedAt).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">
                          ${earning.commissionAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              earning.status === "paid"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            }`}
                          >
                            {earning.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-white/5">
                  {earnings.map((earning) => (
                    <div key={earning.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-neutral-400 text-xs mb-1">Date</p>
                          <p className="text-white text-sm">
                            {earning.convertedAt
                              ? new Date(earning.convertedAt).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-neutral-400 text-xs mb-1">Amount</p>
                          <p className="text-white font-medium">
                            ${earning.commissionAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            earning.status === "paid"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          }`}
                        >
                          {earning.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </AccountLayout>
  );
}






