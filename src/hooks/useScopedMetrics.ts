import { useEffect, useMemo, useState } from 'react';
import { format, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
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
 * assert their total against this exact series (see utils/kpiIntegrity).
 */

export interface ScopedDailyRow {
  bucket: string;
  units: number;
  sales_native: number | null;
  sales_gbp: number | null;
  page_views: number | null;
  sessions: number | null;
  buy_box_pct: number | null;
  conversion: number | null;
  has_sessions: boolean;
  currency: string | null;
}

export interface ScopedTotals {
  /** Native currency total for a single-country scope, GBP for a rollup. */
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
  loading: boolean;
  error: string | null;
}

const EMPTY_SERIES: ScopedSeries = { sales: [], units: [], pageViews: [], sessions: [], buyBox: [] };

const num = (v: unknown) => Number(v) || 0;

/** Sales are native when the whole scope shares one currency, GBP otherwise. */
const rowSales = (r: ScopedDailyRow) => (r.currency ? num(r.sales_native) : num(r.sales_gbp));

function summarise(rows: ScopedDailyRow[]): ScopedTotals | null {
  if (!rows.length) return null;

  const currencies = new Set(rows.map((r) => r.currency).filter(Boolean) as string[]);
  const currency = currencies.size === 1 ? [...currencies][0] : null;

  const unitsOrdered = rows.reduce((s, r) => s + num(r.units), 0);
  const pageViews = rows.reduce((s, r) => s + num(r.page_views), 0);
  const salesGbp = rows.reduce((s, r) => s + num(r.sales_gbp), 0);
  const sales = currency ? rows.reduce((s, r) => s + num(r.sales_native), 0) : salesGbp;

  // A day with no sessions column at all (vendor) must not be read as zero
  // sessions — that would make conversion look infinite rather than unknown.
  const hasSessions = rows.some((r) => r.has_sessions && r.sessions != null);
  const sessions = hasSessions ? rows.reduce((s, r) => s + num(r.sessions), 0) : null;

  // House rule: conversion = Σunits ÷ Σsessions, never a mean of daily rates.
  const rawConversion = sessions && sessions > 0 ? (unitsOrdered / sessions) * 100 : null;
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

  const series = useMemo<ScopedSeries>(() => {
    if (!daily.length) return EMPTY_SERIES;
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
  }, [daily, days, byDay]);

  const totals = useMemo(() => summarise(daily), [daily]);
  const previousTotals = useMemo(() => summarise(prev), [prev]);

  return { daily, totals, previousTotals, series, days, loading, error };
}
