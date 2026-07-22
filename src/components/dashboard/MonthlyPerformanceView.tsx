import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrencyByMerchantToken, formatNumber } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Package, DollarSign, Target, TrendingUp, BarChart3, Eye, MousePointer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDateDisplayText } from '@/utils/dateUtils';
import { hybridDataService } from '@/utils/hybridDataService';
import { isVendorAccount } from '@/utils/vendorUtils';

const VENDOR_LAG_DAYS = 3;

interface MonthlyData {
  month: string;
  year: number;
  sales: number;
  unitsSold: number;
  ppcSpend: number;
  ppcSales: number;
  acos: number;
  tacos: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  pageViews: number;
  buyBoxPercentage: number;
  conversionRate: number;
  advertisingReliance: number;
}

interface MetricConfig {
  key: keyof MonthlyData;
  label: string;
  format: (value: number) => string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  isPercentage?: boolean;
  category: 'volume' | 'financial' | 'rate';
}

const getMetrics = (merchantToken: string): MetricConfig[] => [
  { 
    key: 'unitsSold', 
    label: 'Units Sold', 
    format: formatNumber, 
    color: '#8B5CF6', 
    icon: Package,
    category: 'volume'
  },
  { 
    key: 'sales', 
    label: 'Total Sales', 
    format: (value: number) => formatCurrencyByMerchantToken(value, merchantToken), 
    color: '#3B82F6', 
    icon: DollarSign,
    category: 'financial'
  },
  { 
    key: 'ppcSpend', 
    label: 'PPC Spend', 
    format: (value: number) => formatCurrencyByMerchantToken(value, merchantToken), 
    color: '#F59E0B', 
    icon: Target,
    category: 'financial'
  },
  { 
    key: 'ppcSales', 
    label: 'PPC Sales', 
    format: (value: number) => formatCurrencyByMerchantToken(value, merchantToken), 
    color: '#10B981', 
    icon: TrendingUp,
    category: 'financial'
  },
  { 
    key: 'acos', 
    label: 'ACoS', 
    format: (value: number) => `${value.toFixed(1)}%`, 
    color: '#EF4444', 
    icon: BarChart3,
    isPercentage: true,
    category: 'rate'
  },
  { 
    key: 'tacos', 
    label: 'TACoS', 
    format: (value: number) => `${value.toFixed(1)}%`, 
    color: '#06B6D4', 
    icon: Target,
    isPercentage: true,
    category: 'rate'
  },
  { 
    key: 'impressions', 
    label: 'Impressions', 
    format: formatNumber, 
    color: '#8B5CF6', 
    icon: Eye,
    category: 'volume'
  },
  { 
    key: 'clicks', 
    label: 'Clicks', 
    format: formatNumber, 
    color: '#F59E0B', 
    icon: MousePointer,
    category: 'volume'
  },
  { 
    key: 'cpc', 
    label: 'CPC', 
    format: (value: number) => formatCurrencyByMerchantToken(value, merchantToken), 
    color: '#10B981', 
    icon: Target,
    category: 'financial'
  },
  { 
    key: 'ctr', 
    label: 'CTR', 
    format: (value: number) => `${value.toFixed(2)}%`, 
    color: '#3B82F6', 
    icon: MousePointer,
    isPercentage: true,
    category: 'rate'
  },
  { 
    key: 'pageViews', 
    label: 'Page Views', 
    format: formatNumber, 
    color: '#EC4899', 
    icon: Eye,
    category: 'volume'
  },
  { 
    key: 'buyBoxPercentage', 
    label: 'Buy Box %', 
    format: (value: number) => `${value.toFixed(1)}%`, 
    color: '#EAB308', 
    icon: Target,
    isPercentage: true,
    category: 'rate'
  },
  { 
    key: 'conversionRate', 
    label: 'Conversion Rate', 
    format: (value: number) => `${value.toFixed(2)}%`, 
    color: '#EF4444', 
    icon: TrendingUp,
    isPercentage: true,
    category: 'rate'
  },
  { 
    key: 'advertisingReliance', 
    label: 'Advertising %', 
    format: (value: number) => `${value.toFixed(1)}%`, 
    color: '#F59E0B', 
    icon: Target,
    isPercentage: true,
    category: 'rate'
  }
];

// Helper function to get date range from filter
const getDateRangeFromFilter = (dateFilter?: string, customDateRange?: { from: Date; to: Date }) => {
  let startDate = new Date();
  let endDate = new Date();

  if (customDateRange) {
    startDate = customDateRange.from;
    endDate = customDateRange.to;
  } else {
    switch (dateFilter) {
      case 'yesterday':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case 'last-7-days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'last-14-days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);
        break;
      case 'this-week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - startDate.getDay());
        break;
      case 'last-week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
        endDate = new Date();
        endDate.setDate(endDate.getDate() - endDate.getDay() - 1);
        break;
      case 'this-month':
        startDate = new Date();
        startDate.setDate(1);
        break;
      case 'last-month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        endDate = new Date();
        endDate.setDate(0);
        break;
      case 'past-30-days':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'this-year':
        startDate = new Date();
        startDate.setMonth(0, 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);
    }
  }

  return { from: startDate, to: endDate };
};

