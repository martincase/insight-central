import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import type { AccountData } from '@/types/dashboard';
import { parse, isWithinInterval, differenceInDays, isSameDay } from 'date-fns';

export async function fetchVendorData(): Promise<any[]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.VENDOR_SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.VENDOR_SHEET_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('🏪 Error fetching vendor data:', error);
    return [];
  }
}

export const calculateVendorPeriodData = (
  vendorData: any[], 
  ppcData: any[],
  merchantToken: string, 
  ppcAccountName: string | undefined,
  dateRange: { from: Date; to: Date }
) => {
  // Check if this is a single day period
  const isSingleDay = isSameDay(dateRange.from, dateRange.to);
  const numberOfDays = isSingleDay ? 1 : Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1);
  
  let totalSales = 0;
  let totalUnitsOrdered = 0;
  let totalPpcSpend = 0;
  let totalPpcSales = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let dataPointsCount = 0;

  // Show first 5 merchant tokens to see what we have
  for (let i = 1; i <= Math.min(5, vendorData.length - 1); i++) {
    const row = vendorData[i];
    if (row && row.length > 3) {
    }
  }
  
  // Check if Portwest token exists in the data
  const hasMatchingToken = vendorData.some(row => row && row[3] === merchantToken);
  
  // Show all unique merchant tokens
  const uniqueTokens = new Set();
  for (let i = 1; i < vendorData.length; i++) {
    const row = vendorData[i];
    if (row && row[3]) {
      uniqueTokens.add(row[3]);
    }
  }
  
  // Process vendor data based on provided mappings
  for (let i = 1; i < vendorData.length; i++) {
    const row = vendorData[i];
    
    if (!row || row.length === 0) continue;
    
    // Column mappings based on Daily Vendor V2 sheet structure:
    // 0: datasource, 1: date, 2: source, 3: account_name, 4: asin, 5: shippedcogs_amount, 6: shippedcogs_currencycode, 7: shippedunits, 8: shippedrevenue_amount, 9: shippedrevenue_currencycode
    const dateStr = row[1]; // Column 1 (index 1) - date
    const merchantTokenFromSheet = row[3]; // Column 3 (index 3) - account_name (merchant token)
    const salesAmount = parseFloat(row[8] || '0'); // Column 8 (index 8) - vendor_sales_report__shippedrevenue_amount
    const unitsOrdered = parseFloat(row[7] || '0'); // Column 7 (index 7) - vendor_sales_report__shippedunits
    
    // Debug first few rows to understand structure
    if (i <= 3) {
    }
    
    // Parse the date with support for multiple formats (same as seller accounts)
    let rowDate;
    try {
      rowDate = parse(dateStr, 'dd/MM/yyyy', new Date());
      if (isNaN(rowDate.getTime())) {
        rowDate = parse(dateStr, 'MM/dd/yyyy', new Date());
        if (isNaN(rowDate.getTime())) {
          rowDate = parse(dateStr, 'yyyy-MM-dd', new Date());
          if (isNaN(rowDate.getTime())) {
            rowDate = parse(dateStr, 'dd-MM-yyyy', new Date());
            if (isNaN(rowDate.getTime())) {
              rowDate = parse(dateStr, 'MM-dd-yyyy', new Date());
              if (isNaN(rowDate.getTime())) {
                rowDate = parse(dateStr, 'yyyy/MM/dd', new Date());
              }
            }
          }
        }
      }
    } catch (error) {
      continue;
    }

    if (isNaN(rowDate.getTime())) continue;

    // Check if date is within range
    const isInDateRange = isWithinInterval(rowDate, {
      start: dateRange.from,
      end: dateRange.to
    });
    
    // Match merchant token (Column 4)
    const merchantMatches = merchantTokenFromSheet === merchantToken;
    
    if (merchantMatches && isInDateRange && !isNaN(salesAmount)) {
      totalSales += salesAmount;
      totalUnitsOrdered += isNaN(unitsOrdered) ? 0 : unitsOrdered;
      dataPointsCount++;
      
    }
  }

  // Calculate PPC data from PPC sheet if available and ppcAccountName is provided
  if (ppcData.length > 0 && ppcAccountName) {
    
    for (let i = 1; i < ppcData.length; i++) {
      const row = ppcData[i];
      
      const dateStr = row[0]; // Column A - date
      const ppcAccountNameFromSheet = row[4]; // Column E - account_name
      const ppcSales = parseFloat(row[5] || '0'); // Column F - sponsored_products_campaign__attributedsales14d
      const ppcSpend = parseFloat(row[6] || '0'); // Column G - sponsored_products_campaign__cost
      const impressions = parseInt(row[7] || '0'); // Column H - impressions  
      const clicks = parseInt(row[9] || '0'); // Column J - clicks
      
      // Parse the date with support for multiple formats (same as seller accounts)
      let rowDate;
      try {
        rowDate = parse(dateStr, 'dd/MM/yyyy', new Date());
        if (isNaN(rowDate.getTime())) {
          rowDate = parse(dateStr, 'MM/dd/yyyy', new Date());
          if (isNaN(rowDate.getTime())) {
            rowDate = parse(dateStr, 'yyyy-MM-dd', new Date());
            if (isNaN(rowDate.getTime())) {
              rowDate = parse(dateStr, 'dd-MM-yyyy', new Date());
              if (isNaN(rowDate.getTime())) {
                rowDate = parse(dateStr, 'MM-dd-yyyy', new Date());
                if (isNaN(rowDate.getTime())) {
                  rowDate = parse(dateStr, 'yyyy/MM/dd', new Date());
                }
              }
            }
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

  return {
    sales,
    ppcSpend,
    ppcSales,
    acos,
    tacos,
    unitsOrdered: Math.round(totalUnitsOrdered),
    pageViews: 0, // Vendors don't have page views in the vendor sheet
    buyBoxPercentage: 0, // Vendors don't have buy box in the vendor sheet
    conversionRate: 0, // Vendors don't have conversion rate in the vendor sheet
    impressions: Math.round(totalImpressions),
    clicks: Math.round(totalClicks),
    cpc: totalClicks > 0 ? Math.round((ppcSpend / totalClicks) * 100) / 100 : 0,
    ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 100 * 100) / 100 : 0,
  };
};