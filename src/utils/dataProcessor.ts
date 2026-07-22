import { parse, isWithinInterval, format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, startOfYear, isSameDay, differenceInDays, parseISO } from 'date-fns';
import type { AccountData, DateFilter } from '@/types/dashboard';
import { calculateVendorPeriodData } from './vendorProcessor';
import { hybridDataService, type HybridDataResult } from './hybridDataService';
import type { DataSourceInfo } from '@/types/hybridData';
import type { SupabaseVendorRow } from './supabaseDataFetchers';
import { getVendorCurrentDateRange, getVendorPreviousDateRange } from './asinProcessor';
import { isVendorAccount } from './vendorUtils';

export const updateAccountsWithFilteredData = (
  accounts: AccountData[],
  sheetData: any[],
  ppcData: any[],
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date },
  vendorData: any[] = [],
  supabaseVendorData: SupabaseVendorRow[] = []
) => {
  
  if (sheetData.length === 0 && supabaseVendorData.length === 0) {
    return accounts;
  }

  // Get current and previous date ranges
  const currentRange = getCurrentDateRange(dateFilter, customDateRange);
  const previousRange = getPreviousDateRange(dateFilter, customDateRange);

  // Pre-index sheetData by merchant_token (column D = index 3) for O(1) lookups
  const sheetDataByAccount = new Map<string, any[]>();
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    const key = row[3]; // account_id column
    if (key) {
      let arr = sheetDataByAccount.get(key);
      if (!arr) { arr = []; sheetDataByAccount.set(key, arr); }
      arr.push(row);
    }
  }

  // Pre-index ppcData by account_name for O(1) lookups
  const ppcHeaders = ppcData.length > 0 ? ppcData[0] : [];
  const ppcAccountNameIdx = ppcHeaders.indexOf?.('account_name') ?? 4;
  const ppcDataByAccount = new Map<string, any[]>();
  for (let i = 1; i < ppcData.length; i++) {
    const row = ppcData[i];
    const key = row[ppcAccountNameIdx];
    if (key) {
      let arr = ppcDataByAccount.get(key);
      if (!arr) { arr = []; ppcDataByAccount.set(key, arr); }
      arr.push(row);
    }
  }

  // Pre-index supabaseVendorData by merchant_token
  const vendorDataByAccount = new Map<string, SupabaseVendorRow[]>();
  for (const row of supabaseVendorData) {
    const key = row.merchant_token;
    let arr = vendorDataByAccount.get(key);
    if (!arr) { arr = []; vendorDataByAccount.set(key, arr); }
    arr.push(row);
  }
  
  const updatedAccounts = accounts.map(account => {
    let currentData;
    let previousData;
    
    if (isVendorAccount(account.merchantToken)) {
      if (supabaseVendorData.length > 0) {
        const vendorCurrentRange = getVendorCurrentDateRange(dateFilter, customDateRange);
        const vendorPreviousRange = getVendorPreviousDateRange(dateFilter, customDateRange);
        const accountVendorData = vendorDataByAccount.get(account.merchantToken) || [];
        currentData = calculateSupabaseVendorPeriodDataIndexed(accountVendorData, ppcDataByAccount.get(account.ppcAccountName || '') || [], ppcHeaders, account.ppcAccountName, vendorCurrentRange);
        previousData = calculateSupabaseVendorPeriodDataIndexed(accountVendorData, ppcDataByAccount.get(account.ppcAccountName || '') || [], ppcHeaders, account.ppcAccountName, vendorPreviousRange);
      } else {
        currentData = calculateVendorPeriodData(vendorData, ppcData, account.merchantToken, account.ppcAccountName, currentRange);
        previousData = calculateVendorPeriodData(vendorData, ppcData, account.merchantToken, account.ppcAccountName, previousRange);
      }
    } else {
      // Use pre-indexed data: reconstruct a mini sheetData array with header + account rows
      const accountSheetRows = sheetDataByAccount.get(account.merchantToken) || [];
      const accountPpcRows = ppcDataByAccount.get(account.ppcAccountName || '') || [];
      
      // Build mini arrays with headers for calculatePeriodData compatibility
      const miniSheet = accountSheetRows.length > 0 ? [sheetData[0], ...accountSheetRows] : [sheetData[0] || []];
      const miniPpc = accountPpcRows.length > 0 ? [ppcHeaders, ...accountPpcRows] : [ppcHeaders];
      
      currentData = calculatePeriodData(miniSheet, miniPpc, account.merchantToken, account.ppcAccountName, currentRange);
      previousData = calculatePeriodData(miniSheet, miniPpc, account.merchantToken, account.ppcAccountName, previousRange);
    }
    
      return {
        ...account,
        sales: currentData.sales,
        ppcSpend: currentData.ppcSpend,
        ppcSales: currentData.ppcSales,
        acos: currentData.acos,
        tacos: currentData.tacos,
        unitsOrdered: currentData.unitsOrdered,
        pageViews: currentData.pageViews,
        impressions: currentData.impressions || 0,
        clicks: currentData.clicks || 0,
        cpc: currentData.cpc || 0,
        ctr: currentData.ctr || 0,
        buyBoxPercentage: currentData.buyBoxPercentage,
        conversionRate: currentData.conversionRate,
        previousPeriod: previousData,
      };
  });

  return updatedAccounts;
};

