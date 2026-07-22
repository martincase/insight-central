import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Upload, History, Wallet } from 'lucide-react';
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { useChartReady } from '@/hooks/useChartReady';
import type { AddonSectionProps } from '@/addons/registry';
import { BudgetUploadDialog } from './BudgetUploadDialog';

interface SummaryRow {
  metric: 'sales' | 'ppc_spend' | string;
  currency: string;
  mtd_actual_gbp: number;
  mtd_budget_gbp: number;
  mtd_pace_pct: number | null;
  ytd_actual_gbp: number;
  ytd_budget_gbp: number;
  ytd_pace_pct: number | null;
  full_year_budget_gbp: number;
  projected_full_year_gbp: number;
  projected_vs_budget_pct: number | null;
  has_budget: boolean;
  mtd_actual_native?: number;
  mtd_budget_native?: number;
  ytd_actual_native?: number;
  ytd_budget_native?: number;
  full_year_budget_native?: number;
  projected_full_year_native?: number;
}

interface VsActualRow {
  metric: string;
  period_month: string;
  budget_native: number;
  budget_gbp: number;
  actual_native: number;
  actual_gbp: number;
  variance_gbp: number;
  variance_pct: number | null;
  currency: string;
  is_future: boolean;
}

interface AlertRow {
  metric: string;
  severity: 'ok' | 'warn' | 'high';
  ytd_pace_pct: number | null;
  message: string;
}

interface VersionRow {
  id: string;
  label: string;
  fiscal_year: number;
  status: string;
  created_at: string;
  source_file_name?: string | null;
  is_active?: boolean;
}

const METRIC_LABELS: Record<string, string> = {
  sales: 'Sales',
  ppc_spend: 'PPC Spend',
};

function paceTone(metric: string, pace: number | null | undefined): { color: string; label: string } {
  if (pace == null || !Number.isFinite(pace)) return { color: 'text-muted-foreground', label: '—' };
  const isCost = metric === 'ppc_spend';
  if (isCost) {
    if (pace <= 100) return { color: 'text-green-600', label: 'On track' };
    if (pace <= 110) return { color: 'text-amber-600', label: 'Watch' };
    return { color: 'text-red-600', label: 'Over budget' };
  }
  if (pace >= 100) return { color: 'text-green-600', label: 'On track' };
  if (pace >= 90) return { color: 'text-amber-600', label: 'Watch' };
  return { color: 'text-red-600', label: 'Behind' };
}

