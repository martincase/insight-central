import { useMemo } from 'react';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { formatCurrency, formatCurrencyByMerchantToken, formatPercentage } from '@/utils/formatters';
import { hasMultipleCurrencies } from '@/utils/currencyUtils';
import { convertAccountMetricsToGBP } from '@/utils/currencyConverter';
import { AdTypeToggle } from '@/components/dashboard/AdTypeToggle';
import type { AccountData, DateFilter } from '@/types/dashboard';
import type { ApiPpcMetrics, AdType, ApiPpcDailyRow } from '@/hooks/useApiPpcData';
import { isVendorAccount as isVendorAccountCheck } from '@/utils/vendorUtils';
import { isMetricPlottable } from '@/hooks/useChartMetrics';
import type { UseScopedMetricsResult } from '@/hooks/useScopedMetrics';
import { describeMissingDates } from '@/utils/kpiIntegrity';
import { AlertTriangle } from 'lucide-react';
import { getComparisonLabel } from '@/utils/comparisonLabels';
import { VENDOR_LAG_DAYS } from '@/utils/asinProcessor';

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
  /**
   * Country-scoped organic metrics from rpc_metrics_daily_country. When supplied
   * this is the ONLY source for sales / units / page views / buy box /
   * conversion — the account-level fallbacks below are not country aware and
   * silently report the home marketplace for every scope.
   */
  scopedMetrics?: UseScopedMetricsResult | null;
  customDateRange?: { from: Date; to: Date };
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
  scopedMetrics,
  customDateRange,
}: MetricsGridProps) => {
  const isVendor = isVendorAccountCheck(focusedAccount?.merchantToken);

  // ---------------------------------------------------------------------
  // KPI card → chart wiring.
  //
  // A card only offers the click when there is a series behind it. Vendor
  // accounts have no advertising feed at all, so PPC Impressions on a vendor
  // dashboard used to be a card you could press to add a bar pinned to zero —
  // which reads as a broken chart, not as "Amazon doesn't give us this for 1P".
  // The same gate drives isSelected, otherwise a vendor would see "Added to
  // chart" on a card whose series was never drawn.
  // ---------------------------------------------------------------------
  const chartToggleFor = (metricKey: string) =>
    onToggleChartMetric && isMetricPlottable(metricKey, isVendor)
      ? () => onToggleChartMetric(metricKey)
      : undefined;

  const chartSelected = (metricKey: string) =>
    isMetricPlottable(metricKey, isVendor) && !!selectedChartMetrics?.includes(metricKey);

  // Name the baseline every delta is measured against. Derived from the actual
  // date ranges rather than a hand-maintained lookup — the old map was keyed on
  // filter names that no longer exist ('last-30-days', 'last-60-days'), so most
  // periods silently fell back to the meaningless "vs prior period".
  const comparisonLabel = useMemo(
    () => getComparisonLabel(dateFilter, customDateRange, { vendorLagDays: isVendor ? VENDOR_LAG_DAYS : 0 }),
    [dateFilter, customDateRange, isVendor]
  );

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

  // A rate with no denominator is unknown, not zero. '—' says so; "0.0%" or
  // "£0.00" would be read as a real, very good number.
  const rateMoney = (v: number | null) => (v == null ? '—' : formatCurrencyForMetrics(v));
  const ratePct = (v: number | null) => (v == null ? '—' : formatPercentage(v));
  /** Deltas need a number; a withheld rate compares against nothing. */
  const rateDelta = (v: number | null) => v ?? 0;

  // ---------------------------------------------------------------------
  // Rates are never summed and never averaged.
  //
  // Only extensive quantities — money, units, clicks, impressions — add up
  // across accounts. A rate is a ratio of two of them, so a set-wide rate has
  // to be rebuilt from the set-wide numerator and denominator. Summing CPC gave
  // a two-account total of "£1.40" for two accounts charging £0.70 each;
  // averaging ACOS weighted a £50 account equally with a £50,000 one.
  //
  // Same house rule already applied to conversion: Σunits ÷ Σsessions, never a
  // mean of per-row rates. A missing or zero denominator returns null and the
  // card prints '—' rather than a confident zero.
  // ---------------------------------------------------------------------
  const ratio = (numerator: number, denominator: number, scale = 1): number | null => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
    if (denominator <= 0) return null;
    return (numerator / denominator) * scale;
  };

  // Calculate organic metrics: prefer direct computation from sheetData, fall back to account aggregation
  const accountSums = gbpAccounts.reduce((acc, account) => ({
    sales: acc.sales + (Number(account.sales) || 0),
    ppcSpend: acc.ppcSpend + (Number(account.ppcSpend) || 0),
    ppcSales: acc.ppcSales + (Number(account.ppcSales) || 0),
    unitsOrdered: acc.unitsOrdered + (Number(account.unitsOrdered) || 0),
    pageViews: acc.pageViews + (Number(account.pageViews) || 0),
    impressions: acc.impressions + (Number(account.impressions) || 0),
    clicks: acc.clicks + (Number(account.clicks) || 0),
  }), { sales: 0, ppcSpend: 0, ppcSales: 0, unitsOrdered: 0, pageViews: 0, impressions: 0, clicks: 0 });

  const accountAggregated = {
    ...accountSums,
    cpc: ratio(accountSums.ppcSpend, accountSums.clicks) ?? 0,
    ctr: ratio(accountSums.clicks, accountSums.impressions, 100) ?? 0,
  };

  // Use direct organic metrics if provided (always preferred - computed fresh from raw sheetData)
  const baseTotalMetrics = directOrganicMetrics
    ? { sales: directOrganicMetrics.sales, unitsOrdered: directOrganicMetrics.unitsOrdered, pageViews: directOrganicMetrics.pageViews, ppcSpend: directOrganicMetrics.ppcSpend, ppcSales: directOrganicMetrics.ppcSales, impressions: directOrganicMetrics.impressions, clicks: directOrganicMetrics.clicks, cpc: directOrganicMetrics.cpc, ctr: directOrganicMetrics.ctr }
    : accountAggregated;

  const prevAccountSums = gbpAccounts.reduce((acc, account) => ({
    sales: acc.sales + (account.previousPeriod?.sales || 0),
    ppcSpend: acc.ppcSpend + (account.previousPeriod?.ppcSpend || 0),
    ppcSales: acc.ppcSales + (account.previousPeriod?.ppcSales || 0),
    unitsOrdered: acc.unitsOrdered + (account.previousPeriod?.unitsOrdered || 0),
    pageViews: acc.pageViews + (account.previousPeriod?.pageViews || 0),
    impressions: acc.impressions + (account.previousPeriod?.impressions || 0),
    clicks: acc.clicks + (account.previousPeriod?.clicks || 0),
  }), { sales: 0, ppcSpend: 0, ppcSales: 0, unitsOrdered: 0, pageViews: 0, impressions: 0, clicks: 0 });

  const prevAccountAggregated = {
    ...prevAccountSums,
    cpc: ratio(prevAccountSums.ppcSpend, prevAccountSums.clicks) ?? 0,
    ctr: ratio(prevAccountSums.clicks, prevAccountSums.impressions, 100) ?? 0,
  };

  const basePreviousMetrics = directOrganicPreviousMetrics
    ? { sales: directOrganicPreviousMetrics.sales, unitsOrdered: directOrganicPreviousMetrics.unitsOrdered, pageViews: directOrganicPreviousMetrics.pageViews, ppcSpend: directOrganicPreviousMetrics.ppcSpend, ppcSales: directOrganicPreviousMetrics.ppcSales, impressions: directOrganicPreviousMetrics.impressions, clicks: directOrganicPreviousMetrics.clicks, cpc: directOrganicPreviousMetrics.cpc, ctr: directOrganicPreviousMetrics.ctr }
    : prevAccountAggregated;

  // ---------------------------------------------------------------------
  // Country scope. The organic figures above are account-level: they know
  // nothing about the country switcher, so on any non-home scope they show the
  // home marketplace under the wrong flag. Where a scoped series is available
  // it wins outright for sales / units / page views / buy box / conversion.
  // ---------------------------------------------------------------------
  const scoped = scopedMetrics?.totals ?? null;
  const scopedPrev = scopedMetrics?.previousTotals ?? null;
  const scopeError = scopedMetrics?.error ?? null;

  // ---------------------------------------------------------------------
  // Data completeness.
  //
  // Lockabox's SP-API credential died on 2 July. Its ads feed kept running, so
  // "Last Month" showed two days of sales (£5,048), a 91.8%-worse delta against
  // a real June, a TACOS of 109.3% and an Advertising % of 524.8% — a full
  // month of ad spend divided into two days of revenue. Nothing on the page
  // used the word incomplete. Where the sales series does not cover the period,
  // the total is qualified, the comparison is withheld and every ratio that
  // mixes complete advertising with incomplete sales is withheld with it.
  // ---------------------------------------------------------------------
  const completeness = scopedMetrics?.completeness ?? null;
  const salesIncomplete = !!completeness?.materiallyIncomplete;
  const incompleteNote = salesIncomplete
    ? `Withheld — only ${completeness!.presentDays} of ${completeness!.expectedDays} days of sales data`
    : undefined;
  // Nothing at all arrived. "£0" and "0.0%" are measurements; this is an
  // absence, and an absence prints as '—'.
  const scopedEmpty = completeness?.level === 'empty';
  const partialQualifier = salesIncomplete && !scopedEmpty
    ? `Partial period — ${completeness!.presentDays} of ${completeness!.expectedDays} days`
    : undefined;

  const totalMetrics = scoped
    ? { ...baseTotalMetrics, sales: scoped.sales, unitsOrdered: scoped.unitsOrdered, pageViews: scoped.pageViews }
    : baseTotalMetrics;
  const totalPreviousMetrics = scopedPrev
    ? { ...basePreviousMetrics, sales: scopedPrev.sales, unitsOrdered: scopedPrev.unitsOrdered, pageViews: scopedPrev.pageViews }
    : basePreviousMetrics;

  // ---------------------------------------------------------------------
  // Does this account advertise at all?
  //
  // Suu Balm Australia runs no advertising. Falling back to the account
  // aggregate produced a clean set of zeroes — PPC SPEND $0, PPC SALES $0,
  // TACOS 0.0%, ADVERTISING % 0.0%, CPA $0 — every one of which reads as a
  // measured result. "Zero spend at zero cost" is a very good month; "we have
  // no ad data" is not a month at all. ACOS, CPC and CTR already printed '—'
  // because their denominators were zero; the rest now say the same thing.
  // ---------------------------------------------------------------------
  const fallbackHasAds =
    (Number(totalMetrics.ppcSpend) || 0) > 0 ||
    (Number(totalMetrics.ppcSales) || 0) > 0 ||
    (Number(totalMetrics.impressions) || 0) > 0 ||
    (Number(totalMetrics.clicks) || 0) > 0;
  const adsAvailable = hasApiPpc || fallbackHasAds;

  // PPC metrics: use API if available, otherwise fall back to daily_asin_data
  const ppcSpend = hasApiPpc ? apiPpcMetrics.spend : totalMetrics.ppcSpend;
  const ppcSales = hasApiPpc ? apiPpcMetrics.sales : totalMetrics.ppcSales;
  const ppcImpressions = hasApiPpc ? apiPpcMetrics.impressions : totalMetrics.impressions;
  const ppcClicks = hasApiPpc ? apiPpcMetrics.clicks : totalMetrics.clicks;
  const ppcOrders = hasApiPpc ? apiPpcMetrics.orders : totalMetrics.unitsOrdered;
  // Derived from the four sums immediately above, whichever source they came
  // from — so the rate and the numbers it is made of can never disagree, and a
  // multi-account set gets one true rate rather than a mean of per-account ones.
  const ppcCpc = adsAvailable ? ratio(ppcSpend, ppcClicks) : null;
  const ppcCtr = adsAvailable ? ratio(ppcClicks, ppcImpressions, 100) : null;
  const ppcAcos = adsAvailable ? ratio(ppcSpend, ppcSales, 100) : null;
  // CPA falls back to total units ordered when there is no ads feed, so without
  // this gate an account that never advertised showed "CPA $0" — spend of zero
  // spread over organic orders.
  const ppcCpa = adsAvailable ? ratio(ppcSpend, ppcOrders) : null;

  const prevPpcSpend = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.spend : totalPreviousMetrics.ppcSpend;
  const prevPpcSales = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.sales : totalPreviousMetrics.ppcSales;
  const prevPpcImpressions = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.impressions : totalPreviousMetrics.impressions;
  const prevPpcClicks = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.clicks : totalPreviousMetrics.clicks;
  const prevPpcOrders = hasApiPpc && apiPpcPreviousMetrics ? apiPpcPreviousMetrics.orders : totalPreviousMetrics.unitsOrdered;
  const prevPpcCpc = ratio(prevPpcSpend, prevPpcClicks);
  const prevPpcCtr = ratio(prevPpcClicks, prevPpcImpressions, 100);
  const prevPpcAcos = ratio(prevPpcSpend, prevPpcSales, 100);
  const prevPpcCpa = ratio(prevPpcSpend, prevPpcOrders);

  // A number the account has no data for is '—', not zero.
  const adsMoney = (v: number) => (adsAvailable ? formatCurrencyForMetrics(v) : '—');
  const adsCount = (v: number) => (adsAvailable ? Math.round(v).toLocaleString() : '—');
  /** Organic figures, withheld outright when the scope reported nothing. */
  const orgMoney = (v: number) => (scopedEmpty ? '—' : formatCurrencyForMetrics(v));
  const orgCount = (v: number) => (scopedEmpty ? '—' : Math.round(v).toLocaleString());
  const orgPct = (v: number) => (scopedEmpty ? '—' : formatPercentage(v));

  // TACOS = ad spend ÷ TOTAL sales. Withheld when there are no sales to divide
  // by; "0.0%" would read as "advertising is free", not "unknown". Also withheld
  // when the sales side is materially incomplete — dividing a whole month of ad
  // spend into two days of revenue is what produced Lockabox's 109.3%.
  const blendedRatiosOk = adsAvailable && !salesIncomplete;
  const tacos = blendedRatiosOk ? ratio(ppcSpend, totalMetrics.sales, 100) : null;
  const prevTacos = blendedRatiosOk ? ratio(prevPpcSpend, totalPreviousMetrics.sales, 100) : null;

  // Advertising reliance — PPC sales as a share of total sales. Same exposure
  // to a half-reported sales series, same treatment.
  const advertisingReliance = blendedRatiosOk ? ratio(ppcSales, totalMetrics.sales, 100) : null;
  const prevAdvertisingReliance = blendedRatiosOk
    ? ratio(prevPpcSales, totalPreviousMetrics.sales, 100)
    : null;

  // Organic metrics - prefer direct computation
  const fallbackBuyBoxPercentage = directOrganicMetrics ? directOrganicMetrics.buyBoxPercentage
    : displayedAccounts.length > 0 
      ? displayedAccounts.reduce((acc, account) => acc + account.buyBoxPercentage, 0) / displayedAccounts.length 
      : 0;
  const fallbackConversionRate = directOrganicMetrics ? directOrganicMetrics.conversionRate
    : displayedAccounts.length > 0
      ? displayedAccounts.reduce((acc, account) => acc + account.conversionRate, 0) / displayedAccounts.length
      : 0;
  const fallbackPreviousBuyBoxPercentage = directOrganicPreviousMetrics ? directOrganicPreviousMetrics.buyBoxPercentage
    : displayedAccounts.length > 0
      ? displayedAccounts.reduce((acc, account) => acc + (account.previousPeriod?.buyBoxPercentage || 0), 0) / displayedAccounts.length
      : 0;
  const fallbackPreviousConversionRate = directOrganicPreviousMetrics ? directOrganicPreviousMetrics.conversionRate
    : displayedAccounts.length > 0
      ? displayedAccounts.reduce((acc, account) => acc + (account.previousPeriod?.conversionRate || 0), 0) / displayedAccounts.length
      : 0;

  const avgBuyBoxPercentage = scoped?.buyBoxPercentage ?? (scoped ? 0 : fallbackBuyBoxPercentage);
  const avgPreviousBuyBoxPercentage = scopedPrev?.buyBoxPercentage ?? (scopedPrev ? 0 : fallbackPreviousBuyBoxPercentage);

  // Conversion is Σunits ÷ Σsessions for the whole period (never a mean of daily
  // rates, and never units ÷ page views — a session can hold several page views).
  //
  // The denominator is now TOTAL sessions, the same one Amazon uses for the
  // unit-session percentage plotted in the daily cells. It used to be
  // browser_sessions, which excludes the mobile app: on the same July screen
  // Cottam read 74.0% over cells of 21.7–41.3%, THEYE 75.6% over 20.4–35.2%,
  // and Dragonfly's 231.5% was so far past possible that the implausibility
  // guard was the only thing standing between it and the client.
  const conversionAvailable = !!scoped
    ? scoped.conversionRate != null && !scoped.conversionImplausible
    : true;
  const conversionUnavailableReason = !scoped
    ? null
    : scoped.conversionRate == null
      ? (scoped.hasSessions ? 'No sessions recorded in this period.' : 'Session data is not reported for this account.')
      : scoped.conversionImplausible
        ? `Units (${Math.round(scoped.conversionUnits ?? scoped.unitsOrdered).toLocaleString()}) exceed sessions (${Math.round(scoped.sessions || 0).toLocaleString()}), so this cannot be a conversion rate.`
        : null;
  // See CountryScopedPerformance: when the numerator is smaller than the units
  // card — a vendor arm in scope, or a day whose traffic feed has not landed —
  // the card names both figures instead of printing one that contradicts the
  // other.
  const conversionNumerator = Math.round(scoped?.conversionUnits ?? scoped?.unitsOrdered ?? 0);
  const conversionPartial = !!scoped && !scoped.conversionCoversAllUnits;
  const conversionNumeratorLabel = conversionPartial
    ? `${conversionNumerator.toLocaleString()} of ${Math.round(scoped!.unitsOrdered).toLocaleString()} units`
    : `${conversionNumerator.toLocaleString()} units`;
  const avgConversionRate = scoped ? (scoped.conversionRate ?? 0) : fallbackConversionRate;
  const avgPreviousConversionRate = scopedPrev
    ? (scopedPrev.conversionImplausible ? 0 : (scopedPrev.conversionRate ?? 0))
    : fallbackPreviousConversionRate;
  const conversionDenominatorLabel = 'sessions (all devices)';


  const showExtendedMetrics = focusedAccount !== null;

  // Organic sparklines come from the scoped daily series, so the KPI totals and
  // the line under them are literally the same numbers — which is what the
  // seriesSemantics="sum" assertion on each card checks.
  const scopedSeries = scopedMetrics?.series ?? null;

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

  // A scope we could not resolve must be shown, not papered over with the home
  // market's numbers.
  const scopeErrorBanner = scopeError ? (
    <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-medium">Country-scoped figures unavailable</div>
        <div className="text-xs">{scopeError}</div>
      </div>
    </div>
  ) : null;

  // Say plainly what is missing, in the same place the numbers are read.
  const completenessBanner =
    completeness && completeness.headline ? (
      <div
        role="status"
        className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
          completeness.materiallyIncomplete
            ? 'border-amber-400 bg-amber-50 text-amber-900'
            : 'border-slate-300 bg-slate-50 text-slate-700'
        }`}
      >
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">
            {completeness.level === 'empty'
              ? 'No sales data for this period'
              : completeness.materiallyIncomplete
                ? 'Incomplete period — these are not full-period figures'
                : 'Some days are missing from this period'}
          </div>
          <div className="text-xs mt-0.5">{completeness.headline}</div>
          {describeMissingDates(completeness) && (
            <div className="text-xs mt-0.5">{describeMissingDates(completeness)}</div>
          )}
          {completeness.materiallyIncomplete && (
            <div className="text-xs mt-1">
              The period-on-period comparison and any ratio of advertising to sales are withheld:
              advertising is reported in full, so dividing it by part of a month of sales gives a
              number that means nothing.
            </div>
          )}
        </div>
      </div>
    ) : null;

  if (showExtendedMetrics) {
    // VENDOR-SPECIFIC KPI LAYOUT
    if (isVendor) {
      // vendorMetrics sums apiPpcDailyData, whose window the caller controls and
      // which has in the past been a ~30-day fetch buffer rather than the
      // selected period. Prefer the scoped series, which is exact by construction.
      const vendorSales = scoped ? scoped.sales : (apiPpcMetrics?.sales ?? totalMetrics.sales);
      const vendorUnits = scoped ? scoped.unitsOrdered : (vendorMetrics?.unitsOrdered ?? totalMetrics.unitsOrdered);
      const vendorSalesSpark = scopedSeries?.sales ?? sparklines.sales;
      const vendorUnitsSpark = scopedSeries?.units ?? sparklines.unitsOrdered;

      return (
        <div className="space-y-4">
          {scopeErrorBanner}
          {completenessBanner}
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
                value={orgMoney(vendorSales)}
                color="text-blue-600"
                currentValue={vendorSales}
                previousValue={scopedPrev ? scopedPrev.sales : (prevVendorSales || totalPreviousMetrics.sales)}
                comparisonLabel={comparisonLabel}
                onClick={chartToggleFor('sales')}
                isSelected={chartSelected('sales')}
                sparklineData={vendorSalesSpark}
                seriesSemantics={scopedSeries ? 'sum' : undefined}
                comparisonSuppressedReason={incompleteNote}
                qualifier={partialQualifier}
              />

              <MetricsCard
                title="Units Ordered"
                value={orgCount(vendorUnits)}
                color="text-indigo-600"
                currentValue={vendorUnits}
                previousValue={scopedPrev ? scopedPrev.unitsOrdered : (prevVendorOrders || totalPreviousMetrics.unitsOrdered)}
                comparisonLabel={comparisonLabel}
                onClick={chartToggleFor('unitsSold')}
                isSelected={chartSelected('unitsSold')}
                sparklineData={vendorUnitsSpark}
                seriesSemantics={scopedSeries ? 'sum' : undefined}
                comparisonSuppressedReason={incompleteNote}
                qualifier={partialQualifier}
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
                  onClick={chartToggleFor('ppcSpend')}
                  isSelected={chartSelected('ppcSpend')}
                  sparklineData={sparklines.spend}
                />
                <MetricsCard
                  title="PPC Sales"
                  value={formatCurrencyForMetrics(ppcSales)}
                  color="text-indigo-600"
                  currentValue={ppcSales}
                  previousValue={prevPpcSales}
                  comparisonLabel={comparisonLabel}
                  onClick={chartToggleFor('ppcSales')}
                  isSelected={chartSelected('ppcSales')}
                  sparklineData={sparklines.sales}
                />
                <MetricsCard
                  title="ACOS"
                  invertSentiment
                  value={ratePct(ppcAcos)}
                  color="text-purple-600"
                  currentValue={rateDelta(ppcAcos)}
                  previousValue={rateDelta(prevPpcAcos)}
                  previousDisplayValue={ratePct(prevPpcAcos)}
                  comparisonLabel={comparisonLabel}
                  isPercentage={true}
                  onClick={chartToggleFor('acos')}
                  isSelected={chartSelected('acos')}
                  sparklineData={sparklines.acos}
                />
                <MetricsCard
                  title="CPC"
                  invertSentiment
                  value={rateMoney(ppcCpc)}
                  color="text-amber-600"
                  currentValue={rateDelta(ppcCpc)}
                  previousValue={rateDelta(prevPpcCpc)}
                  previousDisplayValue={rateMoney(prevPpcCpc)}
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
        {scopeErrorBanner}
        {completenessBanner}
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
              value={orgMoney(totalMetrics.sales)}
              color="text-blue-600"
              currentValue={totalMetrics.sales}
              previousValue={totalPreviousMetrics.sales}
              comparisonLabel={comparisonLabel}
              onClick={chartToggleFor('sales')}
              isSelected={chartSelected('sales')}
              sparklineData={scopedSeries?.sales ?? sparklines.sales}
              seriesSemantics={scopedSeries ? 'sum' : undefined}
              comparisonSuppressedReason={incompleteNote}
              qualifier={partialQualifier}
            />

            <MetricsCard
              title="PPC Spend"
              info="Total advertising spend in the period. Cost metric — a rising delta is bad and turns red."
              invertSentiment
              value={adsMoney(ppcSpend)}
              color="text-orange-600"
              currentValue={ppcSpend}
              previousValue={prevPpcSpend}
              comparisonLabel={comparisonLabel}
              onClick={chartToggleFor('ppcSpend')}
              isSelected={chartSelected('ppcSpend')}
              sparklineData={sparklines.spend}
            />
            
            <MetricsCard
              title="PPC Sales"
              info="Sales attributed to advertising (typically 7-day attribution). Higher is better."
              value={adsMoney(ppcSales)}
              color="text-indigo-600"
              currentValue={ppcSales}
              previousValue={prevPpcSales}
              comparisonLabel={comparisonLabel}
              onClick={chartToggleFor('ppcSales')}
              isSelected={chartSelected('ppcSales')}
              sparklineData={sparklines.sales}
            />

            <MetricsCard
              title="Overall Units"
              info="Units ordered across all orders in the period (organic + PPC)."
              value={orgCount(totalMetrics.unitsOrdered)}
              color="text-indigo-600"
              currentValue={totalMetrics.unitsOrdered}
              previousValue={totalPreviousMetrics.unitsOrdered}
              comparisonLabel={comparisonLabel}
              onClick={chartToggleFor('unitsSold')}
              isSelected={chartSelected('unitsSold')}
              sparklineData={scopedSeries?.units ?? sparklines.orders}
              seriesSemantics={scopedSeries ? 'sum' : undefined}
              comparisonSuppressedReason={incompleteNote}
              qualifier={partialQualifier}
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
              value={ratePct(ppcAcos)}
              color="text-purple-600"
              currentValue={rateDelta(ppcAcos)}
              previousValue={rateDelta(prevPpcAcos)}
              previousDisplayValue={ratePct(prevPpcAcos)}
              comparisonLabel={comparisonLabel}
              isPercentage={true}
              onClick={chartToggleFor('acos')}
              isSelected={chartSelected('acos')}
              sparklineData={sparklines.acos}
            />
            
            <MetricsCard
              title="TACOS"
              info="Ad spend ÷ TOTAL sales (organic + PPC). Cost metric — lower is better."
              invertSentiment
              value={ratePct(tacos)}
              color="text-cyan-600"
              currentValue={rateDelta(tacos)}
              previousValue={rateDelta(prevTacos)}
              previousDisplayValue={ratePct(prevTacos)}
              comparisonLabel={comparisonLabel}
              isPercentage={true}
              onClick={chartToggleFor('tacos')}
              isSelected={chartSelected('tacos')}
              comparisonSuppressedReason={incompleteNote}
            />

            <MetricsCard
              title="Advertising %"
              info="PPC sales as a share of total sales. Cost-sentiment metric — a heavy reliance on ads turns red."
              invertSentiment
              value={ratePct(advertisingReliance)}
              color="text-amber-600"
              currentValue={rateDelta(advertisingReliance)}
              previousValue={rateDelta(prevAdvertisingReliance)}
              previousDisplayValue={ratePct(prevAdvertisingReliance)}
              comparisonLabel={comparisonLabel}
              isPercentage={true}
              onClick={chartToggleFor('advertisingReliance')}
              isSelected={chartSelected('advertisingReliance')}
              comparisonSuppressedReason={incompleteNote}
            />


            <MetricsCard
              title="PPC Impressions"
              value={adsCount(ppcImpressions)}
              color="text-blue-600"
              currentValue={ppcImpressions}
              previousValue={prevPpcImpressions}
              comparisonLabel={comparisonLabel}
              onClick={chartToggleFor('impressions')}
              isSelected={chartSelected('impressions')}
              sparklineData={sparklines.impressions}
            />
          </div>

          {/* Second Row - 4 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <MetricsCard
              title="PPC Clicks"
              value={adsCount(ppcClicks)}
              color="text-violet-600"
              currentValue={ppcClicks}
              previousValue={prevPpcClicks}
              comparisonLabel={comparisonLabel}
              onClick={chartToggleFor('clicks')}
              isSelected={chartSelected('clicks')}
              sparklineData={sparklines.clicks}
            />

            <MetricsCard
              title="CPC"
              invertSentiment
              value={rateMoney(ppcCpc)}
              color="text-orange-600"
              currentValue={rateDelta(ppcCpc)}
              previousValue={rateDelta(prevPpcCpc)}
              previousDisplayValue={rateMoney(prevPpcCpc)}
              comparisonLabel={comparisonLabel}
              onClick={chartToggleFor('cpc')}
              isSelected={chartSelected('cpc')}
              sparklineData={sparklines.cpc}
            />

            <MetricsCard
              title="CTR"
              value={ratePct(ppcCtr)}
              color="text-blue-600"
              currentValue={rateDelta(ppcCtr)}
              previousValue={rateDelta(prevPpcCtr)}
              previousDisplayValue={ratePct(prevPpcCtr)}
              comparisonLabel={comparisonLabel}
              isPercentage={true}
              onClick={chartToggleFor('ctr')}
              isSelected={chartSelected('ctr')}
              sparklineData={sparklines.ctr}
            />

            <MetricsCard
              title="CPA"
              invertSentiment
              value={rateMoney(ppcCpa)}
              color="text-orange-600"
              currentValue={rateDelta(ppcCpa)}
              previousValue={rateDelta(prevPpcCpa)}
              previousDisplayValue={rateMoney(prevPpcCpa)}
              comparisonLabel={comparisonLabel}
              onClick={chartToggleFor('cpa')}
              isSelected={chartSelected('cpa')}
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
                value={orgCount(totalMetrics.pageViews)}
                color="text-pink-600"
                currentValue={totalMetrics.pageViews}
                previousValue={totalPreviousMetrics.pageViews}
              comparisonLabel={comparisonLabel}
                onClick={chartToggleFor('pageViews')}
                isSelected={chartSelected('pageViews')}
                sparklineData={scopedSeries?.pageViews}
                seriesSemantics={scopedSeries ? 'sum' : undefined}
                subtitle={
                  !scoped?.hasSessions
                    ? undefined
                    : scoped.mixedArms
                      ? 'Browser page views + vendor glance views'
                      : 'Browser page views'
                }
                info="Seller page views are Amazon's BROWSER page views — the mobile app is not in them. Vendor marketplaces report glance views instead. Neither is a session count, so the sessions used for conversion can be the larger number."
                comparisonSuppressedReason={incompleteNote}
                qualifier={partialQualifier}
              />

              <MetricsCard
                title="Buy Box %"
                // Not a plain average of the daily figures. useScopedMetrics
                // weights each reported day by its page views (falling back to
                // an unweighted mean only when the scope reports no page views
                // at all), so a quiet day cannot pull the period figure about as
                // hard as a busy one. Said out loud because the number does not
                // reproduce from the daily cells without it.
                info={
                  scoped
                    ? 'Weighted by page views across the days in this period, not a plain average of the daily figures — a day with few page views moves it less than a busy one. Days the feed did not report are left out entirely. Where the scope reports no page views at all, an unweighted mean is used instead.'
                    : 'An unweighted average across the accounts shown.'
                }
                value={orgPct(avgBuyBoxPercentage)}
                color="text-yellow-600"
                currentValue={avgBuyBoxPercentage}
                previousValue={avgPreviousBuyBoxPercentage}
                previousDisplayValue={orgPct(avgPreviousBuyBoxPercentage)}
              comparisonLabel={comparisonLabel}
                isPercentage={true}
                onClick={chartToggleFor('buyBoxPercentage')}
                isSelected={chartSelected('buyBoxPercentage')}
                comparisonSuppressedReason={incompleteNote}
              />

              <MetricsCard
                // See CountryScopedPerformance: on a scope that also holds a
                // vendor arm this rate covers the seller arm alone.
                title={scoped?.mixedArms ? 'Conversion Rate (seller arm)' : 'Conversion Rate'}
                info={
                  `Units ordered ÷ ${conversionDenominatorLabel} for the whole period. `
                  + 'Only units with a session denominator are counted, so where a scope also holds a vendor arm, or a day\'s traffic feed has not arrived, this counts fewer units than the Units card. '
                  + 'Page views are not sessions — one session can span several page views, and the page-view figure is browser only — so the two give different rates.'
                }
                subtitle={
                  conversionAvailable
                    ? (scoped?.sessions != null
                        ? `${conversionNumeratorLabel} ÷ ${Math.round(scoped.sessions).toLocaleString()} ${conversionDenominatorLabel}`
                        : undefined)
                    : conversionUnavailableReason
                }
                value={conversionAvailable && !scopedEmpty ? formatPercentage(avgConversionRate) : '—'}
                // Neutral hue: the headline must not carry good/bad — that is the
                // delta badge's job (fix/deltas), and red read as "bad conversion".
                color={conversionAvailable ? 'text-fuchsia-600' : 'text-muted-foreground'}
                currentValue={conversionAvailable ? avgConversionRate : 0}
                previousValue={conversionAvailable ? avgPreviousConversionRate : 0}
              comparisonLabel={comparisonLabel}
                isPercentage={true}
                onClick={chartToggleFor('conversionRate')}
                isSelected={chartSelected('conversionRate')}
                comparisonSuppressedReason={incompleteNote}
              />
            </div>
          </div>
        )}

      </div>
    );
  }

  // Default view - condensed metrics (no API PPC here, unfocused view).
  //
  // These were means of per-account rates, which is not the portfolio's ACOS:
  // it gives a £50 account and a £50,000 account the same vote. Rebuilt from
  // the GBP-normalised sums, so the figure is the one the money actually
  // produced. Labels drop "Avg" accordingly.
  const portfolioAcos = ratio(accountSums.ppcSpend, accountSums.ppcSales, 100);
  const portfolioTacos = ratio(accountSums.ppcSpend, accountSums.sales, 100);
  const prevPortfolioAcos = ratio(prevAccountSums.ppcSpend, prevAccountSums.ppcSales, 100);
  const prevPortfolioTacos = ratio(prevAccountSums.ppcSpend, prevAccountSums.sales, 100);

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
          color="text-indigo-600"
          currentValue={totalMetrics.ppcSales}
          previousValue={totalPreviousMetrics.ppcSales}
              comparisonLabel={comparisonLabel}
        />
        
        <MetricsCard
          title="ACOS"
          info="Total ad spend ÷ total PPC sales across every account shown. Not an average of per-account ACOS — that would weight a tiny account like a large one."
          invertSentiment
          value={ratePct(portfolioAcos)}
          color="text-purple-600"
          currentValue={rateDelta(portfolioAcos)}
          previousValue={rateDelta(prevPortfolioAcos)}
              comparisonLabel={comparisonLabel}
          isPercentage={true}
        />

        <MetricsCard
          title="TACOS"
          info="Total ad spend ÷ total sales across every account shown. Not an average of per-account TACOS."
          invertSentiment
          value={ratePct(portfolioTacos)}
          color="text-cyan-600"
          currentValue={rateDelta(portfolioTacos)}
          previousValue={rateDelta(prevPortfolioTacos)}
              comparisonLabel={comparisonLabel}
          isPercentage={true}
        />
      </div>
    </div>
  );
};
