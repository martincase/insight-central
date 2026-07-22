import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, Download, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Target, DollarSign, ExternalLink, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format as formatDate, parseISO } from 'date-fns';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import type { DateFilter } from '@/types/dashboard';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

const formatDateFriendly = (dateStr: string) => {
  try {
    return formatDate(parseISO(dateStr), 'd MMM yyyy');
  } catch {
    return dateStr;
  }
};

interface ApiSearchTermsDashboardProps {
  accountName: string;
  dateFilter?: DateFilter;
  customDateRange?: { from: Date; to: Date };
  scope?: CountryScope;
}

interface SearchTermRow {
  search_term: string;
  keyword: string | null;
  match_type: string | null;
  campaign_name: string | null;
  ad_group_name: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  spend: number | null;
  sales_7d: number | null;
  orders_7d: number | null;
  acos_7d: number | null;
  roas_7d: number | null;
  cpc: number | null;
  country_code: string | null;
}

type SortField = 'search_term' | 'keyword' | 'match_type' | 'campaign_name' | 'impressions' | 'clicks' | 'ctr' | 'spend' | 'sales_7d' | 'orders_7d' | 'acos_7d' | 'roas_7d' | 'cpc' | 'cvr';
type SortDir = 'asc' | 'desc';
type TabFilter = 'all' | 'keywords' | 'asins';

const isAsin = (term: string) => /^B0[A-Z0-9]{8}$/i.test(term);

import { getMatchTypeLabel } from '@/utils/matchTypeUtils';

export function ApiSearchTermsDashboard({ accountName, dateFilter = 'last-7-days', customDateRange, scope }: ApiSearchTermsDashboardProps) {
  const cur = getCurrencyInfo(scope);
  const fmtMoney = (v: number | null | undefined) =>
    v == null ? '—' : `${cur.symbol}${new Intl.NumberFormat(cur.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
  const [profileId, setProfileId] = useState<number | null | undefined>(undefined);
  const [apiAccountName, setApiAccountName] = useState<string | null | undefined>(undefined);
  const [data, setData] = useState<SearchTermRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const tab = tabFilter;
  const setTab = setTabFilter;
  const [matchTypeFilter, setMatchTypeFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
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

  // 2. Fetch data when profile is resolved or dateFilter changes
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
        const addFilter = (query: any) => {
          if (profileId) return query.eq('profile_id', profileId);
          return query.eq('account_name', apiAccountName);
        };

        // Compute date range from the dashboard's dateFilter
        const range = getCurrentDateRange(dateFilter, customDateRange);
        const rangeStart = formatDate(range.from, 'yyyy-MM-dd');
        const rangeEnd = formatDate(range.to, 'yyyy-MM-dd');

        // Fetch all weekly buckets that overlap with the selected date range
        const PAGE_SIZE = 10000;
        let allRows: SearchTermRow[] = [];
        let from = 0;

        while (true) {
          let query = supabase
            .from('amazon_api_search_terms_performance')
            .select('search_term, keyword, match_type, campaign_name, ad_group_name, impressions, clicks, ctr, spend, sales_7d, orders_7d, acos_7d, roas_7d, cpc, country_code');
          query = addFilter(query);
          const { data: batch, error: batchErr } = await query
            .gte('date_end', rangeStart)
            .lte('date_start', rangeEnd)
            .range(from, from + PAGE_SIZE - 1);

          if (batchErr) {
            setError('Failed to fetch search term data');
            setIsLoading(false);
            return;
          }

          if (!batch || batch.length === 0) break;
          allRows = allRows.concat(batch as SearchTermRow[]);
          if (batch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        // Aggregate rows by (search_term, keyword, match_type, campaign_name, ad_group_name)
        const grouped: Record<string, {
          search_term: string;
          keyword: string | null;
          match_type: string | null;
          campaign_name: string | null;
          ad_group_name: string | null;
          country_code: string | null;
          impressions: number;
          clicks: number;
          spend: number;
          sales_7d: number;
          orders_7d: number;
        }> = {};

        for (const row of allRows) {
          const key = `${row.search_term}|||${row.keyword || ''}|||${row.match_type || ''}|||${row.campaign_name || ''}|||${row.ad_group_name || ''}`;
          if (!grouped[key]) {
            grouped[key] = {
              search_term: row.search_term,
              keyword: row.keyword,
              match_type: row.match_type,
              campaign_name: row.campaign_name,
              ad_group_name: row.ad_group_name,
              country_code: row.country_code,
              impressions: 0, clicks: 0, spend: 0, sales_7d: 0, orders_7d: 0,
            };
          }
          const g = grouped[key];
          g.impressions += Number(row.impressions) || 0;
          g.clicks += Number(row.clicks) || 0;
          g.spend += Number(row.spend) || 0;
          g.sales_7d += Number(row.sales_7d) || 0;
          g.orders_7d += Number(row.orders_7d) || 0;
        }

        // Recalculate derived metrics from aggregated totals
        const aggregated: SearchTermRow[] = Object.values(grouped).map(g => ({
          search_term: g.search_term,
          keyword: g.keyword,
          match_type: g.match_type,
          campaign_name: g.campaign_name,
          ad_group_name: g.ad_group_name,
          country_code: g.country_code,
          impressions: g.impressions,
          clicks: g.clicks,
          spend: g.spend,
          sales_7d: g.sales_7d,
          orders_7d: g.orders_7d,
          ctr: g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0,
          acos_7d: g.sales_7d > 0 ? (g.spend / g.sales_7d) * 100 : 0,
          roas_7d: g.spend > 0 ? g.sales_7d / g.spend : 0,
          cpc: g.clicks > 0 ? g.spend / g.clicks : 0,
        }));

        setDateRange({ start: rangeStart, end: rangeEnd });
        setData(aggregated);
      } catch (e) {
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profileId, apiAccountName, dateFilter, customDateRange]);

  // Derived data
  const campaigns = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => { if (r.campaign_name) set.add(r.campaign_name); });
    return Array.from(set).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let rows = [...data];

    if (tab === 'keywords') rows = rows.filter(r => !isAsin(r.search_term));
    if (tab === 'asins') rows = rows.filter(r => isAsin(r.search_term));

    if (searchText) {
      const q = searchText.toLowerCase();
      rows = rows.filter(r =>
        r.search_term.toLowerCase().includes(q) ||
        (r.keyword?.toLowerCase().includes(q)) ||
        (r.campaign_name?.toLowerCase().includes(q))
      );
    }

    if (matchTypeFilter !== 'all') {
      rows = rows.filter(r => r.match_type?.toLowerCase() === matchTypeFilter.toLowerCase());
    }

    if (campaignFilter !== 'all') {
      rows = rows.filter(r => r.campaign_name === campaignFilter);
    }

    rows.sort((a, b) => {
      let av: any, bv: any;
      if (sortField === 'cvr') {
        av = (a.clicks && a.clicks > 0) ? ((a.orders_7d || 0) / a.clicks * 100) : 0;
        bv = (b.clicks && b.clicks > 0) ? ((b.orders_7d || 0) / b.clicks * 100) : 0;
      } else {
        av = a[sortField as keyof SearchTermRow] ?? 0;
        bv = b[sortField as keyof SearchTermRow] ?? 0;
      }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [data, tab, searchText, matchTypeFilter, campaignFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pageData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  }, [sortField]);

  useEffect(() => { setPage(0); }, [tab, searchText, matchTypeFilter, campaignFilter]);

  // Highlight cards
  const highlights = useMemo(() => {
    if (data.length === 0) return null;
    const withClicks = data.filter(r => (r.clicks || 0) >= 4 && (r.orders_7d || 0) > 0);
    const bestConverting = withClicks.length > 0
      ? withClicks.reduce((best, r) => {
          const cvr = (r.orders_7d || 0) / (r.clicks || 1);
          const bestCvr = (best.orders_7d || 0) / (best.clicks || 1);
          return cvr > bestCvr ? r : best;
        })
      : null;

    const withSpend = data.filter(r => (r.spend || 0) > 1 && (r.roas_7d || 0) > 0);
    const highestRoas = withSpend.length > 0
      ? withSpend.reduce((best, r) => (r.roas_7d || 0) > (best.roas_7d || 0) ? r : best)
      : null;

    const withSales = data.filter(r => (r.sales_7d || 0) > 0);
    const highestSales = withSales.length > 0
      ? withSales.reduce((best, r) => (r.sales_7d || 0) > (best.sales_7d || 0) ? r : best)
      : data.reduce((best, r) => (r.sales_7d || 0) > (best.sales_7d || 0) ? r : best);

    return { bestConverting, highestRoas, highestSales };
  }, [data]);

  // CSV export
  const exportCsv = () => {
    const headers = ['Search Term', 'Keyword', 'Match Type', 'Campaign', 'Impressions', 'Clicks', 'CTR %', 'CPC', 'Spend', 'Sales', 'Orders', 'ACoS %', 'ROAS', 'Conv Rate %'];
    const rows = filteredData.map(r => {
      const cvr = r.clicks && r.clicks > 0 ? ((r.orders_7d || 0) / r.clicks * 100).toFixed(2) : '0';
      return [
        `"${r.search_term.replace(/"/g, '""')}"`,
        `"${(r.keyword || '').replace(/"/g, '""')}"`,
        getMatchTypeLabel(r.match_type).label,
        `"${(r.campaign_name || '').replace(/"/g, '""')}"`,
        r.impressions || 0,
        r.clicks || 0,
        (r.ctr || 0).toFixed(2),
        (r.cpc || 0).toFixed(2),
        (r.spend || 0).toFixed(2),
        (r.sales_7d || 0).toFixed(2),
        r.orders_7d || 0,
        (r.acos_7d || 0).toFixed(2),
        (r.roas_7d || 0).toFixed(2),
        cvr
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ppc-search-terms-${dateRange?.start || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => {
    const isActive = sortField === field;
    return (
      <TableHead
        className={`cursor-pointer select-none hover:bg-muted/50 ${className || ''}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {label}
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

  // Render search term cell with ASIN handling
  const renderSearchTerm = (searchTerm: string) => {
    if (isAsin(searchTerm)) {
      return (
        <div className="flex items-center gap-1.5">
          <a
            href={`https://www.amazon.co.uk/dp/${searchTerm.toUpperCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-mono text-xs truncate flex items-center gap-1"
            title={`View ${searchTerm} on Amazon`}
          >
            <ShoppingCart className="h-3 w-3 text-amber-500 flex-shrink-0" />
            {searchTerm}
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
          </a>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1" title={searchTerm}>
        <span className="truncate">{searchTerm}</span>
        <a
          href={`https://www.amazon.co.uk/s?k=${encodeURIComponent(searchTerm)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary flex-shrink-0"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  };

  // Not configured state
  if (apiAccountName === null && !isLoading) {
    return (
      <Card className="bg-card border-0 shadow-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">API data not configured for this account</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-0 shadow-lg overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

      <CardHeader className="pb-4 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">PPC Search Term Performance</CardTitle>
              <CardDescription className="text-muted-foreground">
                {dateRange
                  ? `${formatDateFriendly(dateRange.start)} – ${formatDateFriendly(dateRange.end)} · ${filteredData.length.toLocaleString()} search terms`
                  : 'Loading...'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ToggleGroup
              type="single"
              value={tab}
              onValueChange={(v) => { if (v) setTab(v as TabFilter); }}
              disabled={isLoading}
              size="sm"
            >
              <ToggleGroupItem value="all" className="text-xs px-2 h-8">All</ToggleGroupItem>
              <ToggleGroupItem value="keywords" className="text-xs px-2 h-8">Keywords</ToggleGroupItem>
              <ToggleGroupItem value="asins" className="text-xs px-2 h-8">ASINs</ToggleGroupItem>
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={isLoading || filteredData.length === 0}>
              <Download className="h-4 w-4 mr-2" />Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Highlight Cards */}
        {!isLoading && highlights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highlights.bestConverting && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">Best Converting</span>
                </div>
                <p className="text-sm font-semibold truncate">{highlights.bestConverting.search_term}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {highlights.bestConverting.orders_7d} orders / {highlights.bestConverting.clicks} clicks
                  ({((highlights.bestConverting.orders_7d || 0) / (highlights.bestConverting.clicks || 1) * 100).toFixed(1)}% CVR)
                </p>
              </div>
            )}
            {highlights.highestRoas && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium text-blue-600">Highest ROAS</span>
                </div>
                <p className="text-sm font-semibold truncate">{highlights.highestRoas.search_term}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(highlights.highestRoas.roas_7d || 0).toFixed(1)}x ROAS · {fmtMoney(highlights.highestRoas.sales_7d)} sales
                </p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-600">Highest Sales</span>
              </div>
              <p className="text-sm font-semibold truncate">{highlights.highestSales.search_term}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtMoney(highlights.highestSales.sales_7d)} sales · {fmtMoney(highlights.highestSales.spend)} spend
              </p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            type="text"
            placeholder="Search terms, keywords, campaigns..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            disabled={isLoading}
            className="max-w-xs"
          />
          <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter} disabled={isLoading}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Match Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Match Types</SelectItem>
              <SelectItem value="exact">Exact</SelectItem>
              <SelectItem value="phrase">Phrase</SelectItem>
              <SelectItem value="broad">Broad</SelectItem>
              <SelectItem value="targeting_expression_predefined">Auto Target</SelectItem>
              <SelectItem value="targeting_expression">Product Target</SelectItem>
            </SelectContent>
          </Select>
          <Select value={campaignFilter} onValueChange={setCampaignFilter} disabled={isLoading}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(c => (
                <SelectItem key={c} value={c}>{c.length > 40 ? c.slice(0, 40) + '…' : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <SortHeader field="search_term" label="Search Term" className="min-w-[180px]" />
                    <SortHeader field="keyword" label="Keyword" className="min-w-[140px]" />
                    <SortHeader field="match_type" label="Match" />
                    <SortHeader field="campaign_name" label="Campaign" className="min-w-[160px] hidden xl:table-cell" />
                    <SortHeader field="impressions" label="Impr." className="hidden lg:table-cell" />
                    <SortHeader field="clicks" label="Clicks" />
                    <SortHeader field="ctr" label="CTR" className="hidden lg:table-cell" />
                    <SortHeader field="cpc" label="CPC" className="hidden xl:table-cell" />
                    <SortHeader field="spend" label="Spend" />
                    <SortHeader field="sales_7d" label="Sales" />
                    <SortHeader field="orders_7d" label="Orders" className="hidden lg:table-cell" />
                    <SortHeader field="cvr" label="Conv %" className="hidden md:table-cell" />
                    <SortHeader field="acos_7d" label="ACoS" />
                    <SortHeader field="roas_7d" label="ROAS" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                        No search terms found
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((r, i) => {
                      const cvr = r.clicks && r.clicks > 0 ? ((r.orders_7d || 0) / r.clicks * 100) : 0;
                      const acosVal = r.acos_7d;
                      const roasVal = r.roas_7d;
                      const isAcosInvalid = acosVal == null || !Number.isFinite(acosVal) || acosVal > 9999 || ((r.spend || 0) > 0 && (r.sales_7d || 0) === 0);
                      const isRoasInvalid = roasVal == null || !Number.isFinite(roasVal) || roasVal > 9999 || ((r.spend || 0) > 0 && (r.sales_7d || 0) === 0);
                      const acosColor = isAcosInvalid ? 'text-muted-foreground' : (acosVal! > 30 ? 'text-destructive' : acosVal! > 15 ? 'text-amber-500' : 'text-emerald-600');
                      const matchInfo = getMatchTypeLabel(r.match_type);
                      return (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="font-medium max-w-[200px]">
                            {renderSearchTerm(r.search_term)}
                          </TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate" title={r.keyword || ''}>{r.keyword || '—'}</TableCell>
                          <TableCell>
                            <span className={`inline-block whitespace-nowrap text-[10px] px-2 py-0.5 rounded-full font-medium border ${matchInfo.color}`}>
                              {matchInfo.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate hidden xl:table-cell" title={r.campaign_name || ''}>{r.campaign_name || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums hidden lg:table-cell">{(r.impressions || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums">{(r.clicks || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums hidden lg:table-cell">{(r.ctr || 0).toFixed(2)}%</TableCell>
                          <TableCell className="text-right tabular-nums hidden xl:table-cell">{fmtMoney(r.cpc)}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{fmtMoney(r.spend)}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{fmtMoney(r.sales_7d)}</TableCell>
                          <TableCell className="text-right tabular-nums hidden lg:table-cell">{r.orders_7d || 0}</TableCell>
                          <TableCell className="text-right tabular-nums hidden md:table-cell">{cvr.toFixed(1)}%</TableCell>
                          <TableCell className={`text-right tabular-nums ${acosColor}`}>
                            {isAcosInvalid ? 'N/A' : `${acosVal!.toFixed(1)}%`}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums ${isRoasInvalid ? 'text-muted-foreground' : ''}`}>
                            {isRoasInvalid ? 'N/A' : `${roasVal!.toFixed(1)}x`}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Scroll indicator for hidden columns */}
            <div className="xl:hidden px-3 py-1.5 bg-muted/30 border-t text-[10px] text-muted-foreground text-center">
              ← Scroll horizontally for more columns →
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Showing {(page * pageSize + 1).toLocaleString()} – {Math.min((page + 1) * pageSize, filteredData.length).toLocaleString()} of {filteredData.length.toLocaleString()}
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
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page + 1} of {Math.max(totalPages, 1)} ({filteredData.length.toLocaleString()} results)
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
