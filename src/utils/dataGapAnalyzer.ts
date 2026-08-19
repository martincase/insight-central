import { supabase } from '@/integrations/supabase/client';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import type { DataCoverageWarning } from '@/types/hybridData';

export interface DataGapResult {
  accountName: string;
  merchantToken: string;
  dataType: 'sales' | 'campaign' | 'vendor' | 'inventory' | 'ppc';
  missingDates: Date[];
  lastDataDate?: Date;
  totalDaysMissing: number;
  consecutiveDaysMissing: number;
  severity: 'low' | 'medium' | 'high';
}

export interface DataGapSummary {
  totalAccounts: number;
  accountsWithGaps: number;
  highSeverityGaps: number;
  mediumSeverityGaps: number;
  lowSeverityGaps: number;
  gaps: DataGapResult[];
}

export class DataGapAnalyzer {
  private lookbackDays: number;
  private bufferDays: number;

  constructor(lookbackDays = 60, bufferDays = 3) {
    this.lookbackDays = lookbackDays;
    this.bufferDays = bufferDays;
  }

  /**
   * Analyze data gaps across all accounts and data types
   */
  async analyzeAllDataGaps(): Promise<DataGapSummary> {
    const endDate = startOfDay(subDays(new Date(), this.bufferDays));
    const startDate = startOfDay(subDays(endDate, this.lookbackDays));

    // Get all active accounts
    const { data: accounts, error } = await supabase
      .from('accounts_master')
      .select('account_name, merchant_token, status')
      .eq('status', 'active');

    if (error || !accounts) {
      console.error('Failed to fetch accounts:', error);
      return this.createEmptySummary();
    }

    const allGaps: DataGapResult[] = [];

    // Analyze each data type for each account
    for (const account of accounts) {
      const accountGaps = await this.analyzeAccountDataGaps(
        account.account_name,
        account.merchant_token,
        startDate,
        endDate
      );
      allGaps.push(...accountGaps);
    }

    return this.createSummary(accounts.length, allGaps);
  }

