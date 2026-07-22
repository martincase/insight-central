import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChangeMarker } from '@/hooks/useChangeMarkers';

interface ChangeMarkerComparisonProps {
  markers: ChangeMarker[];
  accountName: string;
  merchantToken: string; // reliable unique identifier for PPC lookups
}

interface PeriodMetrics {
  spend: number;
  sales: number;
  impressions: number;
  clicks: number;
  orders: number;
  days: number;
}

const EMPTY_METRICS: PeriodMetrics = { spend: 0, sales: 0, impressions: 0, clicks: 0, orders: 0, days: 0 };

type WindowDays = 7 | 14 | 30;

const fetchProfileId = async (merchantToken: string): Promise<number | null> => {
  const { data } = await supabase
    .from('accounts_master')
    .select('profile_id')
    .eq('merchant_token', merchantToken)
    .single();
  return data?.profile_id ?? null;
};

const fetchPpcForPeriod = async (
  profileId: number,
  startDate: string,
  endDate: string,
): Promise<PeriodMetrics> => {
  let totalSpend = 0, totalSales = 0, totalImpressions = 0, totalClicks = 0, totalOrders = 0;
  const datesSet = new Set<string>();

  // SP campaigns
  const { data: spData } = await supabase
    .from('amazon_api_campaigns_performance')
    .select('date,impressions,clicks,spend,sales_7d,orders_7d')
    .eq('profile_id', profileId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (spData) {
    for (const row of spData) {
      totalImpressions += Number(row.impressions) || 0;
      totalClicks += Number(row.clicks) || 0;
      totalSpend += Number(row.spend) || 0;
      totalSales += Number(row.sales_7d) || 0;
      totalOrders += Number(row.orders_7d) || 0;
      if (row.date) datesSet.add(row.date);
    }
  }

  // SB campaigns
  const { data: sbData } = await supabase
    .from('amazon_api_sb_campaigns_performance')
    .select('date,impressions,clicks,cost,sales_14d,purchases_14d')
    .eq('profile_id', profileId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (sbData) {
    for (const row of sbData) {
      totalImpressions += Number(row.impressions) || 0;
      totalClicks += Number(row.clicks) || 0;
      totalSpend += Number(row.cost) || 0;
      totalSales += Number(row.sales_14d) || 0;
      totalOrders += Number(row.purchases_14d) || 0;
      if (row.date) datesSet.add(row.date);
    }
  }

  // SD campaigns
  const { data: sdData } = await supabase
    .from('amazon_api_sd_campaigns_performance')
    .select('date,impressions,clicks,cost,sales_14d,purchases_14d')
    .eq('profile_id', profileId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (sdData) {
    for (const row of sdData) {
      totalImpressions += Number(row.impressions) || 0;
      totalClicks += Number(row.clicks) || 0;
      totalSpend += Number(row.cost) || 0;
      totalSales += Number(row.sales_14d) || 0;
      totalOrders += Number(row.purchases_14d) || 0;
      if (row.date) datesSet.add(row.date);
    }
  }

  return {
    spend: totalSpend,
    sales: totalSales,
    impressions: totalImpressions,
    clicks: totalClicks,
    orders: totalOrders,
    days: datesSet.size,
  };
};

const computeDerived = (m: PeriodMetrics) => ({
  acos: m.sales > 0 ? (m.spend / m.sales) * 100 : 0,
  ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
  cvr: m.clicks > 0 ? (m.orders / m.clicks) * 100 : 0,
});

interface MetricRow {
  label: string;
  beforeVal: string;
  afterVal: string;
  delta: string;
  good: boolean | null; // true=green, false=red, null=neutral
}

const fmtCur = (v: number) => `£${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNum = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const lowerBetter = new Set(['acos', 'spend']);

const buildRows = (before: PeriodMetrics, after: PeriodMetrics): MetricRow[] => {
  const bD = computeDerived(before);
  const aD = computeDerived(after);

  const row = (label: string, bv: number, av: number, fmt: (v: number) => string, key: string, isPts = false): MetricRow => {
    const diff = av - bv;
    const pctDiff = bv !== 0 ? (diff / Math.abs(bv)) * 100 : av !== 0 ? 100 : 0;
    const deltaStr = isPts
      ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}pts`
      : `${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)}%`;
    const isLower = lowerBetter.has(key);
    const good = Math.abs(diff) < 0.01 ? null : isLower ? diff < 0 : diff > 0;
    return { label, beforeVal: fmt(bv), afterVal: fmt(av), delta: deltaStr, good };
  };

  return [
    row('PPC Spend', before.spend, after.spend, fmtCur, 'spend'),
    row('PPC Sales', before.sales, after.sales, fmtCur, 'sales'),
    row('ACoS', bD.acos, aD.acos, fmtPct, 'acos', true),
    row('Impressions', before.impressions, after.impressions, fmtNum, 'impressions'),
    row('Clicks', before.clicks, after.clicks, fmtNum, 'clicks'),
    row('CTR', bD.ctr, aD.ctr, fmtPct, 'ctr', true),
    row('CVR', bD.cvr, aD.cvr, fmtPct, 'cvr', true),
    row('Orders', before.orders, after.orders, fmtNum, 'orders'),
  ];
};

const MarkerCard: React.FC<{
  marker: ChangeMarker;
  merchantToken: string;
  window: WindowDays;
}> = ({ marker, merchantToken, window: windowDays }) => {
  const [before, setBefore] = useState<PeriodMetrics>(EMPTY_METRICS);
  const [after, setAfter] = useState<PeriodMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const profileId = await fetchProfileId(merchantToken);
      if (!profileId || cancelled) { setLoading(false); return; }

      const eventDate = new Date(marker.event_date);
      const beforeEnd = new Date(eventDate);
      beforeEnd.setDate(beforeEnd.getDate() - 1);
      const beforeStart = new Date(beforeEnd);
      beforeStart.setDate(beforeStart.getDate() - windowDays + 1);

      const afterStart = new Date(eventDate);
      const afterEnd = new Date(afterStart);
      afterEnd.setDate(afterEnd.getDate() + windowDays - 1);
      const today = new Date();
      if (afterEnd > today) afterEnd.setTime(today.getTime());

      const [b, a] = await Promise.all([
        fetchPpcForPeriod(profileId, beforeStart.toISOString().slice(0, 10), beforeEnd.toISOString().slice(0, 10)),
        fetchPpcForPeriod(profileId, afterStart.toISOString().slice(0, 10), afterEnd.toISOString().slice(0, 10)),
      ]);
      if (!cancelled) { setBefore(b); setAfter(a); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [marker.event_date, merchantToken, windowDays]);

  const rows = useMemo(() => buildRows(before, after), [before, after]);
  const afterCaveat = after.days < windowDays ? `${after.days} of ${windowDays} days` : null;

  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 bg-muted/30 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">{marker.event_label}</h4>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {format(new Date(marker.event_date), 'dd MMM yyyy')}
          </p>
        </div>
        {afterCaveat && (
          <Badge variant="outline" className="text-[10px] shrink-0 gap-1 text-amber-600 border-amber-300">
            <Info className="h-3 w-3" />
            {afterCaveat}
          </Badge>
        )}
      </div>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Metric</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Before</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">After</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Delta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-border/15 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{row.beforeVal}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{row.afterVal}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={cn(
                        'inline-flex items-center gap-0.5 font-semibold tabular-nums',
                        row.good === true && 'text-emerald-600 dark:text-emerald-400',
                        row.good === false && 'text-red-500 dark:text-red-400',
                        row.good === null && 'text-muted-foreground',
                      )}>
                        {row.good === true && <TrendingUp className="h-3 w-3" />}
                        {row.good === false && <TrendingDown className="h-3 w-3" />}
                        {row.good === null && <Minus className="h-3 w-3" />}
                        {row.delta}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {marker.change_notes && (
              <div className="px-4 py-3 border-t border-border/30 bg-muted/10">
                <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{marker.change_notes}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const ChangeMarkerComparison: React.FC<ChangeMarkerComparisonProps> = ({ markers, merchantToken }) => {
  const [windowDays, setWindowDays] = useState<WindowDays>(7);

  if (markers.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Change Impact Analysis</h3>
          <Badge variant="secondary" className="text-[10px]">{markers.length} marker{markers.length > 1 ? 's' : ''}</Badge>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {([7, 14, 30] as WindowDays[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindowDays(w)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all',
                windowDays === w
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {w}D
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {markers.map((m) => (
          <MarkerCard key={m.id} marker={m} merchantToken={merchantToken} window={windowDays} />
        ))}
      </div>
    </div>
  );
};
