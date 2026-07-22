import type { ASINData, ASINDataFallbackInfo, DateFilter } from '@/types/dashboard';
import { parse, isWithinInterval, parseISO, subDays, eachDayOfInterval, format, differenceInCalendarDays } from 'date-fns';
import { getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
import type { SupabaseASINRow, SupabaseVendorRow } from '@/utils/supabaseDataFetchers';

const VENDOR_LAG_DAYS = 3;

/**
 * Get vendor-adjusted date range (offset by VENDOR_LAG_DAYS)
 */
export const getVendorCurrentDateRange = (dateFilter: DateFilter, customDateRange?: { from: Date; to: Date }) => {
  const range = getCurrentDateRange(dateFilter, customDateRange);
  return { from: subDays(range.from, VENDOR_LAG_DAYS), to: subDays(range.to, VENDOR_LAG_DAYS) };
};

export const getVendorPreviousDateRange = (dateFilter: DateFilter, customDateRange?: { from: Date; to: Date }) => {
  const range = getPreviousDateRange(dateFilter, customDateRange);
  return { from: subDays(range.from, VENDOR_LAG_DAYS), to: subDays(range.to, VENDOR_LAG_DAYS) };
};

/**
 * Detect missing dates in data for a given merchant_token within a date range.
 * Returns formatted date strings (e.g. "Mar 19") for dates with no data.
 */
export const detectMissingDates = (
  data: any[],
  merchantToken: string,
  dateRange: { from: Date; to: Date }
): string[] => {
  const datesWithData = new Set<string>();
  
  for (const row of data) {
    if (row.merchant_token !== merchantToken) continue;
    datesWithData.add(row.record_date);
  }

  const allDates = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const missing: string[] = [];
  
  for (const date of allDates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!datesWithData.has(dateStr)) {
      missing.push(format(date, 'MMM dd'));
    }
  }

  return missing;
};

const getRangeLengthInDays = (dateRange: { from: Date; to: Date }) =>
  differenceInCalendarDays(dateRange.to, dateRange.from) + 1;

const getFallbackRanges = (latestAvailableDate: Date, periodDays: number) => {
  const currentRange = {
    from: subDays(latestAvailableDate, Math.max(periodDays - 1, 0)),
    to: latestAvailableDate,
  };

  return {
    currentRange,
    previousRange: {
      from: subDays(currentRange.from, periodDays),
      to: subDays(currentRange.to, periodDays),
    },
  };
};

const getLatestAvailableDate = (recordDates: string[]): Date | null => {
  let latest: Date | null = null;

  recordDates.forEach((recordDate) => {
    const parsedDate = parseISO(recordDate);
    if (isNaN(parsedDate.getTime())) return;
    if (!latest || parsedDate > latest) {
      latest = parsedDate;
    }
  });

  return latest;
};

const buildFallbackInfo = (
  latestAvailableDate: Date,
  requestedRange: { from: Date; to: Date },
  displayedRange: { from: Date; to: Date },
): ASINDataFallbackInfo => ({
  isFallback: true,
  latestAvailableDate: format(latestAvailableDate, 'yyyy-MM-dd'),
  requestedRange: {
    from: format(requestedRange.from, 'yyyy-MM-dd'),
    to: format(requestedRange.to, 'yyyy-MM-dd'),
  },
  displayedRange: {
    from: format(displayedRange.from, 'yyyy-MM-dd'),
    to: format(displayedRange.to, 'yyyy-MM-dd'),
  },
});

