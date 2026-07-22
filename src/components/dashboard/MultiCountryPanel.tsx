import { useEffect, useMemo, useState, Fragment } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrencyByCountry } from '@/utils/formatters';
import { getCountryName, getCountryFlagImage } from '@/utils/countryUtils';
import { CountryScope } from './CountrySwitcher';
import { DateFilter } from '@/types/dashboard';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import { Package, TrendingUp, DollarSign, ShoppingCart, Info, Megaphone, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';


interface Props {
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
}

interface SalesRow {
  country_code: string;
  marketplace_id: string;
  currency: string;
  sales_native: number;
  units: number;
  sales_gbp: number;
}

interface InventoryRow {
  pool_key: string;
  countries: string;
  skus: number;
  fulfillable_skus: number;
  fulfillable: number;
  inbound: number;
  reserved: number;
  total: number;
  record_date: string;
}

interface InventorySkuRow {
  sku: string;
  asin: string | null;
  product_name: string | null;
  fulfillable: number;
  inbound: number;
  reserved: number;
  total: number;
}

interface PpcRow {
  country_code: string;
  marketplace_id: string;
  ad_spend_gbp: number;
  sales_gbp: number;
  tacos: number;
  ad_sales: number;
  acos: number;
  has_ads_perf: boolean;
}

const fmtGbp = (v: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(v);
const fmtInt = (v: number) => new Intl.NumberFormat('en-GB').format(Math.round(v || 0));


export function MultiCountryPanel({ spid, scope, dateFilter, customDateRange }: Props) {
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [ppc, setPpc] = useState<PpcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expandable inventory pool state
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const [poolSkus, setPoolSkus] = useState<Record<string, InventorySkuRow[]>>({});
  const [poolLoading, setPoolLoading] = useState<Set<string>>(new Set());

  const range = useMemo(() => getCurrentDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const pStart = useMemo(() => format(range.from, 'yyyy-MM-dd'), [range.from]);
  const pEnd = useMemo(() => format(range.to, 'yyyy-MM-dd'), [range.to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [summaryRes, invRes, ppcRes] = await Promise.all([
          supabase.rpc('rpc_sales_summary', { p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd }),
          supabase.rpc('rpc_inventory_summary', { p_spid: spid, p_scope: scope }),
          (supabase.rpc as any)('rpc_ppc_summary', { p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd }),
        ]);
        if (cancelled) return;
        if (summaryRes.error) throw summaryRes.error;
        if (invRes.error) throw invRes.error;
        setSales((summaryRes.data as any) || []);
        setInventory((invRes.data as any) || []);
        setPpc(ppcRes?.error ? [] : ((ppcRes?.data as any) || []));
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message || 'Failed to load multi-country data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spid, scope, pStart, pEnd]);

  const isRollup = scope === 'ALL_EU' || scope === 'ALL';
  const totalUnits = sales.reduce((s, r) => s + Number(r.units || 0), 0);
  const totalGbp = sales.reduce((s, r) => s + Number(r.sales_gbp || 0), 0);
  const singleRow = !isRollup ? sales[0] : null;

  const togglePool = async (poolKey: string) => {
    const next = new Set(expandedPools);
    if (next.has(poolKey)) {
      next.delete(poolKey);
      setExpandedPools(next);
      return;
    }
    next.add(poolKey);
    setExpandedPools(next);
    // Lazy-load once
    if (!poolSkus[poolKey]) {
      setPoolLoading((prev) => new Set(prev).add(poolKey));
      try {
        const res: any = await (supabase.rpc as any)('rpc_inventory_skus', { p_pool_key: poolKey });
        const rows: InventorySkuRow[] = res?.error ? [] : (res?.data || []);
        rows.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
        setPoolSkus((prev) => ({ ...prev, [poolKey]: rows }));
      } catch {
        setPoolSkus((prev) => ({ ...prev, [poolKey]: [] }));
      } finally {
        setPoolLoading((prev) => {
          const s = new Set(prev);
          s.delete(poolKey);
          return s;
        });
      }
    }
  };



  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base md:text-xl font-semibold text-foreground flex items-center gap-2">
          Multi-country Overview
          {isRollup && (
            <span className="text-[10px] md:text-xs font-normal text-muted-foreground inline-flex items-center gap-1">
              <Info className="h-3 w-3" /> Converted to GBP @ latest FX
            </span>
          )}
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground">
          {isRollup
            ? `${scope === 'ALL_EU' ? 'All EU marketplaces' : 'All enabled marketplaces'} · ${pStart} → ${pEnd}`
            : `${getCountryName(scope)} · ${pStart} → ${pEnd}`}
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">Error loading data: {error}</CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" />Sales</div>
            {loading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <div className="text-lg md:text-2xl font-bold mt-1">
                {singleRow
                  ? formatCurrencyByCountry(Number(singleRow.sales_native || 0), singleRow.country_code)
                  : fmtGbp(totalGbp)}
              </div>
            )}
            {singleRow && (
              <div className="text-[10px] text-muted-foreground mt-0.5">≈ {fmtGbp(Number(singleRow.sales_gbp || 0))}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5" />Units</div>
            {loading ? <Skeleton className="h-7 w-20 mt-1" /> : <div className="text-lg md:text-2xl font-bold mt-1">{fmtInt(totalUnits)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Countries</div>
            {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <div className="text-lg md:text-2xl font-bold mt-1">{sales.length}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />Inventory pools</div>
            {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <div className="text-lg md:text-2xl font-bold mt-1">{inventory.length}</div>}
          </CardContent>
        </Card>
      </div>


      {/* Per-country breakdown when rollup */}
      {isRollup && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">Per-country breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : sales.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No sales in the selected range.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Native sales</TableHead>
                    <TableHead className="text-right">GBP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales
                    .slice()
                    .sort((a, b) => Number(b.sales_gbp || 0) - Number(a.sales_gbp || 0))
                    .map((r) => {
                      const flag = getCountryFlagImage(r.country_code);
                      return (
                        <TableRow key={r.marketplace_id || r.country_code}>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              {flag && <img src={flag} alt="" className="h-3.5 w-5 object-cover rounded-sm" />}
                              {getCountryName(r.country_code)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{fmtInt(Number(r.units || 0))}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyByCountry(Number(r.sales_native || 0), r.country_code)}
                          </TableCell>
                          <TableCell className="text-right">{fmtGbp(Number(r.sales_gbp || 0))}</TableCell>
                        </TableRow>
                      );
                    })}
                  <TableRow className="font-semibold bg-muted/40">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{fmtInt(totalUnits)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">—</TableCell>
                    <TableCell className="text-right">{fmtGbp(totalGbp)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inventory pools */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            Inventory pools
            <span className="text-[10px] font-normal text-muted-foreground">
              Continental-EU marketplaces share one FBA pool
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : inventory.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No inventory data.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-6"></TableHead>
                  <TableHead>Pool</TableHead>
                  <TableHead>Countries</TableHead>
                  <TableHead className="text-right">Fulfillable SKUs</TableHead>
                  <TableHead className="text-right">Fulfillable</TableHead>
                  <TableHead className="text-right">Inbound</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">As of</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((r) => {
                  const expanded = expandedPools.has(r.pool_key);
                  const skus = poolSkus[r.pool_key];
                  const isPoolLoading = poolLoading.has(r.pool_key);
                  return (
                    <Fragment key={r.pool_key}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => togglePool(r.pool_key)}
                      >
                        <TableCell className="w-6">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{r.pool_key}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.countries}</TableCell>
                        <TableCell className="text-right">
                          {fmtInt(Number(r.fulfillable_skus || 0))} <span className="text-muted-foreground">/ {fmtInt(Number(r.skus || 0))}</span>
                        </TableCell>
                        <TableCell className="text-right">{fmtInt(Number(r.fulfillable || 0))}</TableCell>
                        <TableCell className="text-right">{fmtInt(Number(r.inbound || 0))}</TableCell>
                        <TableCell className="text-right">{fmtInt(Number(r.reserved || 0))}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtInt(Number(r.total || 0))}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {r.record_date ? format(new Date(r.record_date), 'dd MMM yyyy') : '—'}
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={9} className="p-0">
                            <div className="p-3">
                              {isPoolLoading ? (
                                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading SKUs…
                                </div>
                              ) : !skus || skus.length === 0 ? (
                                <div className="text-xs text-muted-foreground text-center py-4">No SKU-level data for this pool.</div>
                              ) : (
                                <div className="rounded-md border bg-background overflow-auto max-h-[360px]">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs">Product</TableHead>
                                        <TableHead className="text-xs text-right">Fulfillable</TableHead>
                                        <TableHead className="text-xs text-right">Inbound</TableHead>
                                        <TableHead className="text-xs text-right">Reserved</TableHead>
                                        <TableHead className="text-xs text-right">Total</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {skus.map((s, i) => (
                                        <TableRow key={`${s.sku}-${i}`}>
                                          <TableCell className="text-xs max-w-[360px]">
                                            <div className="truncate font-medium" title={s.product_name || ''}>{s.product_name || '—'}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono">
                                              {s.asin ? `${s.asin} · ` : ''}{s.sku}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-xs text-right">{fmtInt(Number(s.fulfillable || 0))}</TableCell>
                                          <TableCell className="text-xs text-right">{fmtInt(Number(s.inbound || 0))}</TableCell>
                                          <TableCell className="text-xs text-right">{fmtInt(Number(s.reserved || 0))}</TableCell>
                                          <TableCell className="text-xs text-right font-semibold">{fmtInt(Number(s.total || 0))}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(() => {
        const totalSpend = ppc.reduce((s, r) => s + Number(r.ad_spend_gbp || 0), 0);
        if (totalSpend <= 0) return null;
        const totalSales = ppc.reduce((s, r) => s + Number(r.sales_gbp || 0), 0);
        const blendedTacos = totalSales > 0 ? totalSpend / totalSales : 0;
        const perfSpend = ppc.filter((r) => r.has_ads_perf).reduce((s, r) => s + Number(r.ad_spend_gbp || 0), 0);
        const perfAdSales = ppc.reduce((s, r) => s + Number(r.ad_sales || 0), 0);
        const blendedAcos = perfAdSales > 0 ? perfSpend / perfAdSales : 0;
        const anyMissing = ppc.some((r) => !r.has_ads_perf);
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4" /> Advertising
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Ad spend (GBP)</div>
                  <div className="text-lg md:text-2xl font-bold mt-1">{fmtGbp(totalSpend)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Blended TACOS</div>
                  <div className="text-lg md:text-2xl font-bold mt-1">{(blendedTacos * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Ad spend ÷ total sales</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Blended ACOS</div>
                  <div className="text-lg md:text-2xl font-bold mt-1">
                    {perfAdSales > 0 ? `${(blendedAcos * 100).toFixed(1)}%` : '—'}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Ad spend ÷ ad sales (where synced)</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Ad spend (GBP)</TableHead>
                    <TableHead className="text-right">TACOS</TableHead>
                    <TableHead className="text-right">Ad sales (GBP)</TableHead>
                    <TableHead className="text-right">ACOS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ppc
                    .slice()
                    .sort((a, b) => Number(b.ad_spend_gbp || 0) - Number(a.ad_spend_gbp || 0))
                    .map((r) => {
                      const flag = getCountryFlagImage(r.country_code);
                      return (
                        <TableRow key={r.marketplace_id || r.country_code}>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              {flag && <img src={flag} alt="" className="h-3.5 w-5 object-cover rounded-sm" />}
                              {getCountryName(r.country_code)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmtGbp(Number(r.ad_spend_gbp || 0))}</TableCell>
                          <TableCell className="text-right tabular-nums">{(Number(r.tacos || 0) * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.has_ads_perf ? fmtGbp(Number(r.ad_sales || 0)) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.has_ads_perf ? `${(Number(r.acos || 0) * 100).toFixed(1)}%` : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>

              {anyMissing && (
                <p className="text-[11px] text-muted-foreground">
                  ACOS needs advertised-sales data, which is currently only synced for the UK. Other marketplaces show ad spend and TACOS (ad spend ÷ total sales) from the financial feed.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </section>
  );
}
