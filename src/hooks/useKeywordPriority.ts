import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Verdict = 'Working' | 'Scale' | 'Fix' | 'Cut' | 'Watch';
export type Confidence = 'high' | 'low' | 'insufficient';
export type DataSource = 'pipeline' | 'ads_api';
export type Bucket = 'keyword' | 'asin_target';

export interface KeywordPriorityRow {
  account_name: string;
  window_weeks: number;
  bucket: Bucket;
  keyword: string;
  is_branded: boolean | null;
  has_ba: boolean | null;
  has_ppc: boolean | null;
  data_source: DataSource;
  confidence: Confidence;
  weeks_with_data: number | null;
  latest_data_date: string | null;
  sq_volume: number | null;
  mkt_impressions: number | null;
  mkt_clicks: number | null;
  mkt_purchases: number | null;
  brand_purchases: number | null;
  impressions_share_pct: number | null;
  purchase_share_pct: number | null;
  market_cvr_pct: number | null;
  ppc_impressions: number | null;
  ppc_clicks: number | null;
  ppc_spend: number | null;
  ppc_sales: number | null;
  ppc_orders: number | null;
  our_cvr_pct: number | null;
  acos: number | null;
  spend_14d: number | null;
  sales_14d: number | null;
  rel_conversion: number | null;
  share_efficiency: number | null;
  momentum_share_pp: number | null;
  priority_score: number | null;
  verdict: Verdict | null;
  verdict_reason: string | null;
  target_acos: number | null;
  js_organic_rank: number | null;
  relevance_score: number | null;
  profile_id?: string | null;
}

export type BrandedFilter = 'all' | 'branded' | 'generic';
export type SortDir = 'asc' | 'desc';

export interface UseKeywordPriorityParams {
  accountName: string | null | undefined;
  windowWeeks: 8 | 13;
  bucket: Bucket;
  verdicts?: Verdict[]; // empty = all
  branded?: BrandedFilter;
  search?: string;
  actionableOnly?: boolean; // excludes Watch
  sortField?: keyof KeywordPriorityRow;
  sortDir?: SortDir;
  page?: number; // 0-indexed
  pageSize?: number;
}

export function useKeywordPriority({
  accountName,
  windowWeeks,
  bucket,
  verdicts = [],
  branded = 'all',
  search = '',
  actionableOnly = true,
  sortField = 'priority_score',
  sortDir = 'desc',
  page = 0,
  pageSize = 50,
}: UseKeywordPriorityParams) {
  const [rows, setRows] = useState<KeywordPriorityRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountName) {
      setRows([]);
      setCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let q = supabase
          .from('vw_keyword_priority' as any)
          .select('*', { count: 'exact' })
          .eq('account_name', accountName)
          .eq('window_weeks', windowWeeks)
          .eq('bucket', bucket);

        if (verdicts.length > 0) {
          q = q.in('verdict', verdicts);
        } else if (actionableOnly) {
          q = q.neq('verdict', 'Watch');
        }
        if (branded === 'branded') q = q.eq('is_branded', true);
        else if (branded === 'generic') q = q.eq('is_branded', false);

        const term = search.trim();
        if (term) q = q.ilike('keyword', `%${term}%`);

        q = q.order(sortField as string, { ascending: sortDir === 'asc', nullsFirst: false });

        const from = page * pageSize;
        const to = from + pageSize - 1;
        q = q.range(from, to);

        const { data, error, count } = await q;
        if (error) throw error;
        if (!cancelled) {
          setRows((data || []) as unknown as KeywordPriorityRow[]);
          setCount(count ?? 0);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load keyword priority');
          setRows([]);
          setCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    accountName,
    windowWeeks,
    bucket,
    verdicts.join(','),
    branded,
    search,
    actionableOnly,
    sortField,
    sortDir,
    page,
    pageSize,
  ]);

  return { rows, count, loading, error };
}

/** Single-row fetch helpers — used for header caption (latest_data_date / target_acos / data_source). */
export function useKeywordPriorityMeta(
  accountName: string | null | undefined,
  windowWeeks: 8 | 13,
  bucket: Bucket,
) {
  const [meta, setMeta] = useState<{
    latest_data_date: string | null;
    target_acos: number | null;
    data_source: DataSource | null;
  }>({ latest_data_date: null, target_acos: null, data_source: null });

  useEffect(() => {
    if (!accountName) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('vw_keyword_priority' as any)
        .select('latest_data_date,target_acos,data_source')
        .eq('account_name', accountName)
        .eq('window_weeks', windowWeeks)
        .eq('bucket', bucket)
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) {
        const d = data as any;
        setMeta({
          latest_data_date: d.latest_data_date ?? null,
          target_acos: d.target_acos ?? null,
          data_source: d.data_source ?? null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountName, windowWeeks, bucket]);

  return meta;
}
