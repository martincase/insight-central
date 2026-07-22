import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PythonKwRow {
  account_name: string;
  week_start: string;
  week_end: string | null;
  keyword: string;
  source: 'BA+PPC' | 'PPC-only' | 'BA-only' | string;
  has_ba: boolean;
  has_ppc: boolean;
  is_asin: boolean;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  sales: number | null;
  orders: number | null;
  units: number | null;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  acos: number | null;
  roas: number | null;
  search_query_volume: number | null;
  search_query_score: number | null;
  impressions_total_count: number | null;
  impressions_brand_count: number | null;
  clicks_total_count: number | null;
  purchases_total_count: number | null;
  click_rate_pct: number | null;
  impressions_brand_share_pct: number | null;
  clicks_brand_share_pct: number | null;
  basket_add_rate_pct: number | null;
  basket_adds_brand_share_pct: number | null;
  purchase_rate_pct: number | null;
  purchases_brand_share_pct: number | null;
}

export function usePythonKwWeekly(accountName: string | null | undefined) {
  const [rows, setRows] = useState<PythonKwRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountName) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const all: PythonKwRow[] = [];
        const pageSize = 1000;
        let offset = 0;
        while (true) {
          const { data, error } = await supabase
            .from('vw_python_kw_weekly' as any)
            .select('*')
            .eq('account_name', accountName)
            .order('week_start', { ascending: false })
            .range(offset, offset + pageSize - 1);
          if (error) throw error;
          const batch = (data || []) as unknown as PythonKwRow[];
          all.push(...batch);
          if (batch.length < pageSize) break;
          offset += pageSize;
        }
        if (!cancelled) setRows(all);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load keyword data');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountName]);

  const weeks = Array.from(new Set(rows.map((r) => r.week_start))).sort((a, b) =>
    b.localeCompare(a)
  );

  return { rows, weeks, loading, error };
}
