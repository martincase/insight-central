import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CountryScope } from './CountrySwitcher';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { useChartReady } from '@/hooks/useChartReady';

interface Props {
  spid: string;
  scope: CountryScope;
}

interface Row { bucket: string; units: number; sales_gbp: number; }

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_PLURAL = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

export function SalesByWeekdayCard({ spid, scope }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'sales' | 'units'>('sales');

  const cur = getCurrencyInfo(scope);
  const fmtMoney = (v: number) =>
    `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v ?? 0)}`;
  const fmtInt = (v: number) => new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v ?? 0);
  const fmt = metric === 'sales' ? fmtMoney : fmtInt;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const today = new Date();
        const p_end = format(today, 'yyyy-MM-dd');
        const p_start = format(subDays(today, 83), 'yyyy-MM-dd');
        const res = await supabase.rpc('rpc_sales_timeseries', { p_spid: spid, p_scope: scope, p_start, p_end });
        if (cancelled) return;
        if (res.error) throw res.error;
        setRows((res.data as any) || []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || 'Failed to load weekday data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spid, scope]);

  const { chartData, hasData } = useMemo(() => {
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    rows.forEach((r) => {
      const d = new Date(r.bucket);
      const idx = (d.getDay() + 6) % 7;
      const v = metric === 'sales' ? Number(r.sales_gbp || 0) : Number(r.units || 0);
      sums[idx] += v;
      counts[idx] += 1;
    });
    const data = WEEKDAY_LABELS.map((label, i) => ({
      label,
      value: counts[i] > 0 ? sums[i] / counts[i] : 0,
      count: counts[i],
    }));
    const totalCount = counts.reduce((a, b) => a + b, 0);
    const totalValue = sums.reduce((a, b) => a + b, 0);
    return { chartData: data, hasData: totalCount > 0 && totalValue > 0 };
  }, [rows, metric]);

  const { best, worst, overallMean } = useMemo(() => {
    const valid = chartData.map((d, i) => ({ ...d, i })).filter((d) => d.count > 0);
    if (valid.length === 0) return { best: null as any, worst: null as any, overallMean: 0 };
    const mean = valid.reduce((s, d) => s + d.value, 0) / valid.length;
    let bestD = valid[0], worstD = valid[0];
    valid.forEach((d) => { if (d.value > bestD.value) bestD = d; if (d.value < worstD.value) worstD = d; });
    return { best: bestD, worst: worstD, overallMean: mean };
  }, [chartData]);

  const { ref: chartRef, chartKey } = useChartReady(chartData.length);

  const title = `Sales by Day of Week (${cur.code})`;
  const subtitle = metric === 'sales'
    ? 'Average daily sales by weekday · last 12 weeks'
    : 'Average daily units by weekday · last 12 weeks';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm md:text-base">{title}</CardTitle>
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : error ? (
          <div className="text-sm text-red-600 py-4">Error: {error}</div>
        ) : !hasData ? (
          <Card className="rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 h-1.5" />
            <div className="py-8 px-4 text-center">
              <div className="text-sm font-semibold text-foreground">Not enough data yet</div>
              <div className="text-xs text-muted-foreground mt-1">
                We need at least a few weeks of sales history to show your best-selling days. Check back soon.
              </div>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <button
                type="button"
                onClick={() => setMetric('sales')}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition ${
                  metric === 'sales' ? 'bg-background border-border' : 'bg-muted/40 border-transparent text-muted-foreground'
                }`}
              >
                Sales
              </button>
              <button
                type="button"
                onClick={() => setMetric('units')}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition ${
                  metric === 'units' ? 'bg-background border-border' : 'bg-muted/40 border-transparent text-muted-foreground'
                }`}
              >
                Units
              </button>
            </div>

            {best && worst && overallMean > 0 && (
              <div className="mb-3 space-y-0.5">
                <div className="text-sm text-emerald-700">
                  {WEEKDAY_PLURAL[best.i]} sell best — {Math.round(((best.value - overallMean) / overallMean) * 100)}% above your weekday average.
                </div>
                {best.i !== worst.i && (
                  <div className="text-sm text-muted-foreground">
                    {WEEKDAY_PLURAL[worst.i]} are quietest — {Math.round(((overallMean - worst.value) / overallMean) * 100)}% below average.
                  </div>
                )}
              </div>
            )}

            <div ref={chartRef} style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer key={chartKey}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(val: any) => [fmt(Number(val)), metric === 'sales' ? `Avg sales (${cur.code})` : 'Avg units']} />
                  <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
