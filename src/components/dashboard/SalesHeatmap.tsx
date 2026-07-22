import React from 'react';
import type { ApiPpcDailyRow } from '@/hooks/useApiPpcData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format, subDays, eachDayOfInterval, subWeeks, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, subMonths, startOfYear, differenceInDays, isToday, isYesterday } from 'date-fns';
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

type MetricType = 'sales' | 'ppcSpend' | 'ppcSales' | 'acos' | 'tacos' | 'unitsOrdered' | 'pageViews' | 'buyBoxPercentage' | 'conversionRate';
type ViewType = 'daily' | 'weekly';

const VENDOR_LAG_DAYS = 3;

const METRIC_OPTIONS = [
  { value: 'sales' as MetricType, label: 'Sales' },
  { value: 'ppcSpend' as MetricType, label: 'PPC Spend' },
  { value: 'ppcSales' as MetricType, label: 'PPC Sales' },
  { value: 'acos' as MetricType, label: 'ACOS' },
  { value: 'tacos' as MetricType, label: 'TACOS' },
  { value: 'unitsOrdered' as MetricType, label: 'Units Ordered' },
  { value: 'pageViews' as MetricType, label: 'Page Views' },
  { value: 'buyBoxPercentage' as MetricType, label: 'Buy Box %' },
  { value: 'conversionRate' as MetricType, label: 'Conversion Rate' },
];

const VENDOR_EXCLUDED_METRICS = ['pageViews', 'buyBoxPercentage', 'conversionRate'];

