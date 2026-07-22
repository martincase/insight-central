import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCountryName, getCountryFlagImage } from '@/utils/countryUtils';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { CountryScope } from './CountrySwitcher';
import { DateFilter } from '@/types/dashboard';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import { Info } from 'lucide-react';
import { ASINLink } from '@/components/common/ASINLink';

export type FeeItemKind = 'fee-total' | 'ads' | 'cogs' | 'fee-category';

export interface FeeItem {
  kind: FeeItemKind;
  name: string;         // display name (e.g. "Referral fee")
  color?: string;
  categoryShare?: number; // fraction of total fees (only for fee-category)
  amount: number;         // in statement currency
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

interface ProductRow {
  asin: string;
  sku: string | null;
  product_name: string | null;
  units: number;
  sales_gbp: number;
  fees_gbp: number;
  ads_gbp: number;
  net_proceeds_gbp: number;
  cogs_gbp: number;
  profit_gbp: number;
  has_cost: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FeeItem | null;
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
  rows: PnlRow[];          // from PnlDashboard
  totalFees: number;       // total Amazon fees in statement currency
  totalSales: number;      // total sales in statement currency
  singleCountry: string | null; // country_code if not rollup
}

const DEFINITIONS: Record<string, string> = {
  'Amazon fees (total)': 'All Amazon selling & fulfilment fees (excludes ads & product cost).',
  'Advertising': 'Sponsored Products/Brands/Display spend.',
  'COGS': 'Your landed product cost per unit.',
  'Referral fee': "Amazon's commission on each sale — a % of item price, varies by category.",
  'FBA fulfilment': 'Per-unit pick, pack & ship fee for FBA orders.',
  'Storage': 'Monthly + long-term FBA warehouse storage.',
  'Digital Services Fee': 'Surcharge covering UK/EU digital-services tax.',
  'Promotions': 'Coupon/deal redemptions & rebates.',
  'Deal fees': 'Lightning/Best-Deal & Prime-event participation fees.',
  'Shipping chargeback': 'Adjustments where shipping cost differed from charged.',
};

const fmtGbp = (v: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function FeeDetailDialog({
  open, onOpenChange, item, spid, scope, dateFilter, customDateRange,
  rows, totalFees, totalSales, singleCountry,
}: Props) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const range = useMemo(() => getCurrentDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const pStart = useMemo(() => format(range.from, 'yyyy-MM-dd'), [range.from]);
  const pEnd = useMemo(() => format(range.to, 'yyyy-MM-dd'), [range.to]);

  const isRollup = scope === 'ALL_EU' || scope === 'ALL';
  const cur = getCurrencyInfo(scope);
  const fmtMoney = (v: number) =>
    `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v ?? 0)}`;

  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    setLoadingProducts(true);
    (async () => {
      try {
        const res = await (supabase.rpc as any)('rpc_pnl_products', {
          p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd,
        });
        if (cancelled) return;
        if (!res.error) setProducts((res.data as ProductRow[]) || []);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, item, spid, scope, pStart, pEnd]);

  const itemKind = item?.kind ?? null;
  const share = item?.categoryShare ?? 1;
  const isEstimate = itemKind === 'fee-category';
  const definition = item ? (DEFINITIONS[item.name] || '') : '';

  // Per-country breakdown (rollup only)
  const countryRows = useMemo(() => {
    if (!item || !isRollup) return [];
    const getAmount = (r: PnlRow): number => {
      const feesG = Math.abs(Number(r.fees_gbp || 0));
      const adsG = Math.abs(Number(r.ads_gbp || 0));
      const cogsG = Math.abs(Number(r.cogs_gbp || 0));
      switch (item.kind) {
        case 'ads': return adsG;
        case 'cogs': return cogsG;
        case 'fee-total': return feesG;
        case 'fee-category': return feesG * share;
      }
    };
    return rows
      .map((r) => ({
        code: r.country_code,
        sales: Number(r.sales_gbp || 0),
        amount: getAmount(r),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [rows, item, itemKind, share, isRollup]);

  // Per-product breakdown
  const productRows = useMemo(() => {
    if (!item) return [];
    const getAmount = (p: ProductRow): number => {
      const feesG = Math.abs(Number(p.fees_gbp || 0));
      const adsG = Math.abs(Number(p.ads_gbp || 0));
      const cogsG = Math.abs(Number(p.cogs_gbp || 0));
      switch (item.kind) {
        case 'ads': return adsG;
        case 'cogs': return cogsG;
        case 'fee-total': return feesG;
        case 'fee-category': return feesG * share;
      }
    };
    const totalItem = products.reduce((s, p) => s + getAmount(p), 0) || 1;
    return products
      .map((p) => ({ p, amount: getAmount(p), share: getAmount(p) / totalItem }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);
  }, [products, item, itemKind, share]);

  if (!item) return null;

  const pctOfSales = totalSales > 0 ? item.amount / totalSales : 0;
  const pctOfFees = totalFees > 0 ? item.amount / totalFees : 0;
  const showPctOfFees = item.kind === 'fee-category' || item.kind === 'fee-total';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.color && (
              <span className="h-3 w-3 rounded-sm inline-block" style={{ background: item.color }} />
            )}
            {item.name}
          </DialogTitle>
          {definition && (
            <p className="text-xs text-muted-foreground pt-1">{definition}</p>
          )}
        </DialogHeader>

        {/* Headline tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          <Tile label="Amount" value={fmtMoney(item.amount)} strong />
          <Tile label="% of Sales" value={fmtPct(pctOfSales)} />
          {showPctOfFees && item.kind === 'fee-category' && (
            <Tile label="% of Amazon fees" value={fmtPct(pctOfFees)} />
          )}
          {item.kind === 'fee-total' && (
            <Tile label="% of Amazon fees" value="100.0%" />
          )}
        </div>

        {isEstimate && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Per-country and per-product amounts are estimated by applying the settlement fee-mix to total fees.</span>
          </div>
        )}

        {/* By country */}
        {isRollup && rows.length > 1 && (
          <div className="pt-3">
            <div className="text-sm font-semibold mb-2">By country</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Amount (GBP)</TableHead>
                  <TableHead className="text-right">% of country sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countryRows.map((r) => {
                  const flag = getCountryFlagImage(r.code);
                  const pct = r.sales > 0 ? r.amount / r.sales : 0;
                  return (
                    <TableRow key={r.code}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          {flag && <img src={flag} alt="" className="h-3.5 w-5 object-cover rounded-sm" />}
                          {getCountryName(r.code)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtGbp(r.amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(pct)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* By product */}
        <div className="pt-3">
          <div className="text-sm font-semibold mb-2">By product (top 15)</div>
          {loadingProducts ? (
            <Skeleton className="h-40 w-full" />
          ) : productRows.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">No product data.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Amount (GBP)</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRows.map(({ p, amount, share: s }) => (
                  <TableRow key={p.asin}>
                    <TableCell className="max-w-xs">
                      <div className="text-sm truncate" title={p.product_name || p.asin}>
                        {p.product_name || p.asin}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        <ASINLink asin={p.asin} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtGbp(amount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(s)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Tile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`tabular-nums mt-1 ${strong ? 'text-lg font-semibold' : 'text-sm'}`}>{value}</div>
    </div>
  );
}

export default FeeDetailDialog;