  /**
   * Analyze data gaps for a specific account across all data types
   */
  private async analyzeAccountDataGaps(
    accountName: string,
    merchantToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<DataGapResult[]> {
    const gaps: DataGapResult[] = [];

    // Get account type to determine which data sources to check
    const { data: account, error } = await supabase
      .from('accounts_master')
      .select('account_type')
      .eq('merchant_token', merchantToken)
      .single();

    if (error || !account) {
      console.error('Failed to fetch account type:', error);
      return gaps;
    }

    const accountType = account.account_type;

    // Define data type configurations based on account type
    let dataTypeConfigs: Array<{ type: DataGapResult['dataType']; table: string; dateColumn: string }> = [];
    
    if (accountType === 'vendor') {
      // Vendors only need vendor data checked
      dataTypeConfigs = [
        { type: 'vendor', table: 'vw_daily_vendor_data', dateColumn: 'record_date' },
        { type: 'inventory', table: 'daily_inventory_data', dateColumn: 'record_date' },
      ];
    } else {
      // Sellers check sales, campaign, inventory, and PPC spend data
      dataTypeConfigs = [
        { type: 'sales', table: 'daily_sales_ppc_data', dateColumn: 'record_date' },
        { type: 'campaign', table: 'daily_campaign_data', dateColumn: 'record_date' },
        { type: 'inventory', table: 'daily_inventory_data', dateColumn: 'record_date' },
        { type: 'ppc', table: 'daily_campaign_data', dateColumn: 'record_date' }, // PPC spend data from campaign table
      ];
    }
    // Note: Removed ASIN checks as zero sales days are normal and shouldn't be flagged

    for (const config of dataTypeConfigs) {
      const gap = await this.analyzeDataTypeGap(
        accountName,
        merchantToken,
        config.type,
        config.table,
        config.dateColumn,
        startDate,
        endDate
      );

      if (gap && gap.totalDaysMissing > 0) {
        gaps.push(gap);
      }
    }

    return gaps;
  }

  /**
   * Analyze gaps for a specific data type
   */
  private async analyzeDataTypeGap(
    accountName: string,
    merchantToken: string,
    dataType: DataGapResult['dataType'],
    tableName: string,
    dateColumn: string,
    startDate: Date,
    endDate: Date
  ): Promise<DataGapResult | null> {
    try {
      let data: any[] | null = null;
      let error: any = null;

      // KNOWN LIMITATION, seller side. daily_campaign_data is campaign-grain
      // and daily_inventory_data is SKU-grain, and neither read below pages or
      // ranges — so PostgREST caps them at 1000 rows and a large account's
      // 60-day window is truncated, producing gaps that are not real. The
      // vendor case, which was by far the worst (ASIN grain, ~2.5M rows for
      // Portwest), is fixed below by moving to a day-grain RPC; the seller
      // tables need the same treatment and have NOT had it yet.
      //
      // Use explicit table queries to avoid TypeScript issues
      switch (tableName) {
        case 'daily_sales_ppc_data':
          ({ data, error } = await supabase
            .from('daily_sales_ppc_data')
            .select(dateColumn)
            .eq('merchant_token', merchantToken)
            .gte(dateColumn, format(startDate, 'yyyy-MM-dd'))
            .lte(dateColumn, format(endDate, 'yyyy-MM-dd'))
            .order(dateColumn, { ascending: true }));
          break;
        case 'daily_campaign_data':
          ({ data, error } = await supabase
            .from('daily_campaign_data')
            .select(dateColumn)
            .eq('merchant_token', merchantToken)
            .gte(dateColumn, format(startDate, 'yyyy-MM-dd'))
            .lte(dateColumn, format(endDate, 'yyyy-MM-dd'))
            .order(dateColumn, { ascending: true }));
          break;
        case 'vw_daily_vendor_data':
          // Day-grain RPC, not the ASIN-grain view.
          //
          // This read had no .range() and no limit, so PostgREST silently
          // capped it at 1000 rows. vw_daily_vendor_data is one row per ASIN
          // per day — for Portwest 1000 rows is a day or two of a 60-day
          // window, so the analyser declared almost every day a gap and
          // AdminView showed that for every vendor account it loops. A false
          // gap report is worse than none.
          //
          // rpc_vendor_daily_totals returns ONE ROW PER DAY, so 60 days is 60
          // rows and nothing is truncated. It exposes record_date, which is
          // what dateColumn is for every vendor config here.
          ({ data, error } = await (supabase.rpc as any)('rpc_vendor_daily_totals', {
            p_merchant_token: merchantToken,
            p_start: format(startDate, 'yyyy-MM-dd'),
            p_end: format(endDate, 'yyyy-MM-dd'),
          }));
          // The RPC does not promise an order, and lastDataDate below reads the
          // final element.
          if (!error && Array.isArray(data)) {
            data = [...data].sort((a, b) =>
              String(a[dateColumn]).localeCompare(String(b[dateColumn])),
            );
          }
          break;
        case 'daily_inventory_data':
          ({ data, error } = await supabase
            .from('daily_inventory_data')
            .select(dateColumn)
            .eq('merchant_token', merchantToken)
            .gte(dateColumn, format(startDate, 'yyyy-MM-dd'))
            .lte(dateColumn, format(endDate, 'yyyy-MM-dd'))
            .order(dateColumn, { ascending: true }));
          break;
        default:
          // Handle PPC data type which uses campaign table but specifically for spend analysis
          if (dataType === 'ppc' && tableName === 'daily_campaign_data') {
            ({ data, error } = await supabase
              .from('daily_campaign_data')
              .select(`${dateColumn}, spend`)
              .eq('merchant_token', merchantToken)
              .gte(dateColumn, format(startDate, 'yyyy-MM-dd'))
              .lte(dateColumn, format(endDate, 'yyyy-MM-dd'))
              .gt('spend', 0) // Only consider records with actual spend
              .order(dateColumn, { ascending: true }));
          } else {
            throw new Error(`Unknown table: ${tableName}`);
          }
      }

      if (error) {
        // Deliberately no gap rather than a gap for every day: a failed query
        // knows nothing about coverage, and a false "60 days missing" on the
        // admin board is worse than a quiet one.
        console.error(`Failed to fetch ${dataType} data:`, error);
        return null;
      }

      // Postgres hands a plain date back as 'yyyy-MM-dd'. Round-tripping that
      // through new Date() parses it as UTC midnight and then formats it in
      // local time, so anyone west of UTC — Martin, on US Eastern — would see
      // every date land on the previous day and every day reported as a gap.
      // The expected dates below are local Dates, so compare on the raw string.
      const existingDates = new Set(
        data?.map(row => String(row[dateColumn]).slice(0, 10)) || []
      );

      // Generate all expected dates
      const expectedDates = eachDayOfInterval({ start: startDate, end: endDate });
      
      // Find missing dates
      const missingDates = expectedDates.filter(date => 
        !existingDates.has(format(date, 'yyyy-MM-dd'))
      );

      if (missingDates.length === 0) {
        return null; // No gaps
      }

      // Calculate consecutive missing days
      const consecutiveDays = this.calculateConsecutiveDays(missingDates);

      // Find last data date
      const lastDataDate = data && data.length > 0 
        ? new Date(data[data.length - 1][dateColumn])
        : undefined;

      // Determine severity
      const severity = this.calculateSeverity(missingDates.length, consecutiveDays, dataType);

      return {
        accountName,
        merchantToken,
        dataType,
        missingDates,
        lastDataDate,
        totalDaysMissing: missingDates.length,
        consecutiveDaysMissing: consecutiveDays,
        severity,
      };
    } catch (error) {
      console.error(`Error analyzing ${dataType} gaps:`, error);
      return null;
    }
  }

  /**
   * Calculate the maximum number of consecutive missing days
   */
  private calculateConsecutiveDays(missingDates: Date[]): number {
    if (missingDates.length === 0) return 0;

    missingDates.sort((a, b) => a.getTime() - b.getTime());
    
    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < missingDates.length; i++) {
      const prevDate = missingDates[i - 1];
      const currentDate = missingDates[i];
      
      // Check if dates are consecutive (1 day apart)
      const daysDiff = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }

    return maxConsecutive;
  }