/**
 * Calculate vendor KPIs from pre-indexed Supabase vendor data (no full-array scan)
 */
const calculateSupabaseVendorPeriodDataIndexed = (
  accountVendorRows: SupabaseVendorRow[],
  accountPpcRows: any[],
  ppcHeaders: any[],
  ppcAccountName: string | undefined,
  dateRange: { from: Date; to: Date }
) => {
  const isSingleDay = isSameDay(dateRange.from, dateRange.to);
  let totalSales = 0;
  let totalUnitsOrdered = 0;
  let totalPpcSpend = 0;
  let totalPpcSales = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  for (const row of accountVendorRows) {
    const rowDate = parseISO(row.record_date);
    if (isNaN(rowDate.getTime())) continue;
    if (!isWithinInterval(rowDate, { start: dateRange.from, end: dateRange.to })) continue;
    totalSales += Number(row.sales) || 0;
    totalUnitsOrdered += Number(row.units_ordered) || 0;
  }

  // PPC from pre-indexed rows
  if (accountPpcRows.length > 0 && ppcAccountName) {
    const headerMap: { [key: string]: number } = {};
    ppcHeaders.forEach?.((header: string, index: number) => { headerMap[header] = index; });

    for (const row of accountPpcRows) {
      const dateStr = row[headerMap['date'] ?? 0];
      const ppcSales = parseFloat(row[headerMap['sponsored_products_campaign__attributedsales14d'] ?? 5] || '0');
      const ppcSpend = parseFloat(row[headerMap['sponsored_products_campaign__cost'] ?? 6] || '0');
      const impressions = parseInt(row[headerMap['sponsored_products_campaign__impressions'] ?? 7] || '0');
      const clicks = parseInt(row[headerMap['sponsored_products_campaign__clicks'] ?? 9] || '0');

      let rowDate;
      try {
        rowDate = parse(dateStr, 'dd/MM/yyyy', new Date());
        if (isNaN(rowDate.getTime())) rowDate = parse(dateStr, 'MM/dd/yyyy', new Date());
        if (isNaN(rowDate.getTime())) rowDate = parse(dateStr, 'yyyy-MM-dd', new Date());
      } catch { continue; }
      if (!rowDate || isNaN(rowDate.getTime())) continue;

      if (isWithinInterval(rowDate, { start: dateRange.from, end: dateRange.to })) {
        if (!isNaN(ppcSpend)) totalPpcSpend += ppcSpend;
        if (!isNaN(ppcSales)) totalPpcSales += ppcSales;
        if (!isNaN(impressions)) totalImpressions += impressions;
        if (!isNaN(clicks)) totalClicks += clicks;
      }
    }
  }

  const sales = Math.round(totalSales * 100) / 100;
  const ppcSpend = Math.round(totalPpcSpend * 100) / 100;
  const ppcSales = Math.round(totalPpcSales * 100) / 100;
  const acos = ppcSales > 0 ? Math.round((ppcSpend / ppcSales) * 100 * 10) / 10 : 0;
  const tacos = sales > 0 ? Math.round((ppcSpend / sales) * 100 * 10) / 10 : 0;

  return {
    sales,
    ppcSpend,
    ppcSales,
    acos,
    tacos,
    unitsOrdered: Math.round(totalUnitsOrdered),
    pageViews: 0,
    buyBoxPercentage: 0,
    conversionRate: 0,
    impressions: Math.round(totalImpressions),
    clicks: Math.round(totalClicks),
    cpc: totalClicks > 0 ? Math.round((ppcSpend / totalClicks) * 100) / 100 : 0,
    ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 100 * 100) / 100 : 0,
  };
};