// Fetch real historical data based on date filter with dynamic aggregation
const fetchHistoricalData = async (
  merchantToken: string, 
  dateFilter?: string,
  customDateRange?: { from: Date; to: Date }
): Promise<MonthlyData[]> => {
  try {
    // Check if this is a vendor account
    const isVendor = isVendorAccount(merchantToken);
    
    // Calculate date range based on filter
    let startDate: Date;
    let endDate = new Date();
    
    if (dateFilter === 'custom' && customDateRange) {
      startDate = customDateRange.from;
      endDate = customDateRange.to;
    } else {
      switch (dateFilter) {
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          endDate = new Date(startDate);
          break;
        case 'last-7-days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'last-14-days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 14);
          break;
        case 'this-week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - startDate.getDay());
          break;
        case 'last-week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
          endDate = new Date();
          endDate.setDate(endDate.getDate() - endDate.getDay() - 1);
          break;
        case 'this-month':
          startDate = new Date();
          startDate.setDate(1);
          break;
        case 'last-month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setDate(1);
          endDate = new Date();
          endDate.setDate(0); // Last day of previous month
          break;
        case 'past-30-days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'this-year':
          startDate = new Date();
          startDate.setMonth(0, 1);
          break;
        default:
          // Default to last 13 months for initial load
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 13);
      }
    }

    // Apply 3-day vendor lag offset
    if (isVendor) {
      endDate = new Date(endDate);
      endDate.setDate(endDate.getDate() - VENDOR_LAG_DAYS);
      startDate = new Date(startDate);
      startDate.setDate(startDate.getDate() - VENDOR_LAG_DAYS);
    }
    
    // Determine if we should show daily or monthly aggregation
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const useDaily = daysDiff <= 62; // 2 months or less = daily view
    
    // For monthly view, extend start date to include 13 months of context if no specific filter
    const queryStartDate = useDaily ? startDate : (() => {
      if (!dateFilter || dateFilter === 'default') {
        const defaultStart = new Date(endDate);
        defaultStart.setMonth(defaultStart.getMonth() - 13);
        return defaultStart;
      }
      return startDate;
    })();

    const queryStartDateString = queryStartDate.toISOString().split('T')[0];
    const queryEndDateString = endDate.toISOString().split('T')[0];

    console.log('📈 MonthlyPerformanceView.fetchHistoricalData', {
      merchantToken,
      isVendor,
      dateFilter,
      useDaily,
      vendorLagDays: isVendor ? VENDOR_LAG_DAYS : 0,
      queryTable: isVendor ? 'daily_vendor_data' : 'perplexity_sales_data + perplexity_ppc_campaigns',
      filters: {
        merchant_token: isVendor ? merchantToken : undefined,
        record_date_gte: queryStartDateString,
        record_date_lte: queryEndDateString,
      },
    });

    // --- VENDOR PATH: query daily_vendor_data ---
    if (isVendor) {
      console.log('🏪 MonthlyPerformanceView: fetching vendor data from daily_vendor_data', {
        merchantToken,
        table: 'daily_vendor_data',
        filters: {
          merchant_token: merchantToken,
          record_date_gte: queryStartDateString,
          record_date_lte: queryEndDateString,
        },
        aggregation: 'SUM(sales) grouped by day/month',
      });

      const allVendorData: any[] = [];
      let offset = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('daily_vendor_data')
          .select('record_date, merchant_token, sales, units_ordered, page_views, buy_box_percentage')
          .eq('merchant_token', merchantToken)
          .gte('record_date', queryStartDateString)
          .lte('record_date', queryEndDateString)
          .order('record_date', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) { console.error('Error fetching vendor data:', error); break; }
        if (!data || data.length === 0) break;

        console.log('🏪 MonthlyPerformanceView: vendor page result', {
          merchantToken,
          offset,
          fetchedRows: data.length,
          sampleRows: data.slice(0, 5),
        });

        allVendorData.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }

      if (allVendorData.length === 0) {
        console.log('🏪 MonthlyPerformanceView: no vendor data found', {
          merchantToken,
          table: 'daily_vendor_data',
          record_date_gte: queryStartDateString,
          record_date_lte: queryEndDateString,
        });
        return [];
      }

      console.log('🏪 MonthlyPerformanceView: fetched vendor rows for performance view', {
        merchantToken,
        totalRows: allVendorData.length,
        firstRow: allVendorData[0],
        lastRow: allVendorData[allVendorData.length - 1],
      });

      if (useDaily) {
        const dailyData: { [key: string]: MonthlyData } = {};
        allVendorData.forEach(row => {
          const date = new Date(row.record_date);
          const dateKey = row.record_date;
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
              month: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              year: date.getFullYear(),
              sales: 0, unitsSold: 0, ppcSpend: 0, ppcSales: 0, acos: 0, tacos: 0,
              impressions: 0, clicks: 0, cpc: 0, ctr: 0, pageViews: 0,
              buyBoxPercentage: 0, conversionRate: 0, advertisingReliance: 0,
            };
          }
          dailyData[dateKey].sales += Number(row.sales) || 0;
          dailyData[dateKey].unitsSold += Number(row.units_ordered) || 0;
          dailyData[dateKey].pageViews += Number(row.page_views) || 0;
          // Buy box is a percentage — take the max across rows for the same day
          if ((Number(row.buy_box_percentage) || 0) > dailyData[dateKey].buyBoxPercentage) {
            dailyData[dateKey].buyBoxPercentage = Number(row.buy_box_percentage) || 0;
          }
        });

        const startKey = startDate.toISOString().split('T')[0];
        const endKey = endDate.toISOString().split('T')[0];

        console.log('🏪 MonthlyPerformanceView: vendor daily aggregation before filtering', {
          merchantToken,
          dayBuckets: Object.keys(dailyData).length,
          sampleBuckets: Object.entries(dailyData).slice(0, 5),
          filterRange: {
            startKey,
            endKey,
          },
        });

        return Object.entries(dailyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .filter(([dateKey]) => dateKey >= startKey && dateKey <= endKey)
          .map(([_, data]) => data);
      } else {
        const monthlyData: { [key: string]: MonthlyData } = {};
        allVendorData.forEach(row => {
          const date = new Date(row.record_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthName, year: date.getFullYear(),
              sales: 0, unitsSold: 0, ppcSpend: 0, ppcSales: 0, acos: 0, tacos: 0,
              impressions: 0, clicks: 0, cpc: 0, ctr: 0, pageViews: 0,
              buyBoxPercentage: 0, conversionRate: 0, advertisingReliance: 0,
            };
          }
          monthlyData[monthKey].sales += Number(row.sales) || 0;
          monthlyData[monthKey].unitsSold += Number(row.units_ordered) || 0;
          monthlyData[monthKey].pageViews += Number(row.page_views) || 0;
          if ((Number(row.buy_box_percentage) || 0) > monthlyData[monthKey].buyBoxPercentage) {
            monthlyData[monthKey].buyBoxPercentage = Number(row.buy_box_percentage) || 0;
          }
        });

        console.log('🏪 MonthlyPerformanceView: vendor monthly aggregation result', {
          merchantToken,
          monthBuckets: Object.keys(monthlyData).length,
          sampleBuckets: Object.entries(monthlyData).slice(0, 6),
        });

        return Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([_, data]) => data);
      }
    }

    // --- SELLER PATH: query perplexity_sales_data + perplexity_ppc_campaigns ---
    // Fetch sales data from perplexity_sales_data
    const { data: salesData, error: salesError } = await supabase
      .from('perplexity_sales_data')
      .select('*')
      .eq('account_id', merchantToken)
      .gte('record_date', queryStartDate.toISOString().split('T')[0])
      .lte('record_date', endDate.toISOString().split('T')[0])
      .order('record_date', { ascending: true });

    if (salesError) {
      console.error('Error fetching sales data:', salesError);
      return [];
    }

    // Fetch PPC data from perplexity_ppc_campaigns
    const { data: ppcData, error: ppcError } = await supabase
      .from('perplexity_ppc_campaigns')
      .select('*')
      .eq('account_id', merchantToken)
      .gte('record_date', queryStartDate.toISOString().split('T')[0])
      .lte('record_date', endDate.toISOString().split('T')[0])
      .order('record_date', { ascending: true });

    if (ppcError) {
      console.error('Error fetching PPC data:', ppcError);
    }

    if (useDaily) {
      // Daily aggregation - return daily data points
      const dailyData: { [key: string]: MonthlyData } = {};
      
      // Process sales data
      if (salesData) {
        salesData.forEach(row => {
          const date = new Date(row.record_date);
          const dateKey = row.record_date;
          
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
              month: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              year: date.getFullYear(),
              sales: 0,
              unitsSold: 0,
              ppcSpend: 0,
              ppcSales: 0,
              acos: 0,
              tacos: 0,
              impressions: 0,
              clicks: 0,
              cpc: 0,
              ctr: 0,
              pageViews: 0,
              buyBoxPercentage: 0,
              conversionRate: 0,
              advertisingReliance: 0,
            };
          }
          
          dailyData[dateKey].sales += Number(row.ordered_product_sales_amount) || 0;
          dailyData[dateKey].unitsSold += Number(row.units_ordered) || 0;
          dailyData[dateKey].pageViews += Number(row.browser_pageviews) || 0;
          dailyData[dateKey].buyBoxPercentage = Number(row.buybox_percentage) || 0;
          dailyData[dateKey].conversionRate = Number(row.unit_session_percentage) || 0;
        });
      }

          // Process PPC data
          if (ppcData) {
            ppcData.forEach(row => {
              const dateKey = row.record_date;
              
            if (dailyData[dateKey]) {
              dailyData[dateKey].ppcSpend += Number(row.cost) || 0;
              dailyData[dateKey].ppcSales += Number(row.attributed_sales_14d) || 0;
              dailyData[dateKey].impressions += Number(row.impressions) || 0;
              dailyData[dateKey].clicks += Number(row.clicks) || 0;
            }
            });
          }

      // Calculate derived metrics and filter to requested date range
      const sortedData = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .filter(([dateKey]) => {
          const date = new Date(dateKey);
          return date >= startDate && date <= endDate;
        })
        .map(([_, data]) => {
          data.acos = data.ppcSales > 0 ? (data.ppcSpend / data.ppcSales) * 100 : 0;
          data.tacos = data.sales > 0 ? (data.ppcSpend / data.sales) * 100 : 0;
          data.cpc = data.clicks > 0 ? data.ppcSpend / data.clicks : 0;
          data.ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
          data.advertisingReliance = data.sales > 0 ? (data.ppcSales / data.sales) * 100 : 0;
          return data;
        });

      return sortedData;
    } else {
      // Monthly aggregation - group by month
      const monthlyData: { [key: string]: MonthlyData } = {};
      
      // Process sales data
      if (salesData) {
        salesData.forEach(row => {
          const date = new Date(row.record_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthName,
              year: date.getFullYear(),
              sales: 0,
              unitsSold: 0,
              ppcSpend: 0,
              ppcSales: 0,
              acos: 0,
              tacos: 0,
              impressions: 0,
              clicks: 0,
              cpc: 0,
              ctr: 0,
              pageViews: 0,
              buyBoxPercentage: 0,
              conversionRate: 0,
              advertisingReliance: 0,
            };
          }
          
          monthlyData[monthKey].sales += Number(row.ordered_product_sales_amount) || 0;
          monthlyData[monthKey].unitsSold += Number(row.units_ordered) || 0;
          monthlyData[monthKey].pageViews += Number(row.browser_pageviews) || 0;
          monthlyData[monthKey].buyBoxPercentage = Number(row.buybox_percentage) || 0;
          monthlyData[monthKey].conversionRate = Number(row.unit_session_percentage) || 0;
        });
      }

        // Process PPC data
        if (ppcData) {
          ppcData.forEach(row => {
            const date = new Date(row.record_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].ppcSpend += Number(row.cost) || 0;
            monthlyData[monthKey].ppcSales += Number(row.attributed_sales_14d) || 0;
            monthlyData[monthKey].impressions += Number(row.impressions) || 0;
            monthlyData[monthKey].clicks += Number(row.clicks) || 0;
          }
          });
        }

      // Calculate derived metrics and filter to requested date range
      const sortedData = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .filter(([monthKey]) => {
          const [year, month] = monthKey.split('-');
          const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          // For monthly view, if no specific filter, show last 13 months
          const filterStartDate = (!dateFilter || dateFilter === 'default') ? 
            (() => { const d = new Date(); d.setMonth(d.getMonth() - 13); return d; })() : 
            startDate;
          return monthDate >= filterStartDate && monthDate <= endDate;
        })
        .map(([_, data]) => {
          // Calculate ACOS, TACOS, CPC, CTR, Advertising Reliance
          data.acos = data.ppcSales > 0 ? (data.ppcSpend / data.ppcSales) * 100 : 0;
          data.tacos = data.sales > 0 ? (data.ppcSpend / data.sales) * 100 : 0;
          data.cpc = data.clicks > 0 ? data.ppcSpend / data.clicks : 0;
          data.ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
          data.advertisingReliance = data.sales > 0 ? (data.ppcSales / data.sales) * 100 : 0;
          return data;
        });

      return sortedData;
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
};