  /**
   * Calculate gap severity based on missing days and data type importance
   */
  private calculateSeverity(
    totalMissing: number,
    consecutiveMissing: number,
    dataType: DataGapResult['dataType']
  ): 'low' | 'medium' | 'high' {
    // Data type importance weights
    const importanceWeights = {
      sales: 1.0,    // Most critical
      ppc: 0.9,      // Very high importance - PPC spend tracking is crucial
      campaign: 0.8, // High importance
      vendor: 0.7,   // Medium importance
      inventory: 0.6 // Lower importance
    };

    const weight = importanceWeights[dataType];
    const weightedConsecutive = consecutiveMissing * weight;
    const weightedTotal = totalMissing * weight;

    // High severity: >14 consecutive days OR >21 total days (adjusted by weight)
    if (weightedConsecutive > 14 || weightedTotal > 21) {
      return 'high';
    }

    // Medium severity: 7-14 consecutive days OR 10-21 total days (adjusted by weight)
    if (weightedConsecutive >= 7 || weightedTotal >= 10) {
      return 'medium';
    }

    // Low severity: everything else
    return 'low';
  }

  /**
   * Create summary statistics
   */
  private createSummary(totalAccounts: number, gaps: DataGapResult[]): DataGapSummary {
    const accountsWithGaps = new Set(gaps.map(g => g.merchantToken)).size;
    const highSeverityGaps = gaps.filter(g => g.severity === 'high').length;
    const mediumSeverityGaps = gaps.filter(g => g.severity === 'medium').length;
    const lowSeverityGaps = gaps.filter(g => g.severity === 'low').length;

    return {
      totalAccounts,
      accountsWithGaps,
      highSeverityGaps,
      mediumSeverityGaps,
      lowSeverityGaps,
      gaps: gaps.sort((a, b) => {
        // Sort by severity (high -> medium -> low) then by consecutive days missing
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.consecutiveDaysMissing - a.consecutiveDaysMissing;
      }),
    };
  }

  /**
   * Create empty summary for error cases
   */
  private createEmptySummary(): DataGapSummary {
    return {
      totalAccounts: 0,
      accountsWithGaps: 0,
      highSeverityGaps: 0,
      mediumSeverityGaps: 0,
      lowSeverityGaps: 0,
      gaps: [],
    };
  }

  /**
   * Get data gaps for a specific account
   */
  async getAccountDataGaps(merchantToken: string): Promise<DataGapResult[]> {
    const endDate = startOfDay(subDays(new Date(), this.bufferDays));
    const startDate = startOfDay(subDays(endDate, this.lookbackDays));

    const { data: account, error } = await supabase
      .from('accounts_master')
      .select('account_name')
      .eq('merchant_token', merchantToken)
      .single();

    if (error || !account) {
      console.error('Failed to fetch account:', error);
      return [];
    }

    return this.analyzeAccountDataGaps(
      account.account_name,
      merchantToken,
      startDate,
      endDate
    );
  }
}

export const dataGapAnalyzer = new DataGapAnalyzer();