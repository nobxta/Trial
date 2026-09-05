"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // The API already set the session cookie, so the user is signed in.
      setDone(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
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
          {children}
        </div>
      </div>
    </div>
  );

  // No token in the URL at all — the link was mistyped or truncated by a mail client.
  if (!token) {
    return shell(
      <>
        <h1 className="text-2xl font-semibold text-white mb-2">Invalid link</h1>
        <p className="text-sm text-neutral-400 mb-6">
          This password reset link is missing or incomplete. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center justify-center"
        >
          Request a new link
        </Link>
      </>
    );
  }

  if (done) {
    return shell(
      <>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2 text-center">Password updated</h1>
        <p className="text-sm text-neutral-400 text-center">
          You&apos;re signed in. Taking you to your account…
        </p>
      </>
    );
  }

  return shell(
    <>
      <h1 className="text-2xl font-semibold text-white mb-2">Set a new password</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Choose a new password. You&apos;ll be signed in automatically.
      </p>

      {error && (
        <div className="mb-4 p-4 rounded-xl border text-sm flex items-start gap-2 bg-red-500/10 border-red-500/20 text-red-400">
          <span className="flex-1">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
            placeholder="••••••••"
          />
          <p className="mt-2 text-xs text-neutral-500">At least 6 characters.</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-300 mb-2">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
            placeholder="••••••••"
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
              Updating…
            </>
          ) : (
            "Reset password"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </p>
    </>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#050505] text-[#d4d4d4] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="w-full max-w-md relative z-10 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
