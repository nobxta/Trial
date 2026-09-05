"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#050505] text-[#d4d4d4] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo/logo.png" alt="MintMove" width={120} height={32} className="h-8 w-auto" />
          </Link>
        </div>

        <div className="glass-panel rounded-2xl p-8 backdrop-blur-xl border border-white/10 shadow-2xl">
          {sent ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2 text-center">Check your email</h1>
              <p className="text-sm text-neutral-400 text-center mb-6">
                If an account exists for <span className="text-neutral-200">{email}</span>, we&apos;ve sent a
                link to reset your password. It expires in 1 hour.
              </p>
              <p className="text-xs text-neutral-500 text-center mb-6">
                Didn&apos;t get it? Check your spam folder, or try again in a minute.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setError("");
                }}
                className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
              >
                Use a different email
              </button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white mb-2">Forgot password</h1>
              <p className="text-sm text-neutral-400 mb-6">
                Enter your email and we&apos;ll send you a link to reset it.
              </p>

              {error && (
                <div className="mb-4 p-4 rounded-xl border text-sm flex items-start gap-2 bg-red-500/10 border-red-500/20 text-red-400">
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-neutral-400">
            <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
