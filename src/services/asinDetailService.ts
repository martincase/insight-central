import { supabase } from '@/integrations/supabase/client';
import type { ASINDetailData } from '@/types/asinDetail';
import { subDays, format, parse, isWithinInterval } from 'date-fns';
import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';

export class ASINDetailService {
  static async fetchASINDetails(asin: string, merchantToken: string): Promise<ASINDetailData> {
    console.log(`🔍 Fetching comprehensive data for ASIN: ${asin}, Account: ${merchantToken}`);

    // Check if this is demo mode
    if (merchantToken === 'DEMO_TOKEN') {
      return this.generateDemoASINDetails(asin);
    }

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Fetch all data in parallel
    const [
      performanceData,
      inventoryData,
      historicalData,
      campaignData,
      accountData
    ] = await Promise.all([
      this.fetchPerformanceData(asin, merchantToken, startDateStr, endDateStr),
      this.fetchInventoryData(asin, merchantToken),
      this.fetchHistoricalData(asin, merchantToken, startDateStr, endDateStr),
      this.fetchCampaignData(asin, merchantToken, startDateStr, endDateStr),
      this.fetchAccountData(merchantToken)
    ]);

    // Calculate summary statistics
    const summary = this.calculateSummary(historicalData);

    const asinDetail: ASINDetailData = {
      asin,
      productName: inventoryData?.productName || performanceData?.productName || 'Unknown Product',
      accountName: accountData?.account_name || merchantToken,
      merchantToken,
      
      performance: {
        sales: performanceData?.sales || 0,
        unitsSold: performanceData?.unitsSold || 0,
        pageViews: performanceData?.pageViews || 0,
        buyBoxPercentage: performanceData?.buyBoxPercentage || 0,
        conversionRate: performanceData?.conversionRate || 0,
        previousPeriod: performanceData?.previousPeriod
      },

      inventory: {
        sku: inventoryData?.sku || 'N/A',
        quantity: inventoryData?.quantity || 0,
        price: inventoryData?.price || 0,
        fulfillmentType: inventoryData?.fulfillmentType || 'Unknown',
        inventoryValue: (inventoryData?.quantity || 0) * (inventoryData?.price || 0),
        stockStatus: this.getStockStatus(inventoryData?.quantity || 0)
      },

      historicalData: historicalData || [],
      campaigns: campaignData || [],
      summary
    };

    console.log(`✅ ASIN detail data fetched successfully for ${asin}`);
    return asinDetail;
  }

  // Generate demo data for ASIN detail modal
  private static generateDemoASINDetails(asin: string): ASINDetailData {
    // Demo product catalog matching the ASIN data
    const demoProducts: Record<string, { name: string; sales: number; units: number; buyBox: number; conversion: number; price: number; stock: number }> = {
      'B0DEMO001': { name: 'Premium Wireless Bluetooth Earbuds with Charging Case', sales: 12500, units: 350, buyBox: 98, conversion: 18, price: 35.99, stock: 245 },
      'B0DEMO002': { name: 'Organic Green Tea Matcha Powder 100g', sales: 8200, units: 245, buyBox: 95, conversion: 16, price: 33.49, stock: 180 },
      'B0DEMO003': { name: 'Stainless Steel Water Bottle 750ml Insulated', sales: 6800, units: 180, buyBox: 92, conversion: 14, price: 37.77, stock: 320 },
      'B0DEMO004': { name: 'LED Desk Lamp with USB Charging Port', sales: 5100, units: 150, buyBox: 100, conversion: 12, price: 34.00, stock: 450 },
      'B0DEMO005': { name: 'Memory Foam Neck Pillow for Travel', sales: 3400, units: 95, buyBox: 88, conversion: 10, price: 35.79, stock: 85 },
      'B0DEMO006': { name: 'Bamboo Cutting Board Set - 3 Pack', sales: 4200, units: 120, buyBox: 96, conversion: 15, price: 35.00, stock: 200 },
      'B0DEMO007': { name: 'Yoga Mat Non-Slip Exercise Mat 6mm', sales: 2800, units: 78, buyBox: 94, conversion: 11, price: 35.90, stock: 65 },
      'B0DEMO008': { name: 'Electric Coffee Grinder Stainless Steel', sales: 2000, units: 55, buyBox: 91, conversion: 9, price: 36.36, stock: 150 },
    };

    const product = demoProducts[asin] || {
      name: 'Demo Product',
      sales: 5000,
      units: 140,
      buyBox: 94,
      conversion: 12,
      price: 29.99,
      stock: 100
    };

    // Generate 30 days of historical data
    const historicalData = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendMultiplier = isWeekend ? 0.7 : 1.0;
      const variance = 0.8 + Math.random() * 0.4;

      const dailySales = (product.sales / 30) * weekendMultiplier * variance;
      const dailyUnits = Math.round((product.units / 30) * weekendMultiplier * variance);
      const dailyPageViews = Math.round(dailyUnits / (product.conversion / 100));

      historicalData.push({
        date: format(date, 'yyyy-MM-dd'),
        sales: Math.round(dailySales * 100) / 100,
        unitsSold: dailyUnits,
        pageViews: dailyPageViews,
        buyBoxPercentage: Math.min(100, product.buyBox + (Math.random() * 4 - 2)),
        conversionRate: Math.min(100, product.conversion + (Math.random() * 2 - 1)),
      });
    }

