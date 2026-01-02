"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AccountLayout from "@/components/AccountLayout";
import { Loader2, Plus, Edit2, Trash2, Copy, Check } from "lucide-react";
import CryptoSelector from "@/components/CryptoSelector";
import { SupportedCrypto, getCryptoById, getEnabledCryptos, getCryptosBySymbol } from "@/lib/supported-cryptos";

interface Address {
  id: string;
  label: string;
  address: string;
  currency: string;
  network: string | null;
  isDefault: boolean;
}

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [address, setAddress] = useState("");
  const [selectedCryptoId, setSelectedCryptoId] = useState<string>("");
  const [isDefault, setIsDefault] = useState(false);

  // Get selected crypto object
  const selectedCrypto = useMemo(() => {
    if (!selectedCryptoId) return null;
    return getCryptoById(selectedCryptoId);
  }, [selectedCryptoId]);

  // Initialize with first available crypto
  useEffect(() => {
    if (!selectedCryptoId) {
      const cryptos = getEnabledCryptos();
      if (cryptos.length > 0) {
        setSelectedCryptoId(cryptos[0].id);
      }
    }
  }, []);

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

      await loadAddresses();
    } catch (error) {
      router.push("/sign-in");
    }
  };

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/addresses");
      const data = await res.json();

      if (data.success) {
        setAddresses(data.addresses);
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCrypto) {
      alert("Please select a cryptocurrency");
      return;
    }

    try {
      const url = editingId
        ? `/api/account/addresses/${editingId}`
        : "/api/account/addresses";
      
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          currency: selectedCrypto.symbol,
          network: selectedCrypto.networkCode || null,
          isDefault,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await loadAddresses();
        resetForm();
      } else {
        alert(data.error || "Failed to save address");
      }
    } catch (error) {
      console.error("Failed to save address:", error);
      alert("Failed to save address");
    }
  };

  const handleEdit = (addr: Address) => {
    setEditingId(addr.id);
    setAddress(addr.address);
    setIsDefault(addr.isDefault);
    
    // Find crypto ID from currency and network
    const matchingCryptos = getCryptosBySymbol(addr.currency);
    let cryptoId = matchingCryptos[0]?.id;
    
    // If network is specified, try to find exact match
    if (addr.network && matchingCryptos.length > 1) {
      const exactMatch = matchingCryptos.find(
        (c: SupportedCrypto) => c.networkCode === addr.network
      );
      if (exactMatch) {
        cryptoId = exactMatch.id;
      }
    }
    
    if (cryptoId) {
      setSelectedCryptoId(cryptoId);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        await loadAddresses();
      }
    } catch (error) {
      console.error("Failed to delete address:", error);
    }
  };

  const handleCopy = async (addr: string, id: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setAddress("");
    setIsDefault(false);
    const cryptos = getEnabledCryptos();
    if (cryptos.length > 0) {
      setSelectedCryptoId(cryptos[0].id);
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

  return (
    <AccountLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Address Book</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass-panel rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editingId ? "Edit Address" : "Add New Address"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Cryptocurrency
              </label>
              <CryptoSelector
                selectedCryptoId={selectedCryptoId}
                onSelect={(crypto) => setSelectedCryptoId(crypto.id)}
                placeholder="Search or select cryptocurrency"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste crypto address"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded bg-white/5 border-white/10 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm text-neutral-300">
                Set as default address
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                {editingId ? "Update" : "Add"} Address
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <p className="text-neutral-400">No addresses saved yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="glass-panel rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-white font-medium">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-neutral-400 text-sm font-mono break-all">
                    {addr.address.length > 40
                      ? `${addr.address.substring(0, 20)}...${addr.address.substring(addr.address.length - 20)}`
                      : addr.address}
                  </span>
                  <button
                    onClick={() => handleCopy(addr.address, addr.id)}
                    className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                  >
                    {copiedId === addr.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>
                </div>
                <div className="text-neutral-500 text-sm">
                  {addr.currency}
                  {addr.network && ` (${addr.network})`}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleEdit(addr)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-blue-400" />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  );
}