export function BudgetsSection(props: AddonSectionProps) {
  const { spid, scope, brandName, config, readOnly } = props;
  const [showGbp, setShowGbp] = useState(false);
  const [summary, setSummary] = useState<SummaryRow[] | null>(null);
  const [monthly, setMonthly] = useState<VsActualRow[] | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [grain, setGrain] = useState<'week' | 'month'>('week');

  const fyStartMonth = Math.min(12, Math.max(1, Number(config?.fiscal_year_start_month ?? 1)));
  const configFiscalYear = Number(config?.fiscal_year ?? new Date().getFullYear());
  const metricsToShow: string[] = Array.isArray(config?.metrics) ? config!.metrics : ['sales', 'ppc_spend'];
  const asof = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const cur = getCurrencyInfo(scope === 'ALL' || scope === 'ALL_EU' ? 'GB' : scope);
  const isRollup = scope === 'ALL' || scope === 'ALL_EU';
  const effectiveGbp = showGbp || isRollup;
  const displayCur = effectiveGbp ? getCurrencyInfo('GB') : cur;

  const fmtMoney = useCallback(
    (v: number | null | undefined) => {
      const n = Number(v || 0);
      return `${displayCur.symbol}${new Intl.NumberFormat(displayCur.locale, { maximumFractionDigits: 0 }).format(n)}`;
    },
    [displayCur],
  );
  const fmtPct = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(1)}%`);

  const load = useCallback(async () => {
    if (!spid) return;
    setLoading(true);
    try {
      const [sumRes, vsRes, alRes, verRes] = await Promise.all([
        (supabase.rpc as any)('rpc_budget_summary', {
          p_spid: spid,
          p_scope: scope,
          p_asof: asof,
        }),
        (supabase.rpc as any)('rpc_budget_vs_actual', {
          p_spid: spid,
          p_scope: scope,
          p_start: null,
          p_end: null,
          p_metric: 'all',
          p_grain: grain,
        }),
        (supabase.rpc as any)('rpc_budget_alerts', {
          p_spid: spid,
          p_scope: scope,
          p_asof: asof,
        }),
        (supabase.rpc as any)('rpc_budget_versions', { p_spid: spid }),
      ]);
      setSummary((sumRes?.data as SummaryRow[]) || []);
      setMonthly((vsRes?.data as VsActualRow[]) || []);
      const al = ((alRes?.data as AlertRow[]) || []).filter((a) => a.severity === 'warn' || a.severity === 'high');
      setAlerts(al);
      setVersions((verRes?.data as VersionRow[]) || []);
    } catch (e) {
      console.error('BudgetsSection load error', e);
      setSummary([]);
      setMonthly([]);
      setAlerts([]);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [spid, scope, asof, grain]);

  useEffect(() => {
    load();
  }, [load]);

  const activeFiscalYear = useMemo(() => {
    const active = versions.find((v) => v.is_active);
    return Number(active?.fiscal_year ?? configFiscalYear);
  }, [versions, configFiscalYear]);

  const fiscalYearLabel = useMemo(() => {
    const yy = String(activeFiscalYear).slice(-2);
    if (fyStartMonth === 1) return `FY${activeFiscalYear}`;
    // FY starting in `activeFiscalYear` (backend convention: fiscal_year = start year).
    const startDate = new Date(activeFiscalYear, fyStartMonth - 1, 1);
    const endDate = new Date(activeFiscalYear + 1, fyStartMonth - 1, 0);
    return `FY${yy} (${format(startDate, 'MMM yyyy')} – ${format(endDate, 'MMM yyyy')})`;
  }, [activeFiscalYear, fyStartMonth]);


  const summaryByMetric = useMemo(() => {
    const m = new Map<string, SummaryRow>();
    (summary || []).forEach((r) => m.set(r.metric, r));
    return m;
  }, [summary]);

  const valMoney = (native: number | undefined, gbp: number | undefined): number => {
    if (effectiveGbp) return Number(gbp || 0);
    return Number(native ?? gbp ?? 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg md:text-xl font-semibold">Budgets · {fiscalYearLabel}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => setGrain('week')}
              className={`px-2.5 py-1 text-xs ${grain === 'week' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setGrain('month')}
              className={`px-2.5 py-1 text-xs border-l ${grain === 'month' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}
            >
              Month
            </button>
          </div>
          {!isRollup && (
            <div className="flex items-center gap-2">
              <Label htmlFor="budgets-gbp-toggle" className="text-xs text-muted-foreground">
                Show in GBP
              </Label>
              <Switch id="budgets-gbp-toggle" checked={showGbp} onCheckedChange={setShowGbp} />
            </div>
          )}
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" /> Manage budgets
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
                a.severity === 'high'
                  ? 'border-red-300 bg-red-50 text-red-900'
                  : 'border-amber-300 bg-amber-50 text-amber-900'
              }`}
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>{a.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metricsToShow.map((metric) => {
            const row = summaryByMetric.get(metric);
            if (!row || !row.has_budget) {
              return (
                <Card key={metric}>
                  <CardHeader>
                    <CardTitle className="text-sm md:text-base">{METRIC_LABELS[metric] || metric}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground py-8 text-center">
                      {readOnly ? 'No budget on file.' : 'No budget on file — upload one to start tracking.'}
                      {!readOnly && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                            <Upload className="h-4 w-4 mr-1.5" /> Upload budget
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }
            const ytd = paceTone(metric, row.ytd_pace_pct);
            const mtd = paceTone(metric, row.mtd_pace_pct);
            const proj = paceTone(metric, row.projected_vs_budget_pct);
            return (
              <Card key={metric}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm md:text-base flex items-center justify-between">
                    <span>{METRIC_LABELS[metric] || metric}</span>
                    <Badge variant="outline" className="font-normal text-[10px]">
                      {fiscalYearLabel.split(' ')[0]}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">YTD</div>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-2xl font-semibold">
                        {fmtMoney(valMoney(row.ytd_actual_native, row.ytd_actual_gbp))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        of {fmtMoney(valMoney(row.ytd_budget_native, row.ytd_budget_gbp))}
                      </div>
                    </div>
                    <div className={`text-xs font-medium mt-0.5 ${ytd.color}`}>
                      {fmtPct(row.ytd_pace_pct)} · {ytd.label}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t pt-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">MTD</div>
                      <div className="text-sm font-medium">
                        {fmtMoney(valMoney(row.mtd_actual_native, row.mtd_actual_gbp))} /{' '}
                        {fmtMoney(valMoney(row.mtd_budget_native, row.mtd_budget_gbp))}
                      </div>
                      <div className={`text-xs ${mtd.color}`}>{fmtPct(row.mtd_pace_pct)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                        Projected FY
                      </div>
                      <div className="text-sm font-medium">
                        {fmtMoney(valMoney(row.projected_full_year_native, row.projected_full_year_gbp))} /{' '}
                        {fmtMoney(valMoney(row.full_year_budget_native, row.full_year_budget_gbp))}
                      </div>
                      <div className={`text-xs ${proj.color}`}>{fmtPct(row.projected_vs_budget_pct)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Charts per metric */}
      {loading ? (
        <Skeleton className="h-72" />
      ) : (
        metricsToShow.map((metric) => (
          <MetricChart
            key={metric}
            metric={metric}
            rows={(monthly || []).filter((r) => r.metric === metric)}
            effectiveGbp={effectiveGbp}
            fmtMoney={fmtMoney}
            fmtPct={fmtPct}
            grain={grain}
          />
        ))
      )}

      {/* Breakdown table */}
      {!loading && monthly && monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-base">
              {grain === 'week' ? 'Weekly' : 'Monthly'} budget vs actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{grain === 'week' ? 'Week' : 'Month'}</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Var %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.map((r, i) => {
                    const budget = Number(effectiveGbp ? r.budget_gbp : r.budget_native ?? r.budget_gbp) || 0;
                    const actual = Number(effectiveGbp ? r.actual_gbp : r.actual_native ?? r.actual_gbp) || 0;
                    const variance = actual - budget;
                    const isCost = r.metric === 'ppc_spend';
                    const good = isCost ? variance <= 0 : variance >= 0;
                    const tone =
                      Math.abs(variance) < 0.5
                        ? 'text-muted-foreground'
                        : good
                          ? 'text-green-600'
                          : 'text-red-600';
                    return (
                      <TableRow key={i} className={r.is_future ? 'opacity-60' : ''}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(r.period_month), grain === 'week' ? 'dd MMM yyyy' : 'MMM yyyy')}
                        </TableCell>
                        <TableCell>{METRIC_LABELS[r.metric] || r.metric}</TableCell>
                        <TableCell className="text-right">{fmtMoney(budget)}</TableCell>
                        <TableCell className="text-right">{r.is_future ? '—' : fmtMoney(actual)}</TableCell>
                        <TableCell className={`text-right ${tone}`}>
                          {r.is_future ? '—' : fmtMoney(variance)}
                        </TableCell>
                        <TableCell className={`text-right ${tone}`}>
                          {r.is_future ? '—' : fmtPct(r.variance_pct)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version history */}
      {versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Budget version history
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.label}
                      {v.is_active && (
                        <Badge className="ml-2" variant="default">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{v.fiscal_year}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{v.status}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(v.created_at), 'd MMM yyyy')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[240px]">
                      {v.source_file_name || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!readOnly && (
        <BudgetUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          spid={spid}
          fiscalYear={activeFiscalYear}
          brandName={brandName}
          onCommitted={() => {
            toast.success('Budget committed');
            load();
          }}
        />
      )}
    </div>
  );
}

function MetricChart({
  metric,
  rows,
  effectiveGbp,
  fmtMoney,
  fmtPct,
  grain,
}: {
  metric: string;
  rows: VsActualRow[];
  effectiveGbp: boolean;
  fmtMoney: (v: number) => string;
  fmtPct: (v: number | null | undefined) => string;
  grain: 'week' | 'month';
}) {
  const { ref, chartKey } = useChartReady(rows.length);
  if (!rows.length) return null;

  const data = rows.map((r) => {
    const actualRaw = effectiveGbp ? r.actual_gbp : r.actual_native ?? r.actual_gbp;
    const budgetRaw = effectiveGbp ? r.budget_gbp : r.budget_native ?? r.budget_gbp;
    return {
      period: r.period_month,
      label: format(new Date(r.period_month), grain === 'week' ? 'dd MMM' : 'MMM'),
      actual: r.is_future || actualRaw == null ? null : Number(actualRaw),
      budget: budgetRaw == null ? null : Number(budgetRaw),
      variance_gbp: Number(r.variance_gbp ?? 0),
      variance_pct: r.variance_pct == null ? null : Number(r.variance_pct),
      is_future: r.is_future,
    };
  });

  const xInterval = grain === 'week' ? 3 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm md:text-base">
          {METRIC_LABELS[metric] || metric} · actual vs budget
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={ref} className="w-full h-72">
          <ResponsiveContainer key={chartKey} width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: grain === 'week' ? 20 : 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={xInterval}
                angle={grain === 'week' ? -45 : 0}
                textAnchor={grain === 'week' ? 'end' : 'middle'}
                height={grain === 'week' ? 50 : 30}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtMoney(Number(v)).replace(/\.\d+/, '')} />
              <RTooltip
                formatter={(v: any, name: string) => [fmtMoney(Number(v)), name === 'actual' ? 'Actual' : 'Budget']}
                labelFormatter={(l, payload) => {
                  const p = payload?.[0]?.payload;
                  if (!p) return l;
                  return `${l}${p.is_future ? ' (projected)' : ''} · var ${fmtMoney(p.variance_gbp || 0)} (${fmtPct(p.variance_pct)})`;
                }}
              />
              <Legend />
              <Bar
                dataKey="actual"
                name="Actual"
                fill="hsl(var(--primary))"
                fillOpacity={0.85}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="budget"
                name="Budget"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
