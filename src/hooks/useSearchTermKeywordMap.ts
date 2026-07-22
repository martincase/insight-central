import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  SearchTermKeywordMapData, 
  SearchTermKeywordMapFilters, 
  MappingViewMode,
  MappingSortField,
  SortDirection,
  MatchTypeSummary
} from '@/types/ppcAnalytics';

interface RawRow {
  search_term: string;
  keyword: string | null;
  match_type: string | null;
  account_name: string | null;
  campaign_name: string | null;
  ad_group_name: string | null;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  sales_7d: number | null;
  orders_7d: number | null;
}

interface UseSearchTermKeywordMapResult {
  data: SearchTermKeywordMapData[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  negativeCandidates: SearchTermKeywordMapData[];
  matchTypeSummaries: MatchTypeSummary[];
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  sortField: MappingSortField;
  setSortField: (field: MappingSortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (direction: SortDirection) => void;
  filters: SearchTermKeywordMapFilters;
  setFilters: (filters: SearchTermKeywordMapFilters) => void;
  viewMode: MappingViewMode;
  setViewMode: (mode: MappingViewMode) => void;
  drillDownValue: string | null;
  setDrillDownValue: (value: string | null) => void;
  refetch: () => void;
}

export const useSearchTermKeywordMap = (sellerFilter: string): UseSearchTermKeywordMapResult => {
  const [allAggregated, setAllAggregated] = useState<SearchTermKeywordMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiAccountName, setApiAccountName] = useState<string | null | undefined>(undefined);
  const [profileId, setProfileId] = useState<number | null | undefined>(undefined);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<MappingSortField>('total_spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const [viewMode, setViewMode] = useState<MappingViewMode>('all');
  const [drillDownValue, setDrillDownValue] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<SearchTermKeywordMapFilters>({
    matchTypes: [],
    minSpend: 0,
    showNegativeCandidatesOnly: false,
    searchTerm: '',
    keywordText: '',
  });

  // Resolve profile_id and api_account_name
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

  // Fetch raw data and aggregate
  const fetchData = useCallback(async () => {
    if (profileId === undefined) return;
    if (!profileId && !apiAccountName) {
      setAllAggregated([]);
      setLoading(false);
      return;
    }

    setLoading(true);
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
        setError('No search term mapping data found for this account');
        setAllAggregated([]);
        setLoading(false);
        return;
      }

      // Fetch ALL rows for that period using paginated batches
      const BATCH_SIZE = 10000;
      let allRows: RawRow[] = [];
      let batchFrom = 0;

      let batchNumber = 0;
      while (true) {
        batchNumber++;
        const rangeStart = batchFrom;
        const rangeEnd = batchFrom + BATCH_SIZE - 1;
        console.log(`[SearchTermMap] Fetching batch #${batchNumber}: range(${rangeStart}, ${rangeEnd})`);

        let query = supabase
          .from('amazon_api_search_terms_performance')
          .select('search_term, keyword, match_type, account_name, campaign_name, ad_group_name, impressions, clicks, spend, sales_7d, orders_7d');
        query = addFilter(query);
        const { data: batch, error: fetchErr } = await query
          .eq('date_start', latestRow.date_start)
          .eq('date_end', latestRow.date_end)
          .range(rangeStart, rangeEnd);

        if (fetchErr) {
          console.error(`[SearchTermMap] Batch #${batchNumber} ERROR:`, fetchErr);
          setError('Failed to fetch search term keyword mapping data');
          setLoading(false);
          return;
        }

        const batchLen = batch?.length ?? 0;
        console.log(`[SearchTermMap] Batch #${batchNumber} returned ${batchLen} rows, total so far: ${allRows.length + batchLen}`);

        if (!batch || batchLen === 0) break;
        allRows = allRows.concat(batch as RawRow[]);
        if (batchLen < BATCH_SIZE) break;
        batchFrom += BATCH_SIZE;
      }

      const rows = allRows;
      console.log('[SearchTermMap] Total rows fetched:', rows.length);

      // Aggregate by search_term + keyword + match_type + campaign_name + ad_group_name
      const grouped: Record<string, {
        customer_search_term: string;
        keyword_text: string;
        match_type: string;
        sellername: string;
        campaign_name: string;
        ad_group_name: string;
        impressions: number;
        clicks: number;
        spend: number;
        sales: number;
        orders: number;
      }> = {};

      (rows as RawRow[] || []).forEach(row => {
        const key = `${row.search_term}|||${row.keyword || ''}|||${row.match_type || ''}|||${row.campaign_name || ''}|||${row.ad_group_name || ''}`;
        if (!grouped[key]) {
          grouped[key] = {
            customer_search_term: row.search_term,
            keyword_text: row.keyword || '',
            match_type: row.match_type || '',
            sellername: row.account_name || '',
            campaign_name: row.campaign_name || '',
            ad_group_name: row.ad_group_name || '',
            impressions: 0,
            clicks: 0,
            spend: 0,
            sales: 0,
            orders: 0,
          };
        }
        const g = grouped[key];
        g.impressions += Number(row.impressions) || 0;
        g.clicks += Number(row.clicks) || 0;
        g.spend += Number(row.spend) || 0;
        g.sales += Number(row.sales_7d) || 0;
        g.orders += Number(row.orders_7d) || 0;
      });

      const aggregated: SearchTermKeywordMapData[] = Object.values(grouped).map(g => ({
        customer_search_term: g.customer_search_term,
        keyword_text: g.keyword_text,
        match_type: g.match_type,
        sellername: g.sellername,
        campaign_name: g.campaign_name,
        ad_group_name: g.ad_group_name,
        total_impressions: g.impressions,
        total_clicks: g.clicks,
        total_spend: g.spend,
        total_sales: g.sales,
        total_orders: g.orders,
        ctr: g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0,
        acos: g.sales > 0 ? (g.spend / g.sales) * 100 : 0,
        is_negative_candidate: false,
      }));

      setAllAggregated(aggregated);
    } catch (err) {
      console.error('Error fetching search term keyword map:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setAllAggregated([]);
    } finally {
      setLoading(false);
    }
  }, [profileId, apiAccountName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, viewMode, drillDownValue]);

  // Client-side filter, sort, paginate
  const filteredAndSorted = useMemo(() => {
    let result = [...allAggregated];

    // Apply filters
    if (filters.matchTypes.length > 0) {
      result = result.filter(r => filters.matchTypes.includes(r.match_type));
    }
    if (filters.minSpend > 0) {
      result = result.filter(r => r.total_spend >= filters.minSpend);
    }
    if (filters.showNegativeCandidatesOnly) {
      result = result.filter(r => r.is_negative_candidate);
    }
    if (filters.searchTerm) {
      const q = filters.searchTerm.toLowerCase();
      result = result.filter(r => r.customer_search_term.toLowerCase().includes(q));
    }
    if (filters.keywordText) {
      const q = filters.keywordText.toLowerCase();
      result = result.filter(r => r.keyword_text.toLowerCase().includes(q));
    }

    // Apply drill-down
    if (viewMode === 'by-keyword' && drillDownValue) {
      result = result.filter(r => r.keyword_text === drillDownValue);
    } else if (viewMode === 'by-search-term' && drillDownValue) {
      result = result.filter(r => r.customer_search_term === drillDownValue);
    }

    // Sort
    result.sort((a, b) => {
      const av = a[sortField as keyof SearchTermKeywordMapData] ?? 0;
      const bv = b[sortField as keyof SearchTermKeywordMapData] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const numA = Number(av);
      const numB = Number(bv);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return result;
  }, [allAggregated, filters, viewMode, drillDownValue, sortField, sortDirection]);

  const totalCount = filteredAndSorted.length;
  const from = (page - 1) * pageSize;
  const data = filteredAndSorted.slice(from, from + pageSize);

  // Negative candidates: high spend, no sales
  const negativeCandidates = useMemo(() => {
    return allAggregated
      .filter(r => r.total_spend > 0 && r.total_sales === 0)
      .sort((a, b) => b.total_spend - a.total_spend)
      .slice(0, 20);
  }, [allAggregated]);

  // Match type summaries
  const matchTypeSummaries = useMemo((): MatchTypeSummary[] => {
    const grouped: Record<string, {
      match_type: string;
      count: number;
      impressions: number;
      clicks: number;
      orders: number;
      spend: number;
      sales: number;
    }> = {};

    allAggregated.forEach(item => {
      const mt = item.match_type || 'unknown';
      if (!grouped[mt]) {
        grouped[mt] = { match_type: mt, count: 0, impressions: 0, clicks: 0, orders: 0, spend: 0, sales: 0 };
      }
      const g = grouped[mt];
      g.count += 1;
      g.impressions += item.total_impressions;
      g.clicks += item.total_clicks;
      g.orders += item.total_orders;
      g.spend += item.total_spend;
      g.sales += item.total_sales;
    });

    return Object.values(grouped)
      .filter(g => g.count > 0)
      .map(g => ({
        match_type: g.match_type,
        total_mappings: g.count,
        total_impressions: g.impressions,
        total_clicks: g.clicks,
        total_orders: g.orders,
        total_spend: g.spend,
        total_sales: g.sales,
        avg_acos: g.sales > 0 ? (g.spend / g.sales) * 100 : 0,
        avg_cpc: g.clicks > 0 ? g.spend / g.clicks : 0,
        avg_ctr: g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0,
        conversion_rate: g.clicks > 0 ? (g.orders / g.clicks) * 100 : 0,
      }));
  }, [allAggregated]);

  return {
    data,
    loading,
    error,
    totalCount,
    negativeCandidates,
    matchTypeSummaries,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filters,
    setFilters,
    viewMode,
    setViewMode,
    drillDownValue,
    setDrillDownValue,
    refetch: fetchData,
  };
};