export const getCurrentDateRange = (dateFilter: DateFilter, customDateRange?: { from: Date; to: Date }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  switch (dateFilter) {
    case 'last-7-days':
      return { from: subDays(today, 7), to: yesterday };
    case 'last-14-days':
      return { from: subDays(today, 14), to: yesterday };
    case 'yesterday':
      return { from: yesterday, to: yesterday };
    case 'this-week':
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'last-week':
      return { from: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }) };
    case 'this-month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'last-month':
      return { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
    case 'past-30-days':
      return { from: subDays(today, 30), to: yesterday };
    case 'this-year':
      return { from: startOfYear(today), to: today };
    case 'custom':
      return customDateRange && customDateRange.from && customDateRange.to 
        ? { from: customDateRange.from, to: customDateRange.to }
        : { from: subDays(today, 7), to: yesterday };
    default:
      return { from: subDays(today, 7), to: yesterday };
  }
};

export const getPreviousDateRange = (dateFilter: DateFilter, customDateRange?: { from: Date; to: Date }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  switch (dateFilter) {
    case 'last-7-days':
      return { from: subDays(today, 14), to: subDays(today, 8) };
    case 'last-14-days':
      return { from: subDays(today, 28), to: subDays(today, 15) };
    case 'yesterday':
      return { from: dayBeforeYesterday, to: dayBeforeYesterday };
    case 'this-week':
      return { from: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }) };
    case 'last-week':
      return { from: startOfWeek(subWeeks(today, 2), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(today, 2), { weekStartsOn: 1 }) };
    case 'this-month':
      return { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
    case 'last-month':
      return { from: startOfMonth(subMonths(today, 2)), to: endOfMonth(subMonths(today, 2)) };
    case 'past-30-days':
      return { from: subDays(today, 60), to: subDays(today, 31) };
    case 'this-year':
      return { from: startOfYear(subMonths(today, 12)), to: endOfMonth(subMonths(today, 1)) };
    case 'custom':
      if (customDateRange && customDateRange.from && customDateRange.to) {
        const daysDiff = Math.ceil((customDateRange.to.getTime() - customDateRange.from.getTime()) / (1000 * 60 * 60 * 24));
        const previousFrom = new Date(customDateRange.from.getTime() - (daysDiff + 1) * 24 * 60 * 60 * 1000);
        const previousTo = new Date(customDateRange.from.getTime() - 24 * 60 * 60 * 1000);
        return { from: previousFrom, to: previousTo };
      }
      return { from: subDays(today, 14), to: subDays(today, 8) };
    default:
      return { from: subDays(today, 14), to: subDays(today, 8) };
  }
};

