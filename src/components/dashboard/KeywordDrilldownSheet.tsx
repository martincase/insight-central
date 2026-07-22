import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subWeeks, startOfWeek } from 'date-fns';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/formatters';
import type { KeywordPriorityRow, Verdict } from '@/hooks/useKeywordPriority';

const verdictStyle = (v: Verdict | null | undefined): string => {
  switch (v) {
    case 'Working':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Scale':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Fix':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Cut':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const fmtCur = (v: number | null | undefined) => (v == null ? '—' : formatCurrency(Number(v)));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : formatPercentage(Number(v)));
const fmtNum = (v: number | null | undefined) => (v == null ? '—' : formatNumber(Number(v)));

interface Props {
  row: KeywordPriorityRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accountName: string;
  profileId: string | null;
  isAdsApi: boolean;
}

interface WeeklyPoint {
  week: string;
  weekLabel: string;
  spend: number;
  sales: number;
  imp_share: number | null;
  pur_share: number | null;
}

interface CampaignAggRow {
  campaign_name: string;
  match_type: string;
  clicks: number;
  spend: number;
  sales: number;
}

export function KeywordDrilldownSheet({
  row,
  open,
  onOpenChange,
  accountName,
  profileId,
  isAdsApi,
}: Props) {
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignAggRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // (a/b) Weekly trend
        if (!isAdsApi) {
          // Pipeline view — use vw_python_kw_weekly
          const { data } = await supabase
            .from('vw_python_kw_weekly' as any)
            .select('week_start,spend,sales,impressions_brand_share_pct,purchases_brand_share_pct')
            .eq('account_name', accountName)
            .eq('keyword', row.keyword)
            .order('week_start', { ascending: true });
          const all = ((data || []) as any[])
            .slice(-13)
            .map((r) => ({
              week: r.week_start,
              weekLabel: (() => {
                try {
                  return format(new Date(r.week_start), 'dd MMM');
                } catch {
                  return r.week_start;
                }
              })(),
              spend: Number(r.spend) || 0,
              sales: Number(r.sales) || 0,
              imp_share: r.impressions_brand_share_pct == null ? null : Number(r.impressions_brand_share_pct),
              pur_share: r.purchases_brand_share_pct == null ? null : Number(r.purchases_brand_share_pct),
            }));
          if (!cancelled) setWeekly(all);
        } else if (profileId) {
          // ads_api — aggregate from amazon_api_search_terms_performance
          const since = format(subWeeks(new Date(), 13), 'yyyy-MM-dd');
          const { data } = await supabase
            .from('amazon_api_search_terms_performance' as any)
            .select('date_start,spend,sales_7d')
            .eq('profile_id', profileId)
            .eq("search_term", row.keyword)
            .gte('date_start', since);
          const buckets = new Map<string, { spend: number; sales: number }>();
          for (const r of (data || []) as any[]) {
            const wk = format(startOfWeek(new Date(r.date_start), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const cur = buckets.get(wk) || { spend: 0, sales: 0 };
            cur.spend += Number(r.spend) || 0;
            cur.sales += Number(r.sales_7d) || 0;
            buckets.set(wk, cur);
          }
          const points = Array.from(buckets.entries())
            .map(([wk, v]) => ({
              week: wk,
              weekLabel: format(new Date(wk), 'dd MMM'),
              spend: v.spend,
              sales: v.sales,
              imp_share: null,
              pur_share: null,
            }))
            .sort((a, b) => a.week.localeCompare(b.week));
          if (!cancelled) setWeekly(points);
        } else {
          if (!cancelled) setWeekly([]);
        }

        // (c) Where it runs
        if (profileId) {
          const since = format(subWeeks(new Date(), 13), 'yyyy-MM-dd');
          const { data } = await supabase
            .from('amazon_api_search_terms_performance' as any)
            .select('campaign_name,match_type,clicks,spend,sales_7d')
            .eq('profile_id', profileId)
            .eq("search_term", row.keyword)
            .gte('date_start', since);
          const agg = new Map<string, CampaignAggRow>();
          for (const r of (data || []) as any[]) {
            const key = `${r.campaign_name || '—'}|${r.match_type || '—'}`;
            const cur =
              agg.get(key) ||
              {
                campaign_name: r.campaign_name || '—',
                match_type: r.match_type || '—',
                clicks: 0,
                spend: 0,
                sales: 0,
              };
            cur.clicks += Number(r.clicks) || 0;
            cur.spend += Number(r.spend) || 0;
            cur.sales += Number(r.sales_7d) || 0;
            agg.set(key, cur);
          }
          const list = Array.from(agg.values())
            .sort((a, b) => b.spend - a.spend)
            .slice(0, 10);
          if (!cancelled) setCampaigns(list);
        } else {
          if (!cancelled) setCampaigns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row?.keyword, accountName, profileId, isAdsApi]);

  const hasShareData = useMemo(
    () => weekly.some((w) => w.imp_share != null || w.pur_share != null),
    [weekly],
  );

  if (!row) return null;
  const overTarget =
    row.acos != null && row.target_acos != null && Number(row.acos) > Number(row.target_acos);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span className="break-all">{row.keyword}</span>
            {row.verdict && (
              <span
                className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${verdictStyle(
                  row.verdict,
                )}`}
              >
                {row.verdict}
              </span>
            )}
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              Priority{' '}
              <span className="font-bold text-foreground">{row.priority_score ?? '—'}</span>
            </span>
          </SheetTitle>
          {row.verdict_reason && (
            <SheetDescription className="text-xs">{row.verdict_reason}</SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Search volume" value={fmtNum(row.sq_volume)} />
            <Stat
              label="Our CVR / market"
              value={`${fmtPct(row.our_cvr_pct)} / ${fmtPct(row.market_cvr_pct)}`}
            />
            <Stat label="Purchase share" value={fmtPct(row.purchase_share_pct)} />
            <Stat label="Impression share" value={fmtPct(row.impressions_share_pct)} />
            <Stat label="Spend" value={fmtCur(row.ppc_spend)} />
            <Stat label="Sales" value={fmtCur(row.ppc_sales)} />
            <Stat
              label="ACOS vs target"
              value={`${fmtPct(row.acos)} / ${row.target_acos != null ? `${Number(row.target_acos).toFixed(0)}%` : '—'}`}
              valueClass={overTarget ? 'text-red-600' : row.acos != null ? 'text-green-600' : ''}
            />
            <Stat
              label="Last 14d"
              value={`${fmtCur(row.spend_14d)} → ${fmtCur(row.sales_14d)}`}
            />
          </div>

          {/* Trend charts */}
          <div>
            <div className="text-sm font-semibold mb-2">Weekly trend (last 13 weeks)</div>
            {loading && weekly.length === 0 ? (
              <Skeleton className="h-56 w-full" />
            ) : weekly.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center border rounded-md">
                No weekly data available for this keyword.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="weekLabel" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <RTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                        formatter={(v: any) => formatCurrency(Number(v))}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="spend" fill="#ef4444" name="Spend" />
                      <Bar dataKey="sales" fill="#22c55e" name="Sales" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {!isAdsApi && hasShareData && (
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weekly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="weekLabel" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <YAxis
                          fontSize={11}
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                        />
                        <RTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                          formatter={(v: any) => `${Number(v).toFixed(2)}%`}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          type="monotone"
                          dataKey="imp_share"
                          stroke="#3b82f6"
                          name="Impressions brand share"
                          dot={{ r: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="pur_share"
                          stroke="#22c55e"
                          name="Purchases brand share"
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Where it runs */}
          <div>
            <div className="text-sm font-semibold mb-2">Where it runs (last 13 weeks)</div>
            {!profileId ? (
              <div className="text-xs text-muted-foreground py-4 text-center border rounded-md">
                No Ads API link for this account.
              </div>
            ) : loading && campaigns.length === 0 ? (
              <Skeleton className="h-24 w-full" />
            ) : campaigns.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center border rounded-md">
                No campaign-level activity found for this keyword.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{c.campaign_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {c.match_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(c.clicks)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(c.spend)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(c.sales)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums mt-0.5 ${valueClass || ''}`}>{value}</div>
    </div>
  );
}

export default KeywordDrilldownSheet;
