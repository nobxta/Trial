'use client';

import { useEffect, useState } from 'react';
import WalletsPayoutsManager from '@/components/admin/WalletsPayoutsManager';

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletsRes, payoutsRes] = await Promise.all([
          fetch('/api/admin/wallets'),
          fetch('/api/admin/payouts'),
        ]);

        if (walletsRes.ok) {
          const walletsData = await walletsRes.json();
          setWallets(walletsData.wallets || []);
        }

        if (payoutsRes.ok) {
          const payoutsData = await payoutsRes.json();
          setPayouts(payoutsData.payouts || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="admin-page-enter">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6">Wallets / Payouts</h1>
      <WalletsPayoutsManager initialWallets={wallets} initialPayouts={payouts} />
    </div>
  );
}