export const getASINFallbackInfo = (
  data: any[],
  accountMerchantToken: string,
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date },
  vendorData?: any[],
): ASINDataFallbackInfo | null => {
  const isVendorAccount = accountMerchantToken.startsWith('amzn1.vg');
  const sourceData = isVendorAccount ? (vendorData || data) : data;

  if (!sourceData?.length || typeof sourceData[0] !== 'object' || Array.isArray(sourceData[0]) || !('merchant_token' in sourceData[0])) {
    return null;
  }

  const dateRange = isVendorAccount
    ? getVendorCurrentDateRange(dateFilter, customDateRange)
    : getCurrentDateRange(dateFilter, customDateRange);

  const matchingRows = sourceData.filter((row) => {
    const asinValue = isVendorAccount ? row.asin : row.child_asin;
    return row.merchant_token === accountMerchantToken && !!asinValue?.trim();
  });

  if (matchingRows.length === 0) return null;

  const hasCurrentRows = matchingRows.some((row) => {
    const rowDate = parseISO(row.record_date);
    return !isNaN(rowDate.getTime()) && isWithinInterval(rowDate, { start: dateRange.from, end: dateRange.to });
  });

  if (hasCurrentRows) return null;

  const latestAvailableDate = getLatestAvailableDate(matchingRows.map((row) => row.record_date));
  if (!latestAvailableDate) return null;

  const { currentRange } = getFallbackRanges(latestAvailableDate, getRangeLengthInDays(dateRange));
  return buildFallbackInfo(latestAvailableDate, dateRange, currentRange);
};

/**
 * Process ASIN data from Supabase objects.
 * Supports both seller data (SupabaseASINRow[]) and vendor data (SupabaseVendorRow[]).
 * The data format is auto-detected: if items have `child_asin` they're seller rows,
 * if they have `asin` they're vendor rows. Legacy Google Sheets array format is also supported.
 */
export const processASINData = (
  asinData: any[], 
  accountMerchantToken: string, 
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date },
  vendorData?: any[]
): ASINData[] => {
  const isVendorAccount = accountMerchantToken.startsWith('amzn1.vg');

  // If vendor account, use vendor data
  if (isVendorAccount) {
    if (vendorData && vendorData.length > 0) {
      // Check if vendor data is Supabase objects or legacy sheet format
      if (typeof vendorData[0] === 'object' && !Array.isArray(vendorData[0]) && 'merchant_token' in vendorData[0]) {
        return processSupabaseVendorData(vendorData as SupabaseVendorRow[], accountMerchantToken, dateFilter, customDateRange);
      }
      // Legacy sheet format
      return processLegacyVendorASINData(vendorData, accountMerchantToken, dateFilter, customDateRange);
    }
    console.log('❌ Vendor account detected but no vendor data provided');
    return [];
  }

  if (!asinData || asinData.length === 0) {
    console.log('No ASIN data provided');
    return [];
  }

  // Check if data is Supabase objects (has merchant_token property) or legacy sheet format (array of arrays)
  if (typeof asinData[0] === 'object' && !Array.isArray(asinData[0]) && 'merchant_token' in asinData[0]) {
    return processSupabaseASINData(asinData as SupabaseASINRow[], accountMerchantToken, dateFilter, customDateRange);
  }

  // Legacy Google Sheets array format - keep existing logic for backward compatibility
  return processLegacyASINData(asinData, accountMerchantToken, dateFilter, customDateRange);
};

/**
 * Process Supabase ASIN data (seller accounts)
 */
