import { supabase } from '@/integrations/supabase/client';
import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import { fetchAccountsFromSheet } from '@/utils/accountsProcessor';
import { fetchVendorData } from '@/utils/vendorProcessor';
import { fetchInventoryData } from '@/utils/inventoryProcessor';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import type { AccountData } from '@/types/dashboard';

// Configuration for data source selection
export interface DataSourceConfig {
  cutoffDays: number; // Days after which to use banked data (default: 7)
  preferBanked: boolean; // Override to prefer banked data when available
  fallbackToLive: boolean; // Fall back to live data if banked is incomplete
}

export interface HybridDataResult<T> {
  data: T[];
  sources: {
    live: boolean;
    banked: boolean;
    dateRanges: {
      live?: { from: Date; to: Date };
      banked?: { from: Date; to: Date };
    };
  };
  coverage: {
    hasGaps: boolean;
    missingDates?: Date[];
  };
  performance?: {
    mode: 'fast' | 'hybrid' | 'standard' | 'fallback';
    totalTime: number;
    recordCount: number;
  };
}

const DEFAULT_CONFIG: DataSourceConfig = {
  cutoffDays: 7,
  preferBanked: true, // Always prefer banked data for better performance
  fallbackToLive: true,
};

export class HybridDataService {
  private config: DataSourceConfig;

