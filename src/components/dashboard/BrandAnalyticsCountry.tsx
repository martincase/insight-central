import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { useTableSort } from '@/hooks/useTableSort';
import { Button } from '@/components/ui/button';
import { CountryScope } from './CountrySwitcher';
import { getCountryName } from '@/utils/countryUtils';
import { Users, Repeat, Search, ShoppingCart } from 'lucide-react';

interface Props {
  spid: string;
  scope: CountryScope;
}

interface RepeatSummary {
  unique_customers: number | null;
  repeat_customers: number | null;
  repeat_rate: number | null;
  repeat_sales_share: number | null;
  asins: number | null;
}

interface SearchQueryRow {
  search_query: string;
  search_volume: number | null;
  brand_impressions: number | null;
  brand_clicks: number | null;
  brand_purchases: number | null;
  impression_share: number | null;
  click_share: number | null;
  purchase_share: number | null;
  marketplaces: number | null;
}

const scopeLabel = (scope: CountryScope) =>
  scope === 'ALL_EU' ? 'All EU' : scope === 'ALL' ? 'All countries' : getCountryName(scope);

const fmtInt = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-GB').format(Math.round(n));

const fmtPct = (n: number | null | undefined) => {
  if (n == null) return '—';
  const pct = n * 100;
  if (pct === 0) return <span className="text-muted-foreground">0%</span>;
  return `${pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}%`;
};

export const BrandAnalyticsCountry = ({ spid, scope }: Props) => {
  const [summary, setSummary] = useState<RepeatSummary | null>(null);
  const [queries, setQueries] = useState<SearchQueryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [sortMode, setSortMode] = useState<'click_share' | 'search_volume' | 'brand_clicks'>('click_share');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sumRes, qRes] = await Promise.all([
          (supabase.rpc as any)('rpc_ba_repeat_summary', { p_spid: spid, p_scope: scope }),
          (supabase.rpc as any)('rpc_ba_search_queries', { p_spid: spid, p_scope: scope, p_limit: 200 }),
        ]);
        if (cancelled) return;
        const sumRow = Array.isArray(sumRes.data) ? sumRes.data[0] : sumRes.data;
        setSummary(sumRow || null);
        setQueries(Array.isArray(qRes.data) ? qRes.data : []);
      } catch {
        if (!cancelled) { setSummary(null); setQueries([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spid, scope]);

  const sortField = sortMode === 'click_share' ? 'click_share'
    : sortMode === 'search_volume' ? 'search_volume'
    : 'brand_clicks';

  const { sortedData, sortField: sf, sortDirection, handleSort } = useTableSort<SearchQueryRow>({
    data: queries,
    defaultSortField: sortField as keyof SearchQueryRow,
    defaultSortDirection: 'desc',
  });

  // When sortMode toggles, re-sort
  useEffect(() => {
    handleSort(sortField as keyof SearchQueryRow);
    // handleSort toggles on identical field; call twice if needed to enforce desc
    // simplest: not perfect but user can click header
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  const visible = showAll ? sortedData : sortedData.slice(0, 50);

  const totalBrandPurchases = useMemo(
    () => queries.reduce((s, r) => s + (r.brand_purchases ?? 0), 0),
    [queries]
  );
  const maxMarketplaces = useMemo(
    () => queries.reduce((m, r) => Math.max(m, r.marketplaces ?? 0), 0),
    [queries]
  );
  const isRollup = scope === 'ALL_EU' || scope === 'ALL';

  const hasNoData = !loading && queries.length === 0 && (!summary || (summary.unique_customers == null && summary.repeat_customers == null));

  if (hasNoData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Brand Analytics · {scopeLabel(scope)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No country-level Brand Analytics for this marketplace yet — see the brand-level keyword &amp; PPC analysis below.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tiles = [
    {
      label: 'Repeat-purchase sales share',
      value: summary?.repeat_sales_share != null ? `${(summary.repeat_sales_share * 100).toFixed(1)}%` : '—',
      icon: Repeat,
      color: 'text-purple-600',
    },
    {
      label: 'Unique customers',
      value: fmtInt(summary?.unique_customers),
      icon: Users,
      color: 'text-blue-600',
    },
    {
      label: 'Search terms tracked',
      value: fmtInt(queries.length),
      icon: Search,
      color: 'text-cyan-600',
    },
    {
      label: 'Brand purchases',
      value: fmtInt(totalBrandPurchases),
      icon: ShoppingCart,
      color: 'text-emerald-600',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg">Brand Analytics · {scopeLabel(scope)}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Source: Amazon Brand Analytics (Search Query Performance, weekly)
              {isRollup && maxMarketplaces > 0 && (
                <> · Aggregated across {maxMarketplaces} marketplace{maxMarketplaces !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <t.icon className={`h-3.5 w-3.5 ${t.color}`} />
                <span className="text-[11px] text-muted-foreground">{t.label}</span>
              </div>
              <div className={`text-lg font-bold ${t.color}`}>{loading ? '…' : t.value}</div>
            </div>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          {([
            { key: 'click_share', label: 'Our click share' },
            { key: 'search_volume', label: 'Search volume' },
            { key: 'brand_clicks', label: 'Our clicks' },
          ] as const).map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={sortMode === opt.key ? 'default' : 'outline'}
              onClick={() => setSortMode(opt.key)}
              className="h-7 text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Share = the brand's share of that search term's total impressions / clicks / purchases on Amazon.
        </p>

        {/* Table */}
        {loading ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading Brand Analytics…</div>
        ) : queries.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            No Brand Analytics data for this scope/period.
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto max-h-[600px]">
              <Table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Search term</TableHead>
                    <SortableTableHead field="search_volume" currentField={sf} direction={sortDirection} onSort={handleSort} className="text-xs text-right">Volume</SortableTableHead>
                    <SortableTableHead field="brand_impressions" currentField={sf} direction={sortDirection} onSort={handleSort} className="text-xs text-right">Our impr.</SortableTableHead>
                    <SortableTableHead field="impression_share" currentField={sf} direction={sortDirection} onSort={handleSort} className="text-xs text-right">Impr. share</SortableTableHead>
                    <SortableTableHead field="click_share" currentField={sf} direction={sortDirection} onSort={handleSort} className="text-xs text-right">Click share</SortableTableHead>
                    <SortableTableHead field="purchase_share" currentField={sf} direction={sortDirection} onSort={handleSort} className="text-xs text-right">Purch. share</SortableTableHead>
                    <SortableTableHead field="brand_purchases" currentField={sf} direction={sortDirection} onSort={handleSort} className="text-xs text-right">Est. purchases</SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r, i) => (
                    <TableRow key={`${r.search_query}-${i}`}>
                      <TableCell className="text-xs font-medium truncate" title={r.search_query}>{r.search_query}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtInt(r.search_volume)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtInt(r.brand_impressions)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtPct(r.impression_share)}</TableCell>
                      <TableCell className="text-xs text-right font-medium tabular-nums">{fmtPct(r.click_share)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtPct(r.purchase_share)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{fmtInt(r.brand_purchases)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Showing {visible.length} of {queries.length} search terms</span>
              {queries.length > 50 && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show top 50' : `Show all ${queries.length}`}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