const processSupabaseASINData = (
  data: SupabaseASINRow[],
  accountMerchantToken: string,
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date }
): ASINData[] => {
  const dateRange = getCurrentDateRange(dateFilter, customDateRange);
  const previousDateRange = getPreviousDateRange(dateFilter, customDateRange);

  const currentRecords: ASINData[] = [];
  const previousRecords: ASINData[] = [];
  const matchingRecordDates: string[] = [];

  for (const row of data) {
    if (row.merchant_token !== accountMerchantToken) continue;
    if (!row.child_asin || row.child_asin.trim() === '') continue;

    matchingRecordDates.push(row.record_date);

    const rowDate = parseISO(row.record_date);
    if (isNaN(rowDate.getTime())) continue;

    const isInCurrent = isWithinInterval(rowDate, { start: dateRange.from, end: dateRange.to });
    const isInPrevious = isWithinInterval(rowDate, { start: previousDateRange.from, end: previousDateRange.to });

    if (!isInCurrent && !isInPrevious) continue;

    const record: ASINData = {
      childAsin: row.child_asin.trim(),
      sales: Number(row.sales) || 0,
      unitsSold: Number(row.units_sold) || 0,
      pageViews: Number(row.page_views) || 0,
      buyBoxPercentage: Math.min(100, Number(row.buy_box_percentage) || 0),
      conversionRate: Math.min(100, Number(row.conversion_rate) || 0),
      date: row.record_date,
      accountName: row.account_name || row.merchant_token,
      productTitle: row.product_title || undefined,
    };

    if (isInCurrent) currentRecords.push(record);
    if (isInPrevious) previousRecords.push(record);
  }

  if (currentRecords.length === 0 && matchingRecordDates.length > 0) {
    const latestAvailableDate = getLatestAvailableDate(matchingRecordDates);
    if (latestAvailableDate) {
      const { currentRange: fallbackRange, previousRange: fallbackPreviousRange } = getFallbackRanges(
        latestAvailableDate,
        getRangeLengthInDays(dateRange),
      );

      for (const row of data) {
        if (row.merchant_token !== accountMerchantToken) continue;
        if (!row.child_asin || row.child_asin.trim() === '') continue;

        const rowDate = parseISO(row.record_date);
        if (isNaN(rowDate.getTime())) continue;

        const isInFallbackCurrent = isWithinInterval(rowDate, { start: fallbackRange.from, end: fallbackRange.to });
        const isInFallbackPrevious = isWithinInterval(rowDate, { start: fallbackPreviousRange.from, end: fallbackPreviousRange.to });
        if (!isInFallbackCurrent && !isInFallbackPrevious) continue;

        const record: ASINData = {
          childAsin: row.child_asin.trim(),
          sales: Number(row.sales) || 0,
          unitsSold: Number(row.units_sold) || 0,
          pageViews: Number(row.page_views) || 0,
          buyBoxPercentage: Math.min(100, Number(row.buy_box_percentage) || 0),
          conversionRate: Math.min(100, Number(row.conversion_rate) || 0),
          date: row.record_date,
          accountName: row.account_name || row.merchant_token,
          productTitle: row.product_title || undefined,
        };

        if (isInFallbackCurrent) currentRecords.push(record);
        if (isInFallbackPrevious) previousRecords.push(record);
      }

      console.log('↩️ ASIN fallback applied', {
        merchantToken: accountMerchantToken,
        requestedRange: {
          from: format(dateRange.from, 'yyyy-MM-dd'),
          to: format(dateRange.to, 'yyyy-MM-dd'),
        },
        fallbackRange: {
          from: format(fallbackRange.from, 'yyyy-MM-dd'),
          to: format(fallbackRange.to, 'yyyy-MM-dd'),
        },
        latestAvailableDate: format(latestAvailableDate, 'yyyy-MM-dd'),
        currentRecords: currentRecords.length,
      });
    }
  }

  console.log(`Found ${currentRecords.length} current and ${previousRecords.length} previous ASIN records`);
  return aggregateAndCombine(currentRecords, previousRecords);
};

/**
 * Process Supabase vendor data
 */
