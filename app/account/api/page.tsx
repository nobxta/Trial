"use client";

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AccountLayout from "@/components/AccountLayout";
import { Loader2, Copy, Check, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { maskApiKey } from "@/lib/db-api";

export default function ApiManagementPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

      await loadApiKey();
    } catch (error) {
      router.push("/sign-in");
    }
  };

  const loadApiKey = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/api-key");
      const data = await res.json();

      if (data.success) {
        setApiKey(data.apiKey);
      }
    } catch (error) {
      console.error("Failed to load API key:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/account/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });

      const data = await res.json();

      if (data.success) {
        setApiKey(data.apiKey);
        setShowConfirm(false);
      }
    } catch (error) {
      console.error("Failed to generate API key:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke your API key? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch("/api/account/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });

      const data = await res.json();

      if (data.success) {
        setApiKey(null);
      }
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <h1 className="text-2xl md:text-3xl font-semibold text-white mb-6 md:mb-8">API Management</h1>

      <div className="space-y-6 md:space-y-8">
        {/* API Key Section */}
        <div className="glass-panel rounded-2xl p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Your API Key</h2>
          
          {apiKey ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs sm:text-sm break-all">
                  {apiKey ? maskApiKey(apiKey) : "No API key"}
                </div>
                <button
                  onClick={handleCopy}
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
              
              {showConfirm ? (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-yellow-400 text-sm mb-3">
                    Generating a new API key will revoke your current key. Are you sure?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Confirm Generate
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleGenerate}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={handleRevoke}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-neutral-400">You don't have an API key yet.</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Generate API Key
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="glass-panel rounded-2xl p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Usage Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-neutral-400 text-sm mb-1">Requests Today</p>
              <p className="text-2xl font-bold text-white">0</p>
            </div>
            <div>
              <p className="text-neutral-400 text-sm mb-1">Requests This Month</p>
              <p className="text-2xl font-bold text-white">0</p>
            </div>
            <div>
              <p className="text-neutral-400 text-sm mb-1">Rate Limit</p>
              <p className="text-2xl font-bold text-white">1000/day</p>
            </div>
          </div>
        </div>

        {/* Security Warning */}
        <div className="glass-panel rounded-2xl p-4 md:p-6 border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-white font-semibold mb-2">Security Warning</h3>
              <ul className="text-neutral-300 text-sm space-y-1 list-disc list-inside">
                <li>Never share your API key with anyone</li>
                <li>Do not commit your API key to version control</li>
                <li>Regenerate your key immediately if it's compromised</li>
                <li>Use environment variables to store your API key in production</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="glass-panel rounded-2xl p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">API Documentation</h2>
          <p className="text-neutral-400 mb-4">
            Learn how to use the MintMove API to integrate cryptocurrency exchange functionality into your application.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            View Documentation
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </AccountLayout>
  );
}

