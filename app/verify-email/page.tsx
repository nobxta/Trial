"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage("Email verified successfully!");
          setTimeout(() => {
            router.push("/sign-in");
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [searchParams, router]);

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

        <div className="glass-panel rounded-2xl p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-400 animate-spin" />
              <h1 className="text-2xl font-semibold text-white mb-2">Verifying email...</h1>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Email Verified!</h1>
              <p className="text-sm text-neutral-400 mb-6">{message}</p>
              <p className="text-xs text-neutral-500">Redirecting to sign in...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Verification Failed</h1>
              <p className="text-sm text-neutral-400 mb-6">{message}</p>
              <Link
                href="/sign-in"
                className="inline-block px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                Go to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] text-[#d4d4d4] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

