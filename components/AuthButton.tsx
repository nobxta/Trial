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

  if (user) {
    return (
      <Link
        href="/account/personal"
        className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
      >
        Account
      </Link>
    );
  }

  return (
    <Link
      href="/sign-up"
      className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 relative overflow-hidden group"
    >
      <span className="relative z-10">Register</span>
      <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
    </Link>
  );
}

