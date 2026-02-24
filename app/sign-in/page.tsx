"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [justVerified, setJustVerified] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      setJustVerified(true);
      // Clear the query so the banner doesn't persist on refresh
      router.replace("/sign-in", { scroll: false });
    }
  }, [searchParams, router]);

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
    <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#050505] text-[#d4d4d4] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="w-full max-w-md relative z-10">
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

        <div className="glass-panel rounded-2xl p-8 backdrop-blur-xl border border-white/10 shadow-2xl">
          <h1 className="text-2xl font-semibold text-white mb-2">Sign in</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Enter your credentials to access your account
          </p>

          {justVerified && (
            <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-300">Your email is verified.</p>
                <p className="text-xs text-green-400/90 mt-0.5">You can sign in now.</p>
              </div>
            </div>
          )}

          {error && (
            <div className={`mb-4 p-4 rounded-xl border text-sm flex items-start gap-2 ${
              needsVerification
                ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {needsVerification && (
            <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-300 mb-2">
                    Verify your email before you can sign in. Check your inbox for the verification link.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="text-sm text-blue-400 hover:text-blue-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? "Sending…" : "Resend verification email"}
                  </button>
                  {resendSuccess && (
                    <p className="text-xs text-green-400 mt-2">
                      Verification email sent. Check your inbox.
                    </p>
                  )}
                </div>
              </div>
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
                  Signing in…
                </>
              ) : (
                "Sign in"
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

function SignInFallback() {
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

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  );
}