const processSupabaseVendorData = (
  data: SupabaseVendorRow[],
  accountMerchantToken: string,
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date }
): ASINData[] => {
  const dateRange = getVendorCurrentDateRange(dateFilter, customDateRange);
  const previousDateRange = getVendorPreviousDateRange(dateFilter, customDateRange);

  const currentRecords: ASINData[] = [];
  const previousRecords: ASINData[] = [];
  const matchingRecordDates: string[] = [];

  for (const row of data) {
    if (row.merchant_token !== accountMerchantToken) continue;
    if (!row.asin || row.asin.trim() === '') continue;

    matchingRecordDates.push(row.record_date);

    const rowDate = parseISO(row.record_date);
    if (isNaN(rowDate.getTime())) continue;

    const isInCurrent = isWithinInterval(rowDate, { start: dateRange.from, end: dateRange.to });
    const isInPrevious = isWithinInterval(rowDate, { start: previousDateRange.from, end: previousDateRange.to });

    if (!isInCurrent && !isInPrevious) continue;

    const record: ASINData = {
      childAsin: row.asin.trim(),
      sales: Number(row.sales) || 0,
      unitsSold: Number(row.units_ordered) || 0,
      pageViews: Number(row.page_views) || 0,
      buyBoxPercentage: Math.min(100, Number(row.buy_box_percentage) || 0),
      conversionRate: Math.min(100, Number(row.conversion_rate) || 0),
      date: row.record_date,
      accountName: row.account_name || row.merchant_token,
      shippedCogs: Number(row.shipped_cogs_amount) || 0,
      shippedRevenue: Number(row.shipped_revenue_amount) || 0,
    };

    if (isInCurrent) currentRecords.push(record);
    if (isInPrevious) previousRecords.push(record);
  }

  if (currentRecords.length === 0 && matchingRecordDates.length > 0) {
    const latestAvailableDate = getLatestAvailableDate(matchingRecordDates);
    if (latestAvailableDate) {
      const { currentRange: fallbackRange, previousRange: fallbackPreviousRange } = getFallbackRanges(
        latestAvailableDate,
        getRangeLengthInDays(dateRange),
      );

      for (const row of data) {
        if (row.merchant_token !== accountMerchantToken) continue;
        if (!row.asin || row.asin.trim() === '') continue;

        const rowDate = parseISO(row.record_date);
        if (isNaN(rowDate.getTime())) continue;

        const isInFallbackCurrent = isWithinInterval(rowDate, { start: fallbackRange.from, end: fallbackRange.to });
        const isInFallbackPrevious = isWithinInterval(rowDate, { start: fallbackPreviousRange.from, end: fallbackPreviousRange.to });
        if (!isInFallbackCurrent && !isInFallbackPrevious) continue;

        const record: ASINData = {
          childAsin: row.asin.trim(),
          sales: Number(row.sales) || 0,
          unitsSold: Number(row.units_ordered) || 0,
          pageViews: Number(row.page_views) || 0,
          buyBoxPercentage: Math.min(100, Number(row.buy_box_percentage) || 0),
          conversionRate: Math.min(100, Number(row.conversion_rate) || 0),
          date: row.record_date,
          accountName: row.account_name || row.merchant_token,
          shippedCogs: Number(row.shipped_cogs_amount) || 0,
          shippedRevenue: Number(row.shipped_revenue_amount) || 0,
        };

        if (isInFallbackCurrent) currentRecords.push(record);
        if (isInFallbackPrevious) previousRecords.push(record);
      }

      console.log('↩️ Vendor ASIN fallback applied', {
        merchantToken: accountMerchantToken,
        requestedRange: {
          from: format(dateRange.from, 'yyyy-MM-dd'),
          to: format(dateRange.to, 'yyyy-MM-dd'),
        },
        fallbackRange: {
          from: format(fallbackRange.from, 'yyyy-MM-dd'),
          to: format(fallbackRange.to, 'yyyy-MM-dd'),
        },
        latestAvailableDate: format(latestAvailableDate, 'yyyy-MM-dd'),
        currentRecords: currentRecords.length,
      });
    }
  }

  console.log(`Found ${currentRecords.length} current and ${previousRecords.length} previous vendor ASIN records`);
  return aggregateAndCombine(currentRecords, previousRecords, true);
};

/**
 * Aggregate daily records by ASIN and combine current/previous periods
 */
