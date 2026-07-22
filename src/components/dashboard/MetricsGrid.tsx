import { useMemo } from 'react';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { formatCurrency, formatCurrencyByMerchantToken, formatPercentage } from '@/utils/formatters';
import { hasMultipleCurrencies } from '@/utils/currencyUtils';
import { convertAccountMetricsToGBP } from '@/utils/currencyConverter';
import { AdTypeToggle } from '@/components/dashboard/AdTypeToggle';
import type { AccountData, DateFilter } from '@/types/dashboard';
import type { ApiPpcMetrics, AdType, ApiPpcDailyRow } from '@/hooks/useApiPpcData';
import { isVendorAccount as isVendorAccountCheck } from '@/utils/vendorUtils';

export interface OrganicMetrics {
  sales: number;
  ppcSpend: number;
  ppcSales: number;
  unitsOrdered: number;
  pageViews: number;
  buyBoxPercentage: number;
  conversionRate: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  acos: number;
  tacos: number;
}

interface MetricsGridProps {
  displayedAccounts: AccountData[];
  focusedAccount?: AccountData | null;
  selectedChartMetrics?: string[];
  onToggleChartMetric?: (metricKey: string) => void;
  apiPpcMetrics?: ApiPpcMetrics | null;
  apiPpcPreviousMetrics?: ApiPpcMetrics | null;
  apiPpcLoading?: boolean;
  adType?: AdType;
  onAdTypeChange?: (adType: AdType) => void;
  /** Direct organic metrics computed from sheetData - bypasses account state */
  directOrganicMetrics?: OrganicMetrics | null;
  directOrganicPreviousMetrics?: OrganicMetrics | null;
  apiPpcDailyData?: ApiPpcDailyRow[];
  dateFilter?: DateFilter;
}

