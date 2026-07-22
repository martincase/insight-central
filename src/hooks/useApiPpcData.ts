
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getActualDateRange } from '@/utils/dateUtils';
import { format, subDays } from 'date-fns';
import type { DateFilter } from '@/types/dashboard';

export type AdType = 'all' | 'sp' | 'sb' | 'sd';

export interface ApiPpcMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  cpc: number;
  ctr: number;
  acos: number;
  cpa: number;
}

export interface ApiPpcDailyRow {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  // Vendor-specific fields
  pageViews?: number;
  buyBoxPercentage?: number;
  unitsOrdered?: number;
}

interface UseApiPpcDataOptions {
  accountName: string;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
  adType: AdType;
  merchantToken?: string;
}

interface UseApiPpcDataResult {
  metrics: ApiPpcMetrics;
  previousMetrics: ApiPpcMetrics;
  dailyData: ApiPpcDailyRow[];
  /** Always 'all' combined daily data for heatmap use */
  allDailyData: ApiPpcDailyRow[];
  isLoading: boolean;
  error: string | null;
}

const EMPTY_METRICS: ApiPpcMetrics = {
  impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0,
  cpc: 0, ctr: 0, acos: 0, cpa: 0,
};

function calcDerived(raw: { impressions: number; clicks: number; spend: number; sales: number; orders: number }): ApiPpcMetrics {
  return {
    ...raw,
    cpc: raw.clicks > 0 ? raw.spend / raw.clicks : 0,
    ctr: raw.impressions > 0 ? (raw.clicks / raw.impressions) * 100 : 0,
    acos: raw.sales > 0 ? (raw.spend / raw.sales) * 100 : 0,
    cpa: raw.orders > 0 ? raw.spend / raw.orders : 0,
  };
}

async function resolveProfileId(accountName: string): Promise<number | null> {
  // Try exact match first
  const { data: byName } = await supabase
    .from('accounts_master')
    .select('profile_id')
    .eq('account_name', accountName)
    .limit(1)
    .maybeSingle();
  if (byName?.profile_id) {
    return byName.profile_id;
  }

  // Try case-insensitive match on account_name
  const { data: byNameIlike } = await supabase
    .from('accounts_master')
    .select('profile_id')
    .ilike('account_name', accountName)
    .limit(1)
    .maybeSingle();
  if (byNameIlike?.profile_id) {
    return byNameIlike.profile_id;
  }

  // Try ppc_sellername exact
  const { data: byPpc } = await supabase
    .from('accounts_master')
    .select('profile_id')
    .eq('ppc_sellername', accountName)
    .limit(1)
    .maybeSingle();
  if (byPpc?.profile_id) {
    return byPpc.profile_id;
  }

  // Try case-insensitive ppc_sellername
  const { data: byPpcIlike } = await supabase
    .from('accounts_master')
    .select('profile_id')
    .ilike('ppc_sellername', accountName)
    .limit(1)
    .maybeSingle();
  if (byPpcIlike?.profile_id) {
    return byPpcIlike.profile_id;
  }

  return null;
}

