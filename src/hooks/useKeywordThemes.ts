import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { KeywordThemeData, KeywordThemeFilters, KeywordSortField, SortDirection } from '@/types/ppcAnalytics';

interface UseKeywordThemesOptions {
  filters: KeywordThemeFilters;
  sortField: KeywordSortField;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
  sellerFilter?: string;
}

interface MatchTypeTotals {
  name: string;
  total_spend: number;
  total_sales: number;
  count: number;
}

interface UseKeywordThemesResult {
  data: KeywordThemeData[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  sellers: string[];
  matchTypes: string[];
  matchTypeTotals: MatchTypeTotals[];
  refetch: () => void;
}

interface RawRow {
  keyword: string | null;
  match_type: string | null;
  account_name: string | null;
  campaign_id: number | null;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  sales_7d: number | null;
  orders_7d: number | null;
}

export function useKeywordThemes({
  filters,
  sortField,
  sortDirection,
  page,
  pageSize,
  sellerFilter
}: UseKeywordThemesOptions): UseKeywordThemesResult {
  const [allAggregated, setAllAggregated] = useState<KeywordThemeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<string[]>([]);
  const [matchTypes, setMatchTypes] = useState<string[]>([]);
  const [apiAccountName, setApiAccountName] = useState<string | null | undefined>(undefined);
  const [profileId, setProfileId] = useState<number | null | undefined>(undefined);

  // Resolve profile_id and api_account_name from accounts_master
  useEffect(() => {
    if (!sellerFilter) {
      setApiAccountName(null);
      setProfileId(null);
      return;
    }
    const resolve = async () => {
      // Try matching by account_name first, then by ppc_sellername
      let row = null;
      const { data: byName, error: err1 } = await supabase
        .from('accounts_master')
        .select('profile_id, api_account_name')
        .eq('account_name', sellerFilter)
        .limit(1)
        .maybeSingle();

      if (!err1 && byName) {
        row = byName;
      } else {
        const { data: byPpc, error: err2 } = await supabase
          .from('accounts_master')
          .select('profile_id, api_account_name')
          .eq('ppc_sellername', sellerFilter)
          .limit(1)
          .maybeSingle();
        if (!err2 && byPpc) row = byPpc;
      }

      if (!row) {
        console.error('Account resolve error: no match for', sellerFilter);
        setApiAccountName(null);
        setProfileId(null);
        return;
      }
      setProfileId(row.profile_id ?? null);
      setApiAccountName(row.api_account_name || sellerFilter);
    };
    resolve();
  }, [sellerFilter]);

  // Fetch raw data and aggregate client-side
  const fetchData = useCallback(async () => {
    if (profileId === undefined) return;
    if (!profileId && !apiAccountName) {
      setAllAggregated([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build filter using profile_id (preferred) or account_name (fallback)
      const addFilter = (query: any) => {
        if (profileId) return query.eq('profile_id', profileId);
        return query.eq('account_name', apiAccountName);
      };

      // Find latest report period
      const { data: latestRow, error: dateErr } = await addFilter(
        supabase
          .from('amazon_api_search_terms_performance')
          .select('date_start, date_end')
      )
        .order('date_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dateErr) console.error('Date fetch error:', dateErr);
      if (dateErr || !latestRow) {
        setError('No keyword data found for this account');
        setAllAggregated([]);
        setIsLoading(false);
        return;
      }

      // Fetch all rows for that period
      let query = supabase
        .from('amazon_api_search_terms_performance')
        .select('keyword, match_type, account_name, campaign_id, impressions, clicks, spend, sales_7d, orders_7d');
      query = addFilter(query);
      const { data: rows, error: fetchErr } = await query
        .eq('date_start', latestRow.date_start)
        .eq('date_end', latestRow.date_end)
        .limit(10000);

      if (fetchErr) {
        console.error('Keyword themes fetch error:', fetchErr);
        setError('Failed to fetch keyword theme data');
        setIsLoading(false);
        return;
      }

      // Aggregate by keyword + match_type
      const grouped: Record<string, {
        keyword_text: string;
        match_type: string;
        sellername: string;
        campaigns: Set<number>;
        impressions: number;
        clicks: number;
        spend: number;
        sales: number;
        orders: number;
      }> = {};

      (rows as RawRow[] || []).forEach(row => {
        if (!row.keyword) return;
        const key = `${row.keyword}|||${row.match_type || 'unknown'}`;
        if (!grouped[key]) {
          grouped[key] = {
            keyword_text: row.keyword,
            match_type: row.match_type || 'unknown',
            sellername: row.account_name || '',
            campaigns: new Set(),
            impressions: 0,
            clicks: 0,
            spend: 0,
            sales: 0,
            orders: 0,
          };
        }
        const g = grouped[key];
        if (row.campaign_id) g.campaigns.add(row.campaign_id);
        g.impressions += Number(row.impressions) || 0;
        g.clicks += Number(row.clicks) || 0;
        g.spend += Number(row.spend) || 0;
        g.sales += Number(row.sales_7d) || 0;
        g.orders += Number(row.orders_7d) || 0;
      });

      const aggregated: KeywordThemeData[] = Object.values(grouped).map(g => ({
        keyword_text: g.keyword_text,
        match_type: g.match_type,
        sellername: g.sellername,
        campaign_count: g.campaigns.size,
        total_impressions: g.impressions,
        total_clicks: g.clicks,
        total_spend: g.spend,
        total_sales: g.sales,
        total_orders: g.orders,
        ctr: g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0,
        acos: g.sales > 0 ? (g.spend / g.sales) * 100 : 0,
      }));

      // Extract unique sellers and match types
      const uniqueSellers = [...new Set(aggregated.map(a => a.sellername).filter(Boolean))].sort();
      const uniqueMatchTypes = [...new Set(aggregated.map(a => a.match_type).filter(Boolean))].sort();
      setSellers(uniqueSellers);
      setMatchTypes(uniqueMatchTypes);

      setAllAggregated(aggregated);
    } catch (err) {
      console.error('Error fetching keyword themes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch keyword themes');
      setAllAggregated([]);
    } finally {
      setIsLoading(false);
    }
  }, [profileId, apiAccountName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters, sorting, and pagination client-side
  const filteredAndSorted = useCallback(() => {
    let result = [...allAggregated];

    // Apply match type filter
    if (filters.matchTypes.length > 0) {
      result = result.filter(r => filters.matchTypes.includes(r.match_type));
    }

    // Apply impressions filter
    if (filters.minImpressions > 10) {
      result = result.filter(r => r.total_impressions >= filters.minImpressions);
    }

    // Apply ACOS range filter
    if (filters.acosMin !== null) {
      result = result.filter(r => r.acos >= filters.acosMin!);
    }
    if (filters.acosMax !== null) {
      result = result.filter(r => r.acos <= filters.acosMax!);
    }

    // Apply keyword search filter
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const q = filters.searchTerm.trim().toLowerCase();
      result = result.filter(r => r.keyword_text.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      const av = a[sortField as keyof KeywordThemeData] ?? 0;
      const bv = b[sortField as keyof KeywordThemeData] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const numA = Number(av);
      const numB = Number(bv);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return result;
  }, [allAggregated, filters, sortField, sortDirection]);

  const filtered = filteredAndSorted();
  const totalCount = filtered.length;
  const from = page * pageSize;
  const data = filtered.slice(from, from + pageSize);

  // Compute match type totals from full aggregated data
  const matchTypeTotals: MatchTypeTotals[] = (() => {
    const grouped: Record<string, MatchTypeTotals> = {};
    allAggregated.forEach(item => {
      const mt = (item.match_type || 'unknown').toLowerCase();
      if (!grouped[mt]) {
        grouped[mt] = { name: mt, total_spend: 0, total_sales: 0, count: 0 };
      }
      grouped[mt].total_spend += item.total_spend;
      grouped[mt].total_sales += item.total_sales;
      grouped[mt].count += 1;
    });
    return Object.values(grouped);
  })();

  return {
    data,
    totalCount,
    isLoading,
    error,
    sellers,
    matchTypes,
    matchTypeTotals,
    refetch: fetchData
  };
}