// Process Google Sheets data (for SharedView)
const processGoogleSheetsData = (
  sheetData: any[],
  ppcData: any[],
  merchantToken: string,
  ppcAccountName?: string,
  dateFilter?: string,
  customDateRange?: { from: Date; to: Date }
): MonthlyData[] => {
  try {
    console.log('🔍 Processing Google Sheets data:', { 
      sheetDataRows: sheetData.length, 
      ppcDataRows: ppcData.length,
      merchantToken,
      ppcAccountName,
      dateFilter
    });

    // Calculate date range based on filter
    let startDate: Date;
    let endDate = new Date();
    
    if (dateFilter === 'custom' && customDateRange) {
      startDate = customDateRange.from;
      endDate = customDateRange.to;
    } else {
      switch (dateFilter) {
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          endDate = new Date(startDate);
          break;
        case 'last-7-days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'last-14-days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 14);
          break;
        case 'this-week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - startDate.getDay());
          break;
        case 'last-week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
          endDate = new Date();
          endDate.setDate(endDate.getDate() - endDate.getDay() - 1);
          break;
        case 'this-month':
          startDate = new Date();
          startDate.setDate(1);
          break;
        case 'last-month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setDate(1);
          endDate = new Date();
          endDate.setDate(0); // Last day of previous month
          break;
        case 'past-30-days':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'this-year':
          startDate = new Date();
          startDate.setMonth(0, 1);
          break;
        default:
          // Default to last 14 days
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 14);
      }
    }
    
    // Determine if we should show daily or monthly aggregation
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const useDaily = daysDiff <= 62; // 2 months or less = daily view
    
    console.log('📅 Date range:', { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0], daysDiff, useDaily });

    // Check if data is 2D array or object array
    const sheetsAre2DArray = Array.isArray(sheetData[0]);
    const ppcIs2DArray = ppcData.length > 0 && Array.isArray(ppcData[0]);
    
    console.log('📊 Data format:', { sheetsAre2DArray, ppcIs2DArray });

    // Helper function to parse dates robustly
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      
      // Handle yyyy-MM-dd format (ISO)
      if (dateStr.includes('-')) {
        return new Date(dateStr);
      }
      
      // Handle dd/MM/yyyy format (UK format - standard for Amazon UK data)
      const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        const day = parseInt(slashMatch[1]);
        const month = parseInt(slashMatch[2]);
        const year = parseInt(slashMatch[3]);
        // Always assume dd/MM/yyyy for slash-separated dates
        return new Date(year, month - 1, day);
      }
      
      // Fallback to Date constructor
      return new Date(dateStr);
    };

    let filteredSheetData: any[] = [];
    let filteredPpcData: any[] = [];

    // Process main sheet data (sales/units)
    if (sheetsAre2DArray) {
      console.log('📋 Processing 2D array sheet data (fixed column indices)');
      // Skip header row, use fixed column indices
      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        const dateStr = row[1];  // B: date
        const accountId = row[3]; // D: account_id (merchantToken)
        
        if (accountId !== merchantToken) continue;
        
        const rowDate = parseDate(dateStr);
        if (!rowDate || rowDate < startDate || rowDate > endDate) continue;
        
        filteredSheetData.push({
          date: rowDate,
          dateStr: dateStr,
          sales: parseFloat(row[5]) || 0,  // F: Ordered Product Sales
          units: parseFloat(row[7]) || 0,  // H: Units Ordered
          pageViews: parseFloat(row[9]) || 0,  // J: Page Views
          buyBoxPercentage: parseFloat(row[10]) || 0,  // K: Buy Box %
          conversionRate: parseFloat(row[12]) || 0  // M: Conversion Rate
        });
      }
    } else {
      // Object array format
      filteredSheetData = sheetData.filter((row: any) => {
        if (!row.Date || row['Merchant Token'] !== merchantToken) return false;
        const rowDate = parseDate(row.Date);
        return rowDate && rowDate >= startDate && rowDate <= endDate;
      }).map(row => ({
        date: parseDate(row.Date),
        dateStr: row.Date,
        sales: parseFloat(row['Ordered Product Sales']) || 0,
        units: parseFloat(row['Units Ordered']) || 0,
        pageViews: parseFloat(row['Page Views']) || 0,
        buyBoxPercentage: parseFloat(row['Buy Box Percentage']) || 0,
        conversionRate: parseFloat(row['Unit Session Percentage']) || 0
      }));
    }

    // Process PPC data
    if (ppcIs2DArray && ppcData.length > 0) {
      console.log('📋 Processing 2D array PPC data (header-based)');
      const headers = ppcData[0];
      const getColIndex = (name: string) => headers.indexOf(name);
      
      const dateIdx = getColIndex('date');
      const accountIdx = getColIndex('account_name');
      const spendIdx = getColIndex('sponsored_products_campaign__cost');
      const salesIdx = getColIndex('sponsored_products_campaign__attributedsales14d');
      const impressionsIdx = getColIndex('sponsored_products_campaign__impressions');
      const clicksIdx = getColIndex('sponsored_products_campaign__clicks');
      
      console.log('📋 PPC column indices:', { dateIdx, accountIdx, spendIdx, salesIdx, impressionsIdx, clicksIdx });
      
      for (let i = 1; i < ppcData.length; i++) {
        const row = ppcData[i];
        const accountName = row[accountIdx];
        
        // Match by ppcAccountName if provided, otherwise by merchantToken
        const accountMatch = ppcAccountName ? accountName === ppcAccountName : accountName === merchantToken;
        if (!accountMatch) continue;
        
        const dateStr = row[dateIdx];
        const rowDate = parseDate(dateStr);
        if (!rowDate || rowDate < startDate || rowDate > endDate) continue;
        
        filteredPpcData.push({
          date: rowDate,
          dateStr: dateStr,
          spend: parseFloat(row[spendIdx]) || 0,
          sales: parseFloat(row[salesIdx]) || 0,
          impressions: parseInt(row[impressionsIdx]) || 0,
          clicks: parseInt(row[clicksIdx]) || 0
        });
      }
    } else {
      // Object array format
      filteredPpcData = ppcData.filter((row: any) => {
        if (!row.Date) return false;
        const accountMatch = ppcAccountName ? row['Account Name'] === ppcAccountName : row['Merchant Token'] === merchantToken;
        if (!accountMatch) return false;
        const rowDate = parseDate(row.Date);
        return rowDate && rowDate >= startDate && rowDate <= endDate;
      }).map(row => ({
        date: parseDate(row.Date),
        dateStr: row.Date,
        spend: parseFloat(row['Spend']) || 0,
        sales: parseFloat(row['Sales']) || 0,
        impressions: parseInt(row['Impressions']) || 0,
        clicks: parseInt(row['Clicks']) || 0
      }));
    }

    console.log('✅ Filtered data:', { 
      sheetRows: filteredSheetData.length, 
      ppcRows: filteredPpcData.length 
    });

    if (useDaily) {
      // Daily aggregation
      const dailyData: { [key: string]: MonthlyData } = {};
      
      // Process sales data
      filteredSheetData.forEach((item: any) => {
        const dateKey = item.date.toISOString().split('T')[0];
        
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = {
            month: item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            year: item.date.getFullYear(),
            sales: 0,
            unitsSold: 0,
            ppcSpend: 0,
            ppcSales: 0,
            acos: 0,
            tacos: 0,
            impressions: 0,
            clicks: 0,
            cpc: 0,
            ctr: 0,
            pageViews: 0,
            buyBoxPercentage: 0,
            conversionRate: 0,
            advertisingReliance: 0,
          };
        }
        
        dailyData[dateKey].sales += item.sales;
        dailyData[dateKey].unitsSold += item.units;
        dailyData[dateKey].pageViews += item.pageViews || 0;
        dailyData[dateKey].buyBoxPercentage += item.buyBoxPercentage || 0;
        dailyData[dateKey].conversionRate += item.conversionRate || 0;
      });

      // Process PPC data
      filteredPpcData.forEach((item: any) => {
        const dateKey = item.date.toISOString().split('T')[0];
        
        if (dailyData[dateKey]) {
          dailyData[dateKey].ppcSpend += item.spend;
          dailyData[dateKey].ppcSales += item.sales;
          dailyData[dateKey].impressions += item.impressions;
          dailyData[dateKey].clicks += item.clicks;
        }
      });

      // Calculate derived metrics
      const sortedData = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, data]) => {
          data.acos = data.ppcSales > 0 ? (data.ppcSpend / data.ppcSales) * 100 : 0;
          data.tacos = data.sales > 0 ? (data.ppcSpend / data.sales) * 100 : 0;
          data.cpc = data.clicks > 0 ? data.ppcSpend / data.clicks : 0;
          data.ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
          data.advertisingReliance = data.sales > 0 ? (data.ppcSales / data.sales) * 100 : 0;
          return data;
        });

      console.log('✅ Daily data processed:', sortedData.length, 'points');
      if (sortedData.length > 0) {
        console.log('📊 Sample daily data point:', sortedData[0]);
      }
      return sortedData;
    } else {
      // Monthly aggregation
      const monthlyData: { [key: string]: MonthlyData } = {};
      
      // Process sales data
      filteredSheetData.forEach((item: any) => {
        const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = item.date.toLocaleDateString('en-US', { month: 'short' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthName,
            year: item.date.getFullYear(),
            sales: 0,
            unitsSold: 0,
            ppcSpend: 0,
            ppcSales: 0,
            acos: 0,
            tacos: 0,
            impressions: 0,
            clicks: 0,
            cpc: 0,
            ctr: 0,
            pageViews: 0,
            buyBoxPercentage: 0,
            conversionRate: 0,
            advertisingReliance: 0,
          };
        }
        
        monthlyData[monthKey].sales += item.sales;
        monthlyData[monthKey].unitsSold += item.units;
        monthlyData[monthKey].pageViews += item.pageViews || 0;
        monthlyData[monthKey].buyBoxPercentage += item.buyBoxPercentage || 0;
        monthlyData[monthKey].conversionRate += item.conversionRate || 0;
      });

      // Process PPC data
      filteredPpcData.forEach((item: any) => {
        const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].ppcSpend += item.spend;
          monthlyData[monthKey].ppcSales += item.sales;
          monthlyData[monthKey].impressions += item.impressions;
          monthlyData[monthKey].clicks += item.clicks;
        }
      });

      // Calculate derived metrics
      const sortedData = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, data]) => {
          data.acos = data.ppcSales > 0 ? (data.ppcSpend / data.ppcSales) * 100 : 0;
          data.tacos = data.sales > 0 ? (data.ppcSpend / data.sales) * 100 : 0;
          data.cpc = data.clicks > 0 ? data.ppcSpend / data.clicks : 0;
          data.ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
          data.advertisingReliance = data.sales > 0 ? (data.ppcSales / data.sales) * 100 : 0;
          return data;
        });

      console.log('✅ Monthly data processed:', sortedData.length, 'points');
      if (sortedData.length > 0) {
        console.log('📊 Sample monthly data point:', sortedData[0]);
      }
      return sortedData;
    }
  } catch (error) {
    console.error('Error processing Google Sheets data:', error);
    return [];
  }
};

