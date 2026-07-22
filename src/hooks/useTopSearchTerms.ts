import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SearchTermData, SearchTermFilters, SortField, SortDirection } from '@/types/ppcAnalytics';

interface UseTopSearchTermsOptions {
  filters: SearchTermFilters;
  sortField: SortField;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
  sellerFilter?: string; // For client/shared view filtering
}

interface UseTopSearchTermsResult {
  data: SearchTermData[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  sellers: string[];
  refetch: () => void;
}

export function useTopSearchTerms({
  filters,
  sortField,
  sortDirection,
  page,
  pageSize,
  sellerFilter
}: UseTopSearchTermsOptions): UseTopSearchTermsResult {
  const [data, setData] = useState<SearchTermData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query
      let query = supabase
        .from('vw_top_search_terms')
        .select('*', { count: 'exact' });

      // Apply seller filter (for client/shared views)
      if (sellerFilter) {
        query = query.eq('sellername', sellerFilter);
      } else if (filters.sellers.length > 0) {
        query = query.in('sellername', filters.sellers);
      }

      // Apply impressions filter
      if (filters.minImpressions > 10) {
        query = query.gte('total_impressions', filters.minImpressions);
      }

      // Apply ACOS range filter
      if (filters.acosMin !== null) {
        query = query.gte('acos', filters.acosMin);
      }
      if (filters.acosMax !== null) {
        query = query.lte('acos', filters.acosMax);
      }

      // Filter by search term type
      if (filters.searchTermType === 'keywords') {
        query = query.not('customer_search_term', 'ilike', 'B0%');
      } else if (filters.searchTermType === 'asins') {
        query = query.ilike('customer_search_term', 'B0%');
      }

      // Apply search term text filter
      if (filters.searchTerm && filters.searchTerm.trim()) {
        query = query.ilike('customer_search_term', `%${filters.searchTerm.trim()}%`);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: searchTerms, error: queryError, count } = await query;

      console.log('[TopSearchTerms] Query result:', {
        rowsReturned: searchTerms?.length ?? 0,
        exactCount: count,
        page,
        pageSize,
        rangeFrom: page * pageSize,
        rangeTo: page * pageSize + pageSize - 1,
        error: queryError?.message
      });

      if (queryError) throw queryError;

      setData(searchTerms || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching search terms:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch search terms');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortField, sortDirection, page, pageSize, sellerFilter]);

  // Fetch unique sellers for filter dropdown
  const fetchSellers = useCallback(async () => {
    try {
      const { data: sellerData, error: sellerError } = await supabase
        .from('vw_top_search_terms')
        .select('sellername')
        .limit(1000);

      if (sellerError) throw sellerError;

      const uniqueSellers = [...new Set(sellerData?.map(s => s.sellername).filter(Boolean))] as string[];
      setSellers(uniqueSellers.sort());
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  return {
    data,
    totalCount,
    isLoading,
    error,
    sellers,
    refetch: fetchData
  };
}
