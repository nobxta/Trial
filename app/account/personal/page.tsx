"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountLayout from "@/components/AccountLayout";
import { Loader2 } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  emailVerified: boolean;
  notificationsEnabled: boolean;
  createdAt?: string;
  lastVisit?: string;
}

export default function PersonalDataPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Edit states
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [email, setEmail] = useState("");
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

      // Fetch user with preferences
      const userRes = await fetch("/api/account/personal");
      const userData = await userRes.json();
      
      if (userData.success) {
        setUser(userData.user);
        setEmail(userData.user.email);
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email,
          emailVerified: data.user.emailVerified,
          notificationsEnabled: false,
        });
        setEmail(data.user.email);
      }
      setLoading(false);
    } catch (error) {
      router.push("/sign-in");
    }
  };

  const handleToggleNotifications = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !user.notificationsEnabled }),
      });

      const data = await res.json();
      if (data.success) {
        setUser({ ...user, notificationsEnabled: data.notificationsEnabled });
      }
    } catch (error) {
      console.error("Failed to update notifications:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!data.success) {
        setPasswordError(data.error || "Failed to change password");
      } else {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("");
        setTimeout(() => {
          setPasswordSuccess(false);
          setEditingPassword(false);
        }, 2000);
      }
    } catch (error) {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <AccountLayout>
      <h1 className="text-2xl md:text-3xl font-semibold text-white mb-4">Account info</h1>
      
      {/* Account timestamps */}
      <div className="mb-6 md:mb-8 text-neutral-400 text-sm space-y-1">
        <p>Registration date: {formatDate(user?.createdAt)}</p>
        <p>Last visit: {formatDate(user?.lastVisit || user?.createdAt)}</p>
      </div>

      {/* Main Account Info Card */}
      <div className="glass-panel rounded-2xl p-4 md:p-8 relative overflow-hidden">
        {/* Space background effect */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/20 rounded-full blur-2xl"></div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Email Section */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Email
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {editingEmail ? (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingEmail(false);
                        setEmail(user?.email || "");
                      }}
                      className="flex-1 sm:flex-none px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Email editing would require verification, so just cancel for now
                        setEditingEmail(false);
                        setEmail(user?.email || "");
                      }}
                      className="flex-1 sm:flex-none px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white break-words">
                    {user?.email} {!user?.emailVerified && <span className="text-neutral-500">(not confirmed)</span>}
                  </div>
                  <div className="flex gap-2">
                    {!user?.emailVerified && (
                      <button
                        onClick={() => {
                          // Resend verification
                          fetch("/api/auth/resend-verification", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: user?.email }),
                          });
                        }}
                        className="flex-1 sm:flex-none px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm"
                      >
                        Confirm
                      </button>
                    )}
                    <button
                      onClick={() => setEditingEmail(true)}
                      className="flex-1 sm:flex-none px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Password Section */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Password
            </label>
            <div className="flex flex-col gap-3">
              {editingPassword ? (
                <form onSubmit={handleChangePassword} className="flex-1 space-y-4">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {passwordError && (
                    <div className="text-red-400 text-sm">{passwordError}</div>
                  )}
                  {passwordSuccess && (
                    <div className="text-green-400 text-sm">Password changed successfully!</div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                    >
                      {passwordLoading ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setPasswordError("");
                      }}
                      className="px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white">
                    *********
                  </div>
                  <button
                    onClick={() => setEditingPassword(true)}
                    className="px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notifications Section */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Notifications
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={user?.notificationsEnabled || false}
                  onChange={handleToggleNotifications}
                  disabled={saving || !user?.emailVerified}
                  className="w-5 h-5 rounded bg-white/5 border-white/10 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <label htmlFor="notifications" className="text-white">
                  Receive email notifications about order status changes
                </label>
              </div>
              {!user?.emailVerified && (
                <p className="text-neutral-400 text-sm ml-8">
                  To receive notifications about changes in the status of your orders, confirm your email address
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

    </AccountLayout>
  );
}

