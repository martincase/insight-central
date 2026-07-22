import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PythonFinancialRow {
  account_name: string;
  week_start: string;
  week_end: string | null;
  product_asin: string | null;
  product_sku: string | null;
  product_product_name: string | null;
  total_sales_revenue: number | null;
  net_sales_revenue: number | null;
  total_units_sold: number | null;
  units_refunded: number | null;
  return_rate: number | null;
  avg_sales_price: number | null;
  referral_fee: number | null;
  fba_fulfilment_fee: number | null;
  storage_cost: number | null;
  cogs: number | null;
  sponsored_products_charges: number | null;
  advertising_cost: number | null;
  selling_fees: number | null;
  fulfilment_cost: number | null;
  return_recovery_cost: number | null;
  other_charges: number | null;
  net_proceeds: number | null;
  net_margin_pct: number | null;
}

export interface WeeklyAgg {
  week_start: string;
  total_sales_revenue: number;
  net_proceeds: number;
  cogs: number;
  net_margin_pct: number;
}

export function usePythonFinancialWeekly(accountName: string | null | undefined) {
  const [rows, setRows] = useState<PythonFinancialRow[]>([]);
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
        const all: PythonFinancialRow[] = [];
        const pageSize = 1000;
        let offset = 0;
        while (true) {
          const { data, error } = await supabase
            .from('vw_python_financial_weekly' as any)
            .select('week_start, product_asin, total_sales_revenue, net_proceeds, cogs, net_margin_pct')
            .eq('account_name', accountName)
            .order('week_start', { ascending: true })
            .range(offset, offset + pageSize - 1);
          if (error) throw error;
          const batch = (data || []) as unknown as PythonFinancialRow[];
          all.push(...batch);
          if (batch.length < pageSize) break;
          offset += pageSize;
        }
        if (!cancelled) setRows(all);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load financial data');
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

  const byWeek = new Map<string, WeeklyAgg>();
  for (const r of rows) {
    const w = r.week_start;
    const cur = byWeek.get(w) || {
      week_start: w,
      total_sales_revenue: 0,
      net_proceeds: 0,
      cogs: 0,
      net_margin_pct: 0,
    };
    cur.total_sales_revenue += Number(r.total_sales_revenue) || 0;
    cur.net_proceeds += Number(r.net_proceeds) || 0;
    cur.cogs += Number(r.cogs) || 0;
    byWeek.set(w, cur);
  }
  const weekly: WeeklyAgg[] = Array.from(byWeek.values())
    .map((w) => ({
      ...w,
      net_margin_pct:
        w.total_sales_revenue !== 0 ? (w.net_proceeds / w.total_sales_revenue) * 100 : 0,
    }))
    .sort((a, b) => a.week_start.localeCompare(b.week_start));

  const totalCogs = weekly.reduce((s, w) => s + w.cogs, 0);
  const cogsSupplied = totalCogs > 0;

  return { weekly, loading, error, cogsSupplied };
}
