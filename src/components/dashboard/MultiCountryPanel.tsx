import { useEffect, useMemo, useState, Fragment } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrencyByCode } from '@/utils/formatters';
import { getCountryName, getCountryFromMerchantToken } from '@/utils/countryUtils';
import { ageInDays, STOCK_SNAPSHOT_STALE_DAYS } from '@/utils/stockDataQuality';
import { CountryFlag } from './CountryFlag';
import { CountryScope } from './CountrySwitcher';
import { DateFilter } from '@/types/dashboard';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import { Package, TrendingUp, DollarSign, ShoppingCart, Info, Megaphone, ChevronRight, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { isRollupScope, scopeArea, scopeArm } from '@/utils/scope';


interface Props {
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
}

interface SalesRow {
  country_code: string;
  marketplace_id: string;
  /** 'Vendor' / 'Seller' where one client trades through both. */
  arm: string | null;
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

/**
 * One row per country, and — crucially — ONE definition of ad spend per row.
 *
 * rpc_ppc_summary used to hand back two: the financials' ads_spend in the
 * ad_spend_gbp column that the table printed and the card summed, and the ads
 * feed's own spend buried inside the per-row ACOS. Portwest therefore read
 * "Blended ACOS 5.4%" above a country row of 17.9% on what the client was told
 * was the same money. ad_sales was never converted to GBP either, so the card
 * divided a sterling numerator by a native-currency denominator.
 */
interface PpcRow {
  country_code: string;
  marketplace_id: string;
  currency: string;
  ad_spend_gbp: number | null;
  /** 'ads_feed' where the campaign feed covers the country, else 'financials'. */
  ad_spend_source: string;
  /** null — not zero — where no advertised sales are synced. */
  ad_sales_gbp: number | null;
  net_sales_gbp: number | null;
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

  // Resolve each pool's merchant token to its account name, so the table can
  // name the account instead of printing the token. Best-effort on purpose: if
  // the lookup is not readable the row still has a country label to fall back on.
  const [poolAccountNames, setPoolAccountNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const tokens = inventory.map((r) => r.pool_key).filter(Boolean);
    if (tokens.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('accounts_master')
        .select('merchant_token, account_name')
        .in('merchant_token', tokens);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      for (const a of data as { merchant_token: string; account_name: string }[]) {
        if (a.merchant_token && a.account_name) map[a.merchant_token] = a.account_name;
      }
      setPoolAccountNames(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [inventory]);

  const isRollup = isRollupScope(scope);
  const totalUnits = sales.reduce((s, r) => s + Number(r.units || 0), 0);
  const totalGbp = sales.reduce((s, r) => s + Number(r.sales_gbp || 0), 0);
  const singleRow = !isRollup ? sales[0] : null;
  // A client with two arms has two rows in the same country. They are listed
  // separately on purpose — never summed into one national line.
  const splitByArm = sales.some((r) => r.arm) && new Set(sales.map((r) => r.arm)).size > 1;
  const marketCount = new Set(sales.map((r) => r.country_code)).size;
  const rowLabel = (r: SalesRow) =>
    `${getCountryName(r.country_code)}${splitByArm && r.arm ? ` · ${r.arm}` : ''}`;

  /**
   * A client must never be shown a merchant token. `pool_key` IS the token —
   * Portwest's US pool printed as "A3R7FAYWFJZ8JU-US" — so the country it ends
   * in names the pool, and the marketplaces it serves are already in the next
   * column. The account name (below) disambiguates two pools in one country.
   */
  const poolLabel = (r: InventoryRow) => {
    const cc = getCountryFromMerchantToken(r.pool_key);
    return cc ? `${getCountryName(cc)} (FBA pool)` : 'FBA pool';
  };

  /**
   * A snapshot older than the shared threshold is not today's stock position.
   * Portwest's US pool read "23 Jul 2026" beside GB's "18 Aug" — 26 days behind,
   * with nothing on screen saying so. Same rule and same constant the stock
   * panels already use, so a pool cannot be stale here and fresh there.
   */
  const poolAge = (r: InventoryRow) => ageInDays(r.record_date);
  const isPoolStale = (r: InventoryRow) => {
    const age = poolAge(r);
    return age !== null && age > STOCK_SNAPSHOT_STALE_DAYS;
  };
  const stalePools = inventory.filter(isPoolStale).length;

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
              <Info className="h-3 w-3" /> Converted to GBP at the period average rate
            </span>
          )}
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground">
          {isRollup
            ? `${scopeArea(scope) === 'ALL_EU' ? 'All EU marketplaces' : 'All enabled marketplaces'}${scopeArm(scope) ? ` · ${scopeArm(scope)}` : ''} · ${pStart} → ${pEnd}`
            : `${getCountryName(scopeArea(scope))}${scopeArm(scope) ? ` · ${scopeArm(scope)}` : ''} · ${pStart} → ${pEnd}`}
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
                  ? formatCurrencyByCode(
                      Number(singleRow.sales_native || 0),
                      singleRow.currency,
                      singleRow.country_code,
                    )
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
            {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <div className="text-lg md:text-2xl font-bold mt-1">{marketCount}</div>}
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
                    <TableHead>{splitByArm ? 'Country · Arm' : 'Country'}</TableHead>
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
                      return (
                        <TableRow key={`${r.marketplace_id || r.country_code}-${r.arm ?? ''}`}>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <CountryFlag code={r.country_code} />
                              {rowLabel(r)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{fmtInt(Number(r.units || 0))}</TableCell>
                          <TableCell className="text-right">
                            {/* Symbol from the row's own ISO currency, never from
                                its country code — see formatCurrencyByCode. */}
                            {formatCurrencyByCode(Number(r.sales_native || 0), r.currency, r.country_code)}
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
            <>
            {/* Pools are snapshotted independently, so one can freeze while the
                rest keep updating. An out-of-date pool must say so rather than
                sit beside a current one looking equally true. */}
            {stalePools > 0 && (
              <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>
                    {stalePools === 1
                      ? 'One pool’s snapshot is out of date.'
                      : `${stalePools} pools’ snapshots are out of date.`}
                  </strong>{' '}
                  Amazon last reported {stalePools === 1 ? 'it' : 'them'} more than{' '}
                  {STOCK_SNAPSHOT_STALE_DAYS} days ago, so those quantities are frozen at the date shown
                  in the “As of” column and do not describe today’s stock position.
                </span>
              </div>
            )}
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
                  const accountName = poolAccountNames[r.pool_key];
                  const stale = isPoolStale(r);
                  const age = poolAge(r);
                  return (
                    <Fragment key={r.pool_key}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => togglePool(r.pool_key)}
                      >
                        <TableCell className="w-6">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">
                          {poolLabel(r)}
                          {accountName && (
                            <div className="text-[10px] font-normal text-muted-foreground">{accountName}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.countries}</TableCell>
                        <TableCell className="text-right">
                          {fmtInt(Number(r.fulfillable_skus || 0))} <span className="text-muted-foreground">/ {fmtInt(Number(r.skus || 0))}</span>
                        </TableCell>
                        <TableCell className="text-right">{fmtInt(Number(r.fulfillable || 0))}</TableCell>
                        <TableCell className="text-right">{fmtInt(Number(r.inbound || 0))}</TableCell>
                        <TableCell className="text-right">{fmtInt(Number(r.reserved || 0))}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtInt(Number(r.total || 0))}</TableCell>
                        <TableCell
                          className={`text-right text-xs ${stale ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}
                        >
                          {r.record_date ? (
                            <span
                              className="inline-flex items-center justify-end gap-1"
                              title={
                                stale
                                  ? `Snapshot is ${age} days old — these quantities are frozen at ${format(new Date(r.record_date), 'dd MMM yyyy')}.`
                                  : undefined
                              }
                            >
                              {stale && <AlertTriangle className="h-3 w-3 shrink-0" />}
                              {format(new Date(r.record_date), 'dd MMM yyyy')}
                              {stale && <span className="whitespace-nowrap">({age}d old)</span>}
                            </span>
                          ) : (
                            '—'
                          )}
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
            </>
          )}
        </CardContent>
      </Card>

      {(() => {
        const totalSpend = ppc.reduce((s, r) => s + Number(r.ad_spend_gbp || 0), 0);
        if (totalSpend <= 0) return null;

        // TACOS divides by the sales this panel is already showing. It used to
        // divide by fin_seller_economics.net_product_sales, which is a different
        // and usually much smaller figure — S Green & Sons: £161,708 of net
        // sales against the £293,014 on the Sales card two boxes to the left,
        // so TACOS printed 16.1% where the page's own numbers give 8.9%. Ooble
        // showed 15.5% against a true 5.0% the same way.
        const salesByCountry = new Map<string, number>();
        for (const r of sales) {
          salesByCountry.set(
            r.country_code,
            (salesByCountry.get(r.country_code) || 0) + Number(r.sales_gbp || 0),
          );
        }
        // A real but tiny ratio must not round to a flat "0.0%", which reads as
        // "no advertising" rather than "barely any".
        const pct = (v: number | null) => {
          if (v == null) return '—';
          const p = v * 100;
          if (p > 0 && p < 0.05) return '<0.1%';
          return `${p.toFixed(1)}%`;
        };
        const rowTacos = (r: PpcRow) => {
          const s = salesByCountry.get(r.country_code) || 0;
          return s > 0 ? Number(r.ad_spend_gbp || 0) / s : null;
        };
        const rowAcos = (r: PpcRow) => {
          const adSales = Number(r.ad_sales_gbp || 0);
          return r.has_ads_perf && adSales > 0 ? Number(r.ad_spend_gbp || 0) / adSales : null;
        };

        // The card is the column total of the table beneath it. Both ratios are
        // rebuilt from the same two sums, over the same rows, so no reading on
        // this card can contradict a reading in that table.
        //
        // TACOS must divide by the sales the ads could actually influence, not
        // by every market on the panel. Portwest advertises in one of twelve:
        // £187 of spend over £454,050 of group-wide sales printed "<0.1%", which
        // reads as "advertising is free". Over the £10,416 the ads feed covers
        // it is 1.8% — the same money, honestly denominated. So the denominator
        // is the sales of the countries that carry ad spend, and the label names
        // them whenever that is short of the whole panel.
        const spendCountries = new Set(
          ppc.filter((r) => Number(r.ad_spend_gbp || 0) > 0).map((r) => r.country_code),
        );
        const coveredSales = Array.from(spendCountries).reduce(
          (s, cc) => s + (salesByCountry.get(cc) || 0),
          0,
        );
        // Set membership, not a count: a country can carry ad spend without
        // appearing in the sales rows, and that must not read as full coverage.
        const uncoveredMarkets = Array.from(salesByCountry.keys()).filter((cc) => !spendCountries.has(cc));
        const coversEveryMarket = uncoveredMarkets.length === 0;
        const coveredNames = Array.from(spendCountries).map((cc) => getCountryName(cc));
        // Two names fit on a card face; beyond that the count is the readable
        // form and the full list goes in the line underneath.
        const coveredLabel =
          coveredNames.length <= 2 ? coveredNames.join(' + ') : `${coveredNames.length} markets`;
        const tacosTitle = coversEveryMarket
          ? 'Blended TACOS'
          : `TACOS (ads-covered markets: ${coveredLabel})`;
        const coveredTacos = coveredSales > 0 ? totalSpend / coveredSales : null;

        // NOT "blended" — blended conventionally means over total sales, and
        // this is spend ÷ ad sales, i.e. plain ACOS over the markets whose
        // advertised sales are synced. The maths was right; the name was not.
        const perfRows = ppc.filter((r) => r.has_ads_perf && Number(r.ad_sales_gbp || 0) > 0);
        const perfSpend = perfRows.reduce((s, r) => s + Number(r.ad_spend_gbp || 0), 0);
        const perfAdSales = perfRows.reduce((s, r) => s + Number(r.ad_sales_gbp || 0), 0);
        const coveredAcos = perfAdSales > 0 ? perfSpend / perfAdSales : null;
        const anyMissing = ppc.some((r) => !r.has_ads_perf);
        const anyFromFinancials = ppc.some((r) => r.ad_spend_source !== 'ads_feed');
        const partialAcosBase = perfRows.length > 0 && perfRows.length < ppc.length;
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
                  <div className="text-xs text-muted-foreground">{tacosTitle}</div>
                  <div className="text-lg md:text-2xl font-bold mt-1">{pct(coveredTacos)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5" title={coveredNames.join(', ')}>
                    {fmtGbp(totalSpend)} ÷ {fmtGbp(coveredSales)} sales in{' '}
                    {coversEveryMarket ? 'all markets' : coveredLabel}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">ACOS (ads-covered markets)</div>
                  <div className="text-lg md:text-2xl font-bold mt-1">{pct(coveredAcos)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {coveredAcos == null
                      ? 'No advertised sales synced'
                      : `${fmtGbp(perfSpend)} ÷ ${fmtGbp(perfAdSales)} ad sales`}
                  </div>
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
                      return (
                        <TableRow key={r.marketplace_id || r.country_code}>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <CountryFlag code={r.country_code} />
                              {getCountryName(r.country_code)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmtGbp(Number(r.ad_spend_gbp || 0))}</TableCell>
                          <TableCell className="text-right tabular-nums">{pct(rowTacos(r))}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.has_ads_perf ? fmtGbp(Number(r.ad_sales_gbp || 0)) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{pct(rowAcos(r))}</TableCell>
                        </TableRow>
                      );
                    })}
                  {/* The card above is literally this row. */}
                  <TableRow className="font-semibold bg-muted/40">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtGbp(totalSpend)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(coveredTacos)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {perfAdSales > 0 ? fmtGbp(perfAdSales) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pct(coveredAcos)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  TACOS is ad spend ÷ that country's sales from the per-country table above. The Total row
                  divides total ad spend by the {fmtGbp(coveredSales)} of sales in{' '}
                  {coversEveryMarket
                    ? `all ${marketCount} markets, which is the ${fmtGbp(totalGbp)} on the Sales card`
                    : `the ${coveredNames.length === 1 ? 'market' : 'markets'} that carry ad spend (${coveredNames.join(', ')}) — not the ${fmtGbp(totalGbp)} on the Sales card, which also covers ${uncoveredMarkets.length} ${uncoveredMarkets.length === 1 ? 'market' : 'markets'} this advertising does not reach`}
                  . ACOS is ad spend ÷ ad sales, both taken from the advertising feed and converted at the
                  same rate.
                </p>
                {anyMissing && (
                  <p className="text-[11px] text-muted-foreground">
                    ACOS needs advertised-sales data, which is not synced for every marketplace. Where it
                    is missing the row shows '—' rather than a zero.
                    {partialAcosBase && ' The total ACOS covers only the marketplaces that have it.'}
                  </p>
                )}
                {anyFromFinancials && (
                  <p className="text-[11px] text-muted-foreground">
                    Where the advertising feed does not cover a marketplace, ad spend comes from the
                    financial feed instead, so no ACOS is shown for it.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </section>
  );
}