export const MetricsGrid = ({ 
  displayedAccounts, 
  focusedAccount, 
  selectedChartMetrics, 
  onToggleChartMetric,
  apiPpcMetrics,
  apiPpcPreviousMetrics,
  apiPpcLoading,
  adType = 'all',
  onAdTypeChange,
  directOrganicMetrics,
  directOrganicPreviousMetrics,
  apiPpcDailyData,
  dateFilter,
}: MetricsGridProps) => {
  // Compute comparison label based on date filter
  const comparisonLabel = useMemo(() => {
    const labels: Record<string, string> = {
      'last-7-days': 'vs prior 7 days',
      'last-14-days': 'vs prior 14 days',
      'last-30-days': 'vs prior 30 days',
      'last-60-days': 'vs prior 60 days',
      'this-month': 'vs prior month',
      'last-month': 'vs month before',
      'this-year': 'vs prior year',
      'custom': 'vs prior period',
    };
    return dateFilter ? (labels[dateFilter] || 'vs prior period') : 'vs prior period';
  }, [dateFilter]);

  // Only use API PPC data if it was actually provided AND has meaningful data (not just empty defaults)
  const hasApiPpc = !!apiPpcMetrics && !apiPpcLoading && (apiPpcMetrics.spend > 0 || apiPpcMetrics.sales > 0 || apiPpcMetrics.impressions > 0);
  
  // Convert all accounts to GBP for consistent totals
  const gbpAccounts = displayedAccounts.map(account => convertAccountMetricsToGBP(account));
  
  // For formatting, use focusedAccount's currency if available, otherwise use GBP
  const formatCurrencyForMetrics = (amount: number) => {
    if (focusedAccount) {
      return formatCurrencyByMerchantToken(amount, focusedAccount.merchantToken);
    }
    return formatCurrency(amount);
  };

  // Calculate organic metrics: prefer direct computation from sheetData, fall back to account aggregation
  const accountAggregated = gbpAccounts.reduce((acc, account) => ({
    sales: acc.sales + (Number(account.sales) || 0),
    ppcSpend: acc.ppcSpend + (Number(account.ppcSpend) || 0),
    ppcSales: acc.ppcSales + (Number(account.ppcSales) || 0),
    unitsOrdered: acc.unitsOrdered + (Number(account.unitsOrdered) || 0),
    pageViews: acc.pageViews + (Number(account.pageViews) || 0),
    impressions: acc.impressions + (Number(account.impressions) || 0),
    clicks: acc.clicks + (Number(account.clicks) || 0),
    cpc: acc.cpc + (Number(account.cpc) || 0),
    ctr: acc.ctr + (Number(account.ctr) || 0),
  }), { sales: 0, ppcSpend: 0, ppcSales: 0, unitsOrdered: 0, pageViews: 0, impressions: 0, clicks: 0, cpc: 0, ctr: 0 });

  // Use direct organic metrics if provided (always preferred - computed fresh from raw sheetData)
  const totalMetrics = directOrganicMetrics
    ? { sales: directOrganicMetrics.sales, unitsOrdered: directOrganicMetrics.unitsOrdered, pageViews: directOrganicMetrics.pageViews, ppcSpend: directOrganicMetrics.ppcSpend, ppcSales: directOrganicMetrics.ppcSales, impressions: directOrganicMetrics.impressions, clicks: directOrganicMetrics.clicks, cpc: directOrganicMetrics.cpc, ctr: directOrganicMetrics.ctr }
    : accountAggregated;

  const prevAccountAggregated = gbpAccounts.reduce((acc, account) => ({
    sales: acc.sales + (account.previousPeriod?.sales || 0),
    ppcSpend: acc.ppcSpend + (account.previousPeriod?.ppcSpend || 0),
    ppcSales: acc.ppcSales + (account.previousPeriod?.ppcSales || 0),
    unitsOrdered: acc.unitsOrdered + (account.previousPeriod?.unitsOrdered || 0),
    pageViews: acc.pageViews + (account.previousPeriod?.pageViews || 0),
    impressions: acc.impressions + (account.previousPeriod?.impressions || 0),
    clicks: acc.clicks + (account.previousPeriod?.clicks || 0),
    cpc: acc.cpc + (account.previousPeriod?.cpc || 0),
    ctr: acc.ctr + (account.previousPeriod?.ctr || 0),
  }), { sales: 0, ppcSpend: 0, ppcSales: 0, unitsOrdered: 0, pageViews: 0, impressions: 0, clicks: 0, cpc: 0, ctr: 0 });

  const totalPreviousMetrics = directOrganicPreviousMetrics
    ? { sales: directOrganicPreviousMetrics.sales, unitsOrdered: directOrganicPreviousMetrics.unitsOrdered, pageViews: directOrganicPreviousMetrics.pageViews, ppcSpend: directOrganicPreviousMetrics.ppcSpend, ppcSales: directOrganicPreviousMetrics.ppcSales, impressions: directOrganicPreviousMetrics.impressions, clicks: directOrganicPreviousMetrics.clicks, cpc: directOrganicPreviousMetrics.cpc, ctr: directOrganicPreviousMetrics.ctr }
    : prevAccountAggregated;

  // PPC metrics: use API if available, otherwise fall back to daily_asin_data
  const ppcSpend = hasApiPpc ? apiPpcMetrics.spend : totalMetrics.ppcSpend;
  const ppcSales = hasApiPpc ? apiPpcMetrics.sales : totalMetrics.ppcSales;
  const ppcImpressions = hasApiPpc ? apiPpcMetrics.impressions : totalMetrics.impressions;
  const ppcClicks = hasApiPpc ? apiPpcMetrics.clicks : totalMetrics.clicks;
  const ppcOrders = hasApiPpc ? apiPpcMetrics.orders : totalMetrics.unitsOrdered;
  const ppcCpc = hasApiPpc ? apiPpcMetrics.cpc : (displayedAccounts.length > 0 ? displayedAccounts.reduce((acc, a) => acc + (a.cpc || 0), 0) / displayedAccounts.length : 0);
  const ppcCtr = hasApiPpc ? apiPpcMetrics.ctr : (displayedAccounts.length > 0 ? displayedAccounts.reduce((acc, a) => acc + (a.ctr || 0), 0) / displayedAccounts.length : 0);
  const ppcAcos = hasApiPpc ? apiPpcMetrics.acos : (displayedAccounts.length > 0 ? displayedAccounts.reduce((acc, a) => acc + a.acos, 0) / displayedAccounts.length : 0);
  const ppcCpa = hasApiPpc ? apiPpcMetrics.cpa : (ppcOrders > 0 ? ppcSpend / ppcOrders : 0);

  const prevPpcSpend = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.spend : totalPreviousMetrics.ppcSpend;
  const prevPpcSales = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.sales : totalPreviousMetrics.ppcSales;
  const prevPpcImpressions = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.impressions : totalPreviousMetrics.impressions;
  const prevPpcClicks = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.clicks : totalPreviousMetrics.clicks;
  const prevPpcOrders = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.orders : totalPreviousMetrics.unitsOrdered;
  const prevPpcCpc = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.cpc : (displayedAccounts.length > 0 ? displayedAccounts.reduce((acc, a) => acc + (a.previousPeriod?.cpc || 0), 0) / displayedAccounts.length : 0);
  const prevPpcCtr = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.ctr : (displayedAccounts.length > 0 ? displayedAccounts.reduce((acc, a) => acc + (a.previousPeriod?.ctr || 0), 0) / displayedAccounts.length : 0);
  const prevPpcAcos = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.acos : (displayedAccounts.length > 0 ? displayedAccounts.reduce((acc, a) => acc + (a.previousPeriod?.acos || 0), 0) / displayedAccounts.length : 0);
  const prevPpcCpa = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.cpa : (prevPpcOrders > 0 ? prevPpcSpend / prevPpcOrders : 0);

  // TACOS = API PPC spend / daily_asin_data total sales (hybrid)
  const tacos = totalMetrics.sales > 0 ? (ppcSpend / totalMetrics.sales) * 100 : 0;
  const prevTacos = totalPreviousMetrics.sales > 0 ? (prevPpcSpend / totalPreviousMetrics.sales) * 100 : 0;

  // Advertising reliance
  const advertisingReliance = totalMetrics.sales > 0 ? (ppcSales / totalMetrics.sales) * 100 : 0;
  const prevAdvertisingReliance = totalPreviousMetrics.sales > 0 ? (prevPpcSales / totalPreviousMetrics.sales) * 100 : 0;

  // Organic metrics - prefer direct computation
  const avgBuyBoxPercentage = directOrganicMetrics ? directOrganicMetrics.buyBoxPercentage
    : displayedAccounts.length > 0 
      ? displayedAccounts.reduce((acc, account) => acc + account.buyBoxPercentage, 0) / displayedAccounts.length 
      : 0;
  const avgConversionRate = directOrganicMetrics ? directOrganicMetrics.conversionRate
    : displayedAccounts.length > 0 
      ? displayedAccounts.reduce((acc, account) => acc + account.conversionRate, 0) / displayedAccounts.length 
      : 0;
  const avgPreviousBuyBoxPercentage = directOrganicPreviousMetrics ? directOrganicPreviousMetrics.buyBoxPercentage
    : displayedAccounts.length > 0 
      ? displayedAccounts.reduce((acc, account) => acc + (account.previousPeriod?.buyBoxPercentage || 0), 0) / displayedAccounts.length 
      : 0;
  const avgPreviousConversionRate = directOrganicPreviousMetrics ? directOrganicPreviousMetrics.conversionRate
    : displayedAccounts.length > 0 
      ? displayedAccounts.reduce((acc, account) => acc + (account.previousPeriod?.conversionRate || 0), 0) / displayedAccounts.length 
      : 0;


  const showExtendedMetrics = focusedAccount !== null;
  const isVendor = isVendorAccountCheck(focusedAccount?.merchantToken);

  // Build sparkline data from daily PPC/vendor rows (last 7 data points)
  const sparklines = useMemo(() => {
    if (!apiPpcDailyData?.length) return {};
    const sorted = [...apiPpcDailyData].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
    return {
      spend: sorted.map(d => d.spend),
      sales: sorted.map(d => d.sales),
      impressions: sorted.map(d => d.impressions),
      clicks: sorted.map(d => d.clicks),
      orders: sorted.map(d => d.orders),
      cpc: sorted.map(d => d.clicks > 0 ? d.spend / d.clicks : 0),
      ctr: sorted.map(d => d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0),
      acos: sorted.map(d => d.sales > 0 ? (d.spend / d.sales) * 100 : 0),
      // Vendor-specific sparklines
      pageViews: sorted.map(d => d.pageViews ?? 0),
      unitsOrdered: sorted.map(d => d.unitsOrdered ?? d.orders),
      buyBoxPct: sorted.map(d => d.buyBoxPercentage ?? 0),
    };
  }, [apiPpcDailyData]);

  // Vendor-specific aggregated metrics from dailyData
  const vendorMetrics = useMemo(() => {
    if (!isVendor || !apiPpcDailyData?.length) return null;
    let totalPageViews = 0, totalUnits = 0, bbSum = 0, bbCount = 0;
    let prevTotalPageViews = 0, prevTotalUnits = 0, prevBbSum = 0, prevBbCount = 0;
    for (const d of apiPpcDailyData) {
      totalPageViews += d.pageViews ?? 0;
      totalUnits += d.unitsOrdered ?? d.orders;
      if ((d.buyBoxPercentage ?? 0) > 0) { bbSum += d.buyBoxPercentage!; bbCount++; }
    }
    return {
      pageViews: totalPageViews,
      unitsOrdered: totalUnits,
      avgBuyBox: bbCount > 0 ? bbSum / bbCount : 0,
    };
  }, [isVendor, apiPpcDailyData]);

  // Previous vendor metrics - we need to get these from the hook's previous daily data
  // For now, use the apiPpcPreviousMetrics which has sales/orders from the previous period
  const prevVendorSales = apiPpcPreviousMetrics?.sales ?? 0;
  const prevVendorOrders = apiPpcPreviousMetrics?.orders ?? 0;

  if (showExtendedMetrics) {
    // VENDOR-SPECIFIC KPI LAYOUT
    if (isVendor) {
      const vendorSales = apiPpcMetrics?.sales ?? totalMetrics.sales;
      const vendorUnits = vendorMetrics?.unitsOrdered ?? totalMetrics.unitsOrdered;

      return (
        <div className="space-y-4">
          {/* Vendor Financial Metrics */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4 flex items-center">
              <div className="w-1 h-5 md:h-6 bg-purple-500 rounded-full mr-2 md:mr-3"></div>
              Vendor Performance
              {apiPpcLoading && (
                <span className="text-xs text-muted-foreground animate-pulse ml-2">Loading...</span>
              )}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
              <MetricsCard
                title="Ordered Revenue"
                value={formatCurrencyForMetrics(vendorSales)}
                color="text-blue-600"
                currentValue={vendorSales}
                previousValue={prevVendorSales || totalPreviousMetrics.sales}
                comparisonLabel={comparisonLabel}
                onClick={onToggleChartMetric ? () => onToggleChartMetric('sales') : undefined}
                isSelected={selectedChartMetrics?.includes('sales')}
                sparklineData={sparklines.sales}
              />

              <MetricsCard
                title="Units Ordered"
                value={vendorUnits.toLocaleString()}
                color="text-indigo-600"
                currentValue={vendorUnits}
                previousValue={prevVendorOrders || totalPreviousMetrics.unitsOrdered}
                comparisonLabel={comparisonLabel}
                onClick={onToggleChartMetric ? () => onToggleChartMetric('unitsSold') : undefined}
                isSelected={selectedChartMetrics?.includes('unitsSold')}
                sparklineData={sparklines.unitsOrdered}
              />
            </div>
          </div>

          {/* PPC Performance — only when real ad data exists */}
          {(apiPpcMetrics?.spend ?? 0) > 0 && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
                <div className="w-1 h-5 md:h-6 bg-purple-500 rounded-full mr-0"></div>
                <span>PPC Performance</span>
                <span className="text-xs font-normal text-muted-foreground">(Advertising only)</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                <MetricsCard
                  title="PPC Spend"
                  invertSentiment
                  value={formatCurrencyForMetrics(ppcSpend)}
                  color="text-orange-600"
                  currentValue={ppcSpend}
                  previousValue={prevPpcSpend}
                  comparisonLabel={comparisonLabel}
                  onClick={onToggleChartMetric ? () => onToggleChartMetric('ppcSpend') : undefined}
                  isSelected={selectedChartMetrics?.includes('ppcSpend')}
                  sparklineData={sparklines.spend}
                />
                <MetricsCard
                  title="PPC Sales"
                  value={formatCurrencyForMetrics(ppcSales)}
                  color="text-green-600"
                  currentValue={ppcSales}
                  previousValue={prevPpcSales}
                  comparisonLabel={comparisonLabel}
                  onClick={onToggleChartMetric ? () => onToggleChartMetric('ppcSales') : undefined}
                  isSelected={selectedChartMetrics?.includes('ppcSales')}
                  sparklineData={sparklines.sales}
                />
                <MetricsCard
                  title="ACOS"
                  invertSentiment
                  value={formatPercentage(ppcAcos)}
                  color="text-purple-600"
                  currentValue={ppcAcos}
                  previousValue={prevPpcAcos}
                  comparisonLabel={comparisonLabel}
                  isPercentage={true}
                  onClick={onToggleChartMetric ? () => onToggleChartMetric('acos') : undefined}
                  isSelected={selectedChartMetrics?.includes('acos')}
                  sparklineData={sparklines.acos}
                />
                <MetricsCard
                  title="CPC"
                  invertSentiment
                  value={formatCurrencyForMetrics(ppcCpc)}
                  color="text-amber-600"
                  currentValue={ppcCpc}
                  previousValue={prevPpcCpc}
                  comparisonLabel={comparisonLabel}
                />
              </div>
            </div>
          )}
        </div>
      );
    }


    // SELLER-SPECIFIC KPI LAYOUT (existing)
    return (
      <div className="space-y-4">
        {/* Primary Financial Metrics */}
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
            <div className="w-1 h-5 md:h-6 bg-blue-500 rounded-full mr-2 md:mr-3"></div>
            Financial Performance
            <span className="ml-2 text-xs font-normal text-muted-foreground">(Overall + PPC)</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <MetricsCard
              title="Overall Sales"
              subtitle="Gross ordered product sales"
              info="Gross ordered product sales (organic + PPC) from Amazon's sales report. This will NOT match the P&L tab's 'Sales (revenue)', which is net sales from SP-API Seller Economics on an accrual basis — they come from different Amazon reports and different windows, so they won't tie out exactly."
              value={formatCurrencyForMetrics(totalMetrics.sales)}
              color="text-blue-600"
              currentValue={totalMetrics.sales}
              previousValue={totalPreviousMetrics.sales}
              comparisonLabel={comparisonLabel}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('sales') : undefined}
              isSelected={selectedChartMetrics?.includes('sales')}
              sparklineData={sparklines.sales}
            />
            
            <MetricsCard
              title="PPC Spend"
              info="Total advertising spend in the period. Cost metric — a rising delta is bad and turns red."
              invertSentiment
              value={formatCurrencyForMetrics(ppcSpend)}
              color="text-orange-600"
              currentValue={ppcSpend}
              previousValue={prevPpcSpend}
              comparisonLabel={comparisonLabel}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('ppcSpend') : undefined}
              isSelected={selectedChartMetrics?.includes('ppcSpend')}
              sparklineData={sparklines.spend}
            />
            
            <MetricsCard
              title="PPC Sales"
              info="Sales attributed to advertising (typically 7-day attribution). Higher is better."
              value={formatCurrencyForMetrics(ppcSales)}
              color="text-green-600"
              currentValue={ppcSales}
              previousValue={prevPpcSales}
              comparisonLabel={comparisonLabel}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('ppcSales') : undefined}
              isSelected={selectedChartMetrics?.includes('ppcSales')}
              sparklineData={sparklines.sales}
            />

            <MetricsCard
              title="Overall Units"
              info="Units ordered across all orders in the period (organic + PPC)."
              value={totalMetrics.unitsOrdered.toLocaleString()}
              color="text-indigo-600"
              currentValue={totalMetrics.unitsOrdered}
              previousValue={totalPreviousMetrics.unitsOrdered}
              comparisonLabel={comparisonLabel}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('unitsSold') : undefined}
              isSelected={selectedChartMetrics?.includes('unitsSold')}
              sparklineData={sparklines.orders}
            />

          </div>
        </div>

        {/* PPC / Advertising Efficiency Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-purple-500 rounded-full mr-0"></div>
            <span className="flex items-center gap-2">
              PPC Performance
            </span>
            <span className="text-xs font-normal text-muted-foreground">(Advertising only)</span>
            {onAdTypeChange && (
              <AdTypeToggle value={adType} onChange={onAdTypeChange} />
            )}
            {apiPpcLoading && (
              <span className="text-xs text-gray-400 animate-pulse ml-2">Loading...</span>
            )}
          </h3>
          
          {/* First Row - 4 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
            <MetricsCard
              title="ACOS"
              info="Ad spend ÷ PPC sales. Cost metric — lower is better. A rising delta turns red."
              invertSentiment
              value={formatPercentage(ppcAcos)}
              color="text-purple-600"
              currentValue={ppcAcos}
              previousValue={prevPpcAcos}
              comparisonLabel={comparisonLabel}
              isPercentage={true}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('acos') : undefined}
              isSelected={selectedChartMetrics?.includes('acos')}
              sparklineData={sparklines.acos}
            />
            
            <MetricsCard
              title="TACOS"
              info="Ad spend ÷ TOTAL sales (organic + PPC). Cost metric — lower is better."
              invertSentiment
              value={formatPercentage(tacos)}
              color="text-cyan-600"
              currentValue={tacos}
              previousValue={prevTacos}
              comparisonLabel={comparisonLabel}
              isPercentage={true}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('tacos') : undefined}
              isSelected={selectedChartMetrics?.includes('tacos')}
            />

            <MetricsCard
              title="Advertising %"
              info="PPC sales as a share of total sales. Cost-sentiment metric — a heavy reliance on ads turns red."
              invertSentiment
              value={formatPercentage(advertisingReliance)}
              color="text-amber-600"
              currentValue={advertisingReliance}
              previousValue={prevAdvertisingReliance}
              comparisonLabel={comparisonLabel}
              isPercentage={true}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('advertisingReliance') : undefined}
              isSelected={selectedChartMetrics?.includes('advertisingReliance')}
            />


            <MetricsCard
              title="PPC Impressions"
              value={ppcImpressions.toLocaleString()}
              color="text-blue-600"
              currentValue={ppcImpressions}
              previousValue={prevPpcImpressions}
              comparisonLabel={comparisonLabel}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('impressions') : undefined}
              isSelected={selectedChartMetrics?.includes('impressions')}
              sparklineData={sparklines.impressions}
            />
          </div>

          {/* Second Row - 4 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <MetricsCard
              title="PPC Clicks"
              value={ppcClicks.toLocaleString()}
              color="text-green-600"
              currentValue={ppcClicks}
              previousValue={prevPpcClicks}
              comparisonLabel={comparisonLabel}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('clicks') : undefined}
              isSelected={selectedChartMetrics?.includes('clicks')}
              sparklineData={sparklines.clicks}
            />

            <MetricsCard
              title="CPC"
              invertSentiment
              value={formatCurrencyForMetrics(ppcCpc)}
              color="text-orange-600"
              currentValue={ppcCpc}
              previousValue={prevPpcCpc}
              comparisonLabel={comparisonLabel}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('cpc') : undefined}
              isSelected={selectedChartMetrics?.includes('cpc')}
              sparklineData={sparklines.cpc}
            />

            <MetricsCard
              title="CTR"
              value={formatPercentage(ppcCtr)}
              color="text-blue-600"
              currentValue={ppcCtr}
              previousValue={prevPpcCtr}
              comparisonLabel={comparisonLabel}
              isPercentage={true}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('ctr') : undefined}
              isSelected={selectedChartMetrics?.includes('ctr')}
              sparklineData={sparklines.ctr}
            />

            <MetricsCard
              title="CPA"
              invertSentiment
              value={formatCurrencyForMetrics(ppcCpa)}
              color="text-orange-600"
              currentValue={ppcCpa}
              previousValue={prevPpcCpa}
              comparisonLabel={comparisonLabel}
              onClick={onToggleChartMetric ? () => onToggleChartMetric('cpa') : undefined}
              isSelected={selectedChartMetrics?.includes('cpa')}
            />
          </div>
        </div>

        {/* Traffic & Conversion Metrics */}
        {(!isVendor) && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-1 h-6 bg-emerald-500 rounded-full mr-3"></div>
              Overall Traffic & Conversion
              <span className="ml-2 text-xs font-normal text-muted-foreground">(Seller Central)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              <MetricsCard
                title="Page Views"
                value={totalMetrics.pageViews.toLocaleString()}
                color="text-pink-600"
                currentValue={totalMetrics.pageViews}
                previousValue={totalPreviousMetrics.pageViews}
              comparisonLabel={comparisonLabel}
                onClick={onToggleChartMetric ? () => onToggleChartMetric('pageViews') : undefined}
                isSelected={selectedChartMetrics?.includes('pageViews')}
              />
              
              <MetricsCard
                title="Buy Box %"
                value={formatPercentage(avgBuyBoxPercentage)}
                color="text-yellow-600"
                currentValue={avgBuyBoxPercentage}
                previousValue={avgPreviousBuyBoxPercentage}
              comparisonLabel={comparisonLabel}
                isPercentage={true}
                onClick={onToggleChartMetric ? () => onToggleChartMetric('buyBoxPercentage') : undefined}
                isSelected={selectedChartMetrics?.includes('buyBoxPercentage')}
              />
              
              <MetricsCard
                title="Conversion Rate"
                value={formatPercentage(avgConversionRate)}
                color="text-red-600"
                currentValue={avgConversionRate}
                previousValue={avgPreviousConversionRate}
              comparisonLabel={comparisonLabel}
                isPercentage={true}
                onClick={onToggleChartMetric ? () => onToggleChartMetric('conversionRate') : undefined}
                isSelected={selectedChartMetrics?.includes('conversionRate')}
              />
            </div>
          </div>
        )}

      </div>
    );
  }

  // Default view - condensed metrics (no API PPC here, unfocused view)
  const avgAcos = displayedAccounts.length > 0 
    ? displayedAccounts.reduce((acc, account) => acc + account.acos, 0) / displayedAccounts.length 
    : 0;
  const avgTacos = displayedAccounts.length > 0 
    ? displayedAccounts.reduce((acc, account) => acc + account.tacos, 0) / displayedAccounts.length 
    : 0;
  const avgPreviousAcos = displayedAccounts.length > 0 
    ? displayedAccounts.reduce((acc, account) => acc + (account.previousPeriod?.acos || 0), 0) / displayedAccounts.length 
    : 0;
  const avgPreviousTacos = displayedAccounts.length > 0 
    ? displayedAccounts.reduce((acc, account) => acc + (account.previousPeriod?.tacos || 0), 0) / displayedAccounts.length 
    : 0;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
        <MetricsCard
          title="Total Sales"
          value={formatCurrencyForMetrics(totalMetrics.sales)}
          color="text-blue-600"
          currentValue={totalMetrics.sales}
          previousValue={totalPreviousMetrics.sales}
              comparisonLabel={comparisonLabel}
        />
        
        <MetricsCard
          title="Total PPC Spend"
          invertSentiment
          value={formatCurrencyForMetrics(totalMetrics.ppcSpend)}
          color="text-orange-600"
          currentValue={totalMetrics.ppcSpend}
          previousValue={totalPreviousMetrics.ppcSpend}
              comparisonLabel={comparisonLabel}
        />
        
        <MetricsCard
          title="Total PPC Sales"
          value={formatCurrencyForMetrics(totalMetrics.ppcSales)}
          color="text-green-600"
          currentValue={totalMetrics.ppcSales}
          previousValue={totalPreviousMetrics.ppcSales}
              comparisonLabel={comparisonLabel}
        />
        
        <MetricsCard
          title="Avg ACOS"
          invertSentiment
          value={formatPercentage(avgAcos)}
          color="text-purple-600"
          currentValue={avgAcos}
          previousValue={avgPreviousAcos}
              comparisonLabel={comparisonLabel}
          isPercentage={true}
        />
        
        <MetricsCard
          title="Avg TACOS"
          invertSentiment
          value={formatPercentage(avgTacos)}
          color="text-cyan-600"
          currentValue={avgTacos}
          previousValue={avgPreviousTacos}
              comparisonLabel={comparisonLabel}
          isPercentage={true}
        />
      </div>
    </div>
  );
};
