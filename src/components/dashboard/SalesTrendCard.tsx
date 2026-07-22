import { useEffect, useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCountryName, getCountryFlagImage } from '@/utils/countryUtils';
import { CountryScope } from './CountrySwitcher';
import { DateFilter } from '@/types/dashboard';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { useChartReady } from '@/hooks/useChartReady';

interface Props {
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
  onDrilldown?: (from: Date, to: Date) => void;
  primaryCountry?: string | null;
}

interface TimeseriesRow { bucket: string; units: number; sales_gbp: number; sales_native?: number | null; currency?: string | null; }
interface TimeseriesByCountryRow { bucket: string; country_code: string; units: number; sales_gbp: number; }
interface EventRow { id: string; name: string; event_type: string | null; start_date: string; end_date: string; color: string | null; }
interface WeatherRow { record_date: string; temp_max: number | null; temp_min: number | null; temp_mean: number | null; precip_mm: number | null; sunshine_hours: number | null; }




const COUNTRY_COLORS: Record<string, string> = {
  GB: '#2563EB', DE: '#F59E0B', FR: '#EF4444', IT: '#10B981', ES: '#8B5CF6', US: '#0EA5E9', AU: '#EC4899',
};
const FALLBACK_COLORS = ['#14B8A6', '#F97316', '#A855F7', '#84CC16', '#DC2626'];
const colorFor = (cc: string, i: number) => COUNTRY_COLORS[cc] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