export const calculatePeriodData = (
  sheetData: any[], 
  ppcData: any[], 
  merchantToken: string, 
  ppcAccountName: string | undefined, 
  dateRange: { from: Date; to: Date }
) => {
  // Check if this is a single day period
  const isSingleDay = isSameDay(dateRange.from, dateRange.to);
  const numberOfDays = isSingleDay ? 1 : Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1);
  let totalSales = 0;
  let totalPpcSpend = 0;
  let totalPpcSales = 0;
  let totalUnitsOrdered = 0;
  let totalPageViews = 0;
  let buyBoxPercentageSum = 0;
  let conversionRateSum = 0;
  let dataPointsCount = 0;
  let buyBoxDataPointsCount = 0;
  let conversionDataPointsCount = 0;

  // Calculate sales from main sheet
  
  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    
    const dateStr = row[1]; // Column B (date)
    const accountId = row[3]; // Column D (account_id) - FIXED: was row[4]
    const salesAmount = parseFloat(row[5] || '0'); // Column F (sales amount)
    
    // CORRECTED column mappings based on actual headers
    const unitsOrdered = parseFloat(row[7] || '0'); // Column H: sales_and_traffic_report_by_date__salesbydate_unitsordered
    const pageViews = parseFloat(row[9] || '0'); // Column J: sales_and_traffic_report_by_date__trafficbydate_browserpageviews
    const buyBoxPercentage = parseFloat(row[10] || '0'); // Column K: sales_and_traffic_report_by_date__trafficbydate_buyboxpercentage
    const conversionRate = parseFloat(row[12] || '0'); // Column M: sales_and_traffic_report_by_date__trafficbydate_unitsessionpercentage
    
    // Debug logging for first few matching rows
    if (i <= 5 && accountId === merchantToken) {
    }
    
    // Parse the date
    let rowDate;
    try {
      rowDate = parse(dateStr, 'dd/MM/yyyy', new Date());
      if (isNaN(rowDate.getTime())) {
        rowDate = parse(dateStr, 'MM/dd/yyyy', new Date());
        if (isNaN(rowDate.getTime())) {
          rowDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        }
      }
    } catch (error) {
      continue;
    }

    if (isNaN(rowDate.getTime())) continue;

    const isInDateRange = isWithinInterval(rowDate, {
      start: dateRange.from,
      end: dateRange.to
    });

    const accountMatches = accountId === merchantToken;

    if (isInDateRange && accountMatches && !isNaN(salesAmount)) {
      totalSales += salesAmount;
      totalUnitsOrdered += isNaN(unitsOrdered) ? 0 : unitsOrdered;
      totalPageViews += isNaN(pageViews) ? 0 : pageViews;
      // Only include non-zero days in percentage metric averages
      if (!isNaN(buyBoxPercentage) && buyBoxPercentage > 0) {
        buyBoxPercentageSum += buyBoxPercentage;
        buyBoxDataPointsCount++;
      }
      if (!isNaN(conversionRate) && conversionRate > 0) {
        conversionRateSum += conversionRate;
        conversionDataPointsCount++;
      }
      dataPointsCount++;
      
      // Debug: Log when we find matching data
      if (dataPointsCount <= 3) {
      }
    }
  }

  // Calculate PPC data from PPC sheet if available and ppcAccountName is provided
  let totalImpressions = 0;
  let totalClicks = 0;
  
  if (ppcData.length > 0 && ppcAccountName) {
    
    // Helper function to parse numbers that might have commas or other formatting
    const parseNumber = (value: string | number): number => {
      if (typeof value === 'number') return value;
      if (!value || value === '') return 0;
      
      // Convert to string and remove commas, spaces, and other formatting
      const cleanValue = String(value).replace(/[,\s]/g, '');
      
      // Handle scientific notation and regular numbers
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Create header-to-index mapping from first row (headers)
    const headers = ppcData[0];
    const headerMap: { [key: string]: number } = {};
    headers.forEach((header: string, index: number) => {
      headerMap[header] = index;
    });

    for (let i = 1; i < ppcData.length; i++) {
      const row = ppcData[i];
      
      // Create row data object using header mapping
      const rowData: { [key: string]: string } = {};
      headers.forEach((header: string, index: number) => {
        rowData[header] = row[index] || '';
      });
      
      const dateStr = rowData['date'];
      const ppcAccountNameFromSheet = rowData['account_name'];
      const ppcSales = parseNumber(rowData['sponsored_products_campaign__attributedsales14d']);
      const ppcSpend = parseNumber(rowData['sponsored_products_campaign__cost']);
      
      // Get clicks and impressions with enhanced parsing using correct column names
      const impressionsRaw = rowData['sponsored_products_campaign__impressions'];
      const clicksRaw = rowData['sponsored_products_campaign__clicks'];
      const impressions = parseNumber(impressionsRaw);
      const clicks = parseNumber(clicksRaw);
      
      // Comprehensive debug logging for first few rows of target account
      if (i <= 5 && ppcAccountNameFromSheet === ppcAccountName) {
      }
      
      // Parse the date
      let rowDate;
      try {
        rowDate = parse(dateStr, 'dd/MM/yyyy', new Date());
        if (isNaN(rowDate.getTime())) {
          rowDate = parse(dateStr, 'MM/dd/yyyy', new Date());
          if (isNaN(rowDate.getTime())) {
            rowDate = parse(dateStr, 'yyyy-MM-dd', new Date());
          }
        }
      } catch (error) {
        continue;
      }

      if (isNaN(rowDate.getTime())) continue;

      const isInDateRange = isWithinInterval(rowDate, {
        start: dateRange.from,
        end: dateRange.to
      });

      const accountMatches = ppcAccountNameFromSheet === ppcAccountName;

      if (isInDateRange && accountMatches) {
        if (!isNaN(ppcSpend)) totalPpcSpend += ppcSpend;
        if (!isNaN(ppcSales)) totalPpcSales += ppcSales;
        if (!isNaN(impressions)) totalImpressions += impressions;
        if (!isNaN(clicks)) totalClicks += clicks;
      }
    }
  }

  const sales = Math.round(totalSales * 100) / 100;
  const ppcSpend = Math.round(totalPpcSpend * 100) / 100;
  const ppcSales = Math.round(totalPpcSales * 100) / 100;
  
  // Calculate ACOS and TACOS
  const acos = ppcSales > 0 ? Math.round((ppcSpend / ppcSales) * 100 * 10) / 10 : 0;
  const tacos = sales > 0 ? Math.round((ppcSpend / sales) * 100 * 10) / 10 : 0;

  // Calculate Buy Box % and Conversion Rate % correctly based on period
  let finalBuyBoxPercentage = 0;
  let finalConversionRate = 0;
  
  // Average only across days that had actual data (non-zero) for percentage metrics
  const avgBuyBox = buyBoxDataPointsCount > 0 ? (buyBoxPercentageSum / buyBoxDataPointsCount) : 0;
  const avgConversion = conversionDataPointsCount > 0 ? (conversionRateSum / conversionDataPointsCount) : 0;
  
  if (isSingleDay) {
    finalBuyBoxPercentage = Math.min(100, Math.round(avgBuyBox * 10) / 10);
    finalConversionRate = Math.round(avgConversion * 10) / 10;
  } else {
    // For multi-day periods, average across days with actual data, not total calendar days
    finalBuyBoxPercentage = buyBoxDataPointsCount > 0 ? Math.min(100, Math.round((buyBoxPercentageSum / buyBoxDataPointsCount) * 10) / 10) : 0;
    finalConversionRate = conversionDataPointsCount > 0 ? Math.round((conversionRateSum / conversionDataPointsCount) * 10) / 10 : 0;
  }

  return {
    sales,
    ppcSpend,
    ppcSales,
    acos,
    tacos,
    unitsOrdered: Math.round(totalUnitsOrdered),
    pageViews: Math.round(totalPageViews),
    buyBoxPercentage: finalBuyBoxPercentage,
    conversionRate: finalConversionRate,
    impressions: Math.round(totalImpressions || 0),
    clicks: Math.round(totalClicks || 0),
    cpc: totalClicks > 0 ? Math.round((ppcSpend / totalClicks) * 100) / 100 : 0,
    ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 100 * 100) / 100 : 0,
  };
};

