import { useState, useEffect, useMemo } from 'react';
import { format, subDays, endOfMonth } from 'date-fns';
import { useParams, useSearchParams } from 'react-router-dom';
import { useApiPpcData, type AdType } from '@/hooks/useApiPpcData';
import { calculatePeriodData, getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
import { AccountData, DateFilter, ASINData, InventoryData } from '@/types/dashboard';
import { normalizedBrandName } from '@/utils/shareUtils';
import { getCountryInfo, getCountryName } from '@/utils/countryUtils';
import { processInventoryData, fetchInventoryData } from '@/utils/inventoryProcessor';
import { processASINData, detectMissingDates, getASINFallbackInfo, getVendorCurrentDateRange } from '@/utils/asinProcessor';
import { updateAccountsWithFilteredData } from '@/utils/dataProcessor';
import { fetchVendorData } from '@/utils/vendorProcessor';
import { fetchASINDataFromSupabase, fetchVendorDataFromSupabase, fetchInventoryFromSupabase } from '@/utils/supabaseDataFetchers';
import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import { supabase } from '@/integrations/supabase/client';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { SalesHeatmap } from '@/components/dashboard/SalesHeatmap';
import { MonthlyPerformanceView } from '@/components/dashboard/MonthlyPerformanceView';
import { useChartMetrics } from '@/hooks/useChartMetrics';
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
import { useScopedMetrics } from '@/hooks/useScopedMetrics';
import { CountrySwitcher, type CountryScope } from '@/components/dashboard/CountrySwitcher';
import { CountryFlag } from '@/components/dashboard/CountryFlag';
import { isRollupScope, scopeArea, scopeArm } from '@/utils/scope';
import { MultiCountryPanel } from '@/components/dashboard/MultiCountryPanel';
import { SalesTrendCard } from '@/components/dashboard/SalesTrendCard';

import { SalesDriversTab } from '@/components/dashboard/SalesDriversTab';
import { CountryScopedPerformance } from '@/components/dashboard/CountryScopedPerformance';
import { ReportingBasisNote } from '@/components/dashboard/ReportingBasisNote';
import { useLinkAccess } from '@/hooks/useLinkAccess';
import { RequestDashboardLink } from '@/components/dashboard/RequestDashboardLink';

type ClientTab = 'performance' | 'sales-drivers' | 'search-terms' | 'advertised-products' | 'brand-analytics' | 'profit-loss' | 'budgets' | 'inventory-planner';

/* ------------------------------------------------------------------------- *
 * Reporting-period deep links
 *
 * The month-end client email links straight to the period it reports on, so the
 * client lands on the number they have just read rather than a rolling window.
 *
 *   ?month=YYYY-MM                     e.g. /cottam/IJ92T?month=2026-07
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD     e.g. /cottam/IJ92T?from=2026-07-01&to=2026-07-31
 *
 * `month` wins when both are supplied. Anything missing or malformed is ignored
 * and the dashboard falls back to its normal default window — a bad parameter
 * must never break the page. Once loaded the client can still change the range
 * with the date picker; the "as reported in your monthly email" note simply
 * disappears when they do.
 * ------------------------------------------------------------------------- */

export interface DeepLinkPeriod {
  kind: 'month' | 'range';
  from: Date;
  to: Date;
  /** Human label used in the on-screen echo, e.g. "July 2026". */
  label: string;
}

const MONTH_PARAM_PATTERN = /^(\d{4})-(\d{2})$/;
const DATE_PARAM_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Build a local midnight Date, rejecting impossible dates like 2026-02-31. */
const buildLocalDate = (year: number, month: number, day: number): Date | null => {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  dt.setHours(0, 0, 0, 0);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return dt;
};

export const parsePeriodFromSearch = (search: URLSearchParams | null | undefined): DeepLinkPeriod | null => {
  if (!search) return null;
  try {
    const monthRaw = search.get('month');
    if (monthRaw !== null) {
      const m = MONTH_PARAM_PATTERN.exec(monthRaw.trim());
      if (!m) return null; // malformed → ignore, keep the default window
      const from = buildLocalDate(Number(m[1]), Number(m[2]), 1);
      if (!from) return null;
      return { kind: 'month', from, to: endOfMonth(from), label: format(from, 'MMMM yyyy') };
    }

    const fromRaw = search.get('from');
    const toRaw = search.get('to');
    if (fromRaw !== null && toRaw !== null) {
      const f = DATE_PARAM_PATTERN.exec(fromRaw.trim());
      const t = DATE_PARAM_PATTERN.exec(toRaw.trim());
      if (!f || !t) return null;
      let from = buildLocalDate(Number(f[1]), Number(f[2]), Number(f[3]));
      let to = buildLocalDate(Number(t[1]), Number(t[2]), Number(t[3]));
      if (!from || !to) return null;
      if (from.getTime() > to.getTime()) {
        const swap = from;
        from = to;
        to = swap;
      }
      return {
        kind: 'range',
        from,
        to,
        label: `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`,
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Never put a raw Postgres / transport error in front of a client.
 * Log the detail, show them something they can act on.
 */
export const friendlyLoadError = (raw: unknown): string => {
  const message =
    raw instanceof Error
      ? raw.message
      : typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && typeof (raw as any).message === 'string'
          ? (raw as any).message
          : '';
  const lower = message.toLowerCase();
  if (lower.includes('statement timeout') || lower.includes('timeout') || lower.includes('57014')) {
    return 'This is taking longer than usual to load. Please try Sync Data, or narrow the date range.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'We could not reach the data service. Please check your connection and try again.';
  }
  return 'We could not load this data just now. Please try Sync Data, or contact hello@martincase.co.uk.';
};

interface SharedViewProps {
  forcedShareId?: string;
  forcedBrandName?: string;
  isDemo?: boolean;
}

const SharedView = ({ forcedShareId, forcedBrandName, isDemo }: SharedViewProps = {}) => {
  const params = useParams<{ shareId: string; brandName?: string }>();
  const shareId = forcedShareId ?? params.shareId;
  const brandName = forcedBrandName ?? params.brandName;

  // Nothing on this page loads until the visitor has proved they are entitled to
  // it — a live ?t= token for THIS account, a staff session, or /demo. See
  // useLinkAccess. The share code alone is not a credential.
  const access = useLinkAccess({ shareId, brandName, isDemo });

  // Reporting-period deep link (see parsePeriodFromSearch above). Read before the
  // date state is created so the very first data fetch already uses the right window.
  const [searchParams] = useSearchParams();
  const deepLinkPeriod = useMemo(() => parsePeriodFromSearch(searchParams), [searchParams]);

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
  const [dateFilter, setDateFilter] = useState<DateFilter>(deepLinkPeriod ? 'custom' : 'last-14-days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>(
    deepLinkPeriod ? { from: deepLinkPeriod.from, to: deepLinkPeriod.to } : undefined,
  );

  /** True while the on-screen period is still the one the email linked to. */
  const isShowingDeepLinkPeriod =
    !!deepLinkPeriod &&
    dateFilter === 'custom' &&
    !!customDateRange &&
    customDateRange.from.getTime() === deepLinkPeriod.from.getTime() &&
    customDateRange.to.getTime() === deepLinkPeriod.to.getTime();
  const { selectedChartMetrics, toggleChartMetric } = useChartMetrics();
  const [isRefreshing, setIsRefreshing] = useState(false);
  /** Client-safe message for a failed data load — never raw Postgres text. */
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>('performance');
  const { availability: tabAvailability, ready: tabAvailabilityReady } = useTabAvailability(account?.name, account?.merchantToken, account?.profileId);
  const isVendor = account?.type === 'vendor' || isVendorAccount(account?.merchantToken);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockAutoShown, setUnlockAutoShown] = useState(false);
  const dismissKey = account?.shareCode ? `unlock-modal-dismissed:${account.shareCode}` : null;
  // account.name decides whether this link IS the client's primary account —
  // 'S Green & Sons' opens on the whole business, 'Ooble Home' opens on Ooble.
  const brandCountries = useBrandCountries(account?.merchantToken, { accountName: account?.name });
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
    // Where the page opens is decided in useBrandCountries: a client's primary
    // account opens on the whole business, a secondary arm (Ooble Home, Workwear
    // Depot) opens on itself, and a single-account client opens on its primary
    // marketplace exactly as before. Either way the switcher holds the rest.
    if (!countryScope && brandCountries.defaultScope) setCountryScope(brandCountries.defaultScope);
  }, [countryScope, brandCountries.defaultScope]);
  const effectiveScope: CountryScope = countryScope || brandCountries.defaultScope || 'GB';

  // Country-scoped organic KPIs. Resolved by brand so it follows the switcher
  // for vendors too, whose selling_partner_id differs in every marketplace.
  const scopedMetrics = useScopedMetrics(brandCountries.spid, effectiveScope, dateFilter, customDateRange);
  const scopedMetricsForGrid = useMemo(
    () => (brandCountries.error ? { ...scopedMetrics, error: brandCountries.error } : scopedMetrics),
    [brandCountries.error, scopedMetrics],
  );

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
  // allDailyData spans the wider fetch buffer (>=30 days) and is only safe for
  // the heatmap, which filters by date itself. dailyData is the selected period.
  const { metrics: apiPpcMetrics, previousMetrics: apiPpcPreviousMetrics, isLoading: apiPpcLoading, allDailyData: apiPpcAllDaily, dailyData: apiPpcDailyData, error: apiPpcError } = useApiPpcData({
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
    if (loadingProgress.sales || loadingProgress.ppc || loadingProgress.vendor || apiPpcLoading) return false;
    // A failed query looks exactly like zero activity. Never tell a client they had
    // no sales because a query fell over — let the error path speak instead.
    if (dataError || apiPpcError) return false;
    const salesTotal = (directOrganicMetrics?.sales || 0) + (apiPpcMetrics?.sales || 0);
    const unitsTotal = (directOrganicMetrics?.unitsOrdered || 0);
    const adSpend = (apiPpcMetrics?.spend || 0);
    const adSales = (apiPpcMetrics?.sales || 0);
    return salesTotal === 0 && unitsTotal === 0 && adSpend === 0 && adSales === 0;
  }, [loadingProgress.sales, loadingProgress.ppc, loadingProgress.vendor, apiPpcLoading, dataError, apiPpcError, directOrganicMetrics, apiPpcMetrics]);

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

  // Not one row of client data is fetched until access is granted. Gating only the
  // render would still have handed a tokenless visitor the whole account over the
  // network while the refusal page was on screen.
  useEffect(() => {
    if (access.status !== 'allowed') return;
    loadAccountData();
  }, [shareId, brandName, access.status]);

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
    // 90 days covers the built-in filters and their comparison periods, but a
    // deep-linked month (?month=YYYY-MM) can sit outside that, so widen the window
    // to whatever the selected period — and its comparison period — actually needs.
    const today = new Date();
    let earliest = subDays(today, 90);
    let latest = today;
    try {
      const current = getCurrentDateRange(dateFilter, customDateRange);
      const previous = getPreviousDateRange(dateFilter, customDateRange);
      for (const d of [current.from, previous.from]) {
        if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() < earliest.getTime()) earliest = d;
      }
      for (const d of [current.to, previous.to]) {
        if (d instanceof Date && !isNaN(d.getTime()) && d.getTime() > latest.getTime()) latest = d;
      }
    } catch {
      // Fall back to the plain 90-day window.
    }
    const startDate = format(earliest, 'yyyy-MM-dd');
    const endDate = format(latest, 'yyyy-MM-dd');

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
      setDataError(null);

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
        // Resolve server-side: the RPC returns at most one account and only when BOTH the
        // share code and the normalised brand name match. Previously this read
        // accounts_master directly, which handed every share-link visitor the entire
        // roster — every client's name, merchant token and share code.
        const { data: resolved, error: masterError } = await supabase
          .rpc('rpc_resolve_share', { p_brand: brandName, p_code: shareId });

        const masterRow: any = Array.isArray(resolved) ? resolved[0] : resolved;

        if (!masterError && masterRow) {
          {
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

      // No roster fallback. The RPC above is authoritative — if it returns nothing, the
      // brand/code pair is genuinely invalid and must fail closed. Falling back to
      // downloading every account (the old behaviour) is exactly the leak being closed.
      if (!matchedAccount) {
        matchedAccount = null;

        if (matchedAccount) {
          setAccount(matchedAccount);
          setIsLoading(false);
          setStatus(`Loading data for ${matchedAccount.name}...`);
        }
      }

      // PHASE 2 (background roster refresh) removed deliberately. It re-fetched every
      // account in order to update the one already resolved above — no benefit, and it
      // leaked the full roster to every share-link visitor.

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
          .catch(err => { console.error('Sales fetch failed:', err); setDataError(friendlyLoadError(err)); })
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
          .catch(err => { console.error('PPC fetch failed:', err); setDataError(friendlyLoadError(err)); })
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
      // Log the real detail for us; show the client something they can act on.
      // Raw Postgres text ("canceling statement due to statement timeout") must
      // never reach the page.
      console.error('❌ SharedView: Error loading account:', error);
      setStatus(friendlyLoadError(error));
      setDataError(friendlyLoadError(error));

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

  // ── Access gate ──────────────────────────────────────────────────────────
  // Refusal is deliberately uniform: no token, a mistyped token, an expired one
  // and someone else's token all produce this identical page. It never confirms
  // that the account exists, and it never uses the words token, expired or
  // invalid — the reader did nothing wrong, their link is simply too old.
  if (access.status === 'refused') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4 text-gray-900">We can&rsquo;t open this dashboard</h1>
            <p className="mb-4 text-gray-700">
              This link has either expired or isn&rsquo;t quite complete. Dashboard links are personal
              to each client and stop working after a while, so please open the most recent one we
              sent you rather than an older email.
            </p>
            {/* Self-service remedy. The form's confirmation never reveals whether
                the address was recognised, so the hello@ line stays underneath
                as the route for anyone we do not hold an address for. */}
            <RequestDashboardLink shareCode={shareId} />
            <p className="mt-4 text-sm text-gray-500">
              If nothing arrives, email us at{' '}
              <a href="mailto:hello@martincase.co.uk" className="text-blue-600 hover:text-blue-800 underline">
                hello@martincase.co.uk
              </a>{' '}
              and we&rsquo;ll send you a fresh one straight away.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (access.status === 'checking' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-center">Loading shared dashboard...</p>
            <p className="text-center text-sm text-gray-500 mt-2">
              {access.status === 'checking' ? 'Checking your link...' : status}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // An unresolvable link and a closed account look the same to a visitor, and
  // both must look like nothing. rpc_resolve_share already refuses anything that
  // is not `status = 'active'`; the status re-check below is the second lock, so
  // a stale cache or a future change to the RPC cannot put a closed account's
  // figures back on screen. The demo account (inactive, no registered
  // marketplaces) used to render a full dashboard down to "PPC SPEND £5,949.83".
  if (!account || account.status !== 'active') {
    if (account) {
      console.error(
        `[SharedView] Refusing to render ${account.name} (${account.merchantToken}): ` +
        `accounts_master.status is '${account.status}', not 'active'.`,
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4 text-gray-900">This dashboard isn't available</h1>
            <p className="mb-4 text-gray-700">
              This link is no longer active, or the address is not quite right.
            </p>
            <p className="text-sm text-gray-500">
              Please check the link, or contact us at{' '}
              <a href="mailto:hello@martincase.co.uk" className="text-blue-600 hover:text-blue-800 underline">
                hello@martincase.co.uk
              </a>{' '}
              and we will send you a current one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const countryInfo = getCountryInfo(account.merchantToken);
  const scopeAreaCode = scopeArea(effectiveScope);
  const scopeArmName = scopeArm(effectiveScope);
  // Flag resolution (including the country-code fallback for markets we hold no
  // artwork for) lives in one place now — see components/dashboard/CountryFlag.
  const scopeFlagCode = scopeAreaCode || countryInfo.code || '';
  const scopeName = (() => {
    const area =
      scopeAreaCode === 'ALL_EU' ? 'All EU'
      : scopeAreaCode === 'ALL'
        ? (brandCountries.hasMultipleArms
            ? (scopeArmName ? 'All countries' : 'Whole business')
            : 'All countries')
        : getCountryName(scopeAreaCode);
    return scopeArmName ? `${area} · ${scopeArmName}` : area;
  })();
  /** Every registry row the current scope covers — country AND arm. */
  const scopeCountries = brandCountries.countries.filter((c) => {
    if (scopeArmName && c.arm !== scopeArmName) return false;
    if (scopeAreaCode === 'ALL') return true;
    if (scopeAreaCode === 'ALL_EU') return c.region === 'EU';
    return c.country_code === scopeAreaCode;
  });
  const scopeAccountKeys = (() => {
    if (!brandCountries.countries.length) return undefined;
    const keys = scopeCountries.map(c => c.sales_account_key).filter(Boolean);
    return keys.length ? keys : undefined;
  })();
  const isAnyDataLoading = Object.values(loadingProgress).some(loading => loading);

  // Which non-GBP currencies are actually folded into a GBP figure on this page.
  // Empty ⇒ nothing is converted, and the basis note says so rather than leaving
  // the reader to assume.
  const convertedCurrencies: string[] = (() => {
    const source = scopeCountries.length ? scopeCountries : brandCountries.countries;
    // Only a multi-market roll-up is actually converted; a single non-GBP market
    // is shown in its own currency.
    if (source.length < 2) return [];
    return Array.from(new Set(source.map((c) => (c.currency || '').toUpperCase()).filter((c) => c && c !== 'GBP')));
  })();

  // The FX rate depends on the window on screen, not on today, so the basis note
  // is handed the same dates the RPCs behind these numbers were called with.
  //
  // Deliberately not a useMemo: this sits below the isLoading / inactive-account
  // early returns above, so a hook here would change the hook count between
  // renders. It is two date formats, called once a render.
  const basisPeriod = (() => {
    const r = getCurrentDateRange(dateFilter, customDateRange);
    return { start: format(r.from, 'yyyy-MM-dd'), end: format(r.to, 'yyyy-MM-dd') };
  })();

  // KPI cards must stay in a skeleton until EVERY input has settled. Rendering
  // organic sales before the Ads API resolves showed a confident-looking
  // intermediate total (Portwest: £431,793.68 for ~25s before £605,215.35).
  const metricsSettling = loadingProgress.sales || loadingProgress.ppc || loadingProgress.vendor || apiPpcLoading;

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
          {/* Top Row - Gradient section.
              Colour stops are chosen so white text clears 4.5:1 across the WHOLE
              sweep: blue-700 6.70:1 → blue-600 5.17:1 → cyan-700 5.36:1. The old
              cyan-400 end measured 1.81:1 (1.66:1 for the white/90 date caption). */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-700 px-3 py-2 md:px-6 md:py-5">
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
                    className="hidden sm:inline-flex items-center gap-1 text-xs md:text-sm text-white hover:text-white underline-offset-2 hover:underline h-8 px-2"
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
                  className="bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold h-8 px-2 md:px-3"
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
            {/* Date-range caption on its own line below the button group.
                Full white (not white/90) so the smallest text on the page still
                clears 4.5:1 against every stop of the gradient. */}
            <div className="mt-1 md:mt-2 flex justify-end">
              <span className="text-[11px] md:text-xs font-medium text-white whitespace-nowrap">
                {formatDateRangeText(dateFilter, customDateRange)}
              </span>
            </div>
          </div>

          {/* Deep-linked period echo — tells the client exactly which period they
              are looking at and that it came from their monthly email. Disappears
              as soon as they pick a different range. */}
          {isShowingDeepLinkPeriod && deepLinkPeriod && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-blue-100 bg-blue-50 px-3 py-2 md:px-6">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-blue-700" aria-hidden="true" />
              <span className="text-xs md:text-sm font-semibold text-blue-900">
                Showing {deepLinkPeriod.label}, as reported in your monthly email
              </span>
              <span className="text-[11px] md:text-xs text-blue-800">
                {deepLinkPeriod.kind === 'month'
                  ? `(${format(deepLinkPeriod.from, 'd MMM yyyy')} – ${format(deepLinkPeriod.to, 'd MMM yyyy')}) · `
                  : ''}
                use the date picker above to change the period
              </span>
            </div>
          )}

          {/* Statement of basis, directly beneath the reporting period. */}
          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 md:px-6">
            <ReportingBasisNote
              convertedCurrencies={convertedCurrencies}
              periodStart={basisPeriod.start}
              periodEnd={basisPeriod.end}
            />
          </div>

          {/* Focused Account Section */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-2 md:px-6 md:py-4 border-t border-blue-100">
            <div className="flex items-center gap-2 md:gap-3">
              <CountryFlag code={scopeFlagCode} size="lg" alt={scopeName} className="shadow-sm" />
              <h2 className="text-base md:text-xl font-bold text-gray-900 truncate">
                {/* One business, one name. The share link resolves to a single
                    Amazon account ('S Green & Sons' the vendor), but the page
                    now covers the client — Ooble Home included. */}
                {brandCountries.clientName || account.name}
              </h2>
              {/* The Vendor/Seller badge describes the ACCOUNT. Where a client
                  is both, it belongs to the scope, not to the header — so it
                  follows the switcher and disappears on the whole-business view. */}
              {brandCountries.hasMultipleArms ? (
                scopeArmName ? (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 ${
                    scopeArmName === 'Vendor'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {scopeArmName}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 bg-gray-100 text-gray-700">
                    {brandCountries.arms.join(' + ')}
                  </span>
                )
              ) : (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium flex-shrink-0 ${
                  account.type === 'vendor'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {account.type === 'vendor' ? 'Vendor' : 'Seller'}
                </span>
              )}
              <span className="text-[10px] md:text-xs text-gray-500 hidden sm:inline flex-shrink-0">
                {scopeName || 'Unknown Country'}
              </span>
            </div>
            {brandCountries.isMultiCountry && (
              <CountrySwitcher
                className="mt-3"
                countries={brandCountries.countries}
                scope={effectiveScope}
                onChange={setCountryScope}
                arms={brandCountries.arms}
                clientName={brandCountries.clientName}
              />
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
                      // cyan-500 measured 2.43:1 against white; cyan-700 is 5.36:1.
                      ? 'bg-gradient-to-r from-blue-700 to-cyan-700 text-white shadow-md'
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
              dataIssue={
                scopedMetrics.completeness.materiallyIncomplete
                  ? {
                      title:
                        scopedMetrics.completeness.level === 'empty'
                          ? 'No sales data for this period'
                          : 'Incomplete sales data for this period',
                      detail: scopedMetrics.completeness.headline,
                    }
                  : null
              }
              dataNote={
                scopedMetrics.completeness.pendingDays > 0
                  ? {
                      title: 'Most recent days still landing',
                      detail: scopedMetrics.completeness.pendingHeadline,
                    }
                  : null
              }
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






            {brandCountries.isMultiCountry && brandCountries.spid && isRollupScope(effectiveScope) && (
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
              // NB: vendors used to be forced down the home-scope branch here, which
              // is why picking Germany for Portwest kept showing the UK figures.
              // rpc_metrics_daily_country now covers vendor accounts, so the
              // country-scoped branch is correct for them too.
              //
              // The home-scope branch reads account.merchantToken directly, so it
              // can only ever see ONE Amazon account. A client that is two
              // accounts always takes the scoped, RPC-driven branch — otherwise
              // their whole-business view would quietly be the linked arm alone.
              const isHomeScope = brandCountries.hasMultipleArms
                ? false
                : (!brandCountries.isMultiCountry || effectiveScope === (brandCountries.primary?.scope || 'GB'));

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
                  {metricsSettling ? (
                    <MetricsGridSkeleton />
                  ) : dataError || apiPpcError ? (
                    <Card className="rounded-xl border border-amber-200 bg-amber-50">
                      <CardContent className="px-4 py-6 md:px-6">
                        <p className="text-sm font-semibold text-amber-900">Key metrics are unavailable right now</p>
                        <p className="mt-1 text-sm text-amber-800">
                          {dataError ?? friendlyLoadError(apiPpcError)}
                        </p>
                        <p className="mt-1 text-xs text-amber-700">
                          Nothing is being shown rather than a partial figure — a partial figure would be wrong.
                        </p>
                      </CardContent>
                    </Card>
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
                      customDateRange={customDateRange}
                      // apiPpcDailyData drives the vendor KPI totals inside
                      // MetricsGrid, so it must be the SELECTED period. allDailyData
                      // is a >=30-day fetch buffer and produced a headline "Units
                      // Ordered" roughly double the daily grid beneath it.
                      apiPpcDailyData={apiPpcDailyData}
                      scopedMetrics={scopedMetricsForGrid}
                    />
                  )}
                </section>
              </>
              );
            })()}

            {(() => {
              // Same gate as above: these panels are account-scoped, so a
              // two-account client never renders them.
              const isHomeScope = brandCountries.hasMultipleArms
                ? false
                : (!brandCountries.isMultiCountry || effectiveScope === (brandCountries.primary?.scope || 'GB'));
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