    // Calculate page views from units and conversion
    const pageViews = Math.round(product.units / (product.conversion / 100));

    return {
      asin,
      productName: product.name,
      accountName: 'Demo Account',
      merchantToken: 'DEMO_TOKEN',
      
      performance: {
        sales: product.sales,
        unitsSold: product.units,
        pageViews,
        buyBoxPercentage: product.buyBox,
        conversionRate: product.conversion,
        previousPeriod: {
          sales: product.sales * 0.92,
          unitsSold: Math.round(product.units * 0.92),
          pageViews: Math.round(pageViews * 0.95),
          buyBoxPercentage: product.buyBox - 1,
          conversionRate: product.conversion - 0.5,
        }
      },

      inventory: {
        sku: `DEMO-SKU-${asin.slice(-3)}`,
        quantity: product.stock,
        price: product.price,
        fulfillmentType: product.stock > 100 ? 'FBA' : 'FBM',
        inventoryValue: product.stock * product.price,
        stockStatus: this.getStockStatus(product.stock)
      },

      historicalData,
      
      campaigns: [
        {
          campaignName: `SP - ${product.name.split(' ').slice(0, 3).join(' ')} - Auto`,
          spend: product.sales * 0.08,
          sales: product.sales * 0.35,
          acos: 22.8,
          clicks: Math.round(product.units * 5),
          impressions: Math.round(product.units * 150),
          ctr: 3.3,
          cpc: 0.42
        },
        {
          campaignName: `SP - ${product.name.split(' ').slice(0, 3).join(' ')} - Exact`,
          spend: product.sales * 0.05,
          sales: product.sales * 0.25,
          acos: 18.5,
          clicks: Math.round(product.units * 3),
          impressions: Math.round(product.units * 80),
          ctr: 3.8,
          cpc: 0.38
        }
      ],
      
      summary: {
        totalSales30Days: product.sales,
        averageDailySales: product.sales / 30,
        totalUnits30Days: product.units,
        averageDailyUnits: product.units / 30,
        averageBuyBox30Days: product.buyBox,
        averageConversion30Days: product.conversion,
        totalPageViews30Days: pageViews
      }
    };
  }

  private static async fetchPerformanceData(asin: string, merchantToken: string, startDate: string, endDate: string) {
    console.log(`📊 Fetching ASIN performance from Google Sheets for ${asin}`);
    
    try {
      // Fetch ASIN data directly from Google Sheets
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.ASIN_SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.ASIN_SHEET_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`
      );

      if (!response.ok) {
        console.error('Failed to fetch ASIN data from Google Sheets:', response.status);
        return null;
      }

      const data = await response.json();
      const rows = data.values || [];
      
      if (rows.length === 0) return null;

      const headers = rows[0];
      const dateIndex = headers.findIndex((h: string) => h && h.toLowerCase().includes('date'));
      const accountIndex = headers.findIndex((h: string) => h === 'account_name');
      const asinIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__childasin');
      const salesIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__salesbyasin_orderedproductsales_amount');
      const unitsIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__salesbyasin_unitsordered');
      const pageViewsIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_browserpageviews');
      const buyBoxIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_buyboxpercentage');
      const conversionIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_unitsessionpercentage');
      const titleIndex = headers.findIndex((h: string) => h && h.toLowerCase().includes('title'));

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const periodLength = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const previousStartDate = subDays(startDateObj, periodLength);
      const previousEndDate = subDays(startDateObj, 1);

      let currentRecords: any[] = [];
      let previousRecords: any[] = [];
      let productTitle = '';

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowAccount = row[accountIndex] || '';
        const rowAsin = row[asinIndex] || '';
        
        if (rowAccount !== merchantToken || rowAsin !== asin) continue;

        const dateStr = row[dateIndex] || '';
        let rowDate;
        try {
          rowDate = parse(dateStr, 'yyyy-MM-dd', new Date());
          if (isNaN(rowDate.getTime())) {
            rowDate = parse(dateStr, 'dd/MM/yyyy', new Date());
          }
        } catch {
          continue;
        }
        
        if (isNaN(rowDate.getTime())) continue;

        if (!productTitle && titleIndex !== -1) {
          productTitle = row[titleIndex] || '';
        }

        const record = {
          sales: parseFloat(row[salesIndex] || '0'),
          unitsSold: parseInt(row[unitsIndex] || '0'),
          pageViews: parseInt(row[pageViewsIndex] || '0'),
          buyBoxPercentage: Math.min(100, parseFloat(row[buyBoxIndex] || '0')),
          conversionRate: Math.min(100, parseFloat(row[conversionIndex] || '0')),
        };

        // Check current period
        if (isWithinInterval(rowDate, { start: startDateObj, end: endDateObj })) {
          currentRecords.push(record);
        }
        
        // Check previous period
        if (isWithinInterval(rowDate, { start: previousStartDate, end: previousEndDate })) {
          previousRecords.push(record);
        }
      }

      if (currentRecords.length === 0) return null;

      // Aggregate current period
      const currentTotals = currentRecords.reduce((acc, r) => ({
        sales: acc.sales + r.sales,
        unitsSold: acc.unitsSold + r.unitsSold,
        pageViews: acc.pageViews + r.pageViews,
        buyBoxSum: acc.buyBoxSum + r.buyBoxPercentage,
        conversionSum: acc.conversionSum + r.conversionRate,
      }), { sales: 0, unitsSold: 0, pageViews: 0, buyBoxSum: 0, conversionSum: 0 });

      // Aggregate previous period
      const previousTotals = previousRecords.reduce((acc, r) => ({
        sales: acc.sales + r.sales,
        unitsSold: acc.unitsSold + r.unitsSold,
        pageViews: acc.pageViews + r.pageViews,
        buyBoxSum: acc.buyBoxSum + r.buyBoxPercentage,
        conversionSum: acc.conversionSum + r.conversionRate,
      }), { sales: 0, unitsSold: 0, pageViews: 0, buyBoxSum: 0, conversionSum: 0 });

      return {
        productName: productTitle,
        sales: currentTotals.sales,
        unitsSold: currentTotals.unitsSold,
        pageViews: currentTotals.pageViews,
        buyBoxPercentage: currentTotals.buyBoxSum / currentRecords.length,
        conversionRate: currentTotals.conversionSum / currentRecords.length,
        previousPeriod: previousRecords.length > 0 ? {
          sales: previousTotals.sales,
          unitsSold: previousTotals.unitsSold,
          pageViews: previousTotals.pageViews,
          buyBoxPercentage: previousTotals.buyBoxSum / previousRecords.length,
          conversionRate: previousTotals.conversionSum / previousRecords.length,
        } : undefined
      };
    } catch (error) {
      console.error('Error fetching ASIN performance from Google Sheets:', error);
      return null;
    }
  }

  private static async fetchInventoryData(asin: string, merchantToken: string) {
    // Use the Master Listings product lookup service with merchant token-based filtering
    const { fetchMasterListings } = await import('@/utils/productLookupService');
    
    try {
      const productMap = await fetchMasterListings(merchantToken);
      
      // Create composite key using merchantToken directly (matches how Master Listings stores it)
      const cacheKey = `${merchantToken}|${asin}`;
      const product = productMap.get(cacheKey);
      
      if (!product) {
        console.log(`No product found in Master Listings for ASIN: ${asin}, MerchantToken: ${merchantToken}`);
        return null;
      }

      return {
        sku: '', // SKU not stored in the simplified product map
        productName: product.title,
        quantity: product.fbmStock,
        price: product.price,
        fulfillmentType: 'FBM'
      };
    } catch (error) {
      console.error('Error fetching inventory from Master Listings:', error);
      return null;
    }
  }

  private static async fetchHistoricalData(asin: string, merchantToken: string, startDate: string, endDate: string) {
    console.log(`📊 Fetching ASIN historical data from Google Sheets for ${asin}`);
    
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.ASIN_SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.ASIN_SHEET_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`
      );

      if (!response.ok) {
        console.error('Failed to fetch historical ASIN data from Google Sheets:', response.status);
        return [];
      }

      const data = await response.json();
      const rows = data.values || [];
      
      if (rows.length === 0) return [];

      const headers = rows[0];
      const dateIndex = headers.findIndex((h: string) => h && h.toLowerCase().includes('date'));
      const accountIndex = headers.findIndex((h: string) => h === 'account_name');
      const asinIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__childasin');
      const salesIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__salesbyasin_orderedproductsales_amount');
      const unitsIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__salesbyasin_unitsordered');
      const pageViewsIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_browserpageviews');
      const buyBoxIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_buyboxpercentage');
      const conversionIndex = headers.findIndex((h: string) => h === 'sales_and_traffic_report_by_date__trafficbyasin_unitsessionpercentage');

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const historicalRecords: any[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowAccount = row[accountIndex] || '';
        const rowAsin = row[asinIndex] || '';
        
        if (rowAccount !== merchantToken || rowAsin !== asin) continue;

        const dateStr = row[dateIndex] || '';
        let rowDate;
        try {
          rowDate = parse(dateStr, 'yyyy-MM-dd', new Date());
          if (isNaN(rowDate.getTime())) {
            rowDate = parse(dateStr, 'dd/MM/yyyy', new Date());
          }
        } catch {
          continue;
        }
        
        if (isNaN(rowDate.getTime())) continue;

        if (isWithinInterval(rowDate, { start: startDateObj, end: endDateObj })) {
          historicalRecords.push({
            date: format(rowDate, 'yyyy-MM-dd'),
            sales: parseFloat(row[salesIndex] || '0'),
            unitsSold: parseInt(row[unitsIndex] || '0'),
            pageViews: parseInt(row[pageViewsIndex] || '0'),
            buyBoxPercentage: Math.min(100, parseFloat(row[buyBoxIndex] || '0')),
            conversionRate: Math.min(100, parseFloat(row[conversionIndex] || '0')),
          });
        }
      }

      // Sort by date ascending
      historicalRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      return historicalRecords;
    } catch (error) {
      console.error('Error fetching historical ASIN data from Google Sheets:', error);
      return [];
    }
  }

  private static async fetchCampaignData(asin: string, merchantToken: string, startDate: string, endDate: string) {
    // This would require a more complex query to find campaigns targeting this ASIN
    // For now, return empty array - would need campaign-level ASIN targeting data
    return [];
  }

  private static async fetchAccountData(merchantToken: string) {
    const { data, error } = await supabase
      .from('accounts_master')
      .select('account_name')
      .eq('merchant_token', merchantToken)
      .limit(1);

    if (error) {
      console.error('Error fetching account data:', error);
      return null;
    }

    return data?.[0] || null;
  }

  private static calculateSummary(historicalData: any[]) {
    if (historicalData.length === 0) {
      return {
        totalSales30Days: 0,
        averageDailySales: 0,
        totalUnits30Days: 0,
        averageDailyUnits: 0,
        averageBuyBox30Days: 0,
        averageConversion30Days: 0,
        totalPageViews30Days: 0
      };
    }

    const totals = historicalData.reduce((acc, day) => ({
      sales: acc.sales + day.sales,
      units: acc.units + day.unitsSold,
      pageViews: acc.pageViews + day.pageViews,
      buyBox: acc.buyBox + day.buyBoxPercentage,
      conversion: acc.conversion + day.conversionRate
    }), { sales: 0, units: 0, pageViews: 0, buyBox: 0, conversion: 0 });

    return {
      totalSales30Days: totals.sales,
      averageDailySales: totals.sales / historicalData.length,
      totalUnits30Days: totals.units,
      averageDailyUnits: totals.units / historicalData.length,
      averageBuyBox30Days: totals.buyBox / historicalData.length,
      averageConversion30Days: totals.conversion / historicalData.length,
      totalPageViews30Days: totals.pageViews
    };
  }

  private static getStockStatus(quantity: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (quantity === 0) return 'out-of-stock';
    if (quantity < 10) return 'low-stock';
    return 'in-stock';
  }
}