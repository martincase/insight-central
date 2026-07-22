import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CountryScope } from './CountrySwitcher';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { useChartReady } from '@/hooks/useChartReady';
import { SalesByWeekdayCard } from './SalesByWeekdayCard';

type Lens = 'weekday' | 'temperature' | 'weather' | 'promotions';

interface Props {
  spid: string;
  scope: CountryScope;
  primaryCountry?: string | null;
}

interface SalesRow { bucket: string; units: number; sales_gbp: number; }
interface WxRow { record_date: string; temp_max: number | null; temp_min: number | null; temp_mean: number | null; precip_mm: number | null; sunshine_hours: number | null; }
interface EvRow { id: string; name: string; event_type: string; start_date: string; end_date: string; color?: string | null; }

const TEMP_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: '<5°', min: -Infinity, max: 5 },
  { label: '5–10°', min: 5, max: 10 },
  { label: '10–15°', min: 10, max: 15 },
  { label: '15–20°', min: 15, max: 20 },
  { label: '20–25°', min: 20, max: 25 },
  { label: '25°+', min: 25, max: Infinity },
];

function EmptyCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card className="rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 h-1.5" />
      <CardContent className="px-6 py-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export function SalesDriversTab({ spid, scope, primaryCountry }: Props) {
  const [lens, setLens] = useState<Lens>('weekday');
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [weather, setWeather] = useState<WxRow[]>([]);
  const [events, setEvents] = useState<EvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Long window (365 days) for weather lenses only
  const [salesLong, setSalesLong] = useState<SalesRow[]>([]);
  const [weatherLong, setWeatherLong] = useState<WxRow[]>([]);
  const [loadingLong, setLoadingLong] = useState(true);
  const [errorLong, setErrorLong] = useState<string | null>(null);

  const cur = getCurrencyInfo(scope);
  const fmtMoney = (v: number) =>
    `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v ?? 0)}`;

  const isRollup = scope === 'ALL_EU' || scope === 'ALL';
  const wxCountry = isRollup ? (primaryCountry || 'GB') : scope;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const today = new Date();
        const p_end = format(today, 'yyyy-MM-dd');
        const p_start = format(subDays(today, 83), 'yyyy-MM-dd');
        const [salesRes, wxRes, evRes] = await Promise.all([
          supabase.rpc('rpc_sales_timeseries', { p_spid: spid, p_scope: scope, p_start, p_end }),
          (supabase.rpc as any)('rpc_country_weather', { p_country: wxCountry, p_start, p_end }),
          (supabase.rpc as any)('rpc_events', { p_country: wxCountry, p_start, p_end }),
        ]);
        if (cancelled) return;
        if (salesRes.error) throw salesRes.error;
        setSales((salesRes.data as any) || []);
        setWeather(wxRes.error ? [] : ((wxRes.data as any) || []));
        setEvents(evRes.error ? [] : ((evRes.data as any) || []));
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load sales drivers data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spid, scope, wxCountry]);

  // Long window (365 days) for Temperature + Rain & sunshine lenses
  useEffect(() => {
    let cancelled = false;
    setLoadingLong(true);
    setErrorLong(null);
    (async () => {
      try {
        const today = new Date();
        const p_end = format(today, 'yyyy-MM-dd');
        const p_start = format(subDays(today, 364), 'yyyy-MM-dd');
        const [salesRes, wxRes] = await Promise.all([
          supabase.rpc('rpc_sales_timeseries', { p_spid: spid, p_scope: scope, p_start, p_end }),
          (supabase.rpc as any)('rpc_country_weather', { p_country: wxCountry, p_start, p_end }),
        ]);
        if (cancelled) return;
        if (salesRes.error) throw salesRes.error;
        setSalesLong((salesRes.data as any) || []);
        setWeatherLong(wxRes.error ? [] : ((wxRes.data as any) || []));
      } catch (e: any) {
        if (!cancelled) setErrorLong(e.message || 'Failed to load weather history');
      } finally {
        if (!cancelled) setLoadingLong(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spid, scope, wxCountry]);

  const { salesByDate, overallDailyMean, hasSales } = useMemo(() => {
    const map = new Map<string, number>();
    let sum = 0, count = 0;
    sales.forEach((r) => {
      const key = String(r.bucket).slice(0, 10);
      const v = Number(r.sales_gbp || 0);
      map.set(key, v);
      sum += v;
      count += 1;
    });
    return { salesByDate: map, overallDailyMean: count > 0 ? sum / count : 0, hasSales: count > 0 && sum > 0 };
  }, [sales]);

  const { salesByDateLong, hasSalesLong } = useMemo(() => {
    const map = new Map<string, number>();
    let sum = 0, count = 0;
    salesLong.forEach((r) => {
      const key = String(r.bucket).slice(0, 10);
      const v = Number(r.sales_gbp || 0);
      map.set(key, v);
      sum += v;
      count += 1;
    });
    return { salesByDateLong: map, hasSalesLong: count > 0 && sum > 0 };
  }, [salesLong]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm md:text-base">Sales Drivers</CardTitle>
        <div className="text-xs text-muted-foreground mt-1">What moves your sales · last 12 weeks</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {([
            { k: 'weekday', label: 'Day of week' },
            { k: 'temperature', label: 'Temperature' },
            { k: 'weather', label: 'Rain & sunshine' },
            { k: 'promotions', label: 'Promotions' },
          ] as Array<{ k: Lens; label: string }>).map((l) => (
            <button
              key={l.k}
              type="button"
              onClick={() => setLens(l.k)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition ${
                lens === l.k ? 'bg-background border-border' : 'bg-muted/40 border-transparent text-muted-foreground'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {lens === 'weekday' ? (
          <SalesByWeekdayCard spid={spid} scope={scope} />
        ) : lens === 'temperature' ? (
          loadingLong ? (
            <Skeleton className="h-64 w-full" />
          ) : errorLong ? (
            <div className="text-sm text-red-600 py-4">Error: {errorLong}</div>
          ) : !hasSalesLong ? (
            <EmptyCard title="Not enough data yet" subtitle="We need sales history to show what moves your sales. Check back soon." />
          ) : (
            <TemperatureLens weather={weatherLong} salesByDate={salesByDateLong} fmtMoney={fmtMoney} curCode={cur.code} />
          )
        ) : lens === 'weather' ? (
          loadingLong ? (
            <Skeleton className="h-64 w-full" />
          ) : errorLong ? (
            <div className="text-sm text-red-600 py-4">Error: {errorLong}</div>
          ) : !hasSalesLong ? (
            <EmptyCard title="Not enough data yet" subtitle="We need sales history to show what moves your sales. Check back soon." />
          ) : (
            <WeatherLens weather={weatherLong} salesByDate={salesByDateLong} fmtMoney={fmtMoney} curCode={cur.code} />
          )
        ) : loading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <div className="text-sm text-red-600 py-4">Error: {error}</div>
        ) : !hasSales ? (
          <EmptyCard title="Not enough data yet" subtitle="We need sales history to show what moves your sales. Check back soon." />
        ) : (
          <PromotionsLens events={events} salesByDate={salesByDate} fmtMoney={fmtMoney} curCode={cur.code} />
        )}
      </CardContent>
    </Card>
  );
}

function TemperatureLens({
  weather, salesByDate, fmtMoney, curCode,
}: { weather: WxRow[]; salesByDate: Map<string, number>; fmtMoney: (n: number) => string; curCode: string }) {
  const { chartData, joinedN, callouts } = useMemo(() => {
    const bandSums = new Array(TEMP_BANDS.length).fill(0);
    const bandCounts = new Array(TEMP_BANDS.length).fill(0);
    let n = 0;
    weather.forEach((w) => {
      const key = String(w.record_date).slice(0, 10);
      const sale = salesByDate.get(key);
      const t = w.temp_mean;
      if (sale == null || t == null) return;
      const idx = TEMP_BANDS.findIndex((b) => Number(t) >= b.min && Number(t) < b.max);
      if (idx < 0) return;
      bandSums[idx] += Number(sale);
      bandCounts[idx] += 1;
      n += 1;
    });
    const data = TEMP_BANDS.map((b, i) => ({
      label: b.label,
      value: bandCounts[i] > 0 ? bandSums[i] / bandCounts[i] : 0,
      count: bandCounts[i],
    })).filter((d) => d.count > 0);

    let calls: { best?: string; worst?: string } = {};
    if (data.length > 1) {
      const mean = data.reduce((s, d) => s + d.value, 0) / data.length;
      let best = data[0], worst = data[0];
      data.forEach((d) => { if (d.value > best.value) best = d; if (d.value < worst.value) worst = d; });
      if (mean > 0) {
        calls.best = `Sales run ${Math.round(((best.value - mean) / mean) * 100)}% above average on ${best.label} days.`;
        if (best.label !== worst.label) {
          calls.worst = `…and are quietest on ${worst.label} days.`;
        }
      }
    }
    return { chartData: data, joinedN: n, callouts: calls };
  }, [weather, salesByDate]);

  const { ref: chartRef, chartKey } = useChartReady(chartData.length);

  if (!weather || weather.length === 0) {
    return <EmptyCard title="Weather data isn't available for this account yet" subtitle="Temperature insights are coming soon." />;
  }
  if (chartData.length === 0) {
    return <EmptyCard title="Not enough overlapping weather & sales days" subtitle="We'll show temperature bands once more data is available." />;
  }

  return (
    <>
      {(callouts.best || callouts.worst) && (
        <div className="mb-3 space-y-0.5">
          {callouts.best && <div className="text-sm text-emerald-700">{callouts.best}</div>}
          {callouts.worst && <div className="text-sm text-muted-foreground">{callouts.worst}</div>}
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer key={chartKey}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => fmtMoney(v as number)} tick={{ fontSize: 11 }} width={70} />
            <Tooltip formatter={(val: any) => [fmtMoney(Number(val)), `Avg sales (${curCode})`]} />
            <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground mt-2">Based on {joinedN} days of weather data</div>
    </>
  );
}

function WeatherLens({
  weather, salesByDate, fmtMoney, curCode,
}: { weather: WxRow[]; salesByDate: Map<string, number>; fmtMoney: (n: number) => string; curCode: string }) {
  const hasWeather = !!(weather && weather.length > 0);


  const { wet, dry, sunny, cloudy, joinedN, hasSunshine } = useMemo(() => {
    const joined: Array<{ sale: number; precip: number | null; sun: number | null }> = [];
    weather.forEach((w) => {
      const key = String(w.record_date).slice(0, 10);
      const sale = salesByDate.get(key);
      if (sale == null) return;
      joined.push({ sale: Number(sale), precip: w.precip_mm == null ? null : Number(w.precip_mm), sun: w.sunshine_hours == null ? null : Number(w.sunshine_hours) });
    });

    const wetArr = joined.filter((r) => r.precip != null && (r.precip as number) >= 1).map((r) => r.sale);
    const dryArr = joined.filter((r) => r.precip != null && (r.precip as number) < 1).map((r) => r.sale);
    const wetAvg = wetArr.length > 0 ? wetArr.reduce((a, b) => a + b, 0) / wetArr.length : null;
    const dryAvg = dryArr.length > 0 ? dryArr.reduce((a, b) => a + b, 0) / dryArr.length : null;

    const sunVals = joined.map((r) => r.sun).filter((v): v is number => v != null);
    let sunnyAvg: number | null = null, cloudyAvg: number | null = null;
    let hasSun = false;
    if (sunVals.length > 0) {
      hasSun = true;
      const sorted = [...sunVals].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const sunnyArr = joined.filter((r) => r.sun != null && (r.sun as number) >= median).map((r) => r.sale);
      const cloudyArr = joined.filter((r) => r.sun != null && (r.sun as number) < median).map((r) => r.sale);
      sunnyAvg = sunnyArr.length > 0 ? sunnyArr.reduce((a, b) => a + b, 0) / sunnyArr.length : null;
      cloudyAvg = cloudyArr.length > 0 ? cloudyArr.reduce((a, b) => a + b, 0) / cloudyArr.length : null;
    }

    return {
      wet: { avg: wetAvg, n: wetArr.length },
      dry: { avg: dryAvg, n: dryArr.length },
      sunny: { avg: sunnyAvg, n: 0 },
      cloudy: { avg: cloudyAvg, n: 0 },
      joinedN: joined.length,
      hasSunshine: hasSun,
    };
  }, [weather, salesByDate]);

  const rainData = [
    { label: 'Dry', value: dry.avg ?? 0, has: dry.avg != null },
    { label: 'Wet', value: wet.avg ?? 0, has: wet.avg != null },
  ];
  const sunData = [
    { label: 'Sunny', value: sunny.avg ?? 0, has: sunny.avg != null },
    { label: 'Cloudy', value: cloudy.avg ?? 0, has: cloudy.avg != null },
  ];

  const rainTakeaway = dry.avg != null && wet.avg != null && wet.avg > 0
    ? `Dry days sell ${Math.round(((dry.avg - wet.avg) / wet.avg) * 100)}% more than wet days.`
    : null;
  const sunTakeaway = sunny.avg != null && cloudy.avg != null && cloudy.avg > 0
    ? `Sunny days sell ${Math.round(((sunny.avg - cloudy.avg) / cloudy.avg) * 100)}% more than cloudy days.`
    : null;

  const { ref: r1, chartKey: k1 } = useChartReady(rainData.length);
  const { ref: r2, chartKey: k2 } = useChartReady(sunData.length);

  if (!hasWeather) {
    return <EmptyCard title="Weather data isn't available for this account yet" subtitle="Rain & sunshine insights are coming soon." />;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium mb-1">Rain</div>
          <div className="text-xs text-muted-foreground mb-2 min-h-[16px]">{rainTakeaway || '—'}</div>
          <div ref={r1} style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer key={k1}>
              <BarChart data={rainData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => fmtMoney(v as number)} tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(val: any) => [fmtMoney(Number(val)), `Avg sales (${curCode})`]} />
                <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Sunshine</div>
          <div className="text-xs text-muted-foreground mb-2 min-h-[16px]">
            {hasSunshine ? (sunTakeaway || '—') : 'Sunshine data not available for this country.'}
          </div>
          {hasSunshine ? (
            <div ref={r2} style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer key={k2}>
                <BarChart data={sunData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmtMoney(v as number)} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(val: any) => [fmtMoney(Number(val)), `Avg sales (${curCode})`]} />
                  <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground bg-muted/30 rounded">
              No sunshine data
            </div>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-3">Based on {joinedN} days of weather data</div>
    </>
  );
}

function PromotionsLens({
  events, salesByDate, fmtMoney, curCode,
}: { events: EvRow[]; salesByDate: Map<string, number>; fmtMoney: (n: number) => string; curCode: string }) {
  const { dealAvg, normalAvg, dealN, normalN } = useMemo(() => {
    const isDeal = (dateKey: string) => events.some((e) => {
      const s = String(e.start_date).slice(0, 10);
      const en = String(e.end_date).slice(0, 10);
      return dateKey >= s && dateKey <= en;
    });
    let dSum = 0, dN = 0, nSum = 0, nN = 0;
    salesByDate.forEach((v, k) => {
      if (isDeal(k)) { dSum += v; dN += 1; } else { nSum += v; nN += 1; }
    });
    return {
      dealAvg: dN > 0 ? dSum / dN : null,
      normalAvg: nN > 0 ? nSum / nN : null,
      dealN: dN,
      normalN: nN,
    };
  }, [events, salesByDate]);

  const data = [
    { label: 'Normal days', value: normalAvg ?? 0, has: normalAvg != null },
    { label: 'Deal days', value: dealAvg ?? 0, has: dealAvg != null },
  ];

  const takeaway = dealAvg != null && normalAvg != null && normalAvg > 0
    ? `Sales are ${Math.round(((dealAvg - normalAvg) / normalAvg) * 100)}% higher on deal days.`
    : null;

  const { ref, chartKey } = useChartReady(data.length);

  return (
    <>
      {dealN === 0 ? (
        <div className="mb-3 text-sm text-muted-foreground">
          No promotions ran in the last 12 weeks — nothing to compare yet.
        </div>
      ) : takeaway ? (
        <div className="mb-3 text-sm text-emerald-700">{takeaway}</div>
      ) : null}
      <div ref={ref} style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer key={chartKey}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => fmtMoney(v as number)} tick={{ fontSize: 11 }} width={70} />
            <Tooltip formatter={(val: any) => [fmtMoney(Number(val)), `Avg sales (${curCode})`]} />
            <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        {dealN} deal day{dealN === 1 ? '' : 's'} · {normalN} normal day{normalN === 1 ? '' : 's'} in the last 12 weeks
      </div>
    </>
  );
}
