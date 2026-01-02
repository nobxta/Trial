import { requireAdmin } from '@/lib/admin-rbac';
import ExchangePairEditor from '@/components/admin/ExchangePairEditor';
import { supabaseAdmin } from '@/lib/supabase';

async function getExchangePairs() {
  const { data, error } = await supabaseAdmin!
    .from('exchange_pairs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch exchange pairs:', error);
    return { pairs: [] };
  }

  return { pairs: data || [] };
}

export default async function AdminExchangePage() {
  await requireAdmin('viewer');
  const { pairs } = await getExchangePairs();

  return (
    <div className="admin-page-enter">
      <h1 className="text-2xl font-bold mb-6">Exchange Engine</h1>
      <ExchangePairEditor pairs={pairs} />
    </div>
  );
}