const aggregateAndCombine = (
  currentRecords: ASINData[],
  previousRecords: ASINData[],
  isVendor: boolean = false
): ASINData[] => {
  // Phase 1: Aggregate by ASIN+date (handle duplicates per day)
  const aggregateByAsinDate = (records: ASINData[]) => {
    const dailyMap = new Map<string, ASINData>();
    
    records.forEach(rec => {
      const key = `${rec.childAsin}_${rec.date}`;
      if (dailyMap.has(key)) {
        const existing = dailyMap.get(key)!;
        dailyMap.set(key, {
          ...existing,
          sales: existing.sales + rec.sales,
          unitsSold: existing.unitsSold + rec.unitsSold,
          pageViews: existing.pageViews + rec.pageViews,
          buyBoxPercentage: Math.max(existing.buyBoxPercentage, rec.buyBoxPercentage),
          conversionRate: Math.max(existing.conversionRate, rec.conversionRate),
          shippedCogs: (existing.shippedCogs || 0) + (rec.shippedCogs || 0),
          shippedRevenue: (existing.shippedRevenue || 0) + (rec.shippedRevenue || 0),
        });
      } else {
        dailyMap.set(key, { ...rec });
      }
    });
    return Array.from(dailyMap.values());
  };

  const dailyCurrent = aggregateByAsinDate(currentRecords);
  const dailyPrevious = aggregateByAsinDate(previousRecords);

  // Phase 2: Aggregate across days by ASIN
  type AsinAgg = ASINData & { buyBoxSum: number; conversionSum: number; recordCount: number };
  
  const aggregateAcrossDays = (records: ASINData[]) => {
    const map = new Map<string, AsinAgg>();
    records.forEach(rec => {
      const key = rec.childAsin;
      if (map.has(key)) {
        const existing = map.get(key)!;
        const newCount = existing.recordCount + 1;
        const newBBSum = existing.buyBoxSum + rec.buyBoxPercentage;
        const newConvSum = existing.conversionSum + rec.conversionRate;
        map.set(key, {
          ...existing,
          sales: existing.sales + rec.sales,
          unitsSold: existing.unitsSold + rec.unitsSold,
          pageViews: existing.pageViews + rec.pageViews,
          buyBoxSum: newBBSum,
          conversionSum: newConvSum,
          recordCount: newCount,
          buyBoxPercentage: Math.min(100, newBBSum / newCount),
          conversionRate: Math.min(100, newConvSum / newCount),
          shippedCogs: (existing.shippedCogs || 0) + (rec.shippedCogs || 0),
          shippedRevenue: (existing.shippedRevenue || 0) + (rec.shippedRevenue || 0),
          // Keep first productTitle found
          productTitle: existing.productTitle || rec.productTitle,
        });
      } else {
        map.set(key, {
          ...rec,
          buyBoxSum: rec.buyBoxPercentage,
          conversionSum: rec.conversionRate,
          recordCount: 1,
        });
      }
    });
    return map;
  };

  const currentMap = aggregateAcrossDays(dailyCurrent);
  const previousMap = aggregateAcrossDays(dailyPrevious);

  // Combine
  const result = Array.from(currentMap.values()).map(item => {
    const { buyBoxSum, conversionSum, recordCount, ...clean } = item;
    const prev = previousMap.get(clean.childAsin);
    return {
      ...clean,
      previousPeriod: prev ? {
        sales: prev.sales,
        unitsSold: prev.unitsSold,
        pageViews: prev.pageViews,
        buyBoxPercentage: prev.buyBoxPercentage,
        conversionRate: prev.conversionRate,
        ...(isVendor ? {
          shippedCogs: prev.shippedCogs,
          shippedRevenue: prev.shippedRevenue,
        } : {}),
      } : undefined,
    };
  });

  console.log(`Returning ${result.length} unique ASINs`);
  return result;
};

/**
 * Legacy: Process Google Sheets array format ASIN data (seller)
 */
const processLegacyASINData = (
  asinData: any[],
  accountMerchantToken: string,
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date }
): ASINData[] => {
  const headers = asinData[0] || [];
  
  const dateColumnIndex = headers.findIndex((h: string) => h && h.toLowerCase().includes('date'));
  const accountNameIndex = headers.findIndex((h: string) => h === 'account_name');
  let childAsinIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__childasin');
  let salesIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__salesbyasin_orderedproductsales_amount');
  let unitsIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__salesbyasin_unitsordered');
  let pageViewsIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_browserpageviews');
  let buyBoxIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_buyboxpercentage');
  let conversionIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_unitsessionpercentage');

  if (buyBoxIndex === -1) {
    buyBoxIndex = headers.findIndex((h: string) => h && (h.toLowerCase().includes('buybox') || h.toLowerCase().includes('buy_box')));
  }
  if (conversionIndex === -1) {
    conversionIndex = headers.findIndex((h: string) => h && (h.toLowerCase().includes('unitsessionpercentage') || h.toLowerCase().includes('unit_session')));
  }

  if (accountNameIndex === -1 || childAsinIndex === -1 || salesIndex === -1) {
    console.error('Required ASIN columns not found in legacy format');
    return [];
  }

  const dateRange = getCurrentDateRange(dateFilter, customDateRange);
  const previousDateRange = getPreviousDateRange(dateFilter, customDateRange);
  const currentRecords: ASINData[] = [];
  const previousRecords: ASINData[] = [];

  for (let i = 1; i < asinData.length; i++) {
    const row = asinData[i];
    const accountName = row[accountNameIndex] || '';
    if (accountName !== accountMerchantToken) continue;

    const childAsin = row[childAsinIndex] || '';
    if (!childAsin || childAsin.trim() === '') continue;

    const date = row[dateColumnIndex] || '';
    let rowDate;
    try {
      rowDate = parse(date, 'dd/MM/yyyy', new Date());
      if (isNaN(rowDate.getTime())) rowDate = parse(date, 'MM/dd/yyyy', new Date());
      if (isNaN(rowDate.getTime())) rowDate = parse(date, 'yyyy-MM-dd', new Date());
    } catch { continue; }
    if (isNaN(rowDate.getTime())) continue;

    const isInCurrent = isWithinInterval(rowDate, { start: dateRange.from, end: dateRange.to });
    const isInPrevious = isWithinInterval(rowDate, { start: previousDateRange.from, end: previousDateRange.to });
    if (!isInCurrent && !isInPrevious) continue;

    const record: ASINData = {
      childAsin: childAsin.trim(),
      sales: parseFloat(row[salesIndex] || '0'),
      unitsSold: parseInt(row[unitsIndex] || '0'),
      pageViews: parseInt(row[pageViewsIndex] || '0'),
      buyBoxPercentage: Math.min(100, parseFloat(row[buyBoxIndex] || '0')),
      conversionRate: Math.min(100, parseFloat(row[conversionIndex] || '0')),
      date,
      accountName,
    };

    if (isInCurrent) currentRecords.push(record);
    if (isInPrevious) previousRecords.push(record);
  }

  return aggregateAndCombine(currentRecords, previousRecords);
};