// Metrics where lower values = better performance
const INVERSE_METRICS: MetricType[] = ['acos', 'tacos'];
const isInverseMetric = (metric: MetricType) => INVERSE_METRICS.includes(metric);

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
    const map = new Map<string, { ppcSpend: number; ppcSales: number }>();
    for (const row of apiPpcDailyData) {
      const existing = map.get(row.date);
      if (existing) {
        existing.ppcSpend += row.spend;
        existing.ppcSales += row.sales;
      } else {
        map.set(row.date, { ppcSpend: row.spend, ppcSales: row.sales });
      }
    }
    return map;
  }, [apiPpcDailyData]);
  
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

  // Generate date ranges based on view type and dateFilter
  const getDateRanges = () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    if (viewType === 'weekly') {
      // For weekly view
      if (dateFilter === 'this-year') {
        const yearStart = startOfYear(today);
        const lastWeek = subWeeks(today, 1);
        return eachWeekOfInterval({
          start: shouldApplyVendorLag ? subDays(yearStart, VENDOR_LAG_DAYS) : yearStart,
          end: shouldApplyVendorLag ? subDays(lastWeek, VENDOR_LAG_DAYS) : lastWeek,
        }, { weekStartsOn: 1 });
      }
      // Default: 8 weeks
      const lastWeek = subWeeks(today, 1);
      const startWeek = subWeeks(lastWeek, 7);
       return eachWeekOfInterval({
         start: shouldApplyVendorLag ? subDays(startWeek, VENDOR_LAG_DAYS) : startWeek,
         end: shouldApplyVendorLag ? subDays(lastWeek, VENDOR_LAG_DAYS) : lastWeek,
       }, { weekStartsOn: 1 });
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

    if (shouldApplyVendorLag) {
      startDate = subDays(startDate, VENDOR_LAG_DAYS);
      endDate = subDays(endDate, VENDOR_LAG_DAYS);
    }

    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const dateRange = getDateRanges();
  
  // Get display title based on dateFilter
  const getHeatmapTitle = () => {
    if (viewType === 'weekly') {
      return `Metrics Heatmap (${dateRange.length} Weeks)`;
    }
    return `Metrics Heatmap (${dateRange.length} Days)`;
  };

  // Helper function to get PPC data for a given date and account
  const getPPCDataForDate = (dateStr: string, account: AccountData) => {
    // If API PPC data is available (focused mode), use it instead of sheet PPC data
    if (apiPpcByDate) {
      // dateStr is DD/MM/YYYY, convert to YYYY-MM-DD for lookup
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        const apiRow = apiPpcByDate.get(isoDate);
        return { ppcSpend: apiRow?.ppcSpend || 0, ppcSales: apiRow?.ppcSales || 0 };
      }
    } else {
    }

    let ppcSpend = 0;
    let ppcSales = 0;
    
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
          if (!isNaN(spend)) ppcSpend += spend;
          if (!isNaN(ppcSalesAmount)) ppcSales += ppcSalesAmount;
        }
      }
    }
    
    return { ppcSpend, ppcSales };
  };

  // Helper function to get all data (sales + traffic) for a given date and account
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
        };
      }

      let sales = 0;
      let unitsOrdered = 0;

      if (isoDateStr) {
        const vendorEntry = vendorAllAccountsMap.get(`${account.merchantToken}|${isoDateStr}`);
        if (vendorEntry) {
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
        conversionRate: 0
      };
    }
    
    // For seller accounts, use sheet data
    let sales = 0;
    let unitsOrdered = 0;
    let pageViews = 0;
    let buyBoxPercentageSum = 0;
    let conversionRateSum = 0;
    let dataPointsCount = 0;
    
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
      conversionRate: dataPointsCount > 0 ? conversionRateSum / dataPointsCount : 0
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
          if (dayData.buyBoxPercentage > 0) {
            buyBoxPercentageSum += dayData.buyBoxPercentage;
            dataPointsCount++;
          }
          if (dayData.conversionRate > 0) conversionRateSum += dayData.conversionRate;
          
          const ppcData = getPPCDataForDate(dayStr, account);
          ppcSpend += ppcData.ppcSpend;
          ppcSales += ppcData.ppcSales;
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
        
        // For vendor accounts, also get PPC data for this specific date
        if (isVendorAccount(account.merchantToken)) {
          const ppcData = getPPCDataForDate(dateStr, account);
          ppcSpend = ppcData.ppcSpend;
          ppcSales = ppcData.ppcSales;
        } else {
          const ppcData = getPPCDataForDate(dateStr, account);
          ppcSpend = ppcData.ppcSpend;
          ppcSales = ppcData.ppcSales;
        }
      }

      // Calculate metric value based on selected metric
      let metricValue = 0;
      switch (selectedMetric) {
        case 'sales':
          metricValue = sales;
          break;
        case 'ppcSpend':
          metricValue = ppcSpend;
          break;
        case 'ppcSales':
          metricValue = ppcSales;
          break;
        case 'acos':
          metricValue = ppcSales > 0 ? (ppcSpend / ppcSales) * 100 : 0;
          break;
        case 'tacos':
          metricValue = sales > 0 ? (ppcSpend / sales) * 100 : 0;
          break;
        case 'unitsOrdered':
          metricValue = unitsOrdered;
          break;
        case 'pageViews':
          metricValue = pageViews;
          break;
        case 'buyBoxPercentage':
          metricValue = dataPointsCount > 0 ? buyBoxPercentageSum / dataPointsCount : 0;
          break;
        case 'conversionRate':
          metricValue = dataPointsCount > 0 ? conversionRateSum / dataPointsCount : 0;
          break;
      }

      return {
        date: period,
        dateStr: viewType === 'weekly' ? `Week ${format(period, 'dd/MM')}` : format(period, 'dd/MM/yyyy'),
        value: metricValue,
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
      dailyMetrics: periodMetrics.map(d => {
        const raw = d.value / maxValue;
        return {
          ...d,
          intensity: d.value === 0 ? 0 : (inverse ? 1 - raw : raw),
          isInverse: inverse,
        };
      }),
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
          if (dayData.buyBoxPercentage > 0) {
            buyBoxPercentageSum += dayData.buyBoxPercentage;
            dataPointsCount++;
          }
          if (dayData.conversionRate > 0) conversionRateSum += dayData.conversionRate;
          
          const ppcDataResult = getPPCDataForDate(dayStr, account);
          ppcSpend += ppcDataResult.ppcSpend;
          ppcSales += ppcDataResult.ppcSales;
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
        
        // Get PPC data for this specific date
        const ppcDataResult = getPPCDataForDate(dateStr, account);
        ppcSpend = ppcDataResult.ppcSpend;
        ppcSales = ppcDataResult.ppcSales;
      }

      // Calculate metric value
      let metricValue = 0;
      switch (metric.value) {
        case 'sales':
          metricValue = sales;
          break;
        case 'ppcSpend':
          metricValue = ppcSpend;
          break;
        case 'ppcSales':
          metricValue = ppcSales;
          break;
        case 'acos':
          metricValue = ppcSales > 0 ? (ppcSpend / ppcSales) * 100 : 0;
          break;
        case 'tacos':
          metricValue = sales > 0 ? (ppcSpend / sales) * 100 : 0;
          break;
        case 'unitsOrdered':
          metricValue = unitsOrdered;
          break;
        case 'pageViews':
          metricValue = pageViews;
          break;
        case 'buyBoxPercentage':
          metricValue = dataPointsCount > 0 ? buyBoxPercentageSum / dataPointsCount : 0;
          break;
        case 'conversionRate':
          metricValue = dataPointsCount > 0 ? conversionRateSum / dataPointsCount : 0;
          break;
      }

      return {
        date: period,
        dateStr: viewType === 'weekly' ? `Week ${format(period, 'dd/MM')}` : format(period, 'dd/MM/yyyy'),
        value: metricValue
      };
    });

    // Calculate max value for this metric
    const maxValue = Math.max(...periodMetrics.map(d => d.value), 1);

    const inverse = isInverseMetric(metric.value as MetricType);
    return {
      metric,
      dailyMetrics: periodMetrics.map(d => {
        const raw = d.value / maxValue;
        // Always store raw intensity (0-1), inverted for cost metrics so darker blue = better.
        return {
          ...d,
          intensity: d.value === 0 ? 0 : (inverse ? 1 - raw : raw),
          isInverse: inverse,
        };
      }),
      maxValue
    };
  }) : [];

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 0.2) return 'bg-blue-100';
    if (intensity < 0.4) return 'bg-blue-200';
    if (intensity < 0.6) return 'bg-blue-300';
    if (intensity < 0.8) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  const getTextColor = (intensity: number) => {
    return intensity >= 0.6 ? 'text-white' : 'text-gray-700';
  };

  const PENDING_ELIGIBLE_METRICS: MetricType[] = ['pageViews', 'buyBoxPercentage', 'conversionRate'];

  const formatMetricValue = (value: number, metric: MetricType, date?: Date) => {
    if (value === 0) {
      // Recent dates on lagging metrics: render muted em-dash (tooltip explains)
      if (date && PENDING_ELIGIBLE_METRICS.includes(metric) && (isToday(date) || isYesterday(date))) {
        return '—';
      }
      return '-';
    }
    
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

  const getTooltipValue = (value: number, metric: MetricType) => {
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
                ? `${viewType === 'daily' ? 'Daily' : 'Weekly'} performance across all metrics — all metrics on a blue scale where darker = better; for ACOS & TACOS, lower values are the strongest blue`
                : `${viewType === 'daily' ? 'Daily' : 'Weekly'} performance by account — all metrics on a blue scale where darker = better; for ACOS & TACOS, lower values are the strongest blue — Click account name to focus`
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
      <CardContent className="px-2 py-2 md:px-6 md:py-4">
        <div className="space-y-2 overflow-x-auto">
          {isFocusedMode ? (
            // Focused mode: Show all metrics vertically
            <>
              {/* Date headers */}
              <div className="flex min-w-max">
                <div className="w-20 md:w-32 text-[10px] md:text-sm font-medium text-gray-600 py-1.5 md:py-2 sticky left-0 z-10 bg-background flex-shrink-0">Metric</div>
                <div className="flex gap-0.5 md:gap-1">
                  {dateRange.map(date => (
                    <div key={date.toISOString()} className={cn("text-[9px] md:text-xs text-gray-600 text-center py-1.5 md:py-2", viewType === 'weekly' ? "w-14 md:w-20" : "w-10 md:w-16")}>
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
                  ))}
                </div>
              </div>

              {/* Metric rows */}
              {focusedMetricsData.map(({ metric, dailyMetrics }) => (
                <div key={metric.value} className="flex min-w-max">
                  <div className="w-20 md:w-32 text-[10px] md:text-sm font-medium text-gray-800 py-2 md:py-3 px-1 md:px-2 bg-gray-50 rounded flex items-center sticky left-0 z-10 flex-shrink-0">
                    <div className="truncate" title={metric.label}>
                      {metric.label}
                    </div>
                  </div>
                  <div className="flex gap-0.5 md:gap-1">
                    {dailyMetrics.map(({ date, value, intensity, dateStr, isInverse }) => (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          "py-2 md:py-3 px-0.5 md:px-1 rounded text-center cursor-pointer transition-all hover:scale-105",
                          viewType === 'weekly' ? "w-14 md:w-20" : "w-10 md:w-16",
                          getIntensityColor(intensity),
                          getTextColor(intensity)
                        )}
                        title={value === 0 && PENDING_ELIGIBLE_METRICS.includes(metric.value) && (isToday(date) || isYesterday(date))
                          ? `Awaiting data (reporting lag) — ${metric.label} for ${format(date, 'dd/MM/yyyy')}`
                          : `${metric.label} - ${viewType === 'weekly' ? `Week ${format(date, 'w')} (${format(startOfWeek(date, { weekStartsOn: 1 }), 'dd/MM')} - ${format(endOfWeek(date, { weekStartsOn: 1 }), 'dd/MM')})` : format(date, 'dd/MM/yyyy')}: ${getTooltipValue(value, metric.value)}`}
                      >
                        <div className={cn(
                          "text-[9px] md:text-xs font-medium",
                          value === 0 && PENDING_ELIGIBLE_METRICS.includes(metric.value) && (isToday(date) || isYesterday(date)) && "text-muted-foreground/60"
                        )}>
                          {formatMetricValue(value, metric.value, date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            // Multi-account mode: Show selected metric by account
            <>
              {/* Date headers */}
              <div className="flex min-w-max">
                <div className="w-28 md:w-48 text-[10px] md:text-sm font-medium text-gray-600 py-1.5 md:py-2 sticky left-0 z-10 bg-background flex-shrink-0">Account</div>
                <div className="flex gap-0.5 md:gap-1">
                  {dateRange.map(date => (
                    <div key={date.toISOString()} className={cn("text-[9px] md:text-xs text-gray-600 text-center py-1.5 md:py-2", viewType === 'weekly' ? "w-14 md:w-20" : "w-10 md:w-16")}>
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
                  ))}
                </div>
              </div>

              {/* Account rows */}
              {accountMetricsData.map(({ account, dailyMetrics }) => (
                <div key={account.id} className="flex min-w-max">
                  <div 
                    className="w-28 md:w-48 text-[10px] md:text-sm font-medium text-gray-800 py-2 md:py-3 px-1 md:px-2 bg-gray-50 rounded flex items-center cursor-pointer hover:bg-gray-100 transition-colors sticky left-0 z-10 flex-shrink-0"
                    onClick={() => handleAccountClick(account.id)}
                  >
                    <div className="truncate" title={isBlurred ? account.name : getDisplayName(account)}>
                      {getDisplayName(account)}
                    </div>
                    {!isSharedView && (
                      <AccountTagBadges merchantToken={account.merchantToken} size="sm" tags={accountTagsMap[account.merchantToken] || []} />
                    )}
                  </div>
                  <div className="flex gap-0.5 md:gap-1">
                    {dailyMetrics.map(({ date, value, intensity, isInverse }) => (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          "py-2 md:py-3 px-0.5 md:px-1 rounded text-center cursor-pointer transition-all hover:scale-105",
                          viewType === 'weekly' ? "w-14 md:w-20" : "w-10 md:w-16",
                          getIntensityColor(intensity),
                          getTextColor(intensity)
                        )}
                        title={`${getDisplayName(account)} - ${viewType === 'weekly' ? `Week ${format(date, 'w')} (${format(startOfWeek(date, { weekStartsOn: 1 }), 'dd/MM')} - ${format(endOfWeek(date, { weekStartsOn: 1 }), 'dd/MM')})` : format(date, 'dd/MM/yyyy')}: ${getTooltipValue(value, selectedMetric)}`}
                      >
                        <div className="text-[9px] md:text-xs font-medium">
                          {formatMetricValue(value, selectedMetric, date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 md:mt-4 flex flex-col items-center gap-2 text-[10px] md:text-xs text-gray-600">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-100 rounded" />
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-300 rounded" />
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-500 rounded" />
              <span className="text-muted-foreground">higher = better (darker blue)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-gray-100 rounded" />
              <span>None / Awaiting data</span>
            </div>
          </div>
          <div className="text-muted-foreground text-[10px] md:text-xs">
            Note: for ACOS & TACOS, lower is better — shown as the darkest blue.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SalesHeatmap = React.memo(SalesHeatmapInner);
export default SalesHeatmap;
