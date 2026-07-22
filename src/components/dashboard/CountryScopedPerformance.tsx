import { useEffect, useMemo, useState } from 'react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
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
import type { DateFilter } from '@/types/dashboard';

interface Props {
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
  accountMerchantToken?: string;
}

interface TsRow {
  bucket: string;
  units: number;
  sales_gbp: number;
  sales_native?: number | null;
  currency?: string | null;
  page_views?: number | null;
  buy_box_pct?: number | null;
  conversion?: number | null;
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
  const [tsCurrent, setTsCurrent] = useState<TsRow[]>([]);
  const [tsPrev, setTsPrev] = useState<TsRow[]>([]);
  const [asinRows, setAsinRows] = useState<AsinRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [asinLoading, setAsinLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const cur = getCurrencyInfo(scope);
  const isRollup = scope === 'ALL' || scope === 'ALL_EU';

  const fmtMoney = (v: number) =>
    `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v ?? 0)}`;
  const fmtNum = (v: number) => new Intl.NumberFormat(cur.locale).format(Math.round(v ?? 0));

  const currentRange = useMemo(() => getCurrentDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const previousRange = useMemo(() => getPreviousDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const pStart = useMemo(() => format(currentRange.from, 'yyyy-MM-dd'), [currentRange.from]);
  const pEnd = useMemo(() => format(currentRange.to, 'yyyy-MM-dd'), [currentRange.to]);
  const ppStart = useMemo(() => format(previousRange.from, 'yyyy-MM-dd'), [previousRange.from]);
  const ppEnd = useMemo(() => format(previousRange.to, 'yyyy-MM-dd'), [previousRange.to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [curRes, prevRes] = await Promise.all([
          (supabase.rpc as any)('rpc_metrics_daily_country', { p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd }),
          (supabase.rpc as any)('rpc_metrics_daily_country', { p_spid: spid, p_scope: scope, p_start: ppStart, p_end: ppEnd }),
        ]);
        if (cancelled) return;
        setTsCurrent((curRes.data as any) || []);
        setTsPrev((prevRes.data as any) || []);
      } catch (e) {
        console.error('CountryScopedPerformance timeseries error', e);
        if (!cancelled) { setTsCurrent([]); setTsPrev([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spid, scope, pStart, pEnd, ppStart, ppEnd]);

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

  const days = useMemo(() => eachDayOfInterval({ start: currentRange.from, end: currentRange.to }), [currentRange.from, currentRange.to]);
  const byDay = useMemo(() => {
    const m = new Map<string, TsRow>();
    for (const r of tsCurrent) {
      const k = format(parseISO(r.bucket), 'yyyy-MM-dd');
      m.set(k, r);
    }
    return m;
  }, [tsCurrent]);

  const rowVal = (r: TsRow) => (r.currency ? Number(r.sales_native || 0) : Number(r.sales_gbp || 0));
  const totalSales = tsCurrent.reduce((s, r) => s + rowVal(r), 0);
  const totalUnits = tsCurrent.reduce((s, r) => s + (Number(r.units) || 0), 0);
  const prevSales = tsPrev.reduce((s, r) => s + rowVal(r), 0);
  const prevUnits = tsPrev.reduce((s, r) => s + (Number(r.units) || 0), 0);

  const salesSpark = days.map(d => {
    const r = byDay.get(format(d, 'yyyy-MM-dd'));
    return r ? rowVal(r) : 0;
  });
  const unitsSpark = days.map(d => Number(byDay.get(format(d, 'yyyy-MM-dd'))?.units || 0));
  const pageViewsSpark = days.map(d => Number(byDay.get(format(d, 'yyyy-MM-dd'))?.page_views || 0));
  const buyBoxSpark = days.map(d => Number(byDay.get(format(d, 'yyyy-MM-dd'))?.buy_box_pct || 0));
  const conversionSpark = days.map(d => Number(byDay.get(format(d, 'yyyy-MM-dd'))?.conversion || 0));

  const maxSales = Math.max(1, ...salesSpark);
  const maxUnits = Math.max(1, ...unitsSpark);
  const maxPageViews = Math.max(1, ...pageViewsSpark);
  const maxBuyBox = Math.max(1, ...buyBoxSpark);
  const maxConversion = Math.max(1, ...conversionSpark);

  const avgOf = (arr: number[]) => {
    const nz = arr.filter(v => v > 0);
    return nz.length ? nz.reduce((s, v) => s + v, 0) / nz.length : 0;
  };
  const totalPageViews = pageViewsSpark.reduce((s, v) => s + v, 0);
  const avgBuyBox = avgOf(buyBoxSpark);
  const avgConversion = avgOf(conversionSpark);

  const prevPageViews = tsPrev.reduce((s, r) => s + Number(r.page_views || 0), 0);
  const prevBuyBoxArr = tsPrev.map(r => Number(r.buy_box_pct || 0));
  const prevConversionArr = tsPrev.map(r => Number(r.conversion || 0));
  const prevAvgBuyBox = avgOf(prevBuyBoxArr);
  const prevAvgConversion = avgOf(prevConversionArr);

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
                      { label: 'Buy Box %', spark: buyBoxSpark, max: maxBuyBox, base: '#10B981', fmt: fmtPct },
                      { label: 'Conversion %', spark: conversionSpark, max: maxConversion, base: '#10B981', fmt: fmtPct },
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
              sparklineData={salesSpark}
            />
            <MetricsCard
              title="Units Ordered"
              value={fmtNum(totalUnits)}
              color="text-emerald-600"
              currentValue={totalUnits}
              previousValue={prevUnits}
              sparklineData={unitsSpark}
            />
            <MetricsCard
              title="Page Views"
              value={fmtNum(totalPageViews)}
              color="text-blue-600"
              currentValue={totalPageViews}
              previousValue={prevPageViews}
              sparklineData={pageViewsSpark}
            />
            <MetricsCard
              title="Buy Box %"
              value={fmtPct(avgBuyBox)}
              color="text-emerald-600"
              currentValue={avgBuyBox}
              previousValue={prevAvgBuyBox}
              sparklineData={buyBoxSpark}
            />
            <MetricsCard
              title="Conversion %"
              value={fmtPct(avgConversion)}
              color="text-emerald-600"
              currentValue={avgConversion}
              previousValue={prevAvgConversion}
              sparklineData={conversionSpark}
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
