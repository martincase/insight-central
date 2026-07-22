import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, ShoppingCart, Flame, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

interface ApiAdvertisedProductsDashboardProps {
  accountName: string;
  scope?: CountryScope;
}

interface AggregatedProduct {
  advertised_asin: string;
  product_title: string;
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
  ctr: number;
  cpc: number;
  acos: number;
  roas: number;
  campaign_count: number;
}

type SortField = 'advertised_asin' | 'product_title' | 'impressions' | 'clicks' | 'ctr' | 'spend' | 'sales' | 'orders' | 'cvr' | 'acos' | 'roas' | 'campaign_count';
type SortDir = 'asc' | 'desc';

export function ApiAdvertisedProductsDashboard({ accountName, scope }: ApiAdvertisedProductsDashboardProps) {
  const cur = getCurrencyInfo(scope);
  const fmtMoney = (v: number | null | undefined) =>
    v == null ? '—' : `${cur.symbol}${new Intl.NumberFormat(cur.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
  const [profileId, setProfileId] = useState<number | null | undefined>(undefined);
  const [apiAccountName, setApiAccountName] = useState<string | null | undefined>(undefined);
  const [aggregatedData, setAggregatedData] = useState<AggregatedProduct[]>([]);
  const [productTitles, setProductTitles] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState<SortField>('sales');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // 1. Resolve profile_id (preferred) or api_account_name (fallback)
  useEffect(() => {
    const resolve = async () => {
      const { data: row, error } = await supabase
        .from('accounts_master')
        .select('profile_id, api_account_name')
        .eq('account_name', accountName)
        .limit(1)
        .maybeSingle();

      if (error) {
        setProfileId(null);
        setApiAccountName(null);
        setError('Failed to resolve account');
        setIsLoading(false);
        return;
      }
      setProfileId(row?.profile_id ?? null);
      setApiAccountName(row?.api_account_name ?? null);
    };
    resolve();
  }, [accountName]);

  // 2. Fetch data
  useEffect(() => {
    if (profileId === undefined) return;
    if (!profileId && !apiAccountName) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        // Build filter using profile_id (preferred) or account_name (fallback)
        const addFilter = (query: any) => {
          if (profileId) return query.eq('profile_id', profileId);
          return query.eq('account_name', apiAccountName);
        };

        // Paginated fetch to get ALL rows (avoids RPC timeout and .limit() truncation)
        const BATCH_SIZE = 10000;
        let allRows: any[] = [];
        let batchFrom = 0;
        let keepFetching = true;

        while (keepFetching) {
          let query = supabase
            .from('amazon_api_advertised_product_performance')
            .select('advertised_asin, impressions, clicks, spend, orders_7d, sales_7d, campaign_id');
          query = addFilter(query);
          const { data: batch, error: fetchErr } = await query
            .gte('date', dateStr)
            .range(batchFrom, batchFrom + BATCH_SIZE - 1);

          if (fetchErr) {
            console.error('[AdProducts] Fetch error:', fetchErr);
            setError('Failed to fetch advertised product data');
            setIsLoading(false);
            return;
          }

          if (batch && batch.length > 0) {
            allRows = allRows.concat(batch);
            if (batch.length < BATCH_SIZE) {
              keepFetching = false;
            } else {
              batchFrom += BATCH_SIZE;
            }
          } else {
            keepFetching = false;
          }
        }

        console.log('[AdProducts] Fetched', allRows.length, 'total rows via pagination');

        // Fetch product titles from two sources (no account filter)
        const asins = [...new Set(allRows.map((r: any) => r.advertised_asin).filter(Boolean))];
        console.log('[AdProducts] Unique ASINs to look up:', asins.length);
        const titleMap = new Map<string, string>();

        if (asins.length > 0) {
          // PRIMARY: daily_inventory_data
          const { data: invData, error: invErr } = await supabase
            .from('daily_inventory_data')
            .select('asin, product_name')
            .not('product_name', 'is', null)
            .not('product_name', 'eq', '')
            .limit(10000);

          console.log('[AdProducts] daily_inventory_data rows:', invData?.length ?? 0, 'error:', invErr?.message ?? 'none');
          if (invData) {
            for (const row of invData) {
              if (row.asin && row.product_name && !titleMap.has(row.asin)) {
                titleMap.set(row.asin, row.product_name);
              }
            }
          }
          console.log('[AdProducts] Names from daily_inventory_data:', titleMap.size);

          // FALLBACK: perplexity_all_listings_stockprice_data
          const { data: listData, error: listErr } = await supabase
            .from('perplexity_all_listings_stockprice_data')
            .select('asin, item_name')
            .not('item_name', 'is', null)
            .not('item_name', 'eq', '')
            .limit(10000);

          console.log('[AdProducts] perplexity listings rows:', listData?.length ?? 0, 'error:', listErr?.message ?? 'none');
          if (listData) {
            for (const row of listData) {
              if (row.asin && row.item_name && !titleMap.has(row.asin)) {
                titleMap.set(row.asin, row.item_name);
              }
            }
          }
          setProductTitles(titleMap);
        }

        // Client-side aggregation by ASIN
        const asinMap = new Map<string, { imp: number; clk: number; spd: number; ord: number; sal: number; campaigns: Set<string> }>();
        for (const r of allRows) {
          if (!r.advertised_asin) continue;
          const existing = asinMap.get(r.advertised_asin);
          if (existing) {
            existing.imp += Number(r.impressions) || 0;
            existing.clk += Number(r.clicks) || 0;
            existing.spd += Number(r.spend) || 0;
            existing.ord += Number(r.orders_7d) || 0;
            existing.sal += Number(r.sales_7d) || 0;
            if (r.campaign_id) existing.campaigns.add(String(r.campaign_id));
          } else {
            asinMap.set(r.advertised_asin, {
              imp: Number(r.impressions) || 0,
              clk: Number(r.clicks) || 0,
              spd: Number(r.spend) || 0,
              ord: Number(r.orders_7d) || 0,
              sal: Number(r.sales_7d) || 0,
              campaigns: new Set(r.campaign_id ? [String(r.campaign_id)] : []),
            });
          }
        }

        const products: AggregatedProduct[] = Array.from(asinMap.entries()).map(([asin, d]) => ({
          advertised_asin: asin,
          product_title: titleMap.get(asin) || asin,
          impressions: d.imp,
          clicks: d.clk,
          spend: d.spd,
          orders: d.ord,
          sales: d.sal,
          ctr: d.imp > 0 ? (d.clk / d.imp) * 100 : 0,
          cpc: d.clk > 0 ? d.spd / d.clk : 0,
          acos: d.sal > 0 ? (d.spd / d.sal) * 100 : Infinity,
          roas: d.spd > 0 ? d.sal / d.spd : Infinity,
          campaign_count: d.campaigns.size,
        }));

        setAggregatedData(products);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching advertised products:', err);
        setError('An error occurred while loading data');
        setIsLoading(false);
      }
    };
    fetchData();
  }, [profileId, apiAccountName, accountName]);

  // Update product titles in aggregated data when titles load
  useEffect(() => {
    if (productTitles.size === 0 || aggregatedData.length === 0) return;
    setAggregatedData(prev => prev.map(p => ({
      ...p,
      product_title: productTitles.get(p.advertised_asin) || p.advertised_asin,
    })));
  }, [productTitles]);

  // 3. Filter & sort
  const filteredSorted = useMemo(() => {
    let filtered = aggregatedData;
    if (searchText) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(r =>
        r.advertised_asin.toLowerCase().includes(q) ||
        r.product_title.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortField === 'cvr') {
        aVal = a.clicks > 0 ? (a.orders / a.clicks) * 100 : 0;
        bVal = b.clicks > 0 ? (b.orders / b.clicks) * 100 : 0;
      } else {
        aVal = a[sortField] ?? 0;
        bVal = b[sortField] ?? 0;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return filtered;
  }, [aggregatedData, searchText, sortField, sortDir]);

  const totalCount = filteredSorted.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const pageData = filteredSorted.slice(page * pageSize, (page + 1) * pageSize);
  const showingFrom = totalCount > 0 ? page * pageSize + 1 : 0;
  const showingTo = Math.min((page + 1) * pageSize, totalCount);

  const highlights = useMemo(() => {
    if (aggregatedData.length === 0) return null;
    const topSeller = [...aggregatedData].filter(d => d.sales > 0).sort((a, b) => b.sales - a.sales)[0];
    const mostEfficient = [...aggregatedData].filter(d => d.spend > 0 && Number.isFinite(d.roas)).sort((a, b) => b.roas - a.roas)[0];
    const highestSpend = [...aggregatedData].filter(d => d.spend > 0).sort((a, b) => b.spend - a.spend)[0];
    return { topSeller, mostEfficient, highestSpend };
  }, [aggregatedData]);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  }, [sortField]);

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <TableHead
        className="cursor-pointer hover:bg-muted/50 select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (
            sortDir === 'asc'
              ? <ArrowUp className="h-3 w-3 text-primary shrink-0" />
              : <ArrowDown className="h-3 w-3 text-primary shrink-0" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />
          )}
        </div>
      </TableHead>
    );
  };

  const truncateTitle = (title: string, maxLen = 50) =>
    title.length > maxLen ? title.substring(0, maxLen) + '…' : title;

  return (
    <Card className="bg-card border-0 shadow-lg overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
      
      <CardHeader className="pb-4 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Advertised Product Performance</CardTitle>
              <CardDescription className="text-muted-foreground">
                Past 30 days · Aggregated by ASIN across all campaigns
              </CardDescription>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">ℹ️ Ad Products data is sourced from the Amazon Ads API — date range may differ from the global selector</p>
            </div>
          </div>
          <Input
            type="text"
            placeholder="Search ASIN or product name..."
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
            disabled={isLoading}
            className="max-w-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isLoading && highlights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highlights.topSeller && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">Top Seller</span>
                </div>
                <p className="text-sm font-semibold truncate" title={highlights.topSeller.product_title}>
                  {truncateTitle(highlights.topSeller.product_title)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtMoney(highlights.topSeller.sales)} sales · {highlights.topSeller.orders} orders
                </p>
              </div>
            )}
            {highlights.mostEfficient && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-blue-600">Most Efficient</span>
                </div>
                <p className="text-sm font-semibold truncate" title={highlights.mostEfficient.product_title}>
                  {truncateTitle(highlights.mostEfficient.product_title)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {highlights.mostEfficient.roas.toFixed(2)}x ROAS · {fmtMoney(highlights.mostEfficient.sales)} sales
                </p>
              </div>
            )}
            {highlights.highestSpend && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">Highest Spend</span>
                </div>
                <p className="text-sm font-semibold truncate" title={highlights.highestSpend.product_title}>
                  {truncateTitle(highlights.highestSpend.product_title)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtMoney(highlights.highestSpend.spend)} spend · {fmtMoney(highlights.highestSpend.sales)} sales
                </p>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <SortableHeader field="advertised_asin">ASIN</SortableHeader>
                    <SortableHeader field="product_title">Product</SortableHeader>
                    <SortableHeader field="impressions">Impressions</SortableHeader>
                    <SortableHeader field="clicks">Clicks</SortableHeader>
                    <SortableHeader field="ctr">CTR</SortableHeader>
                    <SortableHeader field="spend">Spend</SortableHeader>
                    <SortableHeader field="sales">Sales</SortableHeader>
                    <SortableHeader field="orders">Orders</SortableHeader>
                    <SortableHeader field="cvr">Conv %</SortableHeader>
                    <SortableHeader field="acos">ACoS</SortableHeader>
                    <SortableHeader field="roas">ROAS</SortableHeader>
                    <SortableHeader field="campaign_count">Campaigns</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        {searchText ? 'No products match your search' : 'No advertised product data found'}
                      </TableCell>
                    </TableRow>
                  ) : pageData.map((row) => (
                    <TableRow key={row.advertised_asin} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs">
                        <a
                          href={`https://www.amazon.co.uk/dp/${row.advertised_asin.toUpperCase()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                          title={row.advertised_asin}
                        >
                          {row.advertised_asin}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate" title={row.product_title}>
                        {row.product_title}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.ctr.toFixed(2)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(row.spend)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{fmtMoney(row.sales)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.orders.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.clicks > 0 ? `${((row.orders / row.clicks) * 100).toFixed(1)}%` : '0.0%'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={!Number.isFinite(row.acos) || (row.spend > 0 && row.sales === 0) ? 'text-muted-foreground' : ''}>
                          {(!Number.isFinite(row.acos) || (row.spend > 0 && row.sales === 0)) ? 'N/A' : `${row.acos.toFixed(1)}%`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={!Number.isFinite(row.roas) || (row.sales > 0 && row.spend === 0) ? 'text-muted-foreground' : ''}>
                          {(!Number.isFinite(row.roas) || (row.sales > 0 && row.spend === 0)) ? 'N/A' : `${row.roas.toFixed(2)}x`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.campaign_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalCount > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {showingFrom.toLocaleString()} – {showingTo.toLocaleString()} of {totalCount.toLocaleString()} products
                  </p>
                  <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 rows</SelectItem>
                      <SelectItem value="50">50 rows</SelectItem>
                      <SelectItem value="100">100 rows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || isLoading}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page + 1} of {Math.max(totalPages, 1)} ({totalCount.toLocaleString()} results)
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || isLoading}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