async function fetchSpData(profileId: number, startDate: string, endDate: string) {
  const rows: ApiPpcDailyRow[] = [];
  let from = 0;
  const batchSize = 10000;
  while (true) {
    const { data, error } = await supabase
      .from('amazon_api_campaigns_performance')
      .select('date, impressions, clicks, spend, sales_7d, orders_7d')
      .eq('profile_id', profileId)
      .gte('date', startDate)
      .lte('date', endDate)
      .range(from, from + batchSize - 1);
    if (error) { console.error('SP fetch error:', error); break; }
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({
        date: r.date,
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        spend: Number(r.spend) || 0,
        sales: Number(r.sales_7d) || 0,
        orders: Number(r.orders_7d) || 0,
      });
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return rows;
}

async function fetchSbData(profileId: number, startDate: string, endDate: string) {
  const rows: ApiPpcDailyRow[] = [];
  let from = 0;
  const batchSize = 10000;
  while (true) {
    const { data, error } = await supabase
      .from('amazon_api_sb_campaigns_performance')
      .select('date, impressions, clicks, cost, sales_14d, purchases_14d')
      .eq('profile_id', profileId)
      .gte('date', startDate)
      .lte('date', endDate)
      .range(from, from + batchSize - 1);
    if (error) { console.error('SB fetch error:', error); break; }
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({
        date: r.date || '',
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        spend: Number(r.cost) || 0,
        sales: Number(r.sales_14d) || 0,
        orders: Number(r.purchases_14d) || 0,
      });
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return rows;
}

async function fetchSdData(profileId: number, startDate: string, endDate: string) {
  const rows: ApiPpcDailyRow[] = [];
  let from = 0;
  const batchSize = 10000;
  while (true) {
    const { data, error } = await supabase
      .from('amazon_api_sd_campaigns_performance')
      .select('date, impressions, clicks, cost, sales_14d, purchases_14d')
      .eq('profile_id', profileId)
      .gte('date', startDate)
      .lte('date', endDate)
      .range(from, from + batchSize - 1);
    if (error) { console.error('SD fetch error:', error); break; }
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({
        date: r.date || '',
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        spend: Number(r.cost) || 0,
        sales: Number(r.sales_14d) || 0,
        orders: Number(r.purchases_14d) || 0,
      });
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return rows;
}

async function fetchVendorData(merchantToken: string, startDate: string, endDate: string): Promise<ApiPpcDailyRow[]> {
  const rows: ApiPpcDailyRow[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('daily_vendor_data')
      .select('record_date, sales, units_ordered, page_views, buy_box_percentage')
      .eq('merchant_token', merchantToken)
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .range(from, from + batchSize - 1);
    if (error) { console.error('Vendor fetch error:', error); break; }
    if (!data || data.length === 0) break;
    for (const r of data) {
      rows.push({
        date: r.record_date,
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: Number(r.sales) || 0,
        orders: Number(r.units_ordered) || 0,
        pageViews: Number(r.page_views) || 0,
        buyBoxPercentage: Number(r.buy_box_percentage) || 0,
        unitsOrdered: Number(r.units_ordered) || 0,
      });
    }
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return rows;
}

function aggregateByDate(rows: ApiPpcDailyRow[]): ApiPpcDailyRow[] {
  const map = new Map<string, ApiPpcDailyRow>();
  for (const r of rows) {
    const existing = map.get(r.date);
    if (existing) {
      existing.impressions += r.impressions;
      existing.clicks += r.clicks;
      existing.spend += r.spend;
      existing.sales += r.sales;
      existing.orders += r.orders;
      if (r.pageViews !== undefined) existing.pageViews = (existing.pageViews || 0) + r.pageViews;
      if (r.unitsOrdered !== undefined) existing.unitsOrdered = (existing.unitsOrdered || 0) + r.unitsOrdered;
      // For buyBox, take max (it's a percentage, not additive)
      if (r.buyBoxPercentage !== undefined) existing.buyBoxPercentage = Math.max(existing.buyBoxPercentage || 0, r.buyBoxPercentage);
    } else {
      map.set(r.date, { ...r });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function sumRows(rows: ApiPpcDailyRow[]): { impressions: number; clicks: number; spend: number; sales: number; orders: number } {
  return rows.reduce((acc, r) => ({
    impressions: acc.impressions + r.impressions,
    clicks: acc.clicks + r.clicks,
    spend: acc.spend + r.spend,
    sales: acc.sales + r.sales,
    orders: acc.orders + r.orders,
  }), { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 });
}

function filterByAdType(
  spData: ApiPpcDailyRow[],
  sbData: ApiPpcDailyRow[],
  sdData: ApiPpcDailyRow[],
  adType: AdType
): ApiPpcDailyRow[] {
  switch (adType) {
    case 'sp': return spData;
    case 'sb': return sbData;
    case 'sd': return sdData;
    case 'all':
    default:
      return [...spData, ...sbData, ...sdData];
  }
}

export function useApiPpcData({
  accountName,
  dateFilter,
  customDateRange,
  adType,
  merchantToken,
}: UseApiPpcDataOptions): UseApiPpcDataResult {
  const isVendor = !!merchantToken && merchantToken.startsWith('amzn1.vg.');

  const [metrics, setMetrics] = useState<ApiPpcMetrics>(EMPTY_METRICS);
  const [previousMetrics, setPreviousMetrics] = useState<ApiPpcMetrics>(EMPTY_METRICS);
  const [dailyData, setDailyData] = useState<ApiPpcDailyRow[]>([]);
  const [allDailyData, setAllDailyData] = useState<ApiPpcDailyRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache raw fetched data so toggling adType doesn't re-fetch
  const [rawSp, setRawSp] = useState<ApiPpcDailyRow[]>([]);
  const [rawSb, setRawSb] = useState<ApiPpcDailyRow[]>([]);
  const [rawSd, setRawSd] = useState<ApiPpcDailyRow[]>([]);
  const [prevRawSp, setPrevRawSp] = useState<ApiPpcDailyRow[]>([]);
  const [prevRawSb, setPrevRawSb] = useState<ApiPpcDailyRow[]>([]);
  const [prevRawSd, setPrevRawSd] = useState<ApiPpcDailyRow[]>([]);
  // Vendor raw data cache
  const [rawVendor, setRawVendor] = useState<ApiPpcDailyRow[]>([]);
  const [prevRawVendor, setPrevRawVendor] = useState<ApiPpcDailyRow[]>([]);
  const [dataFetched, setDataFetched] = useState(false);

  const dateRange = getActualDateRange(dateFilter, customDateRange);
  // Always fetch at least 30 days so heatmap has full data even with shorter filters
  const minStart = subDays(new Date(), 30);
  const fetchFrom = dateRange ? (dateRange.from < minStart ? dateRange.from : minStart) : minStart;
  const fetchTo = dateRange ? dateRange.to : new Date();
  const startDate = format(fetchFrom, 'yyyy-MM-dd');
  const endDate = format(fetchTo, 'yyyy-MM-dd');

  // Calculate previous period dates (same duration, shifted back)
  const getPreviousPeriodDates = useCallback(() => {
    if (!dateRange) return { prevStart: '', prevEnd: '' };
    const duration = dateRange.to.getTime() - dateRange.from.getTime();
    const prevEnd = new Date(dateRange.from.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return {
      prevStart: format(prevStart, 'yyyy-MM-dd'),
      prevEnd: format(prevEnd, 'yyyy-MM-dd'),
    };
  }, [startDate, endDate]);

  // Fetch data whenever account/dates change
  useEffect(() => {
    if (!accountName || !startDate || !endDate) return;

    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      setDataFetched(false);
      try {
        const { prevStart, prevEnd } = getPreviousPeriodDates();

        if (isVendor && merchantToken) {
          // VENDOR PATH: query daily_vendor_data
          const [current, prev] = await Promise.all([
            fetchVendorData(merchantToken, startDate, endDate),
            prevStart && prevEnd ? fetchVendorData(merchantToken, prevStart, prevEnd) : Promise.resolve([]),
          ]);
          setRawVendor(current);
          setPrevRawVendor(prev);
          // Clear seller data
          setRawSp([]); setRawSb([]); setRawSd([]);
          setPrevRawSp([]); setPrevRawSb([]); setPrevRawSd([]);
        } else {
          // SELLER PATH: query PPC tables
          const profileId = await resolveProfileId(accountName);
          if (!profileId) {
            setError('Could not resolve profile_id for account');
            setIsLoading(false);
            return;
          }

          const [sp, sb, sd] = await Promise.all([
            fetchSpData(profileId, startDate, endDate),
            fetchSbData(profileId, startDate, endDate),
            fetchSdData(profileId, startDate, endDate),
          ]);

          setRawSp(sp); setRawSb(sb); setRawSd(sd);
          // Clear vendor data
          setRawVendor([]); setPrevRawVendor([]);

          if (prevStart && prevEnd) {
            const [prevSp, prevSb, prevSd] = await Promise.all([
              fetchSpData(profileId, prevStart, prevEnd),
              fetchSbData(profileId, prevStart, prevEnd),
              fetchSdData(profileId, prevStart, prevEnd),
            ]);
            setPrevRawSp(prevSp); setPrevRawSb(prevSb); setPrevRawSd(prevSd);
          }
        }

        setDataFetched(true);
      } catch (err: any) {
        console.error('API PPC data error:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [accountName, merchantToken, startDate, endDate]);

  // The actual user-selected date range (not the extended fetch range)
  const metricsStartDate = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : startDate;
  const metricsEndDate = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : endDate;

  // Recalculate metrics when adType changes or data is fetched
  useEffect(() => {
    if (!dataFetched) return;

    // Filter rows to the actual selected date range for KPI metrics
    const filterToDateRange = (rows: ApiPpcDailyRow[]): ApiPpcDailyRow[] =>
      rows.filter(r => r.date >= metricsStartDate && r.date <= metricsEndDate);

    if (isVendor) {
      // Vendor: aggregate vendor daily data
      const aggregated = aggregateByDate(rawVendor);
      setAllDailyData(aggregated);
      const rangeFiltered = filterToDateRange(aggregated);
      setDailyData(rangeFiltered);
      setMetrics(calcDerived(sumRows(rangeFiltered)));

      const prevAggregated = aggregateByDate(prevRawVendor);
      setPreviousMetrics(calcDerived(sumRows(prevAggregated)));
    } else {
      // Seller: existing PPC logic
      const filtered = filterByAdType(rawSp, rawSb, rawSd, adType);
      const aggregated = aggregateByDate(filtered);
      const rangeFiltered = filterToDateRange(aggregated);
      setDailyData(rangeFiltered);
      setMetrics(calcDerived(sumRows(rangeFiltered)));

      const allFiltered = [...rawSp, ...rawSb, ...rawSd];
      setAllDailyData(aggregateByDate(allFiltered));

      const prevFiltered = filterByAdType(prevRawSp, prevRawSb, prevRawSd, adType);
      setPreviousMetrics(calcDerived(sumRows(prevFiltered)));
    }
  }, [adType, dataFetched, rawSp, rawSb, rawSd, prevRawSp, prevRawSb, prevRawSd, rawVendor, prevRawVendor, isVendor, metricsStartDate, metricsEndDate]);

  return { metrics, previousMetrics, dailyData, allDailyData, isLoading, error };
}