/**
 * Legacy: Process Google Sheets array format vendor data
 */
const processLegacyVendorASINData = (
  vendorData: any[],
  accountMerchantToken: string,
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date }
): ASINData[] => {
  const headers = vendorData[0] || [];
  const dateColumnIndex = headers.findIndex((h: string) => h && h.toLowerCase().includes('date'));
  const accountNameIndex = headers.findIndex((h: string) => h === 'account_name');
  const asinColumnIndex = headers.findIndex((h: string) => h === 'vendor_sales_report__asin');
  const salesColumnIndex = headers.findIndex((h: string) => h === 'vendor_sales_report__shippedcogs_amount');
  const unitsColumnIndex = headers.findIndex((h: string) => h === 'vendor_sales_report__shippedunits');

  if (asinColumnIndex === -1) return [];

  const dateRange = getCurrentDateRange(dateFilter, customDateRange);
  const previousDateRange = getPreviousDateRange(dateFilter, customDateRange);
  const currentRecords: ASINData[] = [];
  const previousRecords: ASINData[] = [];

  for (let i = 1; i < vendorData.length; i++) {
    const row = vendorData[i];
    const accountName = row[accountNameIndex] || '';
    if (accountName !== accountMerchantToken) continue;

    const childAsin = row[asinColumnIndex] || '';
    if (!childAsin || childAsin.trim() === '') continue;

    const date = row[dateColumnIndex] || '';
    let rowDate;
    try {
      rowDate = parse(date, 'dd/MM/yyyy', new Date());
      if (isNaN(rowDate.getTime())) rowDate = parse(date, 'MM/dd/yyyy', new Date());
      if (isNaN(rowDate.getTime())) rowDate = parse(date, 'yyyy-MM-dd', new Date());
    } catch { continue; }
    if (isNaN(rowDate.getTime())) continue;

    const isInCurrent = isWithinInterval(rowDate, { start: dateRange.from, end: dateRange.to });
    const isInPrevious = isWithinInterval(rowDate, { start: previousDateRange.from, end: previousDateRange.to });
    if (!isInCurrent && !isInPrevious) continue;

    const record: ASINData = {
      childAsin: childAsin.trim(),
      sales: parseFloat(row[salesColumnIndex] || '0'),
      unitsSold: parseInt(row[unitsColumnIndex] || '0'),
      pageViews: 0,
      buyBoxPercentage: 0,
      conversionRate: 0,
      date,
      accountName,
    };

    if (isInCurrent) currentRecords.push(record);
    if (isInPrevious) previousRecords.push(record);
  }

  return aggregateAndCombine(currentRecords, previousRecords, true);
};
