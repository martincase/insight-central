import { useEffect, useMemo, useState } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
import { assessCompleteness, COMPLETENESS_UNKNOWN, type DataCompleteness } from '@/utils/kpiIntegrity';
import type { DateFilter } from '@/types/dashboard';

/**
 * The one country-scoped source for headline KPI numbers.
 *
 * Everything here comes from rpc_metrics_daily_country, which resolves the scope
 * by BRAND. That matters because vendors get a different selling_partner_id in
 * every marketplace (Portwest GB is amzn1.vg.2072811, DE is amzn1.vg.5674352),
 * so anything scoped to a single spid sees one country and quietly reports the
 * home market under whatever label the switcher is showing.
 *
 * The daily rows are returned alongside the totals deliberately: the KPI cards
 * assert their total against this exact series (see utils/kpiIntegrity). For
 * that assertion to mean anything, the total and the series must be built on
 * the same basis — same currency decision, same rows — which is why every
 * derivation below is made once, here, and shared.
 */

export interface ScopedDailyRow {
  bucket: string;
  units: number;
  sales_native: number | null;
  sales_gbp: number | null;
  page_views: number | null;
  /** Total sessions (all devices), recovered from Amazon's unit_session_percentage. */
  sessions: number | null;
  buy_box_pct: number | null;
  conversion: number | null;
  has_sessions: boolean;
  /** null when the DAY itself spans more than one currency. */
  currency: string | null;
}

export interface ScopedTotals {
  /** Native currency total for a single-currency scope, GBP for anything else. */
  sales: number;
  salesGbp: number;
  /** null means the scope spans currencies, so the figure above is GBP. */
  currency: string | null;
  unitsOrdered: number;
  pageViews: number;
  /** null where the feed carries no sessions at all (every vendor account). */
  sessions: number | null;
  hasSessions: boolean;
  buyBoxPercentage: number | null;
  /** Σunits ÷ Σsessions × 100. Never an average of per-row conversion rates. */
  conversionRate: number | null;
  /** Units counted in the conversion numerator — only days with a denominator. */
  conversionUnits: number | null;
  /** True when conversion came out above 100% — real data, but not printable. */
  conversionImplausible: boolean;
}

export interface ScopedSeries {
  sales: number[];
  units: number[];
  pageViews: number[];
  sessions: number[];
  buyBox: number[];
}

export interface UseScopedMetricsResult {
  daily: ScopedDailyRow[];
  totals: ScopedTotals | null;
  previousTotals: ScopedTotals | null;
  series: ScopedSeries;
  days: Date[];
  /** How much of the selected window the sales series actually covers. */
  completeness: DataCompleteness;
  loading: boolean;
  error: string | null;
}

const EMPTY_SERIES: ScopedSeries = { sales: [], units: [], pageViews: [], sessions: [], buyBox: [] };

const num = (v: unknown) => Number(v) || 0;

/**
 * Is the whole scope denominated in one currency?
 *
 * This has to be all-or-nothing across every row. It used to ignore rows whose
 * currency was null — but null is precisely the RPC's way of saying "this day
 * mixed marketplaces". Portwest "All seller markets" is Workwear Depot UK plus
 * Workwear Depot US: the US feed died on 2 July, so 29 of July's 31 days were
 * GB-only and carried currency 'GBP'. The old test saw one distinct currency,
 * declared the scope sterling, and summed sales_native — adding raw dollars to
 * pounds. £27,196.93 against the £27,010.75 the same page showed elsewhere, and
 * the sum-check fired on a 0.68% "drift" that was the bug, not a rounding
 * artefact. The 14-day whole-business view was 13.65% out the same way.
 */
const isSingleCurrency = (rows: ScopedDailyRow[]): boolean => {
  if (!rows.length) return false;
  if (rows.some((r) => !r.currency)) return false;
  return new Set(rows.map((r) => r.currency)).size === 1;
};

function summarise(rows: ScopedDailyRow[]): ScopedTotals | null {
  if (!rows.length) return null;

  const single = isSingleCurrency(rows);
  const currency = single ? (rows[0].currency as string) : null;

  const unitsOrdered = rows.reduce((s, r) => s + num(r.units), 0);
  const pageViews = rows.reduce((s, r) => s + num(r.page_views), 0);
  const salesGbp = rows.reduce((s, r) => s + num(r.sales_gbp), 0);
  const sales = single ? rows.reduce((s, r) => s + num(r.sales_native), 0) : salesGbp;

  // Conversion is rebuilt from the per-day rate the RPC computed, weighted by
  // that day's sessions. Algebraically that is Σunits ÷ Σsessions over exactly
  // the rows that HAVE a session denominator — which is not the same as the
  // day's total units when a scope mixes a seller arm (sessions) with a vendor
  // arm (none). S Green & Sons is that case: dividing the combined unit count
  // by the seller-only session count put the headline at 6.4% above a daily
  // range of 3.2–5.1%. Weighted properly it is 4.08%, inside its own cells.
  const convRows = rows.filter(
    (r) => r.has_sessions && r.sessions != null && num(r.sessions) > 0 && r.conversion != null,
  );
  const hasSessions = convRows.length > 0;
  const sessions = hasSessions ? convRows.reduce((s, r) => s + num(r.sessions), 0) : null;
  const conversionUnits = hasSessions
    ? convRows.reduce((s, r) => s + (num(r.conversion) / 100) * num(r.sessions), 0)
    : null;

  const rawConversion =
    sessions && sessions > 0 && conversionUnits != null ? (conversionUnits / sessions) * 100 : null;
  const conversionImplausible = rawConversion != null && rawConversion > 100;

  // Buy box is a percentage, so weight it by traffic rather than by day.
  const bbRows = rows.filter((r) => r.buy_box_pct != null);
  const bbWeight = bbRows.reduce((s, r) => s + num(r.page_views), 0);
  const buyBoxPercentage = bbRows.length === 0
    ? null
    : bbWeight > 0
      ? bbRows.reduce((s, r) => s + num(r.buy_box_pct) * num(r.page_views), 0) / bbWeight
      : bbRows.reduce((s, r) => s + num(r.buy_box_pct), 0) / bbRows.length;

  return {
    sales,
    salesGbp,
    currency,
    unitsOrdered,
    pageViews,
    sessions,
    hasSessions,
    buyBoxPercentage,
    conversionRate: rawConversion,
    conversionUnits,
    conversionImplausible,
  };
}

