import React from 'react';
import type { ApiPpcDailyRow } from '@/hooks/useApiPpcData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format, subDays, eachDayOfInterval, subWeeks, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, subMonths, startOfYear, differenceInCalendarDays } from 'date-fns';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getBlurredDisplayName } from '@/utils/blurUtils';
import { cn } from '@/lib/utils';
import type { AccountData, DateFilter } from '@/types/dashboard';
import { isVendorAccount } from '@/utils/vendorUtils';
import { useState, useEffect, useMemo } from 'react';
import { calculateVendorPeriodData } from '@/utils/vendorProcessor';
import { ColumnMappingDialog } from './ColumnMappingDialog';
import { AccountTagBadges } from './AccountTagBadges';
import type { TagInfo } from '@/hooks/useAccountTags';
import { HeatmapLegend } from './HeatmapLegend';
import { getHeatmapCellStyle, heatmapIntensity, isInverseHeatmapMetric } from '@/utils/heatmapScale';
import { resolveMetricCell, type HeatmapMetric } from '@/utils/heatmapMetricCell';

interface SalesHeatmapProps {
  accounts: AccountData[];
  sheetData: any[];
  ppcData: any[];
  vendorData?: any[];
  supabaseVendorData?: any[];
  isBlurred?: boolean;
  onFocusAccount?: (accountId: string) => void;
  isSharedView?: boolean;
  dateFilter?: DateFilter;
  customDateRange?: { from: Date; to: Date };
  apiPpcDailyData?: ApiPpcDailyRow[];
  accountTagsMap?: Record<string, TagInfo[]>;
}

// The metric keys, the three-state cell and the ratio guards live in
// utils/heatmapMetricCell so the two grids below cannot hold two versions of
// the rule that decides whether a client is shown a percentage.
type MetricType = HeatmapMetric;
type ViewType = 'daily' | 'weekly';

const METRIC_OPTIONS = [
  { value: 'sales' as MetricType, label: 'Sales' },
  { value: 'ppcSpend' as MetricType, label: 'PPC Spend' },
  { value: 'ppcSales' as MetricType, label: 'PPC Sales' },
  { value: 'acos' as MetricType, label: 'ACOS' },
  { value: 'tacos' as MetricType, label: 'TACOS' },
  { value: 'unitsOrdered' as MetricType, label: 'Units Ordered' },
  { value: 'pageViews' as MetricType, label: 'Page Views' },
  { value: 'buyBoxPercentage' as MetricType, label: 'Buy Box %' },
  { value: 'conversionRate' as MetricType, label: 'Conversion Rate (units ÷ sessions)' },
];

const VENDOR_EXCLUDED_METRICS = ['pageViews', 'buyBoxPercentage', 'conversionRate'];

// The ramp, the hatch and the inversion rule live in utils/heatmapScale so every
// heatmap in the app reads off one scale. Nothing about the rendered output of
// this grid changed when they moved out of this file.
const getCellStyle = getHeatmapCellStyle;
const isInverseMetric = (metric: MetricType) => isInverseHeatmapMetric(metric);

// Define PPC and Organic metrics for filtering
const PPC_METRICS: MetricType[] = ['ppcSpend', 'ppcSales', 'acos', 'tacos'];
const ORGANIC_METRICS: MetricType[] = ['sales', 'unitsOrdered', 'pageViews', 'buyBoxPercentage', 'conversionRate'];

interface ColumnMapping {
  ppcSales: number;
  ppcSpend: number;
  sales: number;
  unitsOrdered: number;
  pageViews: number;
  buyBoxPercentage: number;
  conversionRate: number;
}

const DEFAULT_MAPPING: ColumnMapping = {
  ppcSales: 5, // Column F
  ppcSpend: 6, // Column G
  sales: 5, // Column F
  unitsOrdered: 7, // Column H
  pageViews: 9, // Column J
  buyBoxPercentage: 10, // Column K
  conversionRate: 12, // Column M
};

