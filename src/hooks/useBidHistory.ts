import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  BidChangeData, 
  BidHistoryFilters, 
  BidHistorySummary, 
  BidHistoryTimelineData,
  BidHistorySortField 
} from '@/types/bidHistory';

const PAGE_SIZE = 25;

export const useBidHistory = (sellerFilter?: string) => {
  const [bidChanges, setBidChanges] = useState<BidChangeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<number[]>([]);
  const [apiAccountName, setApiAccountName] = useState<string | undefined>(undefined);
  const [filters, setFilters] = useState<BidHistoryFilters>({
    sellers: [],
    keywords: [],
    dateRange: null,
    changeDirection: 'all',
    minChangePercent: null,
  });
  const [sortField, setSortField] = useState<BidHistorySortField>('snapshot_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // Resolve api_account_name from accounts_master
  useEffect(() => {
    const resolve = async () => {
      const effectiveSeller = sellerFilter || 'Pea_Pops';
      const { data: row } = await supabase
        .from('accounts_master')
        .select('api_account_name')
        .eq('account_name', effectiveSeller)
        .maybeSingle();
      setApiAccountName(row?.api_account_name || effectiveSeller);
    };
    resolve();
  }, [sellerFilter]);

  useEffect(() => {
    if (apiAccountName === undefined) return;
    if (apiAccountName) {
      fetchBidChanges(apiAccountName);
    }
  }, [apiAccountName]);

  const fetchBidChanges = async (effectiveSeller: string) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date 30 days ago (YYYY-MM-DD) to limit dataset
      const now = new Date();
      const past = new Date(now);
      past.setDate(now.getDate() - 30);
      const pastIso = past.toISOString().split('T')[0];

      // Query the bid change view
      const { data, error: fetchError } = await supabase
        .from('mv_bid_change_history')
        .select('campaign_id, ad_group_id, keyword_id, keyword_text, sellername, snapshot_date, previous_bid, new_bid, bid_change, bid_change_pct')
        .eq('sellername', effectiveSeller)
        .gte('snapshot_date', pastIso)
        .order('snapshot_date', { ascending: false })
        .limit(5000);

      if (fetchError) {
        console.error('[BidHistory] Supabase error details:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
        });
        throw fetchError;
      }

      const bidChangesData = (data || []) as BidChangeData[];
      console.info('[BidHistory] Loaded from view (changes only):', bidChangesData.length, 'rows for', effectiveSeller);
      setBidChanges(bidChangesData);

      // Extract unique sellers
      const uniqueSellers = [...new Set(bidChangesData.map(d => d.sellername))].filter(Boolean).sort();
      setSellers(uniqueSellers);
    } catch (err) {
      console.error('Error fetching bid changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bid changes');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const filteredChanges = useMemo(() => {
    let result = [...bidChanges];

    // Filter by sellers
    if (filters.sellers.length > 0) {
      result = result.filter(d => filters.sellers.includes(d.sellername));
    }

    // Filter by keywords
    if (filters.keywords.length > 0) {
      const keywordLower = filters.keywords.map(k => k.toLowerCase());
      result = result.filter(d => 
        keywordLower.some(k => d.keyword_text?.toLowerCase().includes(k))
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      const from = filters.dateRange.from.toISOString().split('T')[0];
      const to = filters.dateRange.to.toISOString().split('T')[0];
      result = result.filter(d => d.snapshot_date >= from && d.snapshot_date <= to);
    }

    // Filter by change direction
    if (filters.changeDirection === 'increases') {
      result = result.filter(d => d.bid_change > 0);
    } else if (filters.changeDirection === 'decreases') {
      result = result.filter(d => d.bid_change < 0);
    }

    // Filter by minimum change percent
    if (filters.minChangePercent !== null) {
      result = result.filter(d => Math.abs(d.bid_change_pct) >= filters.minChangePercent!);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'bid_change' || sortField === 'bid_change_pct') {
        aVal = Math.abs(aVal);
        bVal = Math.abs(bVal);
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [bidChanges, filters, sortField, sortDirection]);

  // Calculate summary stats
  const summary: BidHistorySummary = useMemo(() => {
    const increases = filteredChanges.filter(d => d.bid_change > 0);
    const decreases = filteredChanges.filter(d => d.bid_change < 0);
    
    const totalChangeAmount = filteredChanges.reduce((sum, d) => sum + d.bid_change, 0);
    const totalChangePct = filteredChanges.reduce((sum, d) => sum + d.bid_change_pct, 0);

    const dates = filteredChanges.map(d => d.snapshot_date).sort();
    const dateFrom = dates[0];
    const dateTo = dates[dates.length - 1];

    return {
      totalChanges: filteredChanges.length,
      increases: increases.length,
      decreases: decreases.length,
      avgChangeAmount: filteredChanges.length > 0 ? totalChangeAmount / filteredChanges.length : 0,
      avgChangePct: filteredChanges.length > 0 ? totalChangePct / filteredChanges.length : 0,
      dateFrom,
      dateTo,
    };
  }, [filteredChanges]);

  // Paginated results
  const paginatedChanges = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredChanges.slice(start, start + PAGE_SIZE);
  }, [filteredChanges, page]);

  const totalPages = Math.ceil(filteredChanges.length / PAGE_SIZE);

  // Build timeline data for selected keywords
  const timelineData: BidHistoryTimelineData[] = useMemo(() => {
    if (selectedKeywords.length === 0) return [];

    return selectedKeywords.map(keywordId => {
      const keywordChanges = bidChanges
        .filter(d => d.keyword_id === keywordId)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

      if (keywordChanges.length === 0) return null;

      const first = keywordChanges[0];
      
      // Build data points including the initial bid and all changes
      const dataPoints: BidHistoryTimelineData['dataPoints'] = [];
      
      // Add initial point (previous bid of first change)
      const initialDate = new Date(first.snapshot_date);
      initialDate.setDate(initialDate.getDate() - 1);
      dataPoints.push({
        date: initialDate.toISOString().split('T')[0],
        bid: first.previous_bid,
        isChange: false,
      });

      // Add all change points
      keywordChanges.forEach(change => {
        dataPoints.push({
          date: change.snapshot_date,
          bid: change.new_bid,
          isChange: true,
          changeAmount: change.bid_change,
          changePct: change.bid_change_pct,
        });
      });

      return {
        keyword_id: keywordId,
        keyword_text: first.keyword_text,
        sellername: first.sellername,
        dataPoints,
      };
    }).filter(Boolean) as BidHistoryTimelineData[];
  }, [selectedKeywords, bidChanges]);

  const toggleKeywordSelection = (keywordId: number) => {
    setSelectedKeywords(prev => {
      if (prev.includes(keywordId)) {
        return prev.filter(id => id !== keywordId);
      }
      // Limit to 5 keywords on the chart
      if (prev.length >= 5) {
        return [...prev.slice(1), keywordId];
      }
      return [...prev, keywordId];
    });
  };

  const clearSelectedKeywords = () => {
    setSelectedKeywords([]);
  };

  return {
    bidChanges: paginatedChanges,
    allBidChanges: filteredChanges,
    loading,
    error,
    sellers,
    filters,
    setFilters,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    page,
    setPage,
    totalPages,
    summary,
    timelineData,
    selectedKeywords,
    toggleKeywordSelection,
    clearSelectedKeywords,
    refetch: fetchBidChanges,
  };
};