  constructor(config: Partial<DataSourceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Determines data source strategy based on date range and configuration
   * Optimized for performance - prefers banked data for historical data
   */
  private getDataSourceStrategy(dateRange: { from: Date; to: Date }) {
    return {
      useLive: false,
      useBanked: true,
      liveDateRange: null as { from: Date; to: Date } | null,
      bankedDateRange: dateRange,
      performanceMode: 'fast' as 'fast' | 'hybrid' | 'standard',
    };
  }

  /**
   * Fetch accounts from hybrid sources
   */
  async fetchAccounts(): Promise<HybridDataResult<AccountData>> {
    try {
      // For accounts, we primarily use Google Sheets as the master source
      // But check Supabase for additional configuration
      const liveAccounts = await fetchAccountsFromSheet();
      
      // Get additional account metadata from Supabase
      const { data: bankedAccounts, error } = await supabase
        .from('accounts_master')
        .select('*');

      if (error) {
        console.warn('Failed to fetch banked account data:', error);
      }

      // Merge live accounts with banked metadata
      const mergedAccounts = liveAccounts.map(account => {
        const bankedAccount = bankedAccounts?.find(ba => 
          ba.merchant_token === account.merchantToken
        );
        
        if (bankedAccount) {
          return {
            ...account,
            isStarred: bankedAccount.is_starred || false,
            status: (bankedAccount.status as 'active' | 'inactive') || 'active',
            type: (bankedAccount.account_type as 'seller' | 'vendor') || account.type,
          };
        }
        
        return account;
      });

      return {
        data: mergedAccounts,
        sources: {
          live: true,
          banked: !!bankedAccounts?.length,
          dateRanges: {},
        },
        coverage: { hasGaps: false },
      };
    } catch (error) {
      console.error('Error fetching hybrid accounts:', error);
      throw error;
    }
  }

  /**
   * Fetch sales data from hybrid sources with performance monitoring
   */
  async fetchSalesData(dateRange: { from: Date; to: Date }): Promise<HybridDataResult<any[]>> {
    const startTime = performance.now();
    const strategy = this.getDataSourceStrategy(dateRange);
    const results: any[] = [];
    let liveData: any[] = [];
    let bankedData: any[] = [];
    let hasLiveData = false;

    try {
      // Fetch live data first if needed (includes header row)
      if (strategy.useLive && strategy.liveDateRange) {
        const liveStart = performance.now();
        console.log('Fetching live sales data for range:', strategy.liveDateRange);
        liveData = await this.fetchLiveSalesData();
        // Filter live data to the needed date range
        const filteredLiveData = this.filterDataByDateRange(liveData, strategy.liveDateRange);
        results.push(...filteredLiveData);
        hasLiveData = filteredLiveData.length > 0;
        const liveTime = performance.now() - liveStart;
        console.log(`🌐 Live sales data fetched in ${liveTime.toFixed(2)}ms (${filteredLiveData.length} records)`);
      }

      // Fetch banked data if needed
      if (strategy.useBanked && strategy.bankedDateRange) {
        const bankedStart = performance.now();
        console.log('Fetching banked sales data for range:', strategy.bankedDateRange);
        bankedData = await this.fetchBankedSalesData(strategy.bankedDateRange);
        
        // If no live data, add header row for banked data
        if (!hasLiveData && bankedData.length > 0) {
          const headerRow = [
            '', // A
            'Date', // B
            '', // C
            'Merchant Token', // D
            '', // E
            'Ordered Product Sales', // F
            '', // G
            'Units Ordered', // H
            '', // I
            'Page Views', // J
            'Buy Box Percentage', // K
            '', // L
            'Unit Session Percentage' // M
          ];
          results.unshift(headerRow);
        }
        
        results.push(...bankedData);
        const bankedTime = performance.now() - bankedStart;
        console.log(`⚡ Banked sales data fetched in ${bankedTime.toFixed(2)}ms (${bankedData.length} records)`);
      }

      // Check for gaps in coverage
      const coverage = this.analyzeCoverage(dateRange, results);
      const totalTime = performance.now() - startTime;
      
      console.log(`📊 Sales data fetch completed in ${totalTime.toFixed(2)}ms (${strategy.performanceMode} mode)`);

      return {
        data: results,
        sources: {
          live: strategy.useLive,
          banked: strategy.useBanked,
          dateRanges: {
            live: strategy.liveDateRange || undefined,
            banked: strategy.bankedDateRange || undefined,
          },
        },
        coverage,
        performance: {
          mode: strategy.performanceMode,
          totalTime,
          recordCount: results.length,
        },
      };
    } catch (error) {
      console.error('Error fetching hybrid sales data:', error);
      
      // Fallback to live data if configured
      if (this.config.fallbackToLive) {
        console.log('Falling back to live data only');
        const liveData = await this.fetchLiveSalesData();
        return {
          data: liveData,
          sources: { live: true, banked: false, dateRanges: {} },
          coverage: { hasGaps: false },
          performance: {
            mode: 'fallback',
            totalTime: performance.now() - startTime,
            recordCount: liveData.length,
          },
        };
      }
      
      throw error;
    }
  }

  /**
   * Fetch PPC data from hybrid sources
   */
  async fetchPPCData(dateRange: { from: Date; to: Date }): Promise<HybridDataResult<any[]>> {
    const strategy = this.getDataSourceStrategy(dateRange);
    const results: any[] = [];
    let hasLiveData = false;

    try {
      // Fetch live PPC data first if needed (includes header row)
      if (strategy.useLive && strategy.liveDateRange) {
        console.log('Fetching live PPC data for range:', strategy.liveDateRange);
        const liveData = await this.fetchLivePPCData();
        const filteredLiveData = this.filterDataByDateRange(liveData, strategy.liveDateRange);
        results.push(...filteredLiveData);
        hasLiveData = filteredLiveData.length > 0;
      }

      // Fetch banked PPC data if needed
      if (strategy.useBanked && strategy.bankedDateRange) {
        console.log('Fetching banked PPC data for range:', strategy.bankedDateRange);
        const bankedData = await this.fetchBankedPPCData(strategy.bankedDateRange);
        
        // If no live data, add header row for banked data
        if (!hasLiveData && bankedData.length > 0) {
          const headerRow = [
            'date',
            'account_name', 
            'sponsored_products_campaign__cost',
            'sponsored_products_campaign__attributedsales14d',
            'sponsored_products_campaign__impressions',
            'sponsored_products_campaign__clicks'
          ];
          results.unshift(headerRow);
        }
        
        results.push(...bankedData);
      }

      const coverage = this.analyzeCoverage(dateRange, results);

      return {
        data: results,
        sources: {
          live: strategy.useLive,
          banked: strategy.useBanked,
          dateRanges: {
            live: strategy.liveDateRange || undefined,
            banked: strategy.bankedDateRange || undefined,
          },
        },
        coverage,
      };
    } catch (error) {
      console.error('Error fetching hybrid PPC data:', error);
      
      if (this.config.fallbackToLive) {
        console.log('Falling back to live PPC data only');
        const liveData = await this.fetchLivePPCData();
        return {
          data: liveData,
          sources: { live: true, banked: false, dateRanges: {} },
          coverage: { hasGaps: false },
        };
      }
      
      throw error;
    }
  }

  /**
   * Fetch vendor data from hybrid sources
   */
  async fetchVendorData(dateRange: { from: Date; to: Date }): Promise<HybridDataResult<any[]>> {
    const strategy = this.getDataSourceStrategy(dateRange);
    const results: any[] = [];

    try {
      if (strategy.useBanked && strategy.bankedDateRange) {
        console.log('Fetching banked vendor data for range:', strategy.bankedDateRange);
        const bankedData = await this.fetchBankedVendorData(strategy.bankedDateRange);
        results.push(...bankedData);
      }

      if (strategy.useLive && strategy.liveDateRange) {
        console.log('Fetching live vendor data for range:', strategy.liveDateRange);
        const liveData = await this.fetchLiveVendorData();
        const filteredLiveData = this.filterDataByDateRange(liveData, strategy.liveDateRange);
        results.push(...filteredLiveData);
      }

      return {
        data: results,
        sources: {
          live: strategy.useLive,
          banked: strategy.useBanked,
          dateRanges: {
            live: strategy.liveDateRange || undefined,
            banked: strategy.bankedDateRange || undefined,
          },
        },
        coverage: this.analyzeCoverage(dateRange, results),
      };
    } catch (error) {
      console.error('Error fetching hybrid vendor data:', error);
      if (this.config.fallbackToLive) {
        console.log('Falling back to live vendor data only');
        const liveData = await this.fetchLiveVendorData();
        return {
          data: liveData,
          sources: { live: true, banked: false, dateRanges: {} },
          coverage: { hasGaps: false },
        };
      }
      throw error;
    }
  }

  /**
   * Fetch ASIN data - ALWAYS uses live Google Sheets data only
   * Banked ASIN data is disabled due to data quality issues
   */
  async fetchASINData(dateRange: { from: Date; to: Date }): Promise<HybridDataResult<any[]>> {
    console.log('📊 Fetching ASIN data from live Google Sheets only (banked data disabled)');
    
    try {
      const liveData = await this.fetchLiveASINData();
      
      return {
        data: liveData,
        sources: {
          live: true,
          banked: false,
          dateRanges: {
            live: dateRange,
          },
        },
        coverage: { hasGaps: false },
      };
    } catch (error) {
      console.error('Error fetching live ASIN data:', error);
      throw error;
    }
  }

  // Private methods for fetching from specific sources

  private async fetchBankedSalesData(dateRange: { from: Date; to: Date }): Promise<any[]> {
    const { data, error } = await supabase
      .from('perplexity_sales_data')
      .select('*')
      .gte('record_date', format(dateRange.from, 'yyyy-MM-dd'))
      .lte('record_date', format(dateRange.to, 'yyyy-MM-dd'))
      .order('record_date', { ascending: true });

    if (error) throw error;
    
    // Convert Supabase format to Google Sheets format for compatibility
    return (data || []).map(row => this.convertBankedSalesToSheetFormat(row));
  }

  private async fetchBankedPPCData(dateRange: { from: Date; to: Date }): Promise<any[]> {
    const { data, error } = await supabase
      .from('perplexity_ppc_campaigns')
      .select('*')
      .gte('record_date', format(dateRange.from, 'yyyy-MM-dd'))
      .lte('record_date', format(dateRange.to, 'yyyy-MM-dd'))
      .order('record_date', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(row => this.convertBankedPPCToSheetFormat(row));
  }

  private async fetchBankedVendorData(dateRange: { from: Date; to: Date }): Promise<any[]> {
    const { data, error } = await supabase
      .from('daily_vendor_data')
      .select('*')
      .gte('record_date', format(dateRange.from, 'yyyy-MM-dd'))
      .lte('record_date', format(dateRange.to, 'yyyy-MM-dd'))
      .order('record_date', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(row => this.convertBankedVendorToSheetFormat(row));
  }

  private async fetchBankedASINData(dateRange: { from: Date; to: Date }): Promise<any[]> {
    const { data, error } = await supabase
      .from('daily_asin_data')
      .select('*')
      .gte('record_date', format(dateRange.from, 'yyyy-MM-dd'))
      .lte('record_date', format(dateRange.to, 'yyyy-MM-dd'))
      .order('record_date', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(row => this.convertBankedASINToSheetFormat(row));
  }

  private async fetchLiveSalesData(): Promise<any[]> {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch live sales data: ${response.status}`);
    }

    const data = await response.json();
    return data.values || [];
  }

  private async fetchLivePPCData(): Promise<any[]> {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.PPC_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch live PPC data: ${response.status}`);
    }

    const data = await response.json();
    return data.values || [];
  }

  private async fetchLiveVendorData(): Promise<any[]> {
    // Use the existing vendor processor function  
    return await fetchVendorData();
  }

  private async fetchLiveASINData(): Promise<any[]> {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.ASIN_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch live ASIN data: ${response.status}`);
    }

    const data = await response.json();
    return data.values || [];
  }

  // Data conversion methods to maintain compatibility
  private convertBankedSalesToSheetFormat(row: any): any[] {
    // Convert perplexity_sales_data row to Google Sheets array format
    // Expected columns: account_id, ordered_product_sales_amount, units_ordered, browser_pageviews, buybox_percentage, unit_session_percentage
    return [
      '', // A - empty
      format(parseISO(row.record_date), 'dd/MM/yyyy'), // B - date
      '', // C - empty  
      row.account_id, // D - account_id (merchant token)
      '', // E - empty
      row.ordered_product_sales_amount?.toString() || '0', // F - sales
      '', // G - empty
      row.units_ordered?.toString() || '0', // H - units
      '', // I - empty
      row.browser_pageviews?.toString() || '0', // J - page views
      row.buybox_percentage?.toString() || '0', // K - buy box
      '', // L - empty
      row.unit_session_percentage?.toString() || '0', // M - conversion rate (unit session %)
    ];
  }

  private convertBankedPPCToSheetFormat(row: any): any[] {
    // Map perplexity_ppc_campaigns columns to Google Sheets data format
    // Must match the column order expected by processGoogleSheetsData
    // Order: date, account_name, cost, sales, impressions, clicks
    return [
      format(parseISO(row.record_date), 'dd/MM/yyyy'), // date
      row.account_name || '', // account_name (matches ppcAccountName)
      row.cost?.toString() || '0', // sponsored_products_campaign__cost
      row.attributed_sales_14d?.toString() || '0', // sponsored_products_campaign__attributedsales14d
      row.impressions?.toString() || '0', // sponsored_products_campaign__impressions
      row.clicks?.toString() || '0', // sponsored_products_campaign__clicks
    ];
  }

  private convertBankedVendorToSheetFormat(row: any): any[] {
    return [
      format(parseISO(row.record_date), 'dd/MM/yyyy'), // A - date
      row.merchant_token || '', // B - merchant token
      row.account_name || '', // C - account name
      row.sales?.toString() || '0', // D - sales
      row.units_ordered?.toString() || '0', // E - units ordered
      row.page_views?.toString() || '0', // F - page views
      row.buy_box_percentage?.toString() || '0', // G - buy box
      row.conversion_rate?.toString() || '0', // H - conversion rate
      row.asin || '', // I - ASIN
      row.shipped_cogs_amount?.toString() || '0', // J - shipped COGS
      row.shipped_revenue_amount?.toString() || '0', // K - shipped revenue
    ];
  }

  private convertBankedASINToSheetFormat(row: any): any[] {
    return [
      format(parseISO(row.record_date), 'dd/MM/yyyy'), // A - date
      row.child_asin || '', // B - ASIN
      row.sales?.toString() || '0', // C - sales
      row.units_sold?.toString() || '0', // D - units
      row.page_views?.toString() || '0', // E - page views
      row.buy_box_percentage?.toString() || '0', // F - buy box
      row.conversion_rate?.toString() || '0', // G - conversion rate
      row.account_name || '', // H - account name
    ];
  }

  private filterDataByDateRange(data: any[], dateRange: { from: Date; to: Date }): any[] {
    if (!data.length) return data;
    
    // Skip header row, filter data rows
    const header = data[0];
    const filteredRows = data.slice(1).filter((row, index) => {
      try {
        const dateStr = row[1] || row[0]; // Date might be in column A or B depending on sheet
        if (!dateStr) return false;
        
        // Parse date in multiple formats
        let rowDate: Date;
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            // Assume dd/MM/yyyy format
            rowDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else {
            return false;
          }
        } else {
          rowDate = new Date(dateStr);
        }

        if (isNaN(rowDate.getTime())) return false;

        return rowDate >= dateRange.from && rowDate <= dateRange.to;
      } catch (error) {
        console.warn(`Error parsing date in row ${index}:`, error);
        return false;
      }
    });

    return [header, ...filteredRows];
  }

  private analyzeCoverage(requestedRange: { from: Date; to: Date }, data: any[]): { hasGaps: boolean; missingDates?: Date[] } {
    // Simple coverage analysis - can be enhanced based on needs
    // For now, just check if we have any data
    const hasData = data.length > 1; // More than just headers
    
    return {
      hasGaps: !hasData,
      missingDates: hasData ? undefined : [requestedRange.from, requestedRange.to],
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DataSourceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): DataSourceConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const hybridDataService = new HybridDataService();