export function useScopedMetrics(
  spid: string | null | undefined,
  scope: string | null | undefined,
  dateFilter: DateFilter,
  customDateRange?: { from: Date; to: Date },
): UseScopedMetricsResult {
  const [daily, setDaily] = useState<ScopedDailyRow[]>([]);
  const [prev, setPrev] = useState<ScopedDailyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRange = useMemo(
    () => getCurrentDateRange(dateFilter, customDateRange),
    [dateFilter, customDateRange],
  );
  const previousRange = useMemo(
    () => getPreviousDateRange(dateFilter, customDateRange),
    [dateFilter, customDateRange],
  );
  const pStart = format(currentRange.from, 'yyyy-MM-dd');
  const pEnd = format(currentRange.to, 'yyyy-MM-dd');
  const ppStart = format(previousRange.from, 'yyyy-MM-dd');
  const ppEnd = format(previousRange.to, 'yyyy-MM-dd');

  useEffect(() => {
    if (!spid || !scope) {
      setDaily([]);
      setPrev([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [curRes, prevRes] = await Promise.all([
          (supabase.rpc as any)('rpc_metrics_daily_country', { p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd }),
          (supabase.rpc as any)('rpc_metrics_daily_country', { p_spid: spid, p_scope: scope, p_start: ppStart, p_end: ppEnd }),
        ]);
        if (cancelled) return;
        if (curRes?.error) throw curRes.error;
        setDaily((curRes?.data as ScopedDailyRow[]) || []);
        setPrev(prevRes?.error ? [] : ((prevRes?.data as ScopedDailyRow[]) || []));
      } catch (e: any) {
        if (cancelled) return;
        // Loud on purpose. A silent failure here used to show the UK figure
        // under a different country's flag.
        setDaily([]);
        setPrev([]);
        setError(e?.message || 'Could not load country-scoped metrics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spid, scope, pStart, pEnd, ppStart, ppEnd]);

  const days = useMemo(
    () => eachDayOfInterval({ start: currentRange.from, end: currentRange.to }),
    [currentRange.from, currentRange.to],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, ScopedDailyRow>();
    // bucket is a plain yyyy-MM-dd date from Postgres; slicing avoids the
    // timezone shift parseISO would introduce for users behind UTC.
    for (const r of daily) m.set(String(r.bucket).slice(0, 10), r);
    return m;
  }, [daily]);

  // The currency decision is made ONCE, for the whole scope, and both the
  // headline total and the daily series obey it. Deciding per row is what put
  // native pounds-and-dollars in the total and GBP in the series.
  const single = useMemo(() => isSingleCurrency(daily), [daily]);

  const series = useMemo<ScopedSeries>(() => {
    if (!daily.length) return EMPTY_SERIES;
    const rowSales = (r: ScopedDailyRow) => (single ? num(r.sales_native) : num(r.sales_gbp));
    const pick = <T,>(fn: (r: ScopedDailyRow) => T, fallback: T) =>
      days.map((d) => {
        const r = byDay.get(format(d, 'yyyy-MM-dd'));
        return r ? fn(r) : fallback;
      });
    return {
      sales: pick(rowSales, 0),
      units: pick((r) => num(r.units), 0),
      pageViews: pick((r) => num(r.page_views), 0),
      sessions: pick((r) => num(r.sessions), 0),
      buyBox: pick((r) => num(r.buy_box_pct), 0),
    };
  }, [daily, days, byDay, single]);

  const totals = useMemo(() => summarise(daily), [daily]);
  const previousTotals = useMemo(() => summarise(prev), [prev]);

  // A day is "present" when the feed produced a row for it. Loading states must
  // not read as a gap, so completeness is unknown until the fetch settles.
  const completeness = useMemo<DataCompleteness>(() => {
    if (loading || error) return COMPLETENESS_UNKNOWN;
    if (!spid || !scope) return COMPLETENESS_UNKNOWN;
    return assessCompleteness(days, byDay.keys());
  }, [loading, error, spid, scope, days, byDay]);

  return { daily, totals, previousTotals, series, days, completeness, loading, error };
}