interface MonthlyPerformanceViewProps {
  accountName: string;
  merchantToken?: string;
  ppcAccountName?: string;
  selectedMetrics?: string[];
  onToggleMetric?: (metricKey: string) => void;
  dateFilter?: string;
  customDateRange?: { from: Date; to: Date };
  externalData?: {
    sheetData: any[];
    ppcData: any[];
  };
  useHybridData?: boolean;
}

export const MonthlyPerformanceView: React.FC<MonthlyPerformanceViewProps> = ({ 
  accountName, 
  merchantToken,
  ppcAccountName,
  selectedMetrics: externalSelectedMetrics, 
  onToggleMetric,
  dateFilter,
  customDateRange,
  externalData,
  useHybridData = false
}) => {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalSelectedMetrics, setInternalSelectedMetrics] = useState<string[]>(['unitsSold']);

  // Get metrics with proper currency formatting
  const METRICS = getMetrics(merchantToken || '');
  
  // Define selectedMetrics before useEffect to avoid reference issues
  const selectedMetrics = externalSelectedMetrics || internalSelectedMetrics;

  useEffect(() => {
    const loadData = async () => {
      console.log('MonthlyPerformanceView: Loading data for', accountName, 'with merchantToken:', merchantToken);
      console.log('MonthlyPerformanceView: DateFilter:', dateFilter);
      console.log('MonthlyPerformanceView: External data provided:', !!externalData);
      console.log('MonthlyPerformanceView: Use hybrid data:', useHybridData);
      
      if (!merchantToken) {
        console.log('MonthlyPerformanceView: No merchantToken provided, skipping data load');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      let historicalData: MonthlyData[] = [];
      
      // For vendor accounts, always use direct Supabase query (no Google Sheets or hybrid data)
      const isVendor = isVendorAccount(merchantToken);
      
      // Priority 1: Use external Google Sheets data if available (same as heatmap) — skip for vendors
      if (
        !isVendor &&
        externalData &&
        Array.isArray(externalData.sheetData) &&
        externalData.sheetData.length > 0 &&
        Array.isArray(externalData.ppcData)
      ) {
        console.log('MonthlyPerformanceView: Using external Google Sheets data as primary source (same as heatmap)');
        historicalData = processGoogleSheetsData(
          externalData.sheetData,
          externalData.ppcData || [],
          merchantToken,
          ppcAccountName,
          dateFilter,
          customDateRange
        );
      }
      // Priority 2: Use hybrid data service if enabled and no external data
      else if (!isVendor && useHybridData) {
        console.log('MonthlyPerformanceView: Using hybrid data service');
        try {
          const dateRange = customDateRange || getDateRangeFromFilter(dateFilter);
          const [salesResult, ppcResult] = await Promise.all([
            hybridDataService.fetchSalesData(dateRange),
            hybridDataService.fetchPPCData(dateRange)
          ]);

          historicalData = processGoogleSheetsData(
            salesResult.data,
            ppcResult.data,
            merchantToken,
            ppcAccountName,
            dateFilter,
            customDateRange
          );
        } catch (error) {
          console.error('MonthlyPerformanceView: Error fetching hybrid data:', error);
          historicalData = await fetchHistoricalData(merchantToken, dateFilter, customDateRange);
        }
      }
      // Priority 3: Fall back to direct Supabase query
      else {
        console.log('MonthlyPerformanceView: Fetching from Supabase');
        historicalData = await fetchHistoricalData(merchantToken, dateFilter, customDateRange);
      }

      historicalData = historicalData.filter(item => {
        const hasSalesData = item.sales > 0 || item.unitsSold > 0 || item.pageViews > 0 || item.buyBoxPercentage > 0 || item.conversionRate > 0;
        const hasPpcData = item.ppcSpend > 0 || item.ppcSales > 0 || item.impressions > 0 || item.clicks > 0;
        return hasSalesData || hasPpcData;
      });
      
      console.log('MonthlyPerformanceView: Fetched historical data:', historicalData.length, 'data points');
      if (historicalData.length > 0) {
        console.log('MonthlyPerformanceView: Sample data point:', historicalData[0]);
        console.log('MonthlyPerformanceView: PPC Spend in first point:', historicalData[0].ppcSpend);
        console.log('MonthlyPerformanceView: PPC Sales in first point:', historicalData[0].ppcSales);
        console.log('MonthlyPerformanceView: Impressions in first point:', historicalData[0].impressions);
        console.log('MonthlyPerformanceView: Clicks in first point:', historicalData[0].clicks);
      }
      setData(historicalData);
      setIsLoading(false);
    };

    loadData();
  }, [merchantToken, accountName, dateFilter, customDateRange, externalData, useHybridData, ppcAccountName]);
  
  const toggleMetric = (metricKey: string) => {
    console.log('MonthlyPerformanceView: Toggling metric:', metricKey);
    console.log('MonthlyPerformanceView: Current selectedMetrics before toggle:', selectedMetrics);
    
    if (onToggleMetric) {
      onToggleMetric(metricKey);
    } else {
      setInternalSelectedMetrics(prev => {
        const newMetrics = prev.includes(metricKey) 
          ? prev.filter(m => m !== metricKey)
          : [...prev, metricKey];
        console.log('MonthlyPerformanceView: New internal selectedMetrics:', newMetrics);
        return newMetrics;
      });
    }
  };


  return (
    <div className="w-full space-y-4">

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Performance Metrics - {getDateDisplayText(dateFilter as any, customDateRange)}
          </CardTitle>
          <div className="space-y-2 text-sm text-gray-600 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span><strong>Volume metrics</strong> (impressions, clicks, units) use the left axis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span><strong>Financial metrics</strong> (sales, PPC spend) and <strong>rates</strong> (ACOS, TACOS) use the right axis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-400 border-dashed rounded"></div>
              <span><strong>Percentage metrics</strong> shown as dashed lines. Click KPI cards above to add/remove metrics.</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <div className="text-sm text-gray-500">Loading performance data...</div>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center space-y-4">
                <div className="text-lg font-medium mb-2">No historical data available</div>
                <div className="text-sm">
                  {merchantToken 
                    ? `No data found for merchant token: ${merchantToken} in the selected date range.`
                    : 'Historical performance data will appear here once available'
                  }
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  💡 Try selecting a different date range or check the console for debugging info
                </div>
              </div>
            </div>
          ) : selectedMetrics.length > 0 ? (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <defs>
                    {selectedMetrics.map(metricKey => {
                      const metric = METRICS.find(m => m.key === metricKey);
                      if (!metric) return null;
                      return (
                        <linearGradient key={metricKey} id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={metric.color} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={metric.color} stopOpacity={0.1}/>
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    stroke="#E5E7EB"
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    stroke="#E5E7EB"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    stroke="#E5E7EB"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-semibold text-gray-900 mb-2">{label}</p>
                            {payload.map((entry: any, index: number) => {
                              const metric = METRICS.find(m => m.key === entry.dataKey);
                              return (
                                <div key={index} className="flex items-center gap-2 mb-1">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-sm text-gray-700">
                                    {metric?.label}: <span className="font-medium">{metric?.format(entry.value)}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {selectedMetrics.map((metricKey, index) => {
                    const metric = METRICS.find(m => m.key === metricKey);
                    if (!metric) return null;
                    
                    // Use bars for impressions, area chart for the first metric, lines for others
                    if (metricKey === 'impressions') {
                      return (
                        <Bar
                          key={metricKey}
                          yAxisId={metric.category === 'volume' ? 'left' : 'right'}
                          dataKey={metricKey}
                          fill={metric.color}
                          fillOpacity={0.6}
                          stroke={metric.color}
                          strokeWidth={1}
                          radius={[4, 4, 0, 0]}
                        />
                      );
                    }
                    
                    if (index === 0 && metricKey !== 'impressions') {
                      return (
                        <Area
                          key={metricKey}
                          yAxisId={metric.category === 'volume' ? 'left' : 'right'}
                          type="monotone"
                          dataKey={metricKey}
                          stroke={metric.color}
                          strokeWidth={3}
                          fill={`url(#gradient-${metricKey})`}
                          dot={{ fill: metric.color, strokeWidth: 2, stroke: 'white', r: 4 }}
                          activeDot={{ r: 6, fill: metric.color, strokeWidth: 2, stroke: 'white' }}
                        />
                      );
                    }
                    
                    // For additional metrics (not impressions), use lines
                    if (metricKey !== 'impressions') {
                      return (
                        <Area
                          key={metricKey}
                          yAxisId={metric.category === 'volume' ? 'left' : 'right'}
                          type="monotone"
                          dataKey={metricKey}
                          stroke={metric.color}
                          strokeWidth={2}
                          fill="none"
                          dot={{ fill: metric.color, strokeWidth: 2, stroke: 'white', r: 3 }}
                          activeDot={{ r: 5, fill: metric.color, strokeWidth: 2, stroke: 'white' }}
                        />
                      );
                    }
                    
                    return null;
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">No metrics selected</div>
                <div className="text-sm">Click KPI cards above to display performance metrics</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
