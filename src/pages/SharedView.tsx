import { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useParams } from 'react-router-dom';
import { useApiPpcData, type AdType } from '@/hooks/useApiPpcData';
import { calculatePeriodData, getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
import { AccountData, DateFilter, ASINData, InventoryData } from '@/types/dashboard';
import { normalizedBrandName } from '@/utils/shareUtils';
import { getCountryInfo, getCountryFlagImage, getCountryName } from '@/utils/countryUtils';
import { processInventoryData, fetchInventoryData } from '@/utils/inventoryProcessor';
import { processASINData, detectMissingDates, getASINFallbackInfo, getVendorCurrentDateRange } from '@/utils/asinProcessor';
import { updateAccountsWithFilteredData } from '@/utils/dataProcessor';
import { fetchAccountsFromSheet } from '@/utils/accountsProcessor';
import { fetchVendorData } from '@/utils/vendorProcessor';
import { fetchASINDataFromSupabase, fetchVendorDataFromSupabase, fetchInventoryFromSupabase } from '@/utils/supabaseDataFetchers';
import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import { supabase } from '@/integrations/supabase/client';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { SalesHeatmap } from '@/components/dashboard/SalesHeatmap';
import { MonthlyPerformanceView } from '@/components/dashboard/MonthlyPerformanceView';
import { MonthlyPerformanceTable } from '@/components/dashboard/MonthlyPerformanceTable';
import { ASINDataTable } from '@/components/dashboard/ASINDataTable';
import { InventoryTable } from '@/components/dashboard/InventoryTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScreenshotEmailButton } from '@/components/dashboard/ScreenshotEmailButton';
import { ShareableLink } from '@/components/dashboard/ShareableLink';
import { ClientAlertsCard } from '@/components/dashboard/ClientAlertsCard';
import { ApiSearchTermsDashboard } from '@/components/ppc-analytics/ApiSearchTermsDashboard';
import { KeywordThemesDashboard } from '@/components/ppc-analytics/KeywordThemesDashboard';
import { SearchTermKeywordMapDashboard } from '@/components/ppc-analytics/SearchTermKeywordMapDashboard';
import { BrandAnalyticsDashboard } from '@/components/ppc-analytics/BrandAnalyticsDashboard';
import { BrandAnalyticsCountry } from '@/components/dashboard/BrandAnalyticsCountry';
import { ProductFinancialDashboard } from '@/components/dashboard/ProductFinancialDashboard';
import { PnlDashboard } from '@/components/dashboard/PnlDashboard';
import { CollapsibleAlerts } from '@/components/dashboard/CollapsibleAlerts';
import { PerformanceExportButton } from '@/components/dashboard/PerformanceExportButton';
import { Calendar, CalendarX, Download, Map, RefreshCw, BarChart3, Search, TrendingUp, DollarSign, Package, Activity, Wallet } from 'lucide-react';
import { BudgetsSection } from '@/components/budgets/BudgetsSection';
import { ApiAdvertisedProductsDashboard } from '@/components/ppc-analytics/ApiAdvertisedProductsDashboard';
import { InventoryPlannerDashboard } from '@/components/dashboard/InventoryPlannerDashboard';
import { StockInventoryTable } from '@/components/dashboard/StockInventoryTable';
import { StockoutImpactSection } from '@/components/dashboard/StockoutImpactSection';
import { BuyBoxAlertsCard } from '@/components/dashboard/BuyBoxAlertsCard';
import { Link } from 'react-router-dom';
import { isVendorAccount } from '@/utils/vendorUtils';
import { DateFilterSelector } from '@/components/dashboard/DateFilterSelector';
import { getDateDisplayText, formatDateRangeText } from '@/utils/dateUtils';
import { 
  SalesHeatmapSkeleton, 
  MetricsGridSkeleton, 
  MonthlyPerformanceSkeleton, 
  TableSkeleton 
} from '@/components/dashboard/DashboardSkeletons';
import { AIAnalystChat } from '@/components/dashboard/AIAnalystChat';
import { useTabAvailability } from '@/hooks/useTabAvailability';
import { UnlockDashboardModal } from '@/components/dashboard/UnlockDashboardModal';
import { Sparkles } from 'lucide-react';
import { useBrandCountries } from '@/hooks/useBrandCountries';
import { CountrySwitcher, type CountryScope } from '@/components/dashboard/CountrySwitcher';
import { MultiCountryPanel } from '@/components/dashboard/MultiCountryPanel';
import { SalesTrendCard } from '@/components/dashboard/SalesTrendCard';

import { SalesDriversTab } from '@/components/dashboard/SalesDriversTab';
import { CountryScopedPerformance } from '@/components/dashboard/CountryScopedPerformance';

type ClientTab = 'performance' | 'sales-drivers' | 'search-terms' | 'advertised-products' | 'brand-analytics' | 'profit-loss' | 'budgets' | 'inventory-planner';

interface SharedViewProps {
  forcedShareId?: string;
  forcedBrandName?: string;
  isDemo?: boolean;
}

const SharedView = ({ forcedShareId, forcedBrandName, isDemo }: SharedViewProps = {}) => {
  const params = useParams<{ shareId: string; brandName?: string }>();
  const shareId = forcedShareId ?? params.shareId;
  const brandName = forcedBrandName ?? params.brandName;
  const [account, setAccount] = useState<AccountData | null>(null);
  const [status, setStatus] = useState('Initializing...');
  const [isLoading, setIsLoading] = useState(true);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [ppcData, setPpcData] = useState<any[]>([]);
  const [vendorData, setVendorData] = useState<any[]>([]);
  const [asinData, setAsinData] = useState<ASINData[]>([]);
  const [rawAsinData, setRawAsinData] = useState<any[]>([]);
  const [rawVendorData, setRawVendorData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryData[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('last-14-days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [selectedChartMetrics, setSelectedChartMetrics] = useState<string[]>(['sales', 'ppcSales']);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientTab>('performance');
  const { availability: tabAvailability, ready: tabAvailabilityReady } = useTabAvailability(account?.name, account?.merchantToken, account?.profileId);
  const isVendor = account?.type === 'vendor' || isVendorAccount(account?.merchantToken);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockAutoShown, setUnlockAutoShown] = useState(false);
  const dismissKey = account?.shareCode ? `unlock-modal-dismissed:${account.shareCode}` : null;
  const brandCountries = useBrandCountries(account?.merchantToken);
  const [budgetsEnabled, setBudgetsEnabled] = useState(false);
  const [budgetsConfig, setBudgetsConfig] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    const spid = brandCountries.spid;
    if (!spid) { setBudgetsEnabled(false); setBudgetsConfig(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase.rpc as any)('rpc_dashboard_addons', { p_spid: spid });
        if (cancelled) return;
        const row = (data as any[] | null)?.find((r) => r.addon_key === 'budgets');
        setBudgetsEnabled(row?.enabled === true);
        setBudgetsConfig(row?.config ?? null);
      } catch (e) {
        if (!cancelled) { setBudgetsEnabled(false); setBudgetsConfig(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [brandCountries.spid]);

  const [countryScope, setCountryScope] = useState<CountryScope | null>(null);
  useEffect(() => {
    if (!countryScope && brandCountries.primary) setCountryScope(brandCountries.primary.country_code);
  }, [countryScope, brandCountries.primary]);
  const effectiveScope: CountryScope = countryScope || brandCountries.primary?.country_code || 'GB';

  useEffect(() => {
    const map: Record<ClientTab, boolean> = {
      'performance': true,
      'sales-drivers': true,
      'search-terms': tabAvailability.searchTerms,
      'advertised-products': tabAvailability.adProducts,
      'brand-analytics': tabAvailability.brandAnalytics,
      'profit-loss': !isVendor && tabAvailability.profitLoss,
      'budgets': budgetsEnabled,
      'inventory-planner': !isVendor && tabAvailability.inventory,
    };
    if (!map[activeTab]) setActiveTab('performance');
  }, [tabAvailability, activeTab, isVendor]);

  useEffect(() => {
    if (!tabAvailabilityReady || unlockAutoShown || !dismissKey) return;
    const missingBA = tabAvailability.brandAnalytics === false;
    const missingPL = tabAvailability.profitLoss === false;
    if (!missingBA && !missingPL) return;
    try {
      if (localStorage.getItem(dismissKey) === '1') {
        setUnlockAutoShown(true);
        return;
      }
    } catch {}
    setUnlockModalOpen(true);
    setUnlockAutoShown(true);
  }, [tabAvailabilityReady, tabAvailability, unlockAutoShown, dismissKey]);
  const [adType, setAdType] = useState<AdType>('all');
  const [loadingProgress, setLoadingProgress] = useState<{
    sales: boolean;
    ppc: boolean;
    asin: boolean;
    inventory: boolean;
    vendor: boolean;
  }>({
    sales: false,
    ppc: false,
    asin: false,
    inventory: false,
    vendor: false // Will be set based on account type
  });

  // API PPC data hook - fetches from Amazon Advertising API tables
  const { metrics: apiPpcMetrics, previousMetrics: apiPpcPreviousMetrics, isLoading: apiPpcLoading, allDailyData: apiPpcAllDaily } = useApiPpcData({
    accountName: account?.name || '',
    dateFilter,
    customDateRange,
    adType,
    merchantToken: account?.merchantToken,
  });

  // Compute direct organic metrics from raw sheetData
  const directOrganicMetrics = useMemo(() => {
    if (sheetData.length === 0 || !account) return null;
    const currentRange = getCurrentDateRange(dateFilter, customDateRange);
    const data = calculatePeriodData(sheetData, ppcData, account.merchantToken, account.ppcAccountName, currentRange);
    return {
      sales: data.sales || 0, ppcSpend: data.ppcSpend || 0, ppcSales: data.ppcSales || 0,
      unitsOrdered: data.unitsOrdered || 0, pageViews: data.pageViews || 0,
      buyBoxPercentage: data.buyBoxPercentage || 0, conversionRate: data.conversionRate || 0,
      impressions: data.impressions || 0, clicks: data.clicks || 0,
      cpc: data.cpc || 0, ctr: data.ctr || 0, acos: data.acos || 0,
      tacos: data.sales > 0 ? (data.ppcSpend / data.sales) * 100 : 0,
    };
  }, [sheetData, ppcData, account, dateFilter, customDateRange]);

  const directOrganicPreviousMetrics = useMemo(() => {
    if (sheetData.length === 0 || !account) return null;
    const previousRange = getPreviousDateRange(dateFilter, customDateRange);
    const data = calculatePeriodData(sheetData, ppcData, account.merchantToken, account.ppcAccountName, previousRange);
    return {
      sales: data.sales || 0, ppcSpend: data.ppcSpend || 0, ppcSales: data.ppcSales || 0,
      unitsOrdered: data.unitsOrdered || 0, pageViews: data.pageViews || 0,
      buyBoxPercentage: data.buyBoxPercentage || 0, conversionRate: data.conversionRate || 0,
      impressions: data.impressions || 0, clicks: data.clicks || 0,
      cpc: data.cpc || 0, ctr: data.ctr || 0, acos: data.acos || 0,
      tacos: data.sales > 0 ? (data.ppcSpend / data.sales) * 100 : 0,
    };
  }, [sheetData, ppcData, account, dateFilter, customDateRange]);

  const hasNoActivity = useMemo(() => {
    if (loadingProgress.sales || loadingProgress.ppc || apiPpcLoading) return false;
    const salesTotal = (directOrganicMetrics?.sales || 0) + (apiPpcMetrics?.sales || 0);
    const unitsTotal = (directOrganicMetrics?.unitsOrdered || 0);
    const adSpend = (apiPpcMetrics?.spend || 0);
    const adSales = (apiPpcMetrics?.sales || 0);
    return salesTotal === 0 && unitsTotal === 0 && adSpend === 0 && adSales === 0;
  }, [loadingProgress.sales, loadingProgress.ppc, apiPpcLoading, directOrganicMetrics, apiPpcMetrics]);

  const vendorHeatmapRows = useMemo(() => {
    if (account?.type !== 'vendor' || !apiPpcAllDaily?.length) return [];
    return apiPpcAllDaily.map((d: any) => ({
      merchant_token: account.merchantToken,
      record_date: d.date,
      sales: d.sales ?? 0,
      units_ordered: d.unitsOrdered ?? d.orders ?? 0,
    }));
  }, [account, apiPpcAllDaily]);

  // Feature flag to control ASIN functionality in SharedView
  const ASIN_FEATURE_ENABLED = true;

  const toggleChartMetric = (metricKey: string) => {
    setSelectedChartMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  useEffect(() => {
    loadAccountData();
  }, [shareId, brandName]);

  // Helper: fetch sales from Supabase and map to sheet-compatible format
  const fetchSalesFromSupabase = async (merchantToken: string, dateRange: { from: Date; to: Date }) => {
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('perplexity_sales_data')
      .select('record_date, account_name, ordered_product_sales_amount, ordered_product_sales_currency, units_ordered, browser_sessions, browser_pageviews, buybox_percentage, unit_session_percentage, negative_feedback_received')
      .eq('account_name', merchantToken)
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .order('record_date', { ascending: true });

    if (error) {
      return [];
    }
    if (!data || data.length === 0) {
      return [];
    }

    // Map to the 2D array format that calculatePeriodData and SalesHeatmap expect
    // Header row first, then data rows
    const header = ['datasource', 'date', 'source', 'account_id', 'account_name', 'sales_amount', 'currency', 'units_ordered', 'sessions', 'pageviews', 'buybox_percentage', 'negative_feedback', 'conversion_rate'];
    const rows = data.map((row: any) => {
      // Convert record_date (yyyy-MM-dd) to dd/MM/yyyy format expected by calculatePeriodData
      const [y, m, d] = (row.record_date as string).split('-');
      const dateStr = `${d}/${m}/${y}`;
      return [
        'perplexity',                                         // [0] datasource
        dateStr,                                              // [1] date (dd/MM/yyyy)
        'supabase',                                           // [2] source
        row.account_name,                                     // [3] account_id (merchantToken)
        row.account_name,                                     // [4] account_name
        String(row.ordered_product_sales_amount || 0),        // [5] sales_amount
        row.ordered_product_sales_currency || 'GBP',          // [6] currency
        String(row.units_ordered || 0),                       // [7] units_ordered
        String(row.browser_sessions || 0),                    // [8] sessions
        String(row.browser_pageviews || 0),                   // [9] pageviews
        String(row.buybox_percentage || 0),                   // [10] buybox_percentage
        String(row.negative_feedback_received || 0),          // [11] negative_feedback
        String(row.unit_session_percentage || 0),             // [12] conversion_rate
      ];
    });
    return [header, ...rows];
  };

  // Also fetch a wider window for previous period comparisons
  const fetchSalesFromSupabaseWide = async (merchantToken: string) => {
    // Fetch 90 days to cover any date filter + previous period
    const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');
    
    const allData: any[] = [];
    let offset = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('perplexity_sales_data')
        .select('record_date, account_name, ordered_product_sales_amount, ordered_product_sales_currency, units_ordered, browser_sessions, browser_pageviews, buybox_percentage, unit_session_percentage, negative_feedback_received')
        .eq('account_name', merchantToken)
        .gte('record_date', startDate)
        .lte('record_date', endDate)
        .order('record_date', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        break;
      }
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    if (allData.length === 0) return [];

    const header = ['datasource', 'date', 'source', 'account_id', 'account_name', 'sales_amount', 'currency', 'units_ordered', 'sessions', 'pageviews', 'buybox_percentage', 'negative_feedback', 'conversion_rate'];
    const rows = allData.map((row: any) => {
      const [y, m, d] = (row.record_date as string).split('-');
      const dateStr = `${d}/${m}/${y}`;
      return [
        'perplexity', dateStr, 'supabase', row.account_name, row.account_name,
        String(row.ordered_product_sales_amount || 0), row.ordered_product_sales_currency || 'GBP',
        String(row.units_ordered || 0), String(row.browser_sessions || 0),
        String(row.browser_pageviews || 0), String(row.buybox_percentage || 0),
        String(row.negative_feedback_received || 0), String(row.unit_session_percentage || 0),
      ];
    });
    return [header, ...rows];
  };

  // Auto-refresh data when date filter changes
  useEffect(() => {
    if (!account) return;

    // Re-query Supabase sales data with new date range
    const refreshData = async () => {
      try {
        const supabaseSales = await fetchSalesFromSupabaseWide(account.merchantToken);
        if (supabaseSales.length > 1) {
          setSheetData(supabaseSales);
          const updatedAccounts = updateAccountsWithFilteredData([account], supabaseSales, ppcData, dateFilter, customDateRange, vendorData);
          setAccount(updatedAccounts[0]);
        } else if (sheetData.length > 0) {
          // Fallback to existing sheet data
          const updatedAccounts = updateAccountsWithFilteredData([account], sheetData, ppcData, dateFilter, customDateRange, vendorData);
          setAccount(updatedAccounts[0]);
        }
      } catch (err) {
        console.error('Error refreshing sales data on date change:', err);
        if (sheetData.length > 0) {
          const updatedAccounts = updateAccountsWithFilteredData([account], sheetData, ppcData, dateFilter, customDateRange, vendorData);
          setAccount(updatedAccounts[0]);
        }
      }

      // Re-process ASIN data with new date filter
      if (ASIN_FEATURE_ENABLED) {
        fetchASINDataFromSupabase(account.merchantToken)
          .then(asinDataValues => {
            if (asinDataValues.length === 0) { setAsinData([]); return; }
            const processedAsinData = processASINData(asinDataValues, account.merchantToken, dateFilter, customDateRange, vendorData);
            setAsinData(Array.isArray(processedAsinData) ? processedAsinData : []);
          })
          .catch(() => setAsinData([]));
      }
    };

    refreshData();
  }, [dateFilter, customDateRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAccountData();
    setIsRefreshing(false);
  };

  const loadAccountData = async () => {
    try {
      setStatus('Loading account data...');
      
      if (!shareId || !brandName) {
        setStatus('Missing shareId or brandName');
        setIsLoading(false);
        return;
      }

      // Timeout helper for all fetch operations
      const fetchWithTimeout = (promise: Promise<any>, timeoutMs = 15000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };

      // ── PHASE 1: Instant render from Supabase ──
      let matchedAccount: AccountData | null = null;
      let usedSupabaseFastPath = false;

      try {
        const { data: masterRow, error: masterError } = await supabase
          .from('accounts_master')
          .select('*')
          .eq('share_code', shareId)
          .limit(1)
          .maybeSingle();

        if (!masterError && masterRow) {
          // Validate brand name matches for security
          const nameMatch = normalizedBrandName(masterRow.account_name) === normalizedBrandName(brandName);
          if (nameMatch) {
            matchedAccount = {
              id: `${masterRow.merchant_token}-${masterRow.account_name.replace(/\s+/g, '-')}`,
              name: masterRow.account_name,
              sales: 0, ppcSpend: 0, ppcSales: 0, acos: 0, tacos: 0,
              unitsOrdered: 0, pageViews: 0, buyBoxPercentage: 0, conversionRate: 0,
              impressions: 0, clicks: 0, cpc: 0, ctr: 0,
              sellerCentralLink: masterRow.seller_central_link || '',
              merchantToken: masterRow.merchant_token,
              ppcAccountName: masterRow.ppc_account_name || undefined,
              ppc_sellername: masterRow.ppc_sellername || null,
              type: (masterRow.account_type?.toLowerCase() === 'vendor' ? 'vendor' : 'seller') as 'seller' | 'vendor',
              status: (masterRow.status === 'active' || masterRow.status === 'inactive' ? masterRow.status : 'active') as 'active' | 'inactive',
              isStarred: masterRow.is_starred || false,
              shareCode: masterRow.share_code || undefined,
              profileId: (masterRow as any).profile_id ?? undefined,
            };
            usedSupabaseFastPath = true;
            setAccount(matchedAccount);
            setIsLoading(false);
            setStatus(`Loading data for ${matchedAccount.name}...`);
          }
        }
      } catch (supabaseErr) {
      }

      // ── Fallback: If Supabase didn't find it, use Google Sheets ──
      if (!matchedAccount) {
        const accounts = await fetchWithTimeout(
          fetchAccountsFromSheet(),
          15000
        ) as AccountData[];

        matchedAccount = accounts.find((a: AccountData) => {
          const nameMatch = normalizedBrandName(a.name) === normalizedBrandName(brandName);
          const codeMatch = a.shareCode === shareId;
          return nameMatch && codeMatch;
        }) || null;

        if (matchedAccount) {
          setAccount(matchedAccount);
          setIsLoading(false);
          setStatus(`Loading data for ${matchedAccount.name}...`);
        }
      }

      // ── PHASE 2: Background refresh from Sheets (if we used fast path) ──
      if (usedSupabaseFastPath && matchedAccount) {
        const bgAccount = matchedAccount; // capture for closure
        fetchAccountsFromSheet().then(accounts => {
          const freshMatch = accounts.find((a: AccountData) => {
            return normalizedBrandName(a.name) === normalizedBrandName(brandName) && a.shareCode === shareId;
          });
          if (freshMatch) {
            setAccount(prev => prev ? { ...prev, ...freshMatch } : freshMatch);
          }
        }).catch(err => {
        });
      }

      if (matchedAccount) {
        
        // Set all loading states to true (vendor only for vendor accounts)
        setLoadingProgress({
          sales: true,
          ppc: true,
          asin: ASIN_FEATURE_ENABLED,
          inventory: true,
          vendor: matchedAccount.type === 'vendor'
        });

        // Fire all fetches independently — each updates state as it resolves
        const acct = matchedAccount; // capture for closures

        // Track resolved data for the final account update
        let resolvedSales: any[] = [];
        let resolvedPpc: any[] = [];
        let resolvedVendor: any[] = [];

        // ── SALES (Supabase → instant, Sheets fallback if needed) ──
        const salesPromise = fetchSalesFromSupabaseWide(acct.merchantToken)
          .then(supabaseSalesData => {
            if (Array.isArray(supabaseSalesData) && supabaseSalesData.length > 1) {
              resolvedSales = supabaseSalesData;
              setSheetData(resolvedSales);
              setLoadingProgress(prev => ({ ...prev, sales: false }));
              // Update account metrics immediately with sales data
              const updated = updateAccountsWithFilteredData([acct], resolvedSales, resolvedPpc, dateFilter, customDateRange, resolvedVendor);
              setAccount(updated[0]);
              // Shared view sales/traffic comes exclusively from Supabase (perplexity_sales_data).
              // Removed the raw Google Sheets background overwrite that blanked accounts not in the sheet.
            } else {
              // No Supabase data — fall back to Sheets
              return fetchWithTimeout(
                fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`),
                15000
              ).then((res: any) => res?.ok ? res.json() : null).then((data: any) => {
                if (data?.values) {
                  resolvedSales = data.values;
                  setSheetData(resolvedSales);
                }
              });
            }
          })
          .catch(err => { console.error('Sales fetch failed:', err); })
          .finally(() => { setLoadingProgress(prev => ({ ...prev, sales: false })); });

        // ── PPC (Google Sheets) ──
        const ppcPromise = fetchWithTimeout(
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.PPC_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`),
          10000
        )
          .then((res: any) => res?.ok ? res.json() : null)
          .then((data: any) => {
            const ppcValues = data?.values || [];
            resolvedPpc = ppcValues;
            setPpcData(ppcValues);
            // Re-update account with PPC data
            if (resolvedSales.length > 0) {
              const updated = updateAccountsWithFilteredData([acct], resolvedSales, resolvedPpc, dateFilter, customDateRange, resolvedVendor);
              setAccount(updated[0]);
            }
          })
          .catch(err => { console.error('PPC fetch failed:', err); })
          .finally(() => { setLoadingProgress(prev => ({ ...prev, ppc: false })); });

        // ── VENDOR DATA (only for vendor accounts) ──
        const vendorPromise = acct.type === 'vendor'
          ? fetchWithTimeout(fetchVendorData(), 30000)
              .then((data: any) => {
                resolvedVendor = data || [];
                setVendorData(resolvedVendor);
              })
              .catch(err => { console.error('Vendor data failed:', err); })
              .finally(() => { setLoadingProgress(prev => ({ ...prev, vendor: false })); })
          : Promise.resolve().then(() => {
              setLoadingProgress(prev => ({ ...prev, vendor: false }));
            });

        // ── INVENTORY ──
        const isVendorAccount = acct.type === 'vendor' || (acct as any).accountType === 'vendor' || acct.merchantToken?.startsWith('amzn1.vg.');
        const inventoryPromise = isVendorAccount
          ? fetchInventoryFromSupabase(acct.merchantToken)
              .then((data) => {
                if (data && data.length > 0) {
                  const mapped: InventoryData[] = data.map(row => ({
                    sku: row.asin || '',
                    asin: row.asin || '',
                    productName: row.product_title || row.asin || '',
                    quantity: Number(row.sellable_on_hand_units) || 0,
                    price: 0,
                    fulfillmentType: 'Vendor',
                    accountName: row.account_id || ''
                  }));
                  setInventoryData(mapped);
                } else {
                  // Fallback to Google Sheets
                  return fetchWithTimeout(fetchInventoryData(), 30000).then((sheetData: any) => {
                    const processed = processInventoryData(sheetData || [], acct.merchantToken);
                    setInventoryData(processed);
                  });
                }
              })
              .catch(err => { console.error('Vendor inventory fetch failed:', err); })
              .finally(() => { setLoadingProgress(prev => ({ ...prev, inventory: false })); })
          : Promise.resolve().then(() => {
              setLoadingProgress(prev => ({ ...prev, inventory: false }));
            });

        // ── ASIN + Vendor Supabase (these are the slow ones) ──
        const asinPromise = (ASIN_FEATURE_ENABLED
          ? Promise.all([
              fetchWithTimeout(fetchASINDataFromSupabase(acct.merchantToken), 30000).catch(err => { console.error('ASIN fetch failed:', err); return []; }),
              fetchWithTimeout(fetchVendorDataFromSupabase(acct.merchantToken), 30000).catch(err => { console.error('Vendor Supabase failed:', err); return []; })
            ]).then(([asinDataFromSupabase, supabaseVendorValues]) => {
              const asinDataValues = Array.isArray(asinDataFromSupabase) ? asinDataFromSupabase : [];
              const vendorValues = Array.isArray(supabaseVendorValues) ? supabaseVendorValues : [];
              const isVendor = acct.merchantToken?.startsWith('amzn1.vg.');

              // For vendors, use vendor data as the primary source; for sellers, use asin data
              const primaryData = isVendor ? vendorValues : asinDataValues;
              if (primaryData.length === 0) {
                setAsinData([]);
                return;
              }
              try {
                const processedAsinData = processASINData(
                  isVendor ? vendorValues : asinDataValues, acct.merchantToken, 'last-14-days', undefined, vendorValues
                );
                if (Array.isArray(processedAsinData) && processedAsinData.every(item => item && typeof item === 'object' && 'childAsin' in item)) {
                  setAsinData(processedAsinData);
                  setRawAsinData(asinDataValues);
                  setRawVendorData(vendorValues);
                } else {
                  setAsinData([]);
                }
              } catch (err) {
                console.error('ASIN processing error:', err);
                setAsinData([]);
              }
            })
          : Promise.resolve((() => { setAsinData([]); })())
        )
          .catch(err => { console.error('ASIN pipeline error:', err); setAsinData([]); })
          .finally(() => { setLoadingProgress(prev => ({ ...prev, asin: false })); });

        // Wait for all to settle (don't block on failures)
        await Promise.allSettled([salesPromise, ppcPromise, vendorPromise, inventoryPromise, asinPromise]);

        // Final account update with all resolved data
        if (resolvedSales.length > 0 || resolvedPpc.length > 0) {
          const finalUpdated = updateAccountsWithFilteredData([acct], resolvedSales, resolvedPpc, dateFilter, customDateRange, resolvedVendor);
          setAccount(finalUpdated[0]);
        }
        setStatus(`Successfully loaded ${acct.name}`);

      } else {
        setStatus(`No matching account found for ${brandName} (${shareId})`);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('❌ SharedView: Error loading account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load shared dashboard';
      
      // Handle specific error types
      if (errorMessage.includes('timeout')) {
        setStatus('Connection timeout. Please check your internet connection and try again.');
      } else {
        setStatus('Error: ' + errorMessage);
      }
      
      setIsLoading(false); // Always ensure loading stops
    }
  };

  // Detect missing dates for this account
  const sharedASINStaleInfo = useMemo(() => {
    if (!account) return null;
    const dataSource = account.merchantToken.startsWith('amzn1.vg') ? rawVendorData : rawAsinData;
    return getASINFallbackInfo(dataSource, account.merchantToken, dateFilter, customDateRange, rawVendorData);
  }, [rawAsinData, rawVendorData, account, dateFilter, customDateRange]);

  const sharedMissingDates = useMemo(() => {
    if (!account || sharedASINStaleInfo?.isFallback) return [];
    const isVendor = account.merchantToken.startsWith('amzn1.vg');
    const dataSource = isVendor ? rawVendorData : rawAsinData;
    if (!dataSource || dataSource.length === 0) return [];
    if (typeof dataSource[0] !== 'object' || !('merchant_token' in dataSource[0])) return [];
    const dateRange = isVendor
      ? getVendorCurrentDateRange(dateFilter, customDateRange)
      : getCurrentDateRange(dateFilter, customDateRange);
    return detectMissingDates(dataSource, account.merchantToken, dateRange);
  }, [rawAsinData, rawVendorData, account, dateFilter, customDateRange, sharedASINStaleInfo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-center">Loading shared dashboard...</p>
            <p className="text-center text-sm text-gray-500 mt-2">{status}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Share Not Found</h1>
            <p className="mb-4">{status}</p>
            <p className="text-sm text-gray-500">
              Please check the link or contact your account manager for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const countryInfo = getCountryInfo(account.merchantToken);
  const scopeFlag =
    effectiveScope === 'ALL_EU' ? '/flags/eu.svg'
    : effectiveScope === 'ALL' ? '/flags/world.svg'
    : getCountryFlagImage(effectiveScope) || countryInfo.flagImage;
  const scopeName =
    effectiveScope === 'ALL_EU' ? 'All EU'
    : effectiveScope === 'ALL' ? 'All countries'
    : getCountryName(effectiveScope);
  const scopeAccountKeys = (() => {
    if (!brandCountries.countries.length) return undefined;
    if (effectiveScope === 'ALL') return brandCountries.countries.map(c => c.sales_account_key).filter(Boolean);
    if (effectiveScope === 'ALL_EU') return brandCountries.countries.filter(c => c.region === 'EU').map(c => c.sales_account_key).filter(Boolean);
    const match = brandCountries.countries.find(c => c.country_code === effectiveScope);
    return match ? [match.sales_account_key].filter(Boolean) : undefined;
  })();
  const isAnyDataLoading = Object.values(loadingProgress).some(loading => loading);

  // Debug logging before render

  return (
    <div id="shared-dashboard" className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-3 py-4 md:px-6 md:py-8 pb-24">
        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">DEMO</span>
            <p className="text-xs md:text-sm text-amber-800">You're viewing a sample dashboard with illustrative data — not a real client account.</p>
          </div>
        )}
        {/* Loading Progress Banner */}
        {isAnyDataLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Loading data sources...</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {loadingProgress.sales && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Sales</span>
                  )}
                  {loadingProgress.ppc && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">PPC</span>
                  )}
                  {loadingProgress.asin && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">ASIN</span>
                  )}
                  {loadingProgress.inventory && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Inventory</span>
                  )}
                  {loadingProgress.vendor && account?.type === 'vendor' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Vendor</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header - Gradient design */}
        <div className="rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          {/* Top Row - Gradient section */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-3 py-2 md:px-6 md:py-5">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-6 min-w-0">
                <img 
                  src="/uploads/MC-Logo-WHITE.png" 
                  alt="Martin Case Logo" 
                  className="h-6 md:h-14 w-auto flex-shrink-0"
                />
                <div className="hidden md:block border-l-2 border-white/30 pl-6">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Amazon Performance Dashboard
                  </h1>
                </div>
                <h1 className="md:hidden text-sm font-bold text-white truncate">
                  Dashboard
                </h1>
              </div>
              
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                {tabAvailabilityReady && (tabAvailability.brandAnalytics === false || tabAvailability.profitLoss === false) && (
                  <button
                    type="button"
                    onClick={() => setUnlockModalOpen(true)}
                    className="hidden sm:inline-flex items-center gap-1 text-xs md:text-sm text-white/90 hover:text-white underline-offset-2 hover:underline h-8 px-2"
                    title="Unlock more data"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Unlock more data
                  </button>
                )}
                <Button 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold h-8 px-2 md:px-3"
                >
                  <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline ml-1">{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
                </Button>
                <DateFilterSelector
                  dateFilter={dateFilter}
                  customDateRange={customDateRange}
                  onDateFilterChange={setDateFilter}
                  onCustomDateRangeChange={setCustomDateRange}
                  getDateDisplayText={() => getDateDisplayText(dateFilter, customDateRange)}
                  hideCaption
                  buttonClassName="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-xl font-semibold h-8 px-2 md:px-3"
                />
              </div>
            </div>
            {/* Date-range caption on its own line below the button group */}
            <div className="mt-1 md:mt-2 flex justify-end">
              <span className="text-[10px] md:text-xs text-white/90 whitespace-nowrap">
                {formatDateRangeText(dateFilter, customDateRange)}
              </span>
            </div>
          </div>
          
          {/* Focused Account Section */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-2 md:px-6 md:py-4 border-t border-blue-100">
            <div className="flex items-center gap-2 md:gap-3">
              {scopeFlag && (
                <img 
                  src={scopeFlag} 
                  alt={scopeName} 
                  className="w-6 h-4 md:w-10 md:h-7 object-cover rounded-sm shadow-sm flex-shrink-0" 
                />
              )}
              <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">
                {account.name}
              </h2>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 ${
                account.type === 'vendor' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {account.type === 'vendor' ? 'Vendor' : 'Seller'}
              </span>
              <span className="text-[10px] md:text-xs text-gray-500 hidden sm:inline flex-shrink-0">
                {scopeName || 'Unknown Country'}
              </span>
            </div>
            {brandCountries.isMultiCountry && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] md:text-xs uppercase tracking-wide text-gray-500 font-semibold">Country scope</span>
                <CountrySwitcher
                  countries={brandCountries.countries}
                  scope={effectiveScope}
                  onChange={setCountryScope}
                />
              </div>
            )}
          </div>
        </div>

        {/* Alerts are now inside Performance tab as collapsible */}

        {/* Sticky Tab Bar */}
        <div className="sticky top-0 z-30 bg-gradient-to-br from-blue-50 to-cyan-50 pt-2 pb-3 md:pb-4 -mx-3 px-3 md:-mx-6 md:px-6">
          <div className="flex items-center gap-0.5 md:gap-2 p-0.5 md:p-1.5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto scrollbar-hide">
            {(() => {
              const all: Array<{ key: ClientTab; label: string; icon: JSX.Element; show: boolean }> = [
                { key: 'performance', label: 'Performance', icon: <BarChart3 className="h-4 w-4" />, show: true },
                { key: 'sales-drivers', label: 'Sales Drivers', icon: <Activity className="h-4 w-4" />, show: true },
                { key: 'search-terms', label: 'Search Terms', icon: <Search className="h-4 w-4" />, show: tabAvailability.searchTerms },
                { key: 'advertised-products', label: 'Ad Products', icon: <Package className="h-4 w-4" />, show: tabAvailability.adProducts },
                { key: 'brand-analytics', label: 'Brand Analytics', icon: <TrendingUp className="h-4 w-4" />, show: tabAvailability.brandAnalytics },
                { key: 'profit-loss', label: 'Profit & Loss', icon: <DollarSign className="h-4 w-4" />, show: !isVendor && tabAvailability.profitLoss },
                { key: 'budgets', label: 'Budgets', icon: <Wallet className="h-4 w-4" />, show: budgetsEnabled },
                { key: 'inventory-planner', label: '📦 Inventory Planner', icon: <Package className="h-4 w-4" />, show: !isVendor && tabAvailability.inventory },
              ];
              return all.filter((t) => t.show).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2.5 rounded-lg text-[11px] md:text-sm font-medium transition-all justify-center whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ));
            })()}
          </div>
        </div>

        {/* PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <div className="space-y-6 md:space-y-8">
            {/* Collapsible Alerts */}
            <CollapsibleAlerts
              merchantToken={account.merchantToken}
              accountName={account.name}
              hideConfigButton={true}
            />

            {brandCountries.spid && (
              <SalesTrendCard
                spid={brandCountries.spid}
                scope={effectiveScope}
                dateFilter={dateFilter}
                customDateRange={customDateRange}
                primaryCountry={brandCountries.primary?.country_code}
                onDrilldown={(from, to) => {
                  setDateFilter('custom');
                  setCustomDateRange({ from, to });
                }}
              />
            )}






            {brandCountries.isMultiCountry && brandCountries.spid && (effectiveScope === 'ALL_EU' || effectiveScope === 'ALL') && (
              <MultiCountryPanel
                spid={brandCountries.spid}
                scope={effectiveScope}
                dateFilter={dateFilter}
                customDateRange={customDateRange}
              />
            )}



            {hasNoActivity ? (
              <div className="flex justify-center">
                <Card className="w-full max-w-xl rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 h-1.5" />
                  <CardContent className="px-6 py-12 text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <CalendarX className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity in this period</h3>
                    <p className="text-gray-700 mb-1">
                      This account has no recorded sales or ad activity for the selected date range.
                    </p>
                    <p className="text-sm text-gray-500">
                      Try selecting a wider date range using the date picker above, or contact your account manager at{' '}
                      <a href="mailto:hello@martincase.co.uk" className="text-blue-600 hover:text-blue-800 underline">
                        hello@martincase.co.uk
                      </a>.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (() => {
              const homeCountry = brandCountries.primary?.country_code || 'GB';
              const isVendor = isVendorAccount(account.merchantToken);
              const isHomeScope = !brandCountries.isMultiCountry || isVendor || effectiveScope === homeCountry;

              if (!isHomeScope && brandCountries.spid) {
                return (
                  <CountryScopedPerformance
                    spid={brandCountries.spid}
                    scope={effectiveScope}
                    dateFilter={dateFilter}
                    customDateRange={customDateRange}
                    accountMerchantToken={account.merchantToken}
                  />
                );
              }

              return (
              <>
                {/* Daily Performance Section */}
                <section>
                  <div className="flex justify-between items-center mb-3 md:mb-4">
                    <div>
                      <h2 className="text-base md:text-xl font-semibold text-foreground">Daily Performance</h2>
                      <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Sales and advertising activity by day</p>
                    </div>
                    <PerformanceExportButton accounts={[account]} dateFilter={dateFilter} />
                  </div>
                  {loadingProgress.sales ? (
                    <SalesHeatmapSkeleton />
                  ) : (sheetData.length > 0 || vendorHeatmapRows.length > 0) ? (
                    <SalesHeatmap 
                      accounts={[account]} 
                      sheetData={sheetData} 
                      ppcData={ppcData}
                      vendorData={vendorData}
                      isBlurred={false}
                      onFocusAccount={() => {}}
                      isSharedView={true}
                      dateFilter={dateFilter}
                      customDateRange={customDateRange}
                      apiPpcDailyData={apiPpcAllDaily}
                      supabaseVendorData={vendorHeatmapRows}
                    />
                  ) : null}
                </section>

                {/* Key Metrics Section */}
                <section>
                  <div className="mb-3 md:mb-4">
                    <h2 className="text-base md:text-xl font-semibold text-foreground">Key Metrics</h2>
                    <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Overview of sales, PPC, and performance indicators</p>
                  </div>
                  {loadingProgress.sales || loadingProgress.ppc ? (
                    <MetricsGridSkeleton />
                  ) : (
                    <MetricsGrid 
                      displayedAccounts={[account]} 
                      focusedAccount={account} 
                      selectedChartMetrics={selectedChartMetrics}
                      onToggleChartMetric={toggleChartMetric}
                      apiPpcMetrics={apiPpcMetrics}
                      apiPpcPreviousMetrics={apiPpcPreviousMetrics}
                      apiPpcLoading={apiPpcLoading}
                      adType={adType}
                      onAdTypeChange={setAdType}
                      directOrganicMetrics={directOrganicMetrics}
                      directOrganicPreviousMetrics={directOrganicPreviousMetrics}
                      dateFilter={dateFilter}
                      apiPpcDailyData={apiPpcAllDaily}
                    />
                  )}
                </section>
              </>
              );
            })()}

            {(() => {
              const homeCountry = brandCountries.primary?.country_code || 'GB';
              const isVendor = isVendorAccount(account.merchantToken);
              const isHomeScope = !brandCountries.isMultiCountry || isVendor || effectiveScope === homeCountry;
              if (!isHomeScope) return null;
              return (
                <>
                  {/* Monthly Trends Section */}
                  <section>
                    <div className="mb-3 md:mb-4">
                      <h2 className="text-base md:text-xl font-semibold text-foreground">Performance Trends</h2>
                      <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                        {['last-7-days', 'last-14-days', 'yesterday', 'this-week', 'last-week'].includes(dateFilter) ? 'Daily performance over selected period' : 'Historical performance over time'}
                      </p>
                    </div>
                    {loadingProgress.sales || loadingProgress.ppc ? (
                      <MonthlyPerformanceSkeleton />
                    ) : (
                      <MonthlyPerformanceView 
                        accountName={account.name} 
                        merchantToken={account.merchantToken}
                        ppcAccountName={account.ppcAccountName}
                        selectedMetrics={selectedChartMetrics}
                        onToggleMetric={toggleChartMetric}
                        dateFilter={dateFilter}
                        customDateRange={customDateRange}
                        externalData={
                          sheetData.length > 0 && ppcData.length > 0
                            ? { sheetData, ppcData }
                            : undefined
                        }
                      />
                    )}
                  </section>

                  {/* Product Performance Section */}
                  <section>
                    <div className="mb-3 md:mb-4">
                      <h2 className="text-base md:text-xl font-semibold text-foreground">Product Performance</h2>
                      <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Individual ASIN sales and metrics</p>
                    </div>
                    {loadingProgress.asin ? (
                      <TableSkeleton rows={8} />
                    ) : asinData.length > 0 ? (
                      <ASINDataTable 
                        asinData={asinData}
                        isBlurred={false}
                        dateFilter={dateFilter}
                        customDateRange={customDateRange}
                        accountMerchantToken={account.merchantToken}
                        hideBuyBoxAndConversion={true}
                        missingDates={sharedMissingDates}
                        staleInfo={sharedASINStaleInfo}
                      />
                    ) : null}
                  </section>
                </>
              );
            })()}

            {/* Stock & Inventory */}
            <section>
              <StockInventoryTable merchantToken={account.merchantToken} accountType={account.type} />
            </section>

            {/* Stockout Impact */}
            <section>
              <StockoutImpactSection merchantToken={account.merchantToken} accountKeys={scopeAccountKeys} scope={effectiveScope} />
            </section>
          </div>
        )}

        {/* SALES DRIVERS TAB */}
        {activeTab === 'sales-drivers' && (
          <div className="space-y-8">
            {brandCountries.spid ? (
              <SalesDriversTab
                spid={brandCountries.spid}
                scope={effectiveScope}
                primaryCountry={brandCountries.primary?.country_code}
              />
            ) : (
              <Card className="rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 h-1.5" />
                <CardContent className="px-6 py-12 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Not enough data yet</h3>
                  <p className="text-sm text-gray-500">We need sales history to show what moves your sales. Check back soon.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* SEARCH TERMS TAB */}
        {activeTab === 'search-terms' && (
          <div className="space-y-8">
            <ApiSearchTermsDashboard accountName={account.name} dateFilter={dateFilter} customDateRange={customDateRange} scope={effectiveScope} />
            <KeywordThemesDashboard sellerFilter={account.ppc_sellername || account.name} scope={effectiveScope} />
            <SearchTermKeywordMapDashboard sellerFilter={account.ppc_sellername || account.name} scope={effectiveScope} />
          </div>
        )}

        {/* ADVERTISED PRODUCTS TAB */}
        {activeTab === 'advertised-products' && (
          <div className="space-y-8">
            <ApiAdvertisedProductsDashboard accountName={account.name} scope={effectiveScope} />
          </div>
        )}

        {/* BRAND ANALYTICS TAB */}
        {activeTab === 'brand-analytics' && (
          <div className="space-y-8">
            {brandCountries.spid && (
              <BrandAnalyticsCountry spid={brandCountries.spid} scope={effectiveScope} />
            )}
            <div className="border-t pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Keyword & PPC analysis</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Brand-level view (keyword search-share + PPC). Not split by country — per-keyword PPC data isn't available per marketplace.
                </p>
              </div>
              <BrandAnalyticsDashboard accountName={account.name} scope={effectiveScope} />
            </div>
          </div>
        )}

        {/* PROFIT & LOSS TAB */}
        {activeTab === 'profit-loss' && (
          <div className="space-y-8">
            {brandCountries.spid && (
              <>
                <SalesTrendCard
                  spid={brandCountries.spid}
                  scope={effectiveScope}
                  dateFilter={dateFilter}
                  customDateRange={customDateRange}
                  primaryCountry={brandCountries.primary?.country_code}
                  onDrilldown={(from, to) => {
                    setDateFilter('custom');
                    setCustomDateRange({ from, to });
                  }}
                />
                <PnlDashboard
                  spid={brandCountries.spid}
                  scope={effectiveScope}
                  dateFilter={dateFilter}
                  customDateRange={customDateRange}
                />
              </>
            )}
            <ProductFinancialDashboard accountName={account.name} />
          </div>
        )}

        {/* BUDGETS TAB */}
        {activeTab === 'budgets' && budgetsEnabled && brandCountries.spid && (
          <div className="space-y-8">
            <BudgetsSection
              spid={brandCountries.spid}
              scope={effectiveScope}
              dateFilter={dateFilter}
              customDateRange={customDateRange}
              brandName={account.name}
              merchantToken={account.merchantToken}
              config={budgetsConfig}
              readOnly={true}
            />
          </div>
        )}

        {/* INVENTORY PLANNER TAB */}
        {activeTab === 'inventory-planner' && (
          <div className="space-y-8">
            <InventoryPlannerDashboard 
              merchantToken={account.merchantToken} 
              accountName={account.name}
              accountType={account.type}
              asinData={asinData}
              asinStaleInfo={sharedASINStaleInfo}
            />
          </div>
        )}

        {/* Branded Footer */}
        <div className="text-center py-8 border-t border-gray-200 mt-12">
          <p className="text-sm text-gray-500">
            © 2026 Martin Case Limited
          </p>
        </div>
      </div>
      <AIAnalystChat 
        accountName={account?.name}
        merchantToken={account?.merchantToken}
      />
      <UnlockDashboardModal
        open={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onDontShowAgain={() => {
          try { if (dismissKey) localStorage.setItem(dismissKey, '1'); } catch {}
          setUnlockModalOpen(false);
        }}
        missing={{
          brandAnalytics: tabAvailability.brandAnalytics === false,
          profitLoss: tabAvailability.profitLoss === false,
        }}
      />
    </div>
  );
};

export default SharedView;