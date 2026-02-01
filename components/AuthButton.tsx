"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserData {
  id: string;
  email: string;
  emailVerified: boolean;
}

export default function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      }
    } catch (error) {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-24 h-10 bg-white/5 rounded-lg animate-pulse"></div>
    );
  }

  const btnClass =
    "inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg text-sm font-semibold bg-[#2563eb] hover:bg-[#3b82f6] text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95";

  if (user) {
    return (
      <Link href="/account/personal" className={btnClass}>
        Account
      </Link>
    );
  }

  return (
    <Link href="/sign-up" className={btnClass}>
      Register
    </Link>
  );
}

