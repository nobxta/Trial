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
      <>
        <div className="w-20 h-8 bg-white/5 rounded-lg animate-pulse"></div>
        <div className="w-20 h-8 bg-white/5 rounded-lg animate-pulse"></div>
      </>
    );
  }

  if (user) {
    return (
      <Link
        href="/account/personal"
        className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        Account
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/sign-in"
        className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-700 hover:bg-blue-600 text-white transition-colors"
      >
        Sign up
      </Link>
    </>
  );
}