const SalesHeatmapInner = ({ accounts, sheetData, ppcData, vendorData = [], supabaseVendorData = [], isBlurred = false, onFocusAccount, isSharedView = false, dateFilter = 'last-14-days', customDateRange, apiPpcDailyData, accountTagsMap = {} }: SalesHeatmapProps) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('sales');
  
  // Determine initial view type based on dateFilter
  const getInitialViewType = (): ViewType => {
    if (dateFilter === 'this-year') return 'weekly';
    return 'daily';
  };
  
  const [viewType, setViewType] = useState<ViewType>(getInitialViewType());
  const [showPPCOnly, setShowPPCOnly] = useState(false);
  const [showOrganicOnly, setShowOrganicOnly] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);

  // Load column mapping from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('column_mapping');
    if (saved) {
      try {
        const parsedMapping = JSON.parse(saved);
        setColumnMapping(parsedMapping);
      } catch (error) {
        console.error('Failed to parse saved mapping:', error);
      }
    }
  }, []);
  
  // Check if we're in focused mode (single account)
  const isFocusedMode = accounts.length === 1;
  const focusedAccount = isFocusedMode ? accounts[0] : undefined;
  const shouldApplyVendorLag = !!focusedAccount && isVendorAccount(focusedAccount.merchantToken);

  const vendorDailyMap = useMemo(() => {
    const map = new Map<string, { sales: number; unitsOrdered: number }>();

    if (!isFocusedMode || !focusedAccount || !shouldApplyVendorLag || supabaseVendorData.length === 0) {
      return map;
    }

    for (const row of supabaseVendorData) {
      if (row?.merchant_token !== focusedAccount.merchantToken || !row?.record_date) continue;

      const existing = map.get(row.record_date) ?? { sales: 0, unitsOrdered: 0 };
      existing.sales += Number(row.ordered_revenue ?? row.sales) || 0;
      existing.unitsOrdered += Number(row.ordered_units ?? row.units_ordered) || 0;
      map.set(row.record_date, existing);
    }

    return map;
  }, [focusedAccount, isFocusedMode, shouldApplyVendorLag, supabaseVendorData]);

  // Pre-aggregate ALL vendor data for unfocused multi-account view
  const vendorAllAccountsMap = useMemo(() => {
    const map = new Map<string, { sales: number; unitsOrdered: number }>();
    if (supabaseVendorData.length === 0) return map;

    for (const row of supabaseVendorData) {
      if (!row?.merchant_token || !row?.record_date) continue;
      const key = `${row.merchant_token}|${row.record_date}`;
      const existing = map.get(key) ?? { sales: 0, unitsOrdered: 0 };
      existing.sales += Number(row.ordered_revenue ?? row.sales) || 0;
      existing.unitsOrdered += Number(row.ordered_units ?? row.units_ordered) || 0;
      map.set(key, existing);
    }
    return map;
  }, [supabaseVendorData]);

  // Build a lookup map from API PPC daily data (keyed by YYYY-MM-DD)
  // Must be before any early returns to follow React hooks rules
  const apiPpcByDate = useMemo(() => {
    if (!apiPpcDailyData || apiPpcDailyData.length === 0) {
      return null;
    }
    // adSales, not sales. On the seller path the two are the same value, but on
    // the vendor path `sales` carries ORDERED REVENUE — so once vendors gained
    // advertising and these rows became visible, reading `sales` would have
    // drawn Portwest's turnover in the PPC Sales row and an ACOS against it.
    const map = new Map<string, { ppcSpend: number; ppcSales: number }>();
    for (const row of apiPpcDailyData) {
      const adSales = row.adSales ?? 0;
      const existing = map.get(row.date);
      if (existing) {
        existing.ppcSpend += row.spend;
        existing.ppcSales += adSales;
      } else {
        map.set(row.date, { ppcSpend: row.spend, ppcSales: adSales });
      }
    }
    return map;
  }, [apiPpcDailyData]);

  // Latest date for which the underlying sources actually hold a row for the
  // account(s) on screen. Used to tell the reader where real data stops instead of
  // silently rendering a short/blank tail.
  const lastDataDate = useMemo(() => {
    const tokens = new Set(accounts.map(a => a.merchantToken));
    let maxIso = '';

    for (const row of supabaseVendorData) {
      if (!row?.record_date || !tokens.has(row.merchant_token)) continue;
      if (typeof row.record_date === 'string' && row.record_date > maxIso) maxIso = row.record_date;
    }

    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row) continue;
      const iso = row[1];
      if (typeof iso !== 'string' || iso.length < 10 || !iso.includes('-')) continue;
      if (!tokens.has(row[3])) continue;
      if (iso > maxIso) maxIso = iso;
    }

    if (!maxIso) return null;
    const [y, m, d] = maxIso.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [accounts, sheetData, supabaseVendorData]);

  // Check if any data source is available (sheets for sellers, supabase for vendors)
  const hasAnyVendorAccount = accounts.some(a => isVendorAccount(a.merchantToken));
  if (sheetData.length === 0 && !(hasAnyVendorAccount && supabaseVendorData.length > 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Metrics Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            No data available. Please sync with Google Sheets to view the heatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Generate date ranges based on view type and dateFilter.
  //
  // NOTE: this deliberately does NOT shift the window by the vendor reporting lag. Vendor
  // reporting lags ~3 days, but sliding the whole grid back 3 days made the columns
  // disagree with the selected range shown in the page header (and silently dropped
  // the last 3 days of the range from the grid, so the cells no longer summed to the
  // KPI). The grid now renders exactly the selected range; the lag is surfaced as an
  // explicit "Data to <date>" note instead.
  const getDateRanges = () => {
    const today = new Date();
    const yesterday = subDays(today, 1);

    if (viewType === 'weekly') {
      // For weekly view
      if (dateFilter === 'this-year') {
        const yearStart = startOfYear(today);
        const lastWeek = subWeeks(today, 1);
        return eachWeekOfInterval({ start: yearStart, end: lastWeek }, { weekStartsOn: 1 });
      }
      // Default: 8 weeks
      const lastWeek = subWeeks(today, 1);
      const startWeek = subWeeks(lastWeek, 7);
      return eachWeekOfInterval({ start: startWeek, end: lastWeek }, { weekStartsOn: 1 });
    }

    // For daily view - determine days based on dateFilter
    let startDate: Date;
    let endDate: Date = yesterday;
    
    switch (dateFilter) {
      case 'yesterday':
        startDate = yesterday;
        endDate = yesterday;
        break;
      case 'last-7-days':
        startDate = subDays(yesterday, 6);
        break;
      case 'last-14-days':
        startDate = subDays(yesterday, 13);
        break;
      case 'this-week':
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = today;
        break;
      case 'last-week':
        const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        startDate = lastWeekStart;
        endDate = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
        break;
      case 'this-month':
        startDate = startOfMonth(today);
        endDate = today;
        break;
      case 'last-month':
        const lastMonth = subMonths(today, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'past-30-days':
        startDate = subDays(yesterday, 29);
        break;
      case 'this-year':
        // This year should use weekly view, but if daily is selected, show last 30 days
        startDate = subDays(yesterday, 29);
        break;
      case 'custom':
        if (customDateRange?.from && customDateRange?.to) {
          startDate = customDateRange.from;
          endDate = customDateRange.to;
        } else {
          startDate = subDays(yesterday, 13);
        }
        break;
      default:
        startDate = subDays(yesterday, 13);
    }

    if (endDate < startDate) endDate = startDate;

    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const dateRange = getDateRanges();
  const rangeStart = dateRange[0];
  const rangeEnd = dateRange[dateRange.length - 1];

  // Title must describe what is actually on screen, not what was requested.
  const getHeatmapTitle = () => {
    if (viewType === 'weekly') {
      return `Metrics Heatmap (${dateRange.length} ${dateRange.length === 1 ? 'Week' : 'Weeks'})`;
    }
    return `Metrics Heatmap (${dateRange.length} ${dateRange.length === 1 ? 'Day' : 'Days'})`;
  };

  // Explicit range label so the grid can be checked against the page header.
  const rangeLabel = rangeStart && rangeEnd
    ? viewType === 'weekly'
      ? `${format(startOfWeek(rangeStart, { weekStartsOn: 1 }), 'd MMM')} – ${format(endOfWeek(rangeEnd, { weekStartsOn: 1 }), 'd MMM yyyy')}`
      : `${format(rangeStart, 'd MMM')} – ${format(rangeEnd, 'd MMM yyyy')}`
    : '';

  // If the selected range runs past the last day we hold data for, say so.
  const coverageEnd = viewType === 'weekly' && rangeEnd
    ? endOfWeek(rangeEnd, { weekStartsOn: 1 })
    : rangeEnd;
  const missingTailDays = lastDataDate && coverageEnd
    ? differenceInCalendarDays(coverageEnd, lastDataDate)
    : 0;
  const coverageNote = lastDataDate && missingTailDays > 0
    ? `Data to ${format(lastDataDate, 'd MMM')} — the last ${missingTailDays} ${missingTailDays === 1 ? 'day' : 'days'} of this range ${missingTailDays === 1 ? 'is' : 'are'} not reported yet.`
    : null;

  // Helper function to get PPC data for a given date and account.
  //
  // `hasData` says whether the ads feed actually produced a row for this day, as
  // opposed to producing a zero. The two are not the same fact and the grid has
  // to be able to tell them apart: a day that spent nothing is a reported zero,
  // a day the feed has not delivered is a gap.
  const getPPCDataForDate = (dateStr: string, account: AccountData) => {
    // If API PPC data is available (focused mode), use it instead of sheet PPC data
    if (apiPpcByDate) {
      // dateStr is DD/MM/YYYY, convert to YYYY-MM-DD for lookup
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        const apiRow = apiPpcByDate.get(isoDate);
        return { ppcSpend: apiRow?.ppcSpend || 0, ppcSales: apiRow?.ppcSales || 0, hasData: !!apiRow };
      }
    } else {
    }

    let ppcSpend = 0;
    let ppcSales = 0;
    let hasData = false;

    if (ppcData.length > 0) {
      for (let i = 1; i < ppcData.length; i++) {
        const row = ppcData[i];
        const rowDateStr = row[0]; // Column A - date (format: YYYY-MM-DD)
        const ppcAccountName = row[4]; // Column E - account_name
        const ppcSalesAmount = parseFloat(row[columnMapping.ppcSales] || '0'); 
        const spend = parseFloat(row[columnMapping.ppcSpend] || '0');

        // Convert PPC date format (YYYY-MM-DD) to target format (DD/MM/YYYY)
        let formattedPPCDate = rowDateStr;
        if (rowDateStr && rowDateStr.includes('-')) {
          const dateParts = rowDateStr.split('-');
          if (dateParts.length === 3) {
            formattedPPCDate = `${dateParts[2].padStart(2, '0')}/${dateParts[1].padStart(2, '0')}/${dateParts[0]}`;
          }
        }

        // Try to match by ppcAccountName first, then fall back to merchantToken
        const isMatch = (account.ppcAccountName && ppcAccountName === account.ppcAccountName) ||
                       (!account.ppcAccountName && ppcAccountName === account.merchantToken);

        if (formattedPPCDate === dateStr && isMatch) {
          hasData = true;
          if (!isNaN(spend)) ppcSpend += spend;
          if (!isNaN(ppcSalesAmount)) ppcSales += ppcSalesAmount;
        }
      }
    }

    return { ppcSpend, ppcSales, hasData };
  };

  // Helper function to get all data (sales + traffic) for a given date and account.
  //
  // Same contract as getPPCDataForDate: `hasData` is row presence, never
  // `value > 0`. A shop that sold nothing on a Sunday reported a zero; a day the
  // sales feed has not landed reported nothing. Only the second is a gap.
  const getAllDataForDate = (dateStr: string, account: AccountData) => {
    // For vendor accounts, use Supabase vendor data first, fall back to Google Sheets
    if (isVendorAccount(account.merchantToken)) {
      // Convert dateStr (DD/MM/YYYY) to ISO (YYYY-MM-DD) for Supabase comparison
      const parts = dateStr.split('/');
      const isoDateStr = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';

      if (
        isFocusedMode &&
        shouldApplyVendorLag &&
        focusedAccount?.merchantToken === account.merchantToken &&
        isoDateStr
      ) {
        const vendorDay = vendorDailyMap.get(isoDateStr);

        return {
          sales: vendorDay?.sales ?? 0,
          unitsOrdered: vendorDay?.unitsOrdered ?? 0,
          pageViews: 0,
          buyBoxPercentage: 0,
          conversionRate: 0,
          hasData: !!vendorDay,
        };
      }

      let sales = 0;
      let unitsOrdered = 0;
      let hasData = false;

      if (isoDateStr) {
        const vendorEntry = vendorAllAccountsMap.get(`${account.merchantToken}|${isoDateStr}`);
        if (vendorEntry) {
          hasData = true;
          sales = vendorEntry.sales;
          unitsOrdered = vendorEntry.unitsOrdered;
        }
      } else {
        // Fallback to Google Sheets vendor data
        for (let i = 1; i < vendorData.length; i++) {
          const row = vendorData[i];
          if (!row || row.length === 0) continue;
          const rowDateStr = row[1];
          const accountName = row[3];
          const salesAmount = parseFloat(row[8] || '0');
          const unitsOrderedValue = parseFloat(row[7] || '0');
          let formattedVendorDate = rowDateStr;
          if (rowDateStr && rowDateStr.includes('-')) {
            const dateParts = rowDateStr.split('-');
            if (dateParts.length === 3) {
              formattedVendorDate = `${dateParts[2].padStart(2, '0')}/${dateParts[1].padStart(2, '0')}/${dateParts[0]}`;
            }
          }
          if (formattedVendorDate === dateStr && accountName === account.merchantToken) {
            hasData = true;
            if (!isNaN(salesAmount)) sales += salesAmount;
            if (!isNaN(unitsOrderedValue)) unitsOrdered += unitsOrderedValue;
          }
        }

      }

      return {
        sales,
        unitsOrdered,
        pageViews: 0,
        buyBoxPercentage: 0,
        conversionRate: 0,
        hasData
      };
    }

    // For seller accounts, use sheet data
    let sales = 0;
    let unitsOrdered = 0;
    let pageViews = 0;
    let buyBoxPercentageSum = 0;
    let conversionRateSum = 0;
    let dataPointsCount = 0;
    let hasData = false;

    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      const rowDateStr = row[1]; // Column B (date)
      const accountId = row[3]; // Column D (account_id) - FIXED: was row[4]
      const salesAmount = parseFloat(row[columnMapping.sales] || '0');
      
      // Traffic metrics from configured columns
      const unitsOrderedValue = parseFloat(row[columnMapping.unitsOrdered] || '0');
      const pageViewsValue = parseFloat(row[columnMapping.pageViews] || '0');
      const buyBoxPercentage = parseFloat(row[columnMapping.buyBoxPercentage] || '0');
      const conversionRate = parseFloat(row[columnMapping.conversionRate] || '0');

      // Convert sheet date format to match our target format
      let formattedRowDate = rowDateStr;
      if (rowDateStr && rowDateStr.includes('-')) {
        // Convert from YYYY-MM-DD to DD/MM/YYYY
        const dateParts = rowDateStr.split('-');
        if (dateParts.length === 3) {
          formattedRowDate = `${dateParts[2].padStart(2, '0')}/${dateParts[1].padStart(2, '0')}/${dateParts[0]}`;
        }
      }

      if (formattedRowDate === dateStr && accountId === account.merchantToken) {
        hasData = true;
        if (!isNaN(salesAmount)) sales += salesAmount;
        if (!isNaN(unitsOrderedValue)) unitsOrdered += unitsOrderedValue;
        if (!isNaN(pageViewsValue)) pageViews += pageViewsValue;
        if (!isNaN(buyBoxPercentage)) {
          buyBoxPercentageSum += buyBoxPercentage;
          dataPointsCount++;
        }
        if (!isNaN(conversionRate)) conversionRateSum += conversionRate;
      }
    }
    
    return {
      sales,
      unitsOrdered,
      pageViews,
      buyBoxPercentage: dataPointsCount > 0 ? buyBoxPercentageSum / dataPointsCount : 0,
      conversionRate: dataPointsCount > 0 ? conversionRateSum / dataPointsCount : 0,
      hasData
    };
  };

  // Calculate metrics for each account and date/week
  const calculateAccountMetrics = (account: AccountData) => {
    
    const periodMetrics = dateRange.map(period => {
      let sales = 0;
      let ppcSpend = 0;
      let ppcSales = 0;
      let unitsOrdered = 0;
      let pageViews = 0;
      let buyBoxPercentageSum = 0;
      let conversionRateSum = 0;
      let dataPointsCount = 0;
      // Feed presence, aggregated the same way the figures are: a week has sales
      // data if any of its days did.
      let hasSalesData = false;
      let hasPpcData = false;

      if (viewType === 'weekly') {
        // For weekly view, aggregate data for the whole week
        const weekStart = startOfWeek(period, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(period, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

        weekDays.forEach(day => {
          const dayStr = format(day, 'dd/MM/yyyy');
          const dayData = getAllDataForDate(dayStr, account);
          sales += dayData.sales;
          unitsOrdered += dayData.unitsOrdered;
          pageViews += dayData.pageViews;
          hasSalesData = hasSalesData || dayData.hasData;
          if (dayData.buyBoxPercentage > 0) {
            buyBoxPercentageSum += dayData.buyBoxPercentage;
            dataPointsCount++;
          }
          if (dayData.conversionRate > 0) conversionRateSum += dayData.conversionRate;

          const ppcData = getPPCDataForDate(dayStr, account);
          ppcSpend += ppcData.ppcSpend;
          ppcSales += ppcData.ppcSales;
          hasPpcData = hasPpcData || ppcData.hasData;
        });
      } else {
        // For daily view
        const dateStr = format(period, 'dd/MM/yyyy');
        const dayData = getAllDataForDate(dateStr, account);
        sales = dayData.sales;
        unitsOrdered = dayData.unitsOrdered;
        pageViews = dayData.pageViews;
        buyBoxPercentageSum = dayData.buyBoxPercentage;
        conversionRateSum = dayData.conversionRate;
        dataPointsCount = dayData.buyBoxPercentage > 0 ? 1 : 0;
        hasSalesData = dayData.hasData;

        const ppcData = getPPCDataForDate(dateStr, account);
        ppcSpend = ppcData.ppcSpend;
        ppcSales = ppcData.ppcSales;
        hasPpcData = ppcData.hasData;
      }

      // One resolver for both grids: the ratio guards must not be able to drift
      // apart between the account view and the focused view.
      const cell = resolveMetricCell(selectedMetric, {
        sales,
        ppcSpend,
        ppcSales,
        unitsOrdered,
        pageViews,
        buyBoxPercentage: dataPointsCount > 0 ? buyBoxPercentageSum / dataPointsCount : 0,
        conversionRate: dataPointsCount > 0 ? conversionRateSum / dataPointsCount : 0,
        hasSalesData,
        hasPpcData,
      }, period);

      return {
        date: period,
        dateStr: viewType === 'weekly' ? `Week ${format(period, 'dd/MM')}` : format(period, 'dd/MM/yyyy'),
        value: cell.value,
        hasData: cell.hasData,
        isDefined: cell.isDefined,
        reason: cell.reason,
        sales,
        ppcSpend,
        ppcSales,
        unitsOrdered,
        pageViews,
        buyBoxPercentage: dataPointsCount > 0 ? buyBoxPercentageSum / dataPointsCount : 0,
        conversionRate: dataPointsCount > 0 ? conversionRateSum / dataPointsCount : 0
      };
    });

    // Calculate max value for this account to normalize colors
    const maxValue = Math.max(...periodMetrics.map(d => d.value), 1);

    const inverse = isInverseMetric(selectedMetric);
    return {
      account,
      dailyMetrics: periodMetrics.map(d => ({
        ...d,
        intensity: heatmapIntensity(d.value, maxValue, inverse),
        isInverse: inverse,
      })),
      maxValue
    };
  };

  // Sort accounts alphabetically before calculating metrics
  const sortedAccounts = [...accounts].sort((a, b) => a.name.localeCompare(b.name));
  const accountMetricsData = sortedAccounts.map(calculateAccountMetrics);

  // For focused mode, create data for all metrics (exclude vendor-specific metrics for vendor accounts)
  const hasVendorPpc = !!apiPpcDailyData && apiPpcDailyData.some(d => (d.spend ?? 0) > 0);
  const focusedMetricsData = isFocusedMode ? METRIC_OPTIONS
    .filter(metric => {
      const account = accounts[0];
      const isVendor = isVendorAccount(account.merchantToken);

      // Filter by vendor-specific exclusions
      if (isVendor && VENDOR_EXCLUDED_METRICS.includes(metric.value)) {
        return false;
      }
      // Vendors with no ad data: hide empty PPC/ACOS/TACOS rows
      if (isVendor && !hasVendorPpc && ['ppcSpend', 'ppcSales', 'acos', 'tacos'].includes(metric.value)) {
        return false;
      }

      
      // Apply PPC/Organic filters
      if (showPPCOnly && !PPC_METRICS.includes(metric.value)) {
        return false;
      }
      
      if (showOrganicOnly && !ORGANIC_METRICS.includes(metric.value)) {
        return false;
      }
      
      return true;
    })
    .map(metric => {
    const account = accounts[0];
    const periodMetrics = dateRange.map(period => {
      let sales = 0;
      let ppcSpend = 0;
      let ppcSales = 0;
      let unitsOrdered = 0;
      let pageViews = 0;
      let buyBoxPercentageSum = 0;
      let conversionRateSum = 0;
      let dataPointsCount = 0;
      let hasSalesData = false;
      let hasPpcData = false;

      if (viewType === 'weekly') {
        // For weekly view, aggregate data for the whole week
        const weekStart = startOfWeek(period, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(period, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

        weekDays.forEach(day => {
          const dayStr = format(day, 'dd/MM/yyyy');
          const dayData = getAllDataForDate(dayStr, account);
          sales += dayData.sales;
          unitsOrdered += dayData.unitsOrdered;
          pageViews += dayData.pageViews;
          hasSalesData = hasSalesData || dayData.hasData;
          if (dayData.buyBoxPercentage > 0) {
            buyBoxPercentageSum += dayData.buyBoxPercentage;
            dataPointsCount++;
          }
          if (dayData.conversionRate > 0) conversionRateSum += dayData.conversionRate;

          const ppcDataResult = getPPCDataForDate(dayStr, account);
          ppcSpend += ppcDataResult.ppcSpend;
          ppcSales += ppcDataResult.ppcSales;
          hasPpcData = hasPpcData || ppcDataResult.hasData;
        });
      } else {
        // For daily view
        const dateStr = format(period, 'dd/MM/yyyy');
        const dayData = getAllDataForDate(dateStr, account);
        sales = dayData.sales;
        unitsOrdered = dayData.unitsOrdered;
        pageViews = dayData.pageViews;
        buyBoxPercentageSum = dayData.buyBoxPercentage;
        conversionRateSum = dayData.conversionRate;
        dataPointsCount = dayData.buyBoxPercentage > 0 ? 1 : 0;
        hasSalesData = dayData.hasData;

        // Get PPC data for this specific date
        const ppcDataResult = getPPCDataForDate(dateStr, account);
        ppcSpend = ppcDataResult.ppcSpend;
        ppcSales = ppcDataResult.ppcSales;
        hasPpcData = ppcDataResult.hasData;
      }

      const cell = resolveMetricCell(metric.value, {
        sales,
        ppcSpend,
        ppcSales,
        unitsOrdered,
        pageViews,
        buyBoxPercentage: dataPointsCount > 0 ? buyBoxPercentageSum / dataPointsCount : 0,
        conversionRate: dataPointsCount > 0 ? conversionRateSum / dataPointsCount : 0,
        hasSalesData,
        hasPpcData,
      }, period);

      return {
        date: period,
        dateStr: viewType === 'weekly' ? `Week ${format(period, 'dd/MM')}` : format(period, 'dd/MM/yyyy'),
        value: cell.value,
        hasData: cell.hasData,
        isDefined: cell.isDefined,
        reason: cell.reason
      };
    });

    // Calculate max value for this metric
    const maxValue = Math.max(...periodMetrics.map(d => d.value), 1);

    const inverse = isInverseMetric(metric.value as MetricType);
    return {
      metric,
      // Always store raw intensity (0-1), inverted for cost metrics so darker blue = better.
      dailyMetrics: periodMetrics.map(d => ({
        ...d,
        intensity: heatmapIntensity(d.value, maxValue, inverse),
        isInverse: inverse,
      })),
      maxValue
    };
  }) : [];

  /**
   * Two placeholders, one meaning each, and they are used nowhere else:
   *   —    nothing was reported (the cell is hatched, and the key says so)
   *   N/A  the day WAS reported but the figure cannot be computed from it
   * The grid used to emit '-' in some places and '—' in others for the same
   * state, which left a reader deciding whether the difference meant something.
   */
  const NOT_REPORTED = '—';
  const NOT_COMPUTABLE = 'N/A';

  const formatMetricValue = (cell: { value: number; hasData: boolean; isDefined: boolean }, metric: MetricType) => {
    if (!cell.hasData) return NOT_REPORTED;
    if (!cell.isDefined) return NOT_COMPUTABLE;

    const value = cell.value;
    switch (metric) {
      case 'sales':
      case 'ppcSpend':
      case 'ppcSales':
        return formatCurrency(value, false);
      case 'acos':
      case 'tacos':
      case 'buyBoxPercentage':
      case 'conversionRate':
        return formatPercentage(value);
      case 'unitsOrdered':
        return Math.round(value).toLocaleString();
      case 'pageViews':
        return Math.round(value).toLocaleString();
      default:
        return value.toFixed(0);
    }
  };

  const getTooltipValue = (cell: { value: number; hasData: boolean; isDefined: boolean; reason: string }, metric: MetricType) => {
    if (!cell.hasData || !cell.isDefined) {
      return cell.reason || (cell.hasData ? 'not available' : 'not reported yet');
    }
    const value = cell.value;
    switch (metric) {
      case 'sales':
      case 'ppcSpend':
      case 'ppcSales':
        return formatCurrency(value);
      case 'acos':
      case 'tacos':
      case 'buyBoxPercentage':
      case 'conversionRate':
        return formatPercentage(value);
      case 'unitsOrdered':
        return `${Math.round(value).toLocaleString()} units`;
      case 'pageViews':
        return `${Math.round(value).toLocaleString()} views`;
      default:
        return value.toFixed(2);
    }
  };

  // Cell geometry, named once so the header, the body and the two modes cannot
  // drift apart now that they are table cells rather than flex children.
  const cellWidth = viewType === 'weekly' ? 'w-14 md:w-20' : 'w-12 md:w-16';
  /** Column gap, reproduced as left padding on every column but the first. */
  const colGap = (i: number) => (i > 0 ? 'pl-0.5 md:pl-1' : '');
  /** Row gap: 8px above every body row, none above the header. */
  const rowGap = 'pt-2';

  const periodLabel = (date: Date) =>
    viewType === 'weekly'
      ? `Week ${format(date, 'w')} (${format(startOfWeek(date, { weekStartsOn: 1 }), 'dd/MM')} - ${format(endOfWeek(date, { weekStartsOn: 1 }), 'dd/MM')})`
      : format(date, 'dd/MM/yyyy');

  // The reversal has to survive a screenshot of the grid on its own — clients
  // crop the caption off. So it is stated on the row itself and marked in every
  // cell, driven off the shared scale rather than a local list.
  const inverseMarker = (
    <span aria-hidden="true" className="absolute left-0.5 top-0.5 text-[8px] leading-none opacity-70">▼</span>
  );
  const lowerIsBetterNote = (
    <div className="text-[9px] font-normal text-gray-600 leading-none pt-0.5">▼ lower is better</div>
  );

  const dateHeaderCells = dateRange.map((date, i) => (
    <th key={date.toISOString()} scope="col" className={cn('p-0 align-top', colGap(i))}>
      <div className={cn('text-[11px] md:text-xs font-normal text-gray-700 text-center py-1.5 md:py-2', cellWidth)}>
        {viewType === 'weekly' ? (
          <>
            <div>W{format(date, 'w')}</div>
            <div>{format(date, 'dd/MM')}</div>
          </>
        ) : (
          <>
            <div>{format(date, 'dd')}</div>
            <div>{format(date, 'MMM')}</div>
          </>
        )}
      </div>
    </th>
  ));

  const getDisplayName = (account: AccountData) => {
    return getBlurredDisplayName(account.name, isBlurred);
  };

  const handleAccountClick = (accountId: string) => {
    if (onFocusAccount && !isFocusedMode) {
      onFocusAccount(accountId);
    }
  };

  return (
    <Card>
      <CardHeader className="px-3 py-3 md:px-6 md:py-4">
        <div className="flex flex-col gap-3 md:gap-4">
          <div>
            <CardTitle className="text-sm md:text-lg">
              {isFocusedMode 
                ? <><span className="md:hidden">{getDisplayName(accounts[0])} Heatmap</span><span className="hidden md:inline">{getDisplayName(accounts[0])} - {getHeatmapTitle()}</span></>
                : <><span className="md:hidden">Metrics Heatmap</span><span className="hidden md:inline">{getHeatmapTitle()}</span></>
              }
            </CardTitle>
            <p className="hidden md:block text-sm text-gray-600">
              {isFocusedMode
                ? `${viewType === 'daily' ? 'Daily' : 'Weekly'} performance across all metrics`
                : `${viewType === 'daily' ? 'Daily' : 'Weekly'} performance by account — click an account name to focus`
              }
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border p-0.5 md:p-1">
              <Button
                variant={viewType === 'daily' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('daily')}
                className="h-6 px-2 text-xs md:h-7 md:px-3 md:text-sm"
              >
                Daily
              </Button>
              <Button
                variant={viewType === 'weekly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('weekly')}
                className="h-6 px-2 text-xs md:h-7 md:px-3 md:text-sm"
              >
                Weekly
              </Button>
            </div>
            
            {/* Data Type Filters - Only in focused mode */}
            {isFocusedMode && (
              <div className="flex rounded-lg border p-0.5 md:p-1">
                <Button
                  variant={showPPCOnly ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setShowPPCOnly(!showPPCOnly);
                    if (!showPPCOnly) setShowOrganicOnly(false);
                  }}
                  className="h-6 px-2 text-xs md:h-7 md:px-3 md:text-sm"
                >
                  PPC
                </Button>
                <Button
                  variant={showOrganicOnly ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setShowOrganicOnly(!showOrganicOnly);
                    if (!showOrganicOnly) setShowPPCOnly(false);
                  }}
                  className="h-6 px-2 text-xs md:h-7 md:px-3 md:text-sm"
                >
                  Organic
                </Button>
              </div>
            )}
            
            {!isFocusedMode && (
              <Select value={selectedMetric} onValueChange={(value: MetricType) => setSelectedMetric(value)}>
                <SelectTrigger className="w-32 md:w-40 h-7 text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {!isSharedView && <ColumnMappingDialog onMappingChange={setColumnMapping} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 py-2 md:px-6 md:py-4 min-w-0 max-w-full overflow-hidden">
        {/* Scale key + reversal note sit ABOVE the grid: you need them to read a cell,
            so they must not be 250px further down the page. */}
        <HeatmapLegend showNotComputableNote>
          {rangeLabel && (
            <div className="text-gray-600">
              Showing {rangeLabel}
              {coverageNote ? <span className="text-amber-700 font-medium"> · {coverageNote}</span> : null}
            </div>
          )}
        </HeatmapLegend>

        {/* The grid is 14+ columns of 48–64px plus a label column: it cannot fit a
            375px phone, and the panel rejected dropping columns or shrinking the
            text. So it scrolls sideways with the label column pinned, and the
            scroller is a named, focusable region — a keyboard user has to be able
            to reach the right-hand columns without a mouse. */}
        <div
          role="region"
          aria-label={isFocusedMode
            ? `${getDisplayName(accounts[0])} metrics heatmap, scrollable sideways`
            : 'Metrics heatmap by account, scrollable sideways'}
          tabIndex={0}
          className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isFocusedMode ? (
            // Focused mode: Show all metrics vertically
            <table className="border-separate border-spacing-0">
              <caption className="sr-only">
                {getDisplayName(accounts[0])} — {viewType === 'weekly' ? 'weekly' : 'daily'} performance
                {rangeLabel ? ` for ${rangeLabel}` : ''}. Rows are metrics, columns are
                {viewType === 'weekly' ? ' weeks' : ' days'}. Hatched cells marked “—” were not reported;
                “N/A” means the day was reported but the figure cannot be worked out from it.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="p-0 align-top text-left sticky left-0 z-10 bg-background">
                    <div className="w-20 md:w-32 text-[11px] md:text-sm font-medium text-gray-700 py-1.5 md:py-2">Metric</div>
                  </th>
                  {dateHeaderCells}
                </tr>
              </thead>
              <tbody>
                {focusedMetricsData.map(({ metric, dailyMetrics }) => {
                  const inverse = isInverseMetric(metric.value);
                  return (
                    <tr key={metric.value}>
                      <th scope="row" className={cn('p-0 align-middle text-left sticky left-0 z-10', rowGap)}>
                        <div className="w-20 md:w-32 text-[11px] md:text-sm font-medium text-gray-900 py-2 md:py-3 px-1 md:px-2 bg-gray-50 rounded flex items-center">
                          <div className="min-w-0">
                            <div className="truncate" title={inverse ? `${metric.label} (lower is better)` : metric.label}>
                              {metric.label}
                            </div>
                            {inverse ? lowerIsBetterNote : null}
                          </div>
                        </div>
                      </th>
                      {dailyMetrics.map((cell, i) => (
                        <td key={cell.date.toISOString()} className={cn('p-0 align-middle h-px', rowGap, colGap(i))}>
                          <div
                            className={cn(
                              // h-px on the cell + h-full here reproduces the flex row's
                              // stretch: the coloured box has to fill the row, or a row
                              // with a taller label leaves a pale gap above and below it.
                              'relative h-full flex flex-col justify-center py-2 md:py-3 px-0.5 md:px-1 rounded text-center cursor-pointer transition-transform hover:scale-105',
                              cellWidth
                            )}
                            style={getCellStyle(cell.intensity, cell.hasData)}
                            title={`${metric.label}${inverse ? ' (lower is better)' : ''} - ${periodLabel(cell.date)}: ${getTooltipValue(cell, metric.value)}`}
                          >
                            {inverse && cell.hasData ? inverseMarker : null}
                            <div className="text-[11px] md:text-xs font-medium leading-tight">
                              {formatMetricValue(cell, metric.value)}
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            // Multi-account mode: Show selected metric by account
            <table className="border-separate border-spacing-0">
              <caption className="sr-only">
                {METRIC_OPTIONS.find(o => o.value === selectedMetric)?.label ?? selectedMetric} by account,
                {viewType === 'weekly' ? ' weekly' : ' daily'}{rangeLabel ? `, ${rangeLabel}` : ''}. Rows are accounts,
                columns are {viewType === 'weekly' ? 'weeks' : 'days'}. Hatched cells marked “—” were not reported;
                “N/A” means the period was reported but the figure cannot be worked out from it.
                {isInverseMetric(selectedMetric) ? ' For this metric a lower value is better.' : ''}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="p-0 align-top text-left sticky left-0 z-10 bg-background">
                    <div className="w-28 md:w-48 text-[11px] md:text-sm font-medium text-gray-700 py-1.5 md:py-2">
                      Account
                      {isInverseMetric(selectedMetric) ? lowerIsBetterNote : null}
                    </div>
                  </th>
                  {dateHeaderCells}
                </tr>
              </thead>
              <tbody>
                {accountMetricsData.map(({ account, dailyMetrics }) => (
                  <tr key={account.id}>
                    <th scope="row" className={cn('p-0 align-middle text-left sticky left-0 z-10', rowGap)}>
                      <div
                        className="w-28 md:w-48 text-[11px] md:text-sm font-medium text-gray-900 py-2 md:py-3 px-1 md:px-2 bg-gray-50 rounded flex items-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleAccountClick(account.id)}
                      >
                        <div className="truncate" title={isBlurred ? account.name : getDisplayName(account)}>
                          {getDisplayName(account)}
                        </div>
                        {!isSharedView && (
                          <AccountTagBadges merchantToken={account.merchantToken} size="sm" tags={accountTagsMap[account.merchantToken] || []} />
                        )}
                      </div>
                    </th>
                    {dailyMetrics.map((cell, i) => (
                      <td key={cell.date.toISOString()} className={cn('p-0 align-middle h-px', rowGap, colGap(i))}>
                        <div
                          className={cn(
                            'relative h-full flex flex-col justify-center py-2 md:py-3 px-0.5 md:px-1 rounded text-center cursor-pointer transition-transform hover:scale-105',
                            cellWidth
                          )}
                          style={getCellStyle(cell.intensity, cell.hasData)}
                          title={`${getDisplayName(account)} - ${periodLabel(cell.date)}: ${getTooltipValue(cell, selectedMetric)}`}
                        >
                          {cell.isInverse && cell.hasData ? inverseMarker : null}
                          <div className="text-[11px] md:text-xs font-medium leading-tight">
                            {formatMetricValue(cell, selectedMetric)}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export const SalesHeatmap = React.memo(SalesHeatmapInner);
export default SalesHeatmap;
