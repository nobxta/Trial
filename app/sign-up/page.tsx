"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, CheckCircle2, Mail, Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailFilled = email.trim().length > 0;
  const passwordFilled = password.length >= 6;
  const showConfirmField = emailFilled && passwordFilled;
  const canSubmit = showConfirmField ? password === confirmPassword && confirmPassword.length >= 6 : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!showConfirmField) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Sign up failed");
        setLoading(false);
        return;
      }

      // Show success even if email might not have been sent
      if (data.verificationUrl) {
        setVerificationUrl(data.verificationUrl);
      }
      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Request timed out. Please check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#050505] text-[#d4d4d4] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="w-full max-w-md relative z-10 animate-fade-in-up">
          <div className="flex justify-center mb-8 transform hover:scale-105 transition-transform duration-300">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo/logo.png"
                alt="MintMove"
                width={120}
                height={32}
                className="h-8 w-auto drop-shadow-lg"
              />
            </Link>
          </div>

          <div className="glass-panel rounded-2xl p-8 text-center backdrop-blur-xl border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center animate-pulse-glow border border-green-500/30">
              <CheckCircle2 className="w-10 h-10 text-green-400" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
              Check your email
            </h1>
            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              We&apos;ve sent a verification link to <strong className="text-white font-semibold">{email}</strong>. Click the link to verify your account — you&apos;ll need to verify before you can sign in.
            </p>
            {verificationUrl && (
              <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 animate-fade-in">
                <p className="text-xs text-blue-400 mb-2 font-medium">Development Mode - Verification URL:</p>
                <a
                  href={verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-300 break-all hover:underline transition-colors"
                >
                  {verificationUrl}
                </a>
              </div>
            )}
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
            >
              <Mail className="w-4 h-4" />
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#050505] text-[#d4d4d4] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/3 to-purple-600/3 rounded-full blur-3xl animate-rotate-slow"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="flex justify-center mb-8 transform hover:scale-105 transition-transform duration-300">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/logo.png"
              alt="MintMove"
              width={120}
              height={32}
              className="h-8 w-auto drop-shadow-lg"
            />
          </Link>
        </div>

        <div className="glass-panel rounded-2xl p-8 backdrop-blur-xl border border-white/10 shadow-2xl animate-fade-in-up">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-sm text-neutral-400">
              Join us to get started with your journey
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="animate-fade-in delay-100">
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-200 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:bg-white/7 hover:border-white/15"
                  placeholder="your@email.com"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-purple-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-blue-500/5 group-focus-within:to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 blur-xl"></div>
              </div>
            </div>

            <div className="animate-fade-in delay-200">
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-200 mb-2">
                Password
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:bg-white/7 hover:border-white/15"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-purple-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-blue-500/5 group-focus-within:to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 blur-xl"></div>
              </div>
              {password.length > 0 && password.length < 6 && (
                <p className="mt-1.5 text-xs text-amber-400/90">At least 6 characters</p>
              )}
            </div>

            {showConfirmField && (
              <div className="animate-fade-in delay-300">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neutral-200 mb-2">
                  Confirm Password
                </label>
                <div className="relative group">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={showConfirmField}
                    minLength={6}
                    className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:bg-white/7 hover:border-white/15"
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-purple-500/0 group-focus-within:from-blue-500/10 group-focus-within:via-blue-500/5 group-focus-within:to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none -z-10 blur-xl"></div>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="mt-1.5 text-xs text-amber-400/90">Passwords don&apos;t match</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !showConfirmField || !canSubmit}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2 relative overflow-hidden group animate-fade-in delay-400"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating your account...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Create Account</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 animate-fade-in delay-500">
            <p className="text-center text-sm text-neutral-400 mb-1">
              Already have an account?
            </p>
            <Link 
              href="/sign-in" 
              className="group relative inline-flex items-center justify-center w-full mt-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Sign in to your account
              </span>
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300"></span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