/**
 * Enhanced version that uses hybrid data service
 */
export const updateAccountsWithHybridData = async (
  accounts: AccountData[],
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date },
  vendorData: any[] = []
): Promise<{
  updatedAccounts: AccountData[];
  dataStatus: {
    sales: DataSourceInfo;
    ppc: DataSourceInfo;
    asin: DataSourceInfo;
  };
}> => {
  
  const currentRange = getCurrentDateRange(dateFilter, customDateRange);
  const previousRange = getPreviousDateRange(dateFilter, customDateRange);
  
  try {
    // Fetch data from hybrid sources
    const [salesResult, ppcResult] = await Promise.all([
      hybridDataService.fetchSalesData(currentRange),
      hybridDataService.fetchPPCData(currentRange),
    ]);

    // Fetch previous period data (for now, use same data sources)
    const [prevSalesResult, prevPPCResult] = await Promise.all([
      hybridDataService.fetchSalesData(previousRange),
      hybridDataService.fetchPPCData(previousRange),
    ]);

    const updatedAccounts = accounts.map(account => {
      let currentData;
      let previousData;
      
      if (isVendorAccount(account.merchantToken)) {
        currentData = calculateVendorPeriodData(vendorData, ppcResult.data, account.merchantToken, account.ppcAccountName, currentRange);
        previousData = calculateVendorPeriodData(vendorData, prevPPCResult.data, account.merchantToken, account.ppcAccountName, previousRange);
      } else {
        currentData = calculatePeriodData(salesResult.data, ppcResult.data, account.merchantToken, account.ppcAccountName, currentRange);
        previousData = calculatePeriodData(prevSalesResult.data, prevPPCResult.data, account.merchantToken, account.ppcAccountName, previousRange);
      }
      
      return {
        ...account,
        sales: currentData.sales,
        ppcSpend: currentData.ppcSpend,
        ppcSales: currentData.ppcSales,
        acos: currentData.acos,
        tacos: currentData.tacos,
        unitsOrdered: currentData.unitsOrdered,
        pageViews: currentData.pageViews,
        impressions: currentData.impressions || 0,
        clicks: currentData.clicks || 0,
        buyBoxPercentage: currentData.buyBoxPercentage,
        conversionRate: currentData.conversionRate,
        previousPeriod: previousData,
      };
    });

    // Construct data status information
    const dataStatus = {
      sales: {
        type: salesResult.sources.live && salesResult.sources.banked ? 'hybrid' as const :
              salesResult.sources.live ? 'live' as const : 'banked' as const,
        liveDataRange: salesResult.sources.dateRanges.live,
        bankedDataRange: salesResult.sources.dateRanges.banked,
        hasGaps: salesResult.coverage.hasGaps,
        missingDates: salesResult.coverage.missingDates,
      },
      ppc: {
        type: ppcResult.sources.live && ppcResult.sources.banked ? 'hybrid' as const :
              ppcResult.sources.live ? 'live' as const : 'banked' as const,
        liveDataRange: ppcResult.sources.dateRanges.live,
        bankedDataRange: ppcResult.sources.dateRanges.banked,
        hasGaps: ppcResult.coverage.hasGaps,
        missingDates: ppcResult.coverage.missingDates,
      },
      asin: {
        type: 'live' as const, // For now, ASIN data is still live-only
        hasGaps: false,
      },
    };

    return {
      updatedAccounts,
      dataStatus,
    };
  } catch (error) {
    console.error('Error updating accounts with hybrid data:', error);
    
    // Fallback to original method
    const fallbackAccounts = updateAccountsWithFilteredData(accounts, [], [], dateFilter, customDateRange, vendorData);
    
    return {
      updatedAccounts: fallbackAccounts,
      dataStatus: {
        sales: { type: 'live', hasGaps: true },
        ppc: { type: 'live', hasGaps: true },
        asin: { type: 'live', hasGaps: true },
      },
    };
  }
};
