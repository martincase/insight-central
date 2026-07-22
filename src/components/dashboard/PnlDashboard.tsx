import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { formatCurrencyByCountry } from '@/utils/formatters';
import { getCountryName, getCountryFlagImage } from '@/utils/countryUtils';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { CountryScope } from './CountrySwitcher';
import { DateFilter } from '@/types/dashboard';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import { Info, ChevronRight } from 'lucide-react';
import { ProductPnlTable } from './ProductPnlTable';
import { FeeDetailDialog, FeeItem } from './FeeDetailDialog';
import { useChartReady } from '@/hooks/useChartReady';

interface Props {
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
}

interface PnlRow {
  country_code: string;
  marketplace_id: string;
  currency: string;
  units: number;
  sales_native: number;
  fees_native: number;
  ads_native: number;
  net_proceeds_native: number;
  cogs_native: number;
  profit_native: number;
  sales_gbp: number;
  fees_gbp: number;
  ads_gbp: number;
  net_proceeds_gbp: number;
  cogs_gbp: number;
  profit_gbp: number;
}

interface FeeRow {
  category: string;
  amount_gbp: number;
  share: number;
}

const FEE_COLOR_MAP: Record<string, string> = {
  'Referral fee': '#6366F1',
  'FBA fulfilment': '#F59E0B',
  'Storage': '#14B8A6',
  'Digital Services Fee': '#F43F5E',
  'Promotions': '#8B5CF6',
  'Deal fees': '#84CC16',
  'Shipping chargeback': '#64748B',
};
const FEE_FALLBACK = ['#EC4899', '#F97316', '#22C55E', '#A855F7', '#EAB308', '#DC2626', '#0D9488'];

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bfees?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const NORMALIZED_COLOR_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(FEE_COLOR_MAP)) {
  NORMALIZED_COLOR_MAP[normalizeKey(k)] = v;
}

function colorFor(category: string, idx: number): string {
  const exact = FEE_COLOR_MAP[category];
  if (exact) return exact;
  const norm = normalizeKey(category);
  return NORMALIZED_COLOR_MAP[norm] || FEE_FALLBACK[idx % FEE_FALLBACK.length];
}

