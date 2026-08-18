import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer,
  Tooltip as ChartTooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useScopedMetrics } from '@/hooks/useScopedMetrics';
import { useChartMetrics } from '@/hooks/useChartMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { CountryScope } from './CountrySwitcher';
import { isRollupScope, scopeArea, scopeArm, scopeCountryCode } from '@/utils/scope';
import { MetricsCard } from './MetricsCard';
import { getCurrencyInfo, getCurrencyInfoByCode } from '@/utils/currencyUtils';
import { getCountryName } from '@/utils/countryUtils';
import { getAmazonProductUrl } from '@/utils/amazonUtils';
import { getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
import { buildComparisonLabel } from '@/utils/comparisonLabels';
import { describeMissingDates } from '@/utils/kpiIntegrity';
import { AlertTriangle } from 'lucide-react';
import type { DateFilter } from '@/types/dashboard';
import { HeatmapLegend } from './HeatmapLegend';
import { getHeatmapCellStyle, heatmapIntensity, isInverseHeatmapMetric } from '@/utils/heatmapScale';

interface Props {
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
  accountMerchantToken?: string;
}

interface AsinRow {
  child_asin: string;
  units_sold: number;
  sales_native: number;
  sales_gbp: number;
  page_views?: number;
  buy_box_percentage?: number;
  conversion_rate?: number;
  currency?: string | null;
  latest_date?: string | null;
  product_title?: string | null;
}

const scopeLabel = (scope: CountryScope) => {
  const area = scopeArea(scope);
  const arm = scopeArm(scope);
  const base =
    area === 'ALL' ? 'All countries'
    : area === 'ALL_EU' ? 'All EU'
    : (getCountryName(area) || area);
  return arm ? `${base} · ${arm}` : base;
};

export function CountryScopedPerformance({
  spid,
  scope,
  dateFilter,
  customDateRange,
  accountMerchantToken,
}: Props) {
  const [asinRows, setAsinRows] = useState<AsinRow[] | null>(null);
  const [asinLoading, setAsinLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Single scoped source, shared with the KPI grid so the two cannot disagree.
  const scopedMetrics = useScopedMetrics(spid, scope, dateFilter, customDateRange);
  const { totals, previousTotals, series, days, dayHasData, completeness, loading, error: scopeError } = scopedMetrics;

  // See MetricsGrid: a period the feed only half covers is not a period. The
  // total is qualified, the comparison and any ads-over-sales ratio withheld.
  const salesIncomplete = completeness.materiallyIncomplete;
  const incompleteNote = salesIncomplete
    ? `Withheld — only ${completeness.presentDays} of ${completeness.expectedDays} days of sales data`
    : undefined;
  const scopedEmpty = completeness.level === 'empty';
  const partialQualifier = salesIncomplete && !scopedEmpty
    ? `Partial period — ${completeness.presentDays} of ${completeness.expectedDays} days`
    : undefined;

  // The symbol follows the currency the feed reported, not a country code
  // guessed off the scope token. `totals.sales` is native only while the scope
  // resolves to ONE currency; the moment it spans two the hook hands back GBP
  // and says so by returning a null currency (see ScopedTotals). Mapping the
  // scope's country instead is the bug class that printed Portwest's Belgian
  // euros under a £ sign — an unmapped market did not look broken, it looked
  // like pounds. The scope map is used only while totals are still loading.
  const cur = totals
    ? getCurrencyInfoByCode(totals.currency ?? 'GBP')
    : getCurrencyInfo(scope);
  const isRollup = isRollupScope(scope);

  const fmtMoney = (v: number) =>
    `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v ?? 0)}`;
  const fmtNum = (v: number) => new Intl.NumberFormat(cur.locale).format(Math.round(v ?? 0));

  const currentRange = useMemo(() => getCurrentDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const pStart = useMemo(() => format(currentRange.from, 'yyyy-MM-dd'), [currentRange.from]);
  const pEnd = useMemo(() => format(currentRange.to, 'yyyy-MM-dd'), [currentRange.to]);
  // The previous period is fetched inside useScopedMetrics, but the label needs
  // it too. Derived from the same filter + custom range the hook is given, so
  // the named baseline is by construction the one the figures came from.
  const previousRange = useMemo(
    () => getPreviousDateRange(dateFilter, customDateRange),
    [dateFilter, customDateRange]
  );

  // Name the baseline on the card face. Built from the exact ranges this
  // component queries, so the label can never drift from the figures.
  const comparison = useMemo(
    () => buildComparisonLabel(currentRange, previousRange, {
      rolling: dateFilter === 'last-7-days' || dateFilter === 'last-14-days' || dateFilter === 'past-30-days',
    }),
    [currentRange, previousRange, dateFilter]
  );

  useEffect(() => {
    let cancelled = false;
    setAsinLoading(true);
    (async () => {
      try {
        const res = await (supabase.rpc as any)('rpc_asin_performance_country', {
          p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd,
        });
        if (cancelled) return;
        if (res?.error) { setAsinRows([]); }
        else setAsinRows((res?.data as AsinRow[]) || []);
      } catch (e) {
        console.error('CountryScopedPerformance asin error', e);
        if (!cancelled) setAsinRows([]);
      } finally {
        if (!cancelled) setAsinLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spid, scope, pStart, pEnd]);

  const salesSpark = series.sales;
  const unitsSpark = series.units;
  const pageViewsSpark = series.pageViews;
  const sessionsSpark = series.sessions;
  const buyBoxSpark = series.buyBox;
  // Per-day conversion from the same two series the total is built from.
  //
  // The numerator is conversionUnits — the units that HAVE a session
  // denominator — not the day's total units. On a scope holding both a vendor
  // arm and a seller arm those differ: 27 July divided 815 combined units by
  // the seller's 12,368 sessions and printed 6.6%, where the seller scope
  // showed 4.3% for the same day off the same sessions.
  const conversionUnitsSpark = series.conversionUnits;
  const conversionSpark = conversionUnitsSpark.map((u, i) => {
    const s = sessionsSpark[i] || 0;
    if (s <= 0) return 0;
    const pct = (u / s) * 100;
    return pct > 100 ? 0 : pct; // impossible values are not plotted
  });
  // Conversion has two ways of holding no figure that are NOT a 0% conversion:
  // no session denominator at all, and a denominator that produced an impossible
  // rate. Both must hatch. A day that really did convert nobody is a reported 0%
  // and stays on the ramp.
  const conversionHasValue = conversionUnitsSpark.map((u, i) => {
    if (!dayHasData[i]) return false;
    const s = sessionsSpark[i] || 0;
    if (s <= 0) return false;
    return (u / s) * 100 <= 100;
  });

  const totalSales = totals?.sales ?? 0;
  const totalUnits = totals?.unitsOrdered ?? 0;
  const prevSales = previousTotals?.sales ?? 0;
  const prevUnits = previousTotals?.unitsOrdered ?? 0;

  const maxSales = Math.max(1, ...salesSpark);
  const maxUnits = Math.max(1, ...unitsSpark);
  const maxPageViews = Math.max(1, ...pageViewsSpark);
  const maxBuyBox = Math.max(1, ...buyBoxSpark);
  const maxConversion = Math.max(1, ...conversionSpark);

  const totalPageViews = totals?.pageViews ?? 0;
  const avgBuyBox = totals?.buyBoxPercentage ?? 0;
  const conversionAvailable = !!totals && totals.conversionRate != null && !totals.conversionImplausible;
  const avgConversion = conversionAvailable ? (totals!.conversionRate as number) : 0;

  // Where the conversion numerator is smaller than the units card, the card has
  // to say which units it counted — otherwise the two figures sit side by side
  // contradicting each other. It happens on any scope that mixes a seller arm
  // with a vendor arm (vendors report no sessions), and on any day whose
  // traffic feed has not landed yet.
  const conversionUnits = Math.round(totals?.conversionUnits ?? totalUnits);
  const conversionPartial = !!totals && !totals.conversionCoversAllUnits;
  const conversionNumeratorLabel = conversionPartial
    ? `${fmtNum(conversionUnits)} of ${fmtNum(totalUnits)} units`
    : `${fmtNum(conversionUnits)} units`;
  // Seller page views are browser only; vendor page views are glance views.
  // Summing them under one word, next to an all-devices session count, is what
  // made sessions look larger than the page views they supposedly sit inside.
  const pageViewsBasis = !totals?.hasSessions
    ? undefined
    : totals.mixedArms
      ? 'Browser page views + vendor glance views'
      : 'Browser page views';

  const prevPageViews = previousTotals?.pageViews ?? 0;
  const prevAvgBuyBox = previousTotals?.buyBoxPercentage ?? 0;
  const prevAvgConversion = previousTotals && !previousTotals.conversionImplausible
    ? (previousTotals.conversionRate ?? 0)
    : 0;

  const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`;

  /**
   * Rows of the Daily Performance grid.
   *
   * `metric` is the scale's identifier for the row, not the on-screen label — the
   * label changes with the account arm ("Conversion % (seller arm)"), and the
   * inversion hook must not depend on wording. Nothing here is an inverse metric
   * today — this grid is built from rpc_metrics_daily_country, which carries no
   * ads columns, so ACOS/TACOS are not among these rows. (They ARE available per
   * country: amazon_api_campaigns_performance carries country_code and
   * rpc_ppc_summary groups on it, which is what the Advertising panel shows.)
   * The hook is wired so that a cost row added later inverts on its own instead
   * of quietly rendering upside down.
   *
   * `has` is per-day, aligned with `days`: false means nothing was reported, and
   * the cell hatches. It is NOT `value > 0` — a day that genuinely sold nothing
   * is a fact, and must not be dressed as a gap.
   */
  const heatmapRows: {
    label: string;
    metric: string;
    spark: number[];
    max: number;
    fmt: (v: number) => string;
    has: boolean[];
  }[] = [
    { label: 'Sales', metric: 'sales', spark: salesSpark, max: maxSales, fmt: fmtMoney, has: dayHasData },
    { label: 'Units', metric: 'units', spark: unitsSpark, max: maxUnits, fmt: fmtNum, has: dayHasData },
    {
      label: !totals?.hasSessions
        ? 'Glance views'
        : totals.mixedArms
          ? 'Page views (browser) + glance views'
          : 'Page views (browser)',
      metric: 'pageViews', spark: pageViewsSpark, max: maxPageViews, fmt: fmtNum, has: dayHasData,
    },
    ...(totals?.hasSessions
      ? [{
          label: 'Sessions (all devices)', metric: 'sessions',
          spark: sessionsSpark, max: Math.max(1, ...sessionsSpark), fmt: fmtNum, has: dayHasData,
        }]
      : []),
    { label: 'Buy Box %', metric: 'buyBox', spark: buyBoxSpark, max: maxBuyBox, fmt: fmtPct, has: dayHasData },
    // Blank for vendors and for any day where units exceed sessions.
    ...(totals?.hasSessions
      ? [{
          label: totals.mixedArms ? 'Conversion % (seller arm)' : 'Conversion %',
          metric: 'conversion',
          spark: conversionSpark, max: maxConversion, fmt: fmtPct, has: conversionHasValue,
        }]
      : []),
  ];

  const anyInverseRow = heatmapRows.some(r => isInverseHeatmapMetric(r.metric));

  /* ------------------------------------------------------------------ *
   * Performance trends — the country-scoped twin of MonthlyPerformanceView.
   *
   * The trend chart on the home-scope branch reads account.merchantToken, so it
   * plots the linked Amazon account whatever the switcher says. That is why it
   * is gated behind isHomeScope, and it stays gated. This chart is built from
   * `series` and `days` — the very arrays the heatmap above and the KPI
   * sparklines below are drawn from, all of them out of one
   * useScopedMetrics(spid, scope, …) call — so it cannot plot a country other
   * than the selected one.
   *
   * Ads are not split by marketplace, so there is no impressions / spend / ACOS
   * series to offer here. The five plottable series are exactly the five KPI
   * cards, and the cards toggle them.
   * ------------------------------------------------------------------ */
  const { selectedChartMetrics, toggleChartMetric } = useChartMetrics(['sales', 'units']);

  const chartMetrics: {
    key: string;
    label: string;
    color: string;
    axis: 'left' | 'right';
    spark: number[];
    has: boolean[];
    fmt: (v: number) => string;
  }[] = [
    // Colours are MonthlyPerformanceView's, so a client switching between the
    // home scope and a country keeps reading the same hue as the same series.
    { key: 'sales', label: 'Sales', color: '#3B82F6', axis: 'left', spark: salesSpark, has: dayHasData, fmt: fmtMoney },
    { key: 'units', label: 'Units', color: '#8B5CF6', axis: 'left', spark: unitsSpark, has: dayHasData, fmt: fmtNum },
    {
      key: 'pageViews',
      label: !totals?.hasSessions ? 'Glance views' : 'Page views',
      color: '#EC4899', axis: 'left', spark: pageViewsSpark, has: dayHasData, fmt: fmtNum,
    },
    { key: 'buyBox', label: 'Buy Box %', color: '#EAB308', axis: 'right', spark: buyBoxSpark, has: dayHasData, fmt: fmtPct },
    ...(conversionAvailable
      ? [{
          key: 'conversion',
          label: totals?.mixedArms ? 'Conversion % (seller arm)' : 'Conversion %',
          color: '#EF4444', axis: 'right' as const, spark: conversionSpark, has: conversionHasValue, fmt: fmtPct,
        }]
      : []),
  ];

  /** Cards are controls only when there is something to plot. */
  const chartInteractive = !scopedEmpty && days.length > 0;
  const chartToggleFor = (key: string) => (chartInteractive ? () => toggleChartMetric(key) : undefined);
  const chartSelected = (key: string) => chartInteractive && selectedChartMetrics.includes(key);

  const plottedMetrics = chartMetrics.filter(m => selectedChartMetrics.includes(m.key));
  const usesRightAxis = plottedMetrics.some(m => m.axis === 'right');
  const usesLeftAxis = plottedMetrics.some(m => m.axis === 'left');

  // A day the feed never reported is null, not zero — recharts leaves a gap
  // rather than drawing a fall to the floor the client never had.
  const chartData = days.map((d, i) => {
    const row: Record<string, string | number | null> = { label: format(d, 'd MMM') };
    chartMetrics.forEach(m => { row[m.key] = m.has[i] ? (m.spark[i] ?? 0) : null; });
    return row;
  });

  const sortedAsins = useMemo(() => {
    const rows = asinRows || [];
    return [...rows].sort((a, b) => {
      const av = isRollup ? Number(a.sales_gbp || 0) : Number(a.sales_native || 0);
      const bv = isRollup ? Number(b.sales_gbp || 0) : Number(b.sales_native || 0);
      return bv - av;
    });
  }, [asinRows, isRollup]);

  const displayedAsins = showAll ? sortedAsins : sortedAsins.slice(0, 10);

  if (scopeError) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-4 text-sm text-red-800">
          <div className="font-medium">Could not load {scopeLabel(scope)} figures</div>
          <div className="text-xs mt-1">{scopeError}</div>
          <div className="text-xs mt-1">
            Nothing is shown rather than the home marketplace's numbers under this country's name.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {completeness.headline && (
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
                ? `No sales data for ${scopeLabel(scope)} in this period`
                : completeness.materiallyIncomplete
                  ? 'Incomplete period — these are not full-period figures'
                  : 'Some days are missing from this period'}
            </div>
            <div className="text-xs mt-0.5">{completeness.headline}</div>
            {describeMissingDates(completeness) && (
              <div className="text-xs mt-0.5">{describeMissingDates(completeness)}</div>
            )}
            {/* A marketplace can be listed on the account and still be trading
                nothing — Portwest's United States · Seller is selectable and
                returns no rows. Saying so beats an empty page the client reads
                as a broken dashboard. */}
            {completeness.level === 'empty' && (
              <div className="text-xs mt-0.5">
                This marketplace is listed on the account but reported no sales in this window. Try a wider date
                range, or pick another scope above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Performance heatmap (Sales + Units only) */}
      <section>
        <div className="mb-3 md:mb-4">
          <h2 className="text-base md:text-xl font-semibold text-foreground">Daily Performance</h2>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            Daily sales, units, page views, buy box % and conversion for {scopeLabel(scope)}. Advertising is not part of these figures — PPC, ACOS and TACOS are reported, split by country, in the Advertising panel.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-base">
              {format(currentRange.from, 'MMM d')} – {format(currentRange.to, 'MMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : days.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data in range.</p>
            ) : (
              <>
              {/* Same key as every other heatmap in the app — it has to be above
                  the grid, you need it to read a cell. */}
              <HeatmapLegend showInverseNote={anyInverseRow} />
              {/* A named, focusable scroller: the grid is wider than a phone and
                  a keyboard user has to be able to reach the right-hand days. The
                  first column stays pinned so a scrolled cell keeps its row. */}
              <div
                role="region"
                aria-label={`Daily performance heatmap for ${scopeLabel(scope)}, scrollable sideways`}
                tabIndex={0}
                className="overflow-x-auto rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <table className="min-w-full text-xs border-separate border-spacing-0">
                  <caption className="sr-only">
                    Daily performance for {scopeLabel(scope)}, {format(currentRange.from, 'd MMM')} to{' '}
                    {format(currentRange.to, 'd MMM yyyy')}. Rows are metrics, columns are days.
                    Hatched cells marked “—” were not reported.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-background z-10">Metric</th>
                      {days.map(d => (
                        <th key={d.toISOString()} scope="col" className="p-1 text-center font-medium text-muted-foreground min-w-[52px]">
                          <div>{format(d, 'EEE')}</div>
                          <div className="text-[10px]">{format(d, 'MMM d')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapRows.map(row => {
                      const inverse = isInverseHeatmapMetric(row.metric);
                      return (
                        <tr key={row.label}>
                          {/* scope="row" so a screen reader announces the metric with
                              every cell — without it this is 126 unlabelled numbers. */}
                          <th scope="row" className="text-left p-2 font-medium sticky left-0 bg-background z-10">
                            {row.label}
                            {/* Stated on the row, not only in the key above: clients
                                screenshot the grid on its own. */}
                            {inverse ? (
                              <span className="ml-1 font-normal text-[10px] text-muted-foreground">▼ lower is better</span>
                            ) : null}
                          </th>
                          {/* Iterate the DAYS, not the series. When the feed returned
                              nothing at all the series are empty, and mapping them
                              rendered a header row of dates above a row of no cells.
                              A window with no data is a fully hatched row. */}
                          {days.map((d, i) => {
                            const v = row.spark[i] ?? 0;
                            const hasValue = row.has[i] ?? false;
                            const dayLabel = format(d, 'EEE d MMM');
                            return (
                              <td key={i} className="p-1 text-center">
                                <div
                                  className="relative rounded px-1 py-1 text-[11px] font-medium"
                                  style={getHeatmapCellStyle(heatmapIntensity(v, row.max, inverse), hasValue)}
                                  title={hasValue
                                    ? `${row.label}${inverse ? ' (lower is better)' : ''} — ${dayLabel}: ${row.fmt(v)}`
                                    : `${row.label} — ${dayLabel}: not reported`}
                                >
                                  {inverse && hasValue ? (
                                    <span aria-hidden="true" className="absolute left-0.5 top-0.5 text-[8px] leading-none opacity-70">▼</span>
                                  ) : null}
                                  {hasValue ? row.fmt(v) : '—'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Key Metrics — only Overall Sales + Units for scoped country */}
      <section>
        <div className="mb-3 md:mb-4">
          <h2 className="text-base md:text-xl font-semibold text-foreground">Key Metrics</h2>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            Sales, units, page views, buy box and conversion for {scopeLabel(scope)}. Advertising is not part of these figures — PPC, ACOS and TACOS are reported, split by country, in the Advertising panel.
          </p>
          {chartInteractive && (
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
              Select a card to add or remove it from the trend chart below.
            </p>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <MetricsCard
              title="Overall Sales"
              value={scopedEmpty ? '—' : fmtMoney(totalSales)}
              color="text-blue-600"
              currentValue={totalSales}
              previousValue={prevSales}
              comparisonLabel={comparison}
              sparklineData={salesSpark}
              seriesSemantics="sum"
              comparisonSuppressedReason={incompleteNote}
              qualifier={partialQualifier}
              onClick={chartToggleFor('sales')}
              isSelected={chartSelected('sales')}
            />
            <MetricsCard
              title="Units Ordered"
              value={scopedEmpty ? '—' : fmtNum(totalUnits)}
              color="text-indigo-600"
              currentValue={totalUnits}
              previousValue={prevUnits}
              comparisonLabel={comparison}
              sparklineData={unitsSpark}
              seriesSemantics="sum"
              comparisonSuppressedReason={incompleteNote}
              qualifier={partialQualifier}
              onClick={chartToggleFor('units')}
              isSelected={chartSelected('units')}
            />
            <MetricsCard
              title="Page Views"
              value={scopedEmpty ? '—' : fmtNum(totalPageViews)}
              color="text-blue-600"
              currentValue={totalPageViews}
              previousValue={prevPageViews}
              comparisonLabel={comparison}
              sparklineData={pageViewsSpark}
              seriesSemantics="sum"
              subtitle={pageViewsBasis}
              info="Seller page views are Amazon's BROWSER page views — the mobile app is not in them. Vendor marketplaces report glance views instead. Neither is a session count, so the sessions used for conversion can be the larger number."
              comparisonSuppressedReason={incompleteNote}
              qualifier={partialQualifier}
              onClick={chartToggleFor('pageViews')}
              isSelected={chartSelected('pageViews')}
            />
            <MetricsCard
              title="Buy Box %"
              // Weighted by page views inside useScopedMetrics, not a mean of
              // the daily cells above — so it will not reproduce from them by
              // averaging. Said on the card rather than left to be discovered.
              info="Weighted by page views across the days in this period, not a plain average of the daily cells above — a day with few page views moves it less than a busy one. Days the feed did not report are left out entirely. Where the scope reports no page views at all, an unweighted mean is used instead."
              value={scopedEmpty ? '—' : fmtPct(avgBuyBox)}
              color="text-violet-600"
              currentValue={avgBuyBox}
              previousValue={prevAvgBuyBox}
              previousDisplayValue={scopedEmpty ? undefined : fmtPct(prevAvgBuyBox)}
              isPercentage
              comparisonLabel={comparison}
              sparklineData={buyBoxSpark}
              comparisonSuppressedReason={incompleteNote}
              onClick={chartToggleFor('buyBox')}
              isSelected={chartSelected('buyBox')}
            />
            <MetricsCard
              // Named for what it measures. Vendor marketplaces report no
              // sessions, so on a mixed scope this rate covers the seller arm
              // alone — Portwest whole business is 533 of 36,871 units. Calling
              // it plain "Conversion %" invited it to be read as the business's.
              title={totals?.mixedArms ? 'Conversion % (seller arm)' : 'Conversion %'}
              info={
                'Units ordered ÷ sessions (all devices) across the whole period — the same denominator as the daily Conversion % cells above. '
                + 'Only units with a session denominator are counted, so on a scope that also holds a vendor arm (vendors report no sessions), '
                + 'or on a day whose traffic feed has not arrived, this counts fewer units than the Units Ordered card. '
                + 'Page views are not sessions, and the page-view figure is browser only.'
              }
              subtitle={
                conversionAvailable
                  ? `${conversionNumeratorLabel} ÷ ${fmtNum(totals?.sessions || 0)} sessions (all devices)`
                  : totals?.hasSessions
                    ? `Units (${fmtNum(conversionUnits)}) exceed sessions (${fmtNum(totals?.sessions || 0)}) — withheld`
                    : 'Sessions are not reported for this account'
              }
              value={conversionAvailable && !scopedEmpty ? fmtPct(avgConversion) : '—'}
              // Neutral hue, per fix/deltas: the headline no longer carries valence.
              color={conversionAvailable ? 'text-fuchsia-600' : 'text-muted-foreground'}
              currentValue={conversionAvailable ? avgConversion : 0}
              previousValue={conversionAvailable ? prevAvgConversion : 0}
              previousDisplayValue={conversionAvailable && !scopedEmpty ? fmtPct(prevAvgConversion) : undefined}
              isPercentage
              comparisonLabel={comparison}
              sparklineData={conversionAvailable ? conversionSpark : undefined}
              comparisonSuppressedReason={incompleteNote}
              onClick={conversionAvailable ? chartToggleFor('conversion') : undefined}
              isSelected={conversionAvailable && chartSelected('conversion')}
            />
          </div>
        )}
      </section>

      {/* Performance Trends — driven by the KPI cards above, plotted from this
          scope's own daily series. */}
      {chartInteractive && (
        <section>
          <div className="mb-3 md:mb-4">
            <h2 className="text-base md:text-xl font-semibold text-foreground">Performance Trends</h2>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
              Daily {plottedMetrics.map(m => m.label).join(', ') || 'series'} for {scopeLabel(scope)}. Days the feed
              has not reported are left blank rather than drawn as zero.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              {plottedMetrics.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Select a metric card above to plot it.
                </p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#E5E7EB" tickLine={false} />
                      {usesLeftAxis && (
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#E5E7EB" tickLine={false} axisLine={false} />
                      )}
                      {usesRightAxis && (
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#E5E7EB" tickLine={false} axisLine={false} />
                      )}
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
                              <div className="mb-1 text-xs font-medium text-gray-900">{label}</div>
                              {payload.map((p) => {
                                const m = chartMetrics.find(x => x.key === p.dataKey);
                                if (!m || p.value == null) return null;
                                return (
                                  <div key={m.key} className="text-xs text-gray-700">
                                    <span style={{ color: m.color }}>■</span> {m.label}: {m.fmt(Number(p.value))}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {plottedMetrics.map(m => (
                        <Line
                          key={m.key}
                          yAxisId={m.axis}
                          type="monotone"
                          dataKey={m.key}
                          name={m.label}
                          stroke={m.color}
                          strokeWidth={2}
                          dot={false}
                          // Unreported days are nulls; joining across them would
                          // draw a trend the feed never reported.
                          connectNulls={false}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Product Performance (per-country ASIN table) */}
      <section>
        <div className="mb-3 md:mb-4">
          <h2 className="text-base md:text-xl font-semibold text-foreground">Product Performance</h2>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            Top ASINs for {scopeLabel(scope)}.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            {asinLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : sortedAsins.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Per-ASIN breakdown isn't available for this marketplace in the selected date range.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">ASIN</TableHead>
                        <TableHead className="min-w-[200px]">Product Name</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedAsins.map((row) => {
                        const sales = isRollup ? Number(row.sales_gbp || 0) : Number(row.sales_native || 0);
                        return (
                          <TableRow key={row.child_asin}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span>{row.child_asin}</span>
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-6 w-6 p-0"
                                  title="View on Amazon"
                                  onClick={() => window.open(
                                    getAmazonProductUrl(
                                      row.child_asin,
                                      // The storefront is chosen by country, not by arm.
                                      scopeCountryCode(scope) ? `x-${scopeCountryCode(scope)}` : accountMerchantToken,
                                    ),
                                    '_blank'
                                  )}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="truncate max-w-[400px]">{row.product_title || '—'}</TableCell>
                            <TableCell className="text-right font-medium">{fmtMoney(sales)}</TableCell>
                            <TableCell className="text-right">{fmtNum(Number(row.units_sold || 0))}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {sortedAsins.length > 10 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => setShowAll(!showAll)} className="flex items-center gap-2">
                      {showAll ? (<>Show Top 10 <ChevronUp className="h-4 w-4" /></>) : (<>Show All {sortedAsins.length} Products <ChevronDown className="h-4 w-4" /></>)}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
