import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { usePythonKwWeekly, PythonKwRow } from '@/hooks/usePythonKwWeekly';
import { formatNumber, formatPercentage } from '@/utils/formatters';

interface Props {
  accountName: string;
}

const fmtWeek = (w: string) => {
  try {
    return format(new Date(w), 'dd MMM yyyy');
  } catch {
    return w;
  }
};

const num = (v: number | null | undefined) => (v == null ? 0 : Number(v) || 0);

export function PythonBrandAnalyticsPanel({ accountName }: Props) {
  const { rows, weeks, loading, error } = usePythonKwWeekly(accountName);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedWeek && weeks.length > 0) setSelectedWeek(weeks[0]);
  }, [weeks, selectedWeek]);

  const hasAnyBA = useMemo(() => rows.some((r) => r.has_ba), [rows]);

  const weekRows = useMemo(
    () => rows.filter((r) => r.week_start === selectedWeek),
    [rows, selectedWeek]
  );

  const kpis = useMemo(() => {
    const ba = weekRows.filter((r) => r.has_ba);
    const totalVolume = ba.reduce((s, r) => s + num(r.search_query_volume), 0);
    const volumeWeightedShare =
      totalVolume > 0
        ? ba.reduce(
            (s, r) => s + num(r.impressions_brand_share_pct) * num(r.search_query_volume),
            0
          ) / totalVolume
        : 0;
    const gapCount = weekRows.filter((r) => r.source === 'BA-only').length;
    return { totalVolume, volumeWeightedShare, gapCount };
  }, [weekRows]);

  const trend = useMemo(() => {
    const map = new Map<string, { volume: number; weighted: number }>();
    for (const r of rows) {
      if (!r.has_ba) continue;
      const v = num(r.search_query_volume);
      const s = num(r.impressions_brand_share_pct);
      const cur = map.get(r.week_start) || { volume: 0, weighted: 0 };
      cur.volume += v;
      cur.weighted += v * s;
      map.set(r.week_start, cur);
    }
    return Array.from(map.entries())
      .map(([w, v]) => ({
        week: w,
        weekLabel: fmtWeek(w),
        share: v.volume > 0 ? v.weighted / v.volume : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [rows]);

  const topQueries = useMemo(
    () =>
      weekRows
        .filter((r) => r.has_ba)
        .sort((a, b) => num(b.search_query_volume) - num(a.search_query_volume))
        .slice(0, 50),
    [weekRows]
  );

  const demandGaps = useMemo(
    () =>
      weekRows
        .filter((r) => r.source === 'BA-only')
        .sort((a, b) => num(b.search_query_volume) - num(a.search_query_volume))
        .slice(0, 50),
    [weekRows]
  );

  if (loading && rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Analytics & Keyword Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Analytics & Keyword Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!loading && (!rows.length || !hasAnyBA)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Analytics & Keyword Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              No Brand Analytics data supplied for this account.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-accent to-muted border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Brand Analytics & Keyword Intelligence
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                Weekly Brand Analytics + PPC merged view
                {selectedWeek ? ` · Week of ${fmtWeek(selectedWeek)}` : ''}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Week:</span>
            <Select value={selectedWeek ?? ''} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w} value={w}>
                    {fmtWeek(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiTile
            label="Total search query volume"
            value={formatNumber(kpis.totalVolume)}
            hint="Sum of BA search volume (selected week)"
          />
          <KpiTile
            label="Avg brand impression share"
            value={formatPercentage(kpis.volumeWeightedShare)}
            hint="Volume-weighted across BA terms"
          />
          <KpiTile
            label="BA-only demand gaps"
            value={kpis.gapCount.toLocaleString()}
            hint="High-demand queries with no PPC"
          />
        </div>

        {/* Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share of search-page impressions</CardTitle>
            <CardDescription>
              Brand impression share over time (volume-weighted across BA keywords)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="weekLabel" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Brand share']}
                  />
                  <Line
                    type="monotone"
                    dataKey="share"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Search Queries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Top Search Queries
            </CardTitle>
            <CardDescription>
              Selected week, ordered by search volume (top 50)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KeywordTable
              rows={topQueries}
              columns={['volume', 'click_rate', 'purchase_rate', 'purch_share']}
            />
          </CardContent>
        </Card>

        {/* Demand Gaps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Demand Gaps
            </CardTitle>
            <CardDescription>
              High-demand queries with no PPC presence yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KeywordTable rows={demandGaps} columns={['volume', 'purchase_rate']} />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function KpiTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground/70 mt-1">{hint}</div>}
    </div>
  );
}

function KeywordTable({
  rows,
  columns,
}: {
  rows: PythonKwRow[];
  columns: Array<'volume' | 'click_rate' | 'purchase_rate' | 'purch_share'>;
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No rows for this week.</p>;
  }
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Keyword</TableHead>
            {columns.includes('volume') && <TableHead className="text-right">Search Volume</TableHead>}
            {columns.includes('click_rate') && <TableHead className="text-right">Click Rate</TableHead>}
            {columns.includes('purchase_rate') && (
              <TableHead className="text-right">Purchase Rate</TableHead>
            )}
            {columns.includes('purch_share') && (
              <TableHead className="text-right">Purchases Brand Share</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.keyword}-${i}`}>
              <TableCell className="font-medium">{r.keyword}</TableCell>
              {columns.includes('volume') && (
                <TableCell className="text-right tabular-nums">
                  {formatNumber(num(r.search_query_volume))}
                </TableCell>
              )}
              {columns.includes('click_rate') && (
                <TableCell className="text-right tabular-nums">
                  {formatPercentage(num(r.click_rate_pct))}
                </TableCell>
              )}
              {columns.includes('purchase_rate') && (
                <TableCell className="text-right tabular-nums">
                  {formatPercentage(num(r.purchase_rate_pct))}
                </TableCell>
              )}
              {columns.includes('purch_share') && (
                <TableCell className="text-right tabular-nums">
                  {formatPercentage(num(r.purchases_brand_share_pct))}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
