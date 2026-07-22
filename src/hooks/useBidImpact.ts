import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BidImpactData, BidImpactSummary, BidImpactFilters } from '@/types/bidImpact';

export const useBidImpact = (sellerFilter?: string) => {
  const [impactData, setImpactData] = useState<BidImpactData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<string[]>([]);
  const [limit, setLimit] = useState(100);
  const [daysBack, setDaysBack] = useState(30);
  const [filters, setFilters] = useState<BidImpactFilters>({
    seller: sellerFilter || 'Portwest',
    verdict: 'all',
    direction: 'all',
    minMaturity: 0,
    analysisStatus: 'ready', // Default to "ready" to show analysis-ready data first
  });

  // Fetch sellers list from bid change history (fast query)
  useEffect(() => {
    const fetchSellers = async () => {
      const { data } = await supabase
        .from('mv_bid_change_history_v2')
        .select('sellername')
        .not('sellername', 'is', null);
      
      if (data) {
        const uniqueSellers = [...new Set(data.map(d => d.sellername))].filter(Boolean).sort() as string[];
        setSellers(uniqueSellers);
        
        // Set default seller if not already set
        if (!filters.seller && uniqueSellers.length > 0) {
          setFilters(prev => ({ ...prev, seller: uniqueSellers[0] }));
        }
      }
    };
    fetchSellers();
  }, []);

  useEffect(() => {
    if (sellerFilter && sellerFilter !== filters.seller) {
      setFilters(prev => ({ ...prev, seller: sellerFilter }));
    }
  }, [sellerFilter, filters.seller]);

  // Fetch impact data when seller changes - using RPC function with limit/days params
  const fetchImpactData = useCallback(async (selectedSeller: string, queryLimit: number, queryDaysBack: number) => {
    if (!selectedSeller) {
      console.warn('[useBidImpact] fetchImpactData called without seller');
      setImpactData([]);
      return;
    }
    
    console.log('[useBidImpact] Calling get_bid_impact_analysis with:', {
      p_sellername: selectedSeller,
      p_limit: queryLimit,
      p_days_back: queryDaysBack,
    });
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: queryError } = await supabase
        .rpc('get_bid_impact_analysis', { 
          p_sellername: selectedSeller,
          p_limit: queryLimit,
          p_days_back: queryDaysBack
        });

      if (queryError) {
        console.error('[useBidImpact] Supabase RPC error:', queryError);
        throw queryError;
      }

      console.log('[useBidImpact] RPC success, rows returned:', Array.isArray(data) ? data.length : 0);

      const typedData = (data || []) as BidImpactData[];
      setImpactData(typedData);
    } catch (err: any) {
      console.error('[useBidImpact] Failed to fetch impact data:', err);
      const message = err?.message || err?.toString?.() || 'Failed to fetch impact data';
      setError(message);
      setImpactData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when seller, limit, or daysBack changes
  useEffect(() => {
    if (filters.seller) {
      fetchImpactData(filters.seller, limit, daysBack);
    }
  }, [filters.seller, limit, daysBack, fetchImpactData]);

  const filteredData = useMemo(() => {
    return impactData.filter(item => {
      if (filters.seller && item.sellername !== filters.seller) return false;
      if (filters.verdict !== 'all' && item.impact_verdict !== filters.verdict) return false;
      if (filters.direction !== 'all' && item.change_direction !== filters.direction) return false;
      if (item.data_maturity_pct < filters.minMaturity) return false;
      
      // Analysis status filter
      if (filters.analysisStatus === 'ready' && item.impact_verdict === 'pending') return false;
      if (filters.analysisStatus === 'pending' && item.impact_verdict !== 'pending') return false;
      
      return true;
    });
  }, [impactData, filters]);

  const summary = useMemo((): BidImpactSummary => {
    const withData = filteredData.filter(d => d.impact_verdict !== 'no_data' && d.impact_verdict !== 'pending');
    const positives = withData.filter(d => d.impact_verdict === 'positive');
    const negatives = withData.filter(d => d.impact_verdict === 'negative');
    const neutrals = withData.filter(d => d.impact_verdict === 'neutral');
    const pending = filteredData.filter(d => d.impact_verdict === 'pending');

    // Calculate avg sales lift on bid increases
    const increases = withData.filter(d => d.change_direction === 'increase' && d.sales_delta_pct !== null);
    const avgSalesLift = increases.length > 0
      ? increases.reduce((sum, d) => sum + (d.sales_delta_pct || 0), 0) / increases.length
      : 0;

    // Calculate avg ACOS change on bid decreases
    const decreases = withData.filter(d => d.change_direction === 'decrease' && d.acos_delta_pct !== null);
    const avgAcosChange = decreases.length > 0
      ? decreases.reduce((sum, d) => sum + (d.acos_delta_pct || 0), 0) / decreases.length
      : 0;

    // Avg data maturity
    const avgMaturity = filteredData.length > 0
      ? filteredData.reduce((sum, d) => sum + d.data_maturity_pct, 0) / filteredData.length
      : 0;

    return {
      totalBidChanges: filteredData.length,
      withAnalysisData: withData.length,
      avgDataMaturity: avgMaturity,
      positiveImpacts: positives.length,
      negativeImpacts: negatives.length,
      neutralImpacts: neutrals.length,
      winRate: withData.length > 0 ? (positives.length / withData.length) * 100 : 0,
      avgSalesLiftOnIncrease: avgSalesLift,
      avgAcosChangeOnDecrease: avgAcosChange,
    };
  }, [filteredData]);

  // Calendar data for heatmap
  const calendarData = useMemo(() => {
    const dateMap = new Map<string, { count: number; avgChange: number }>();
    
    filteredData.forEach(item => {
      const date = item.bid_change_date;
      const existing = dateMap.get(date);
      if (existing) {
        existing.count += 1;
        existing.avgChange = (existing.avgChange * (existing.count - 1) + item.bid_change_pct) / existing.count;
      } else {
        dateMap.set(date, { count: 1, avgChange: item.bid_change_pct });
      }
    });

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      avgChange: data.avgChange,
    }));
  }, [filteredData]);

  // Scatter data for chart
  const scatterData = useMemo(() => {
    return filteredData
      .filter(d => d.sales_delta_pct !== null && d.impact_verdict !== 'no_data')
      .map(d => ({
        x: d.bid_change_pct,
        y: d.sales_delta_pct || 0,
        keyword: d.keyword_text,
        verdict: d.impact_verdict,
        maturity: d.data_maturity_pct,
      }));
  }, [filteredData]);

  return {
    impactData: filteredData,
    loading,
    error,
    sellers,
    filters,
    setFilters,
    summary,
    calendarData,
    scatterData,
    limit,
    setLimit,
    daysBack,
    setDaysBack,
    refetch: () => fetchImpactData(filters.seller, limit, daysBack),
  };
};
