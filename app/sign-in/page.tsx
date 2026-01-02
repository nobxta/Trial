"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Mail } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!data.success) {
        // Check if email needs verification
        if (data.error === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true);
          setVerificationEmail(data.email || email);
          setError(data.message || "Please verify your email address before signing in.");
        } else {
          setError(data.error || "Sign in failed");
        }
        setLoading(false);
        return;
      }

      // Redirect based on user type
      if (data.isAdmin) {
        router.push("/admin");
      } else {
        router.push("/account/personal");
      }
      router.refresh();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Request timed out. Please check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail || email }),
      });

      const data = await res.json();

      if (data.success) {
        setResendSuccess(true);
        setError("");
      } else {
        setError(data.error || "Failed to resend verification email");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d4d4d4] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
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

        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Sign In</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Enter your credentials to access your account
          </p>

          {error && (
            <div className={`mb-4 p-3 rounded-lg border text-sm ${
              needsVerification 
                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {error}
            </div>
          )}

          {needsVerification && (
            <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-300 mb-2">
                    Your email address needs to be verified before you can sign in.
                  </p>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="text-sm text-blue-400 hover:text-blue-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? "Sending..." : "Resend verification email"}
                  </button>
                  {resendSuccess && (
                    <p className="text-xs text-green-400 mt-2">
                      ✓ Verification email sent! Please check your inbox.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-400">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-blue-400 hover:text-blue-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

