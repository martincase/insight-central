import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPercentage, formatNumber } from '@/utils/formatters';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getCountryFromMerchantToken } from '@/utils/countryUtils';
import { MonthlyData } from '@/types/monthlyPerformance';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, ReferenceLine,
} from 'recharts';
import {
  Download, TrendingUp, TrendingDown, Minus, BarChart3, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChangeMarker } from '@/hooks/useChangeMarkers';

/* ──────────────────── currency helper ──────────────────── */
const fmtCurrency = (amount: number, code = 'GBP'): string => {
  const localeMap: Record<string, string> = {
    GBP: 'en-GB', USD: 'en-US', EUR: 'de-DE', AUD: 'en-AU',
    CAD: 'en-CA', AED: 'ar-AE', SEK: 'sv-SE',
  };
  return new Intl.NumberFormat(localeMap[code] || 'en-GB', {
    style: 'currency', currency: code,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
};

const fmtCurrencyDecimal = (amount: number, code = 'GBP'): string => {
  const localeMap: Record<string, string> = {
    GBP: 'en-GB', USD: 'en-US', EUR: 'de-DE', AUD: 'en-AU',
    CAD: 'en-CA', AED: 'ar-AE', SEK: 'sv-SE',
  };
  return new Intl.NumberFormat(localeMap[code] || 'en-GB', {
    style: 'currency', currency: code,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
};

/* ──────────────────── data mapping ──────────────────── */
const mapRow = (row: any): MonthlyData => ({
  month: row.month,
  currency: row.currency || undefined,
  spend_gbp: row.ad_spend != null ? Number(row.ad_spend) : null,
  ad_sales_gbp: row.ad_sales != null ? Number(row.ad_sales) : null,
  acos: row.acos != null ? Number(row.acos) * 100 : null,
  overall_sales_gbp: row.overall_sales != null ? Number(row.overall_sales) : null,
  ad_cost_pct_vs_overall: row.ad_cost_pct != null ? Number(row.ad_cost_pct) * 100 : null,
  ad_sales_pct_vs_overall: row.ad_sales_pct != null ? Number(row.ad_sales_pct) * 100 : null,
  impressions: row.impressions != null ? Number(row.impressions) : null,
  clicks: row.clicks != null ? Number(row.clicks) : null,
  cpc_gbp: row.cpc != null ? Number(row.cpc) : null,
  ctr: row.ctr != null ? Number(row.ctr) * 100 : null,
});

const fetchMonthlyPerformanceData = async (
  accountName: string, merchantToken?: string,
): Promise<MonthlyData[]> => {
  try {
    const rawCountry = merchantToken ? getCountryFromMerchantToken(merchantToken) : null;
    const m: Record<string, string> = { GB: 'UK', AU: 'AUS', AE: 'UAE' };
    const marketplace = rawCountry ? m[rawCountry] || rawCountry : null;

    const { data: rpcData, error } = await supabase.rpc('get_ppc_monthly_performance', {
      p_account_name: accountName,
      p_marketplace: marketplace || undefined,
    });

    if (error || !rpcData?.length) return [];
    return rpcData.map(mapRow);
  } catch {
    return [];
  }
};

/* ──────────────────── change % helpers ──────────────────── */
type ChangeDir = 'up' | 'down' | 'flat';

const pctChange = (cur: number | null, prev: number | null): { pct: number; dir: ChangeDir } | null => {
  if (cur == null || prev == null || prev === 0) return null;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  return { pct, dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' };
};

const lowerIsBetter = new Set(['spend_gbp', 'acos', 'cpc_gbp', 'ad_cost_pct_vs_overall']);

const isGood = (key: string, dir: ChangeDir): boolean | null => {
  if (dir === 'flat') return null;
  return lowerIsBetter.has(key) ? dir === 'down' : dir === 'up';
};

/* ──────────────────── column config ──────────────────── */
interface ColDef {
  key: string;
  label: string;
  fmt: (v: any, currency?: string) => string;
  chartLine?: boolean;
  chartColor?: string;
  tint?: string;       // cell bg tint
  textTint?: string;   // cell text color
  extended?: boolean;   // hidden by default
}

const COLUMNS: ColDef[] = [
  { key: 'month', label: 'Month', fmt: (v: string) => v ? format(new Date(v), 'MMM yyyy') : '—' },
  { key: 'spend_gbp', label: 'Ad Spend', fmt: (v, c) => v != null ? fmtCurrency(v, c) : '—', chartLine: true, chartColor: '#f97316', tint: 'bg-orange-50 dark:bg-orange-950/20', textTint: 'text-orange-700 dark:text-orange-300' },
  { key: 'ad_sales_gbp', label: 'Ad Sales', fmt: (v, c) => v != null ? fmtCurrency(v, c) : '—', chartLine: true, chartColor: '#22c55e', tint: 'bg-emerald-50 dark:bg-emerald-950/20', textTint: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'acos', label: 'ACoS', fmt: (v) => v != null ? `${v.toFixed(1)}%` : '—', chartLine: true, chartColor: '#ef4444', tint: 'bg-red-50 dark:bg-red-950/20', textTint: 'text-red-700 dark:text-red-300' },
  { key: 'overall_sales_gbp', label: 'Total Sales', fmt: (v, c) => v != null ? fmtCurrency(v, c) : '—', chartLine: true, chartColor: '#3b82f6', tint: 'bg-blue-50 dark:bg-blue-950/20', textTint: 'text-blue-700 dark:text-blue-300' },
  { key: 'impressions', label: 'Impressions', fmt: (v) => v != null ? formatNumber(v) : '—', extended: true },
  { key: 'clicks', label: 'Clicks', fmt: (v) => v != null ? formatNumber(v) : '—', extended: true },
  { key: 'cpc_gbp', label: 'CPC', fmt: (v, c) => v != null ? fmtCurrencyDecimal(v, c) : '—', extended: true },
  { key: 'ctr', label: 'CTR', fmt: (v) => v != null ? `${v.toFixed(2)}%` : '—', extended: true },
];

/* ──────────────────── Chart tooltip ──────────────────── */
const ChartCustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs py-0.5">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-semibold text-foreground tabular-nums">
            {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ──────────────────── Change indicator (two-line) ──────────────────── */
const ChangeIndicator: React.FC<{ change: ReturnType<typeof pctChange>; colKey: string; label: string }> = ({ change, colKey, label }) => {
  if (!change || change.dir === 'flat') return null;
  const good = isGood(colKey, change.dir);
  const colorCls = good === true ? 'text-emerald-600 dark:text-emerald-400' : good === false ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground';
  const Icon = change.dir === 'up' ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium', colorCls)} title={`${label}: ${change.pct > 0 ? '+' : ''}${change.pct.toFixed(1)}%`}>
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(change.pct).toFixed(0)}%
    </span>
  );
};

/* ──────────────────── MAIN COMPONENT ──────────────────── */
interface MonthlyPerformanceTableProps {
  merchantToken: string;
  accountName: string;
  comingSoon?: boolean;
  changeMarkers?: ChangeMarker[];
}

export const MonthlyPerformanceTable: React.FC<MonthlyPerformanceTableProps> = ({
  merchantToken, accountName, comingSoon = false, changeMarkers = [],
}) => {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [momEnabled, setMomEnabled] = useState(false);
  const [yoyEnabled, setYoyEnabled] = useState(false);
  const [showExtended, setShowExtended] = useState(false);

  useEffect(() => {
    (async () => {
      if (comingSoon) { setData([]); setIsLoading(false); return; }
      setIsLoading(true);
      const result = await fetchMonthlyPerformanceData(accountName, merchantToken);
      setData(result);
      setIsLoading(false);
    })();
  }, [merchantToken, accountName, comingSoon]);

  const visibleCols = useMemo(() =>
    COLUMNS.filter(c => !c.extended || showExtended),
    [showExtended]
  );

  /* YoY filtered dataset: same calendar month across all years */
  const yoyFilteredData = useMemo(() => {
    if (!yoyEnabled || data.length === 0) return data;
    // Find most recent month number
    const newest = [...data].sort((a, b) => b.month.localeCompare(a.month))[0];
    const targetMonth = new Date(newest.month).getMonth(); // 0-indexed
    return data
      .filter(row => new Date(row.month).getMonth() === targetMonth)
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [data, yoyEnabled]);

  const yoyMonthLabel = useMemo(() => {
    if (!yoyEnabled || data.length === 0) return '';
    const newest = [...data].sort((a, b) => b.month.localeCompare(a.month))[0];
    return format(new Date(newest.month), 'MMMM');
  }, [data, yoyEnabled]);

  /* sorting */
  const activeData = yoyEnabled ? yoyFilteredData : data;
  const sorted = useMemo(() => {
    const arr = [...activeData];
    arr.sort((a, b) => {
      const av = (a as any)[sortKey], bv = (b as any)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (sortKey === 'month') {
        const d = new Date(av).getTime() - new Date(bv).getTime();
        return sortDir === 'asc' ? d : -d;
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [activeData, sortKey, sortDir]);

  /* lookup maps for MoM / YoY */
  const prevMonthMap = useMemo(() => {
    const map = new Map<string, MonthlyData>();
    const byDate = [...data].sort((a, b) => a.month.localeCompare(b.month));
    byDate.forEach((row, i) => { if (i > 0) map.set(row.month, byDate[i - 1]); });
    return map;
  }, [data]);

  const prevYearMap = useMemo(() => {
    const map = new Map<string, MonthlyData>();
    data.forEach(row => {
      const d = new Date(row.month);
      const target = new Date(d.getFullYear() - 1, d.getMonth(), 1).toISOString().slice(0, 10);
      const match = data.find(r => r.month.startsWith(target.slice(0, 7)));
      if (match) map.set(row.month, match);
    });
    return map;
  }, [data]);

  /* chart data */
  const chartData = useMemo(() => {
    const source = yoyEnabled ? yoyFilteredData : data;
    const chronological = [...source].sort((a, b) => a.month.localeCompare(b.month));
    return chronological.map(row => ({
      name: yoyEnabled
        ? format(new Date(row.month), 'MMM yyyy')
        : format(new Date(row.month), 'MMM yy'),
      'Ad Spend': row.spend_gbp ?? 0,
      'Ad Sales': row.ad_sales_gbp ?? 0,
      'ACoS': row.acos ?? 0,
      'Total Sales': row.overall_sales_gbp ?? 0,
    }));
  }, [data, yoyEnabled, yoyFilteredData]);

  /* map marker event_dates to chart x-axis labels */
  const markerChartLabels = useMemo(() => {
    if (!changeMarkers.length || !chartData.length) return [];
    return changeMarkers.map(m => {
      const d = new Date(m.event_date);
      const label = yoyEnabled
        ? format(d, 'MMM yyyy')
        : format(d, 'MMM yy');
      // Only include if the label exists in chartData
      if (chartData.some(cd => cd.name === label)) {
        return { label, eventLabel: m.event_label };
      }
      return null;
    }).filter(Boolean) as { label: string; eventLabel: string }[];
  }, [changeMarkers, chartData, yoyEnabled]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  /* CSV export */
  const exportCsv = () => {
    const cols = COLUMNS;
    const headers = cols.map(c => c.label);
    const rows = sorted.map(row => cols.map(c => {
      const v = (row as any)[c.key];
      if (c.key === 'month') return format(new Date(v), 'yyyy-MM');
      return v ?? '';
    }));
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-performance-${accountName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartLines = COLUMNS.filter(c => c.chartLine);

  return (
    <Card className="w-full border-border/60 shadow-sm overflow-hidden rounded-xl">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-gradient-to-r from-muted/40 to-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">Monthly Performance</h3>
            {data.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {yoyEnabled ? `${yoyMonthLabel} — Year on Year` : `${data.length} months`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle pills */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setMomEnabled(!momEnabled)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all',
                momEnabled
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              MoM
            </button>
            <button
              onClick={() => setYoyEnabled(!yoyEnabled)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all',
                yoyEnabled
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              YoY
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={isLoading || !data.length}
            className="h-7 text-[10px] px-2.5 border-border/50">
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <CardContent className="p-0">
        {/* ── Chart (inline, no collapsible) ── */}
        {isLoading ? (
          <div className="p-5"><Skeleton className="h-44 w-full rounded-lg" /></div>
        ) : chartData.length > 0 ? (
          <div className="px-4 pt-4 pb-2 border-b border-border/30" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" width={55}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <RechartsTooltip content={<ChartCustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                {chartLines.map(col => (
                  <Line key={col.label} type="monotone" dataKey={col.label} stroke={col.chartColor}
                    strokeWidth={2} dot={{ r: 2.5, fill: col.chartColor }} activeDot={{ r: 5 }} />
                ))}
                {markerChartLabels.map((m, i) => (
                  <ReferenceLine
                    key={`marker-${i}`}
                    x={m.label}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `🚩 ${m.eventLabel}`,
                      position: 'top',
                      fill: 'hsl(var(--foreground))',
                      fontSize: 9,
                      fontWeight: 600,
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border/50 bg-muted/30">
                {visibleCols.map(col => (
                  <th key={col.key}
                    className={cn(
                      'px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap select-none cursor-pointer transition-colors hover:text-foreground',
                      col.key === 'month'
                        ? 'sticky left-0 z-20 bg-muted/30 text-foreground'
                        : 'text-muted-foreground',
                    )}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.tint && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: col.chartColor || undefined }} />}
                      {col.label}
                      {sortKey === col.key && (
                        <span className="text-primary text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                ))}
                {/* More metrics toggle in header */}
                <th className="px-2 py-2.5 text-right">
                  <button
                    onClick={() => setShowExtended(!showExtended)}
                    className={cn(
                      'inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-md px-2 py-0.5 transition-all',
                      showExtended
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {showExtended ? 'Less' : 'More'}
                    <ChevronRight className={cn('h-3 w-3 transition-transform', showExtended && 'rotate-180')} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/20">
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-3 py-3"><Skeleton className="h-5 w-20 rounded" /></td>
                    ))}
                    <td />
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 1} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No performance data available</p>
                      <p className="text-xs text-muted-foreground/60">Data will appear here once synced</p>
                    </div>
                  </td>
                </tr>
              ) : sorted.map((row, idx) => {
                const prevM = prevMonthMap.get(row.month);
                const prevY = prevYearMap.get(row.month);
                const cur = row.currency || 'GBP';
                return (
                  <tr key={row.month} className={cn(
                    'border-b border-border/20 transition-colors hover:bg-muted/30',
                    idx % 2 === 1 && 'bg-muted/10',
                  )}>
                    {visibleCols.map(col => {
                      const val = (row as any)[col.key];
                      const formatted = col.fmt(val, cur);
                      const momChange = momEnabled && col.key !== 'month' ? pctChange(val, prevM ? (prevM as any)[col.key] : null) : null;
                      const yoyChange = yoyEnabled && col.key !== 'month' ? pctChange(val, prevY ? (prevY as any)[col.key] : null) : null;
                      const hasChange = momChange || yoyChange;

                      if (col.key === 'month') {
                        return (
                          <td key={col.key} className="sticky left-0 z-10 bg-card px-3 py-3 border-r border-border/30">
                            <span className="text-xs font-semibold text-foreground">{formatted}</span>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="px-3 py-3">
                          <div className="flex flex-col gap-0.5">
                            {/* Main value as a tinted pill */}
                            <span className={cn(
                              'inline-block px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums w-fit',
                              col.tint && formatted !== '—' ? col.tint : '',
                              col.textTint && formatted !== '—' ? col.textTint : 'text-foreground',
                              formatted === '—' && 'text-muted-foreground/50',
                            )}>
                              {formatted}
                            </span>
                            {/* MoM / YoY change indicators below */}
                            {hasChange && (
                              <div className="flex items-center gap-2 pl-0.5">
                                {momChange && <ChangeIndicator change={momChange} colKey={col.key} label="MoM" />}
                                {yoyChange && <ChangeIndicator change={yoyChange} colKey={col.key} label="YoY" />}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