const fmtGbp = (v: number, digits = 0) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v || 0);
const fmtInt = (v: number) => new Intl.NumberFormat('en-GB').format(Math.round(v || 0));
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function PnlDashboard({ spid, scope, dateFilter, customDateRange }: Props) {
  const [rows, setRows] = useState<PnlRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cur = getCurrencyInfo(scope);
  const fmtMoney = (v: number) =>
    `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v ?? 0)}`;

  const range = useMemo(() => getCurrentDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const pStart = useMemo(() => format(range.from, 'yyyy-MM-dd'), [range.from]);
  const pEnd = useMemo(() => format(range.to, 'yyyy-MM-dd'), [range.to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setRows([]);
        setFees([]);
        setLoading(false);
      }
    }, 12000);
    (async () => {
      try {
        const [sumRes, feeRes] = await Promise.all([
          (supabase.rpc as any)('rpc_pnl_summary', { p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd }),
          (supabase.rpc as any)('rpc_pnl_fee_breakdown', { p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd }),
        ]);
        if (cancelled) return;
        if (sumRes.error) throw sumRes.error;
        if (feeRes.error) throw feeRes.error;
        setRows((sumRes.data as PnlRow[]) || []);
        setFees((feeRes.data as FeeRow[]) || []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || 'Failed to load P&L data');
      } finally {
        if (!cancelled) setLoading(false);
        clearTimeout(safetyTimer);
      }
    })();
    return () => { cancelled = true; clearTimeout(safetyTimer); };
  }, [spid, scope, pStart, pEnd]);

  const isRollup = scope === 'ALL_EU' || scope === 'ALL';
  const singleRow = !isRollup ? rows[0] : null;
  const currencyCountry = singleRow?.country_code || null;

  const totals = useMemo(() => {
    if (singleRow) {
      const num = (v: any) => Number(v || 0);
      return {
        units: num(singleRow.units),
        sales: num(singleRow.sales_native),
        fees: Math.abs(num(singleRow.fees_native)),
        ads: Math.abs(num(singleRow.ads_native)),
        netProceeds: num(singleRow.net_proceeds_native),
        cogs: Math.abs(num(singleRow.cogs_native)),
        profit: num(singleRow.profit_native),
        salesGbp: num(singleRow.sales_gbp),
        feesGbp: Math.abs(num(singleRow.fees_gbp)),
      };
    }
    const sum = (k: keyof PnlRow) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
    return {
      units: sum('units'),
      sales: sum('sales_gbp'),
      fees: Math.abs(sum('fees_gbp')),
      ads: Math.abs(sum('ads_gbp')),
      netProceeds: sum('net_proceeds_gbp'),
      cogs: Math.abs(sum('cogs_gbp')),
      profit: sum('profit_gbp'),
      salesGbp: sum('sales_gbp'),
      feesGbp: Math.abs(sum('fees_gbp')),
    };
  }, [rows, singleRow]);

  const marginPct = totals.sales > 0 ? totals.profit / totals.sales : 0;
  const netProceedsMarginPct = totals.sales > 0 ? totals.netProceeds / totals.sales : 0;
  const cogsMissing = totals.cogs === 0;

  // Cost breakdown — fee categories (share × fee total) + Advertising + COGS.
  // Currency matches the P&L statement: native for single country, GBP for rollup.
  const feeComposition = useMemo(() => {
    const totalShare = fees.reduce((s, f) => s + Number(f.share || 0), 0) || 1;
    const feeSlices = fees.map((f, i) => {
      const share = Number(f.share || 0) / totalShare;
      return {
        category: f.category,
        share, // fraction of the fee total (for label parity with prior UI)
        amount: share * totals.fees,
        color: colorFor(f.category, i),
      };
    });
    if (totals.ads > 0) {
      feeSlices.push({ category: 'Advertising', share: 1, amount: totals.ads, color: '#0EA5E9' });
    }
    if (totals.cogs > 0) {
      feeSlices.push({ category: 'COGS', share: 1, amount: totals.cogs, color: '#78716C' });
    }
    // Recompute share as fraction of the whole cost breakdown for display
    const grand = feeSlices.reduce((s, x) => s + (x.amount || 0), 0) || 1;
    return feeSlices.map((x) => ({ ...x, share: x.amount / grand }));
  }, [fees, totals.fees, totals.ads, totals.cogs]);
  const { ref: donutRef, chartKey: donutKey } = useChartReady(feeComposition.length);
  const hasCostData = feeComposition.some((f) => Number.isFinite(f.amount) && f.amount > 0.01);

  const scopeLabel = isRollup
    ? scope === 'ALL_EU' ? 'All EU marketplaces' : 'All enabled marketplaces'
    : getCountryName(scope);
  const [detailItem, setDetailItem] = useState<FeeItem | null>(null);

  const openDetail = (item: FeeItem) => setDetailItem(item);
  const closeDetail = () => setDetailItem(null);

  const feeCategoryShare = (category: string): number => {
    const slice = feeComposition.find((f) => f.category === category);
    if (!slice) return 0;
    // share within Amazon fees only (exclude ads + cogs)
    return totals.fees > 0 ? slice.amount / totals.fees : 0;
  };



  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base md:text-xl font-semibold text-foreground flex items-center gap-2">
          Profit &amp; Loss
          {isRollup && (
            <span className="text-[10px] md:text-xs font-normal text-muted-foreground inline-flex items-center gap-1">
              <Info className="h-3 w-3" /> Converted to GBP @ latest FX
            </span>
          )}
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground">
          {scopeLabel} · {pStart} → {pEnd} · Source: SP-API Seller Economics (accrual)
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">Error loading P&amp;L: {error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* P&L Statement */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">P&amp;L Statement</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Financial data not yet available for this account — SP-API Seller Economics is updated weekly.</div>
            ) : (
              <div className="divide-y">
                <PnlRowLine label="Sales (revenue)" value={fmtMoney(totals.sales)} bold hint="Net sales · SP-API Seller Economics (accrual) — differs from Performance's gross Overall Sales" />
                <PnlRowLine
                  label="− Amazon fees (total)"
                  value={`(${fmtMoney(totals.fees)})`}
                  muted
                  onClick={() => openDetail({ kind: 'fee-total', name: 'Amazon fees (total)', amount: totals.fees })}
                />
                <PnlRowLine
                  label="− Advertising"
                  value={`(${fmtMoney(totals.ads)})`}
                  muted
                  onClick={() => openDetail({ kind: 'ads', name: 'Advertising', amount: totals.ads, color: '#0EA5E9' })}
                />
                <PnlRowLine
                  label="= Net proceeds"
                  value={fmtMoney(totals.netProceeds)}
                  bold
                  hint={`Net-proceeds margin ${fmtPct(netProceedsMarginPct)}`}
                />
                <PnlRowLine
                  label="− COGS (product cost)"
                  value={cogsMissing ? '—' : `(${fmtMoney(totals.cogs)})`}
                  muted
                  onClick={cogsMissing ? undefined : () => openDetail({ kind: 'cogs', name: 'COGS', amount: totals.cogs, color: '#78716C' })}
                />
                <PnlRowLine
                  label={cogsMissing ? '= Net proceeds (before COGS)' : '= Net profit'}
                  value={fmtMoney(totals.profit)}
                  bold
                  emphasis={!cogsMissing}
                  hint={`Margin ${fmtPct(marginPct)}${cogsMissing ? ' · before COGS' : ''}`}
                />
                <PnlRowLine label="Units sold" value={fmtInt(totals.units)} small />
                {isRollup && (
                  <PnlRowLine
                    label="Sales (GBP)"
                    value={fmtGbp(totals.salesGbp)}
                    small
                  />
                )}
              </div>
            )}
            {cogsMissing && !loading && rows.length > 0 && (
              <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Product costs not set — net profit shown before COGS (equals net proceeds). Add costs to see true profit.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee composition */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">Cost breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : !hasCostData ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No cost breakdown yet — awaiting weekly economics data.</div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {(() => {
                  const donutData = feeComposition.filter((f) => Number.isFinite(f.amount) && f.amount > 0.01);
                  return (
                    <div ref={donutRef} style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer key={donutKey}>
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                            isAnimationActive={false}
                          >
                            {donutData.map((f) => (
                              <Cell key={f.category} fill={f.color} />
                            ))}
                          </Pie>
                          <RTooltip
                            formatter={(value: any, _name: any, entry: any) => {
                              const share = entry?.payload?.share ?? 0;
                              return [`${fmtMoney(Number(value))} · ${fmtPct(share)}`, entry?.payload?.category];
                            }}
                            contentStyle={{ fontSize: 12, borderRadius: 6 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
                <div className="w-full space-y-1.5">
                  {feeComposition.map((f) => {
                    const kind: FeeItem['kind'] =
                      f.category === 'Advertising' ? 'ads' :
                      f.category === 'COGS' ? 'cogs' : 'fee-category';
                    const item: FeeItem = {
                      kind,
                      name: f.category,
                      color: f.color,
                      amount: f.amount,
                      categoryShare: kind === 'fee-category' ? feeCategoryShare(f.category) : undefined,
                    };
                    return (
                      <button
                        type="button"
                        key={f.category}
                        onClick={() => openDetail(item)}
                        className="w-full flex items-center justify-between text-xs px-1.5 py-1 rounded hover:bg-muted/60 cursor-pointer group"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: f.color }} />
                          <span className="truncate">{f.category}</span>
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="tabular-nums text-muted-foreground">
                            {fmtPct(f.share)} · {fmtMoney(f.amount)}
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-country breakdown */}
      {isRollup && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">Per-country P&amp;L</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No data.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Sales (native)</TableHead>
                      <TableHead className="text-right">Sales (GBP)</TableHead>
                      <TableHead className="text-right">Fees (GBP)</TableHead>
                      <TableHead className="text-right">Ads (GBP)</TableHead>
                      <TableHead className="text-right">Net proceeds (GBP)</TableHead>
                      <TableHead className="text-right">COGS (GBP)</TableHead>
                      <TableHead className="text-right">Net profit (GBP)</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows
                      .slice()
                      .sort((a, b) => Number(b.sales_gbp || 0) - Number(a.sales_gbp || 0))
                      .map((r) => {
                        const flag = getCountryFlagImage(r.country_code);
                        const sales = Number(r.sales_gbp || 0);
                        const profit = Number(r.profit_gbp || 0);
                        const margin = sales > 0 ? profit / sales : 0;
                        return (
                          <TableRow key={r.marketplace_id || r.country_code}>
                            <TableCell>
                              <span className="inline-flex items-center gap-2">
                                {flag && <img src={flag} alt="" className="h-3.5 w-5 object-cover rounded-sm" />}
                                {getCountryName(r.country_code)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{fmtInt(Number(r.units || 0))}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrencyByCountry(Number(r.sales_native || 0), r.country_code)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{fmtGbp(sales)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtGbp(Math.abs(Number(r.fees_gbp || 0)))}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtGbp(Math.abs(Number(r.ads_gbp || 0)))}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtGbp(Number(r.net_proceeds_gbp || 0))}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {Number(r.cogs_gbp || 0) === 0 ? '—' : fmtGbp(Math.abs(Number(r.cogs_gbp || 0)))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{fmtGbp(profit)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtPct(margin)}</TableCell>
                          </TableRow>
                        );
                      })}
                    <TableRow className="font-semibold bg-muted/40">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(totals.units)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">—</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtGbp(totals.salesGbp)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtGbp(totals.feesGbp)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtGbp(totals.ads)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtGbp(totals.netProceeds)}</TableCell>
                      <TableCell className="text-right tabular-nums">{totals.cogs === 0 ? '—' : fmtGbp(totals.cogs)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtGbp(totals.profit)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(marginPct)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ProductPnlTable spid={spid} scope={scope} dateFilter={dateFilter} customDateRange={customDateRange} />

      <FeeDetailDialog
        open={!!detailItem}
        onOpenChange={(o) => { if (!o) closeDetail(); }}
        item={detailItem}
        spid={spid}
        scope={scope}
        dateFilter={dateFilter}
        customDateRange={customDateRange}
        rows={rows}
        totalFees={totals.fees}
        totalSales={totals.sales}
        singleCountry={singleRow ? singleRow.country_code : null}
      />
    </section>
  );
}

function PnlRowLine({
  label,
  value,
  bold,
  muted,
  emphasis,
  small,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  emphasis?: boolean;
  small?: boolean;
  hint?: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <div
      className={`flex items-center justify-between py-2 ${small ? 'text-xs text-muted-foreground' : 'text-sm'} ${clickable ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded' : ''}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
    >
      <div className={`${bold ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''} flex items-center gap-1`}>
        {label}
        {clickable && <ChevronRight className="h-3 w-3 opacity-40" />}
        {hint && <span className="ml-2 text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </div>
      <div
        className={`tabular-nums ${bold ? 'font-semibold' : ''} ${emphasis ? 'text-emerald-600 text-base md:text-lg' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}
