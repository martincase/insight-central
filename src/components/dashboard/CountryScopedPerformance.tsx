import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useScopedMetrics } from '@/hooks/useScopedMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { CountryScope } from './CountrySwitcher';
import { MetricsCard } from './MetricsCard';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { getCountryName } from '@/utils/countryUtils';
import { getAmazonProductUrl } from '@/utils/amazonUtils';
import { getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
import { buildComparisonLabel } from '@/utils/comparisonLabels';
import type { DateFilter } from '@/types/dashboard';

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
  if (scope === 'ALL') return 'All countries';
  if (scope === 'ALL_EU') return 'All EU';
  return getCountryName(scope) || scope;
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
  const { totals, previousTotals, series, days, loading, error: scopeError } = scopedMetrics;

  const cur = getCurrencyInfo(scope);
  const isRollup = scope === 'ALL' || scope === 'ALL_EU';

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
  // Per-day conversion from the same two series the totals use: units ÷ sessions.
  // Never units ÷ page views, and never a stored per-row rate.
  const conversionSpark = unitsSpark.map((u, i) => {
    const s = sessionsSpark[i] || 0;
    if (s <= 0) return 0;
    const pct = (u / s) * 100;
    return pct > 100 ? 0 : pct; // impossible values are not plotted
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

  const prevPageViews = previousTotals?.pageViews ?? 0;
  const prevAvgBuyBox = previousTotals?.buyBoxPercentage ?? 0;
  const prevAvgConversion = previousTotals && !previousTotals.conversionImplausible
    ? (previousTotals.conversionRate ?? 0)
    : 0;

  const fmtPct = (v: number) => `${(v ?? 0).toFixed(1)}%`;

  const shadeColor = (ratio: number, base: string) => {
    // ratio 0..1
    const alpha = Math.max(0.08, Math.min(1, ratio));
    return `${base}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
  };

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
      {/* Daily Performance heatmap (Sales + Units only) */}
      <section>
        <div className="mb-3 md:mb-4">
          <h2 className="text-base md:text-xl font-semibold text-foreground">Daily Performance</h2>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            Daily sales, units, page views, buy box % and conversion for {scopeLabel(scope)}. PPC, ACOS and TACOS are not available at country level (ads aren't split by marketplace).
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
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-background z-10">Metric</th>
                      {days.map(d => (
                        <th key={d.toISOString()} className="p-1 text-center font-medium text-muted-foreground min-w-[52px]">
                          <div>{format(d, 'EEE')}</div>
                          <div className="text-[10px]">{format(d, 'MMM d')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Sales', spark: salesSpark, max: maxSales, base: '#2563EB', fmt: fmtMoney },
                      { label: 'Units', spark: unitsSpark, max: maxUnits, base: '#10B981', fmt: fmtNum },
                      { label: 'Page Views', spark: pageViewsSpark, max: maxPageViews, base: '#2563EB', fmt: fmtNum },
                      ...(totals?.hasSessions ? [{ label: 'Sessions', spark: sessionsSpark, max: Math.max(1, ...sessionsSpark), base: '#2563EB', fmt: fmtNum }] : []),
                      { label: 'Buy Box %', spark: buyBoxSpark, max: maxBuyBox, base: '#10B981', fmt: fmtPct },
                      // Blank for vendors and for any day where units exceed sessions.
                      ...(totals?.hasSessions ? [{ label: 'Conversion %', spark: conversionSpark, max: maxConversion, base: '#10B981', fmt: fmtPct }] : []),
                    ].map(row => (
                      <tr key={row.label}>
                        <td className="p-2 font-medium sticky left-0 bg-background z-10">{row.label}</td>
                        {row.spark.map((v, i) => (
                          <td key={i} className="p-1 text-center">
                            <div
                              className="rounded px-1 py-1 text-[11px] font-medium"
                              style={{ backgroundColor: shadeColor(v / row.max, row.base), color: (v / row.max) > 0.55 ? '#fff' : 'inherit' }}
                              title={row.fmt(v)}
                            >
                              {v > 0 ? row.fmt(v) : '—'}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Key Metrics — only Overall Sales + Units for scoped country */}
      <section>
        <div className="mb-3 md:mb-4">
          <h2 className="text-base md:text-xl font-semibold text-foreground">Key Metrics</h2>
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
            Sales, units, page views, buy box and conversion for {scopeLabel(scope)}. PPC, ACOS and TACOS are not available at country level (ads aren't split by marketplace).
          </p>
        </div>
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <MetricsCard
              title="Overall Sales"
              value={fmtMoney(totalSales)}
              color="text-blue-600"
              currentValue={totalSales}
              previousValue={prevSales}
              comparisonLabel={comparison}
              sparklineData={salesSpark}
              seriesSemantics="sum"
            />
            <MetricsCard
              title="Units Ordered"
              value={fmtNum(totalUnits)}
              color="text-indigo-600"
              currentValue={totalUnits}
              previousValue={prevUnits}
              comparisonLabel={comparison}
              sparklineData={unitsSpark}
              seriesSemantics="sum"
            />
            <MetricsCard
              title="Page Views"
              value={fmtNum(totalPageViews)}
              color="text-blue-600"
              currentValue={totalPageViews}
              previousValue={prevPageViews}
              comparisonLabel={comparison}
              sparklineData={pageViewsSpark}
              seriesSemantics="sum"
            />
            <MetricsCard
              title="Buy Box %"
              value={fmtPct(avgBuyBox)}
              color="text-violet-600"
              currentValue={avgBuyBox}
              previousValue={prevAvgBuyBox}
              comparisonLabel={comparison}
              sparklineData={buyBoxSpark}
            />
            <MetricsCard
              title="Conversion %"
              info={`Units ordered ÷ ${totals?.hasSessions ? 'browser sessions' : 'sessions'} across the whole period. Page views are not sessions.`}
              subtitle={
                conversionAvailable
                  ? `${fmtNum(totalUnits)} units ÷ ${fmtNum(totals?.sessions || 0)} sessions`
                  : totals?.hasSessions
                    ? `Units (${fmtNum(totalUnits)}) exceed sessions (${fmtNum(totals?.sessions || 0)}) — withheld`
                    : 'Sessions are not reported for this account'
              }
              value={conversionAvailable ? fmtPct(avgConversion) : '—'}
              // Neutral hue, per fix/deltas: the headline no longer carries valence.
              color={conversionAvailable ? 'text-fuchsia-600' : 'text-muted-foreground'}
              currentValue={conversionAvailable ? avgConversion : 0}
              previousValue={conversionAvailable ? prevAvgConversion : 0}
              comparisonLabel={comparison}
              sparklineData={conversionAvailable ? conversionSpark : undefined}
            />
          </div>
        )}
      </section>

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
                                    getAmazonProductUrl(row.child_asin, typeof scope === 'string' && scope.length === 2 ? `x-${scope}` : accountMerchantToken),
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