export function SalesTrendCard({ spid, scope, dateFilter, customDateRange, onDrilldown, primaryCountry }: Props) {
  const [seriesTotal, setSeriesTotal] = useState<TimeseriesRow[]>([]);
  const [seriesByCountry, setSeriesByCountry] = useState<TimeseriesByCountryRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [weather, setWeather] = useState<WeatherRow[]>([]);
  const [showWeather, setShowWeather] = useState(false);
  const [visibleCountries, setVisibleCountries] = useState<Set<string>>(new Set());
  const [showTotal, setShowTotal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  const range = useMemo(() => getCurrentDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const pStart = useMemo(() => format(range.from, 'yyyy-MM-dd'), [range.from]);
  const pEnd = useMemo(() => format(range.to, 'yyyy-MM-dd'), [range.to]);

  const isRollup = scope === 'ALL_EU' || scope === 'ALL';
  const wxCountry = isRollup ? (primaryCountry || 'GB') : scope;
  const wxCountryName = getCountryName(wxCountry);
  const cur = getCurrencyInfo(scope);
  const fmtMoney = (v: number) =>
    `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v ?? 0)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [tsRes, tsCountryRes, evRes, wxRes] = await Promise.all([
          supabase.rpc('rpc_sales_timeseries', { p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd }),
          (supabase.rpc as any)('rpc_sales_timeseries_by_country', { p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd }),
          (supabase.rpc as any)('rpc_events', { p_country: wxCountry, p_start: pStart, p_end: pEnd }),
          (supabase.rpc as any)('rpc_country_weather', { p_country: wxCountry, p_start: pStart, p_end: pEnd }),
        ]);
        if (cancelled) return;
        if (tsRes.error) throw tsRes.error;
        setSeriesTotal((tsRes.data as any) || []);
        setSeriesByCountry(tsCountryRes?.error ? [] : ((tsCountryRes?.data as any) || []));
        setEvents(evRes?.error ? [] : ((evRes?.data as any) || []));
        setWeather(wxRes?.error ? [] : ((wxRes?.data as any) || []));
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || 'Failed to load trend data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spid, scope, pStart, pEnd, wxCountry]);

  const trendCountries = useMemo(() => {
    const set = new Set<string>();
    const ordered: string[] = [];
    seriesByCountry.forEach((r) => { if (!set.has(r.country_code)) { set.add(r.country_code); ordered.push(r.country_code); } });
    return ordered;
  }, [seriesByCountry]);

  useEffect(() => {
    if (trendCountries.length > 0 && visibleCountries.size === 0) {
      setVisibleCountries(new Set(trendCountries));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendCountries.join(',')]);

  const pivotedSeries = useMemo(() => {
    const totalByBucket = new Map<string, number>();
    seriesTotal.forEach((r) => {
      const v = r.currency ? Number(r.sales_native || 0) : Number(r.sales_gbp || 0);
      totalByBucket.set(r.bucket, v);
    });
    const byBucket = new Map<string, Record<string, any>>();
    seriesByCountry.forEach((r) => {
      const row = byBucket.get(r.bucket) || { bucket: r.bucket };
      row[r.country_code] = Number(r.sales_gbp || 0);
      byBucket.set(r.bucket, row);
    });
    const wxByDate = new Map<string, number | null>();
    weather.forEach((w) => wxByDate.set(w.record_date, w.temp_mean != null ? Number(w.temp_mean) : null));
    const buckets = new Set<string>([...byBucket.keys(), ...totalByBucket.keys()]);
    return Array.from(buckets).sort().map((b) => {
      const row = byBucket.get(b) || { bucket: b };
      row.__total = totalByBucket.get(b) ?? 0;
      const key = b.length >= 10 ? b.slice(0, 10) : b;
      row.__temp = wxByDate.has(key) ? wxByDate.get(key) : (wxByDate.get(b) ?? null);
      return row;
    });
  }, [seriesByCountry, seriesTotal, weather]);
  const { ref: chartRef, chartKey } = useChartReady(pivotedSeries.length);

  const bucketList = useMemo(() => pivotedSeries.map((r: any) => r.bucket as string), [pivotedSeries]);
  const eventBands = useMemo(() => {
    if (bucketList.length === 0) return [] as { id: string; name: string; color: string; x1: string; x2: string }[];
    return events
      .map((ev) => {
        const s = (ev.start_date || '').slice(0, 10);
        const e = (ev.end_date || ev.start_date || '').slice(0, 10);
        const x1 = bucketList.find((b) => b.slice(0, 10) >= s) || null;
        let x2: string | null = null;
        for (let i = bucketList.length - 1; i >= 0; i--) {
          if (bucketList[i].slice(0, 10) <= e) { x2 = bucketList[i]; break; }
        }
        if (!x1 || !x2 || x1 > x2) return null;
        return { id: ev.id, name: ev.name, color: ev.color || '#F59E0B', x1, x2 };
      })
      .filter(Boolean) as { id: string; name: string; color: string; x1: string; x2: string }[];
  }, [events, bucketList]);

  const handleEventDrilldown = (evId: string) => {
    const ev = events.find((e) => e.id === evId);
    if (!ev || !onDrilldown) return;
    const s = new Date(ev.start_date);
    const e = new Date(ev.end_date || ev.start_date);
    onDrilldown(addDays(s, -3), addDays(e, 3));
  };

  const toggleCountryVisible = (cc: string) => {
    setVisibleCountries((prev) => {
      const next = new Set(prev);
      if (next.has(cc)) next.delete(cc); else next.add(cc);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm md:text-base">Daily Sales Trend ({cur.code})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : error ? (
          <div className="text-sm text-red-600 py-4">Error: {error}</div>
        ) : pivotedSeries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No data for the selected range.</div>
        ) : (
          <>
            {isRollup && trendCountries.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {trendCountries.map((cc, i) => {
                  const active = visibleCountries.has(cc);
                  const color = colorFor(cc, i);
                  const flag = getCountryFlagImage(cc);
                  return (
                    <button
                      key={cc}
                      type="button"
                      onClick={() => toggleCountryVisible(cc)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition ${
                        active ? 'bg-background border-border' : 'bg-muted/40 border-transparent text-muted-foreground'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? color : 'transparent', border: active ? 'none' : `1px solid ${color}` }} />
                      {flag && <img src={flag} alt="" className="h-3 w-4 object-cover rounded-sm" />}
                      {getCountryName(cc)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowTotal((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition ${
                    showTotal ? 'bg-background border-border' : 'bg-muted/40 border-transparent text-muted-foreground'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: showTotal ? '#0F172A' : 'transparent', border: showTotal ? 'none' : '1px solid #0F172A' }} />
                  All (total)
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap mb-3">
              {events.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Events:</span>
                  <Select onValueChange={(v) => handleEventDrilldown(v)}>
                    <SelectTrigger className="h-7 w-[220px] text-xs">
                      <SelectValue placeholder={`${events.length} event${events.length === 1 ? '' : 's'} in range`} />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id} className="text-xs">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: ev.color || '#F59E0B' }} />
                            {ev.name}
                            <span className="text-muted-foreground">
                              {format(new Date(ev.start_date), 'dd MMM')}
                              {ev.end_date && ev.end_date !== ev.start_date ? `–${format(new Date(ev.end_date), 'dd MMM')}` : ''}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {weather.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowWeather((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs transition ${
                    showWeather ? 'bg-background border-border' : 'bg-muted/40 border-transparent text-muted-foreground'
                  }`}
                  title={`${wxCountryName} capital-city daily mean temperature`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: showWeather ? '#64748B' : 'transparent', border: showWeather ? 'none' : '1px solid #64748B' }} />
                  Weather · {wxCountryName} (°C)
                </button>
              )}
            </div>

            <div ref={chartRef} style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer key={chartKey}>
                <LineChart data={pivotedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tickFormatter={(v) => format(new Date(v), 'dd MMM')} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => fmtMoney(v as number)} tick={{ fontSize: 11 }} width={70} />
                  {showWeather && (
                    <YAxis
                      yAxisId="temp"
                      orientation="right"
                      tickFormatter={(v) => `${Math.round(Number(v))}°`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      width={40}
                      label={{ value: `Temp °C (${wxCountryName})`, angle: 90, position: 'insideRight', fontSize: 10, fill: '#64748B' }}
                    />
                  )}
                  <Tooltip
                    labelFormatter={(v) => format(new Date(v as string), 'dd MMM yyyy')}
                    formatter={(val: any, key: string) => {
                      if (key === '__total') return [fmtMoney(Number(val)), `All (${cur.code})`];
                      if (key === '__temp') return [val != null ? `${Number(val).toFixed(1)} °C` : '—', `Temp (${wxCountryName})`];
                      return [fmtMoney(Number(val)), getCountryName(key)];
                    }}
                  />

                  {eventBands.map((b) => (
                    <ReferenceArea
                      key={b.id}
                      yAxisId="left"
                      x1={b.x1}
                      x2={b.x2}
                      fill={b.color}
                      fillOpacity={0.12}
                      stroke={b.color}
                      strokeOpacity={0.35}
                      ifOverflow="hidden"
                      label={{ value: b.name, position: 'insideTop', fontSize: 10, fill: b.color }}
                    />
                  ))}

                  {isRollup ? (
                    <>
                      {trendCountries.map((cc, i) =>
                        visibleCountries.has(cc) ? (
                          <Line key={cc} yAxisId="left" type="monotone" dataKey={cc} stroke={colorFor(cc, i)} strokeWidth={2} dot={false} name={getCountryName(cc)} isAnimationActive={false} />
                        ) : null
                      )}
                      {showTotal && (
                        <Line yAxisId="left" type="monotone" dataKey="__total" stroke="#0F172A" strokeWidth={2} strokeDasharray="4 3" dot={false} name={`All (${cur.code})`} isAnimationActive={false} />
                      )}
                    </>
                  ) : (
                    <Line yAxisId="left" type="monotone" dataKey="__total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name={`Sales (${cur.code})`} isAnimationActive={false} />
                  )}
                  {showWeather && (
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="__temp"
                      stroke="#64748B"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      connectNulls
                      name={`Temp (${wxCountryName})`}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
