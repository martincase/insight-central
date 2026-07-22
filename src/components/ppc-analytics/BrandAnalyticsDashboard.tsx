import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Target, AlertTriangle, TrendingUp, ShoppingCart, ArrowRight, Info, X, Trophy, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { InfoTooltip } from '@/components/common/InfoTooltip';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

interface BrandAnalyticsDashboardProps {
  accountName: string;
  scope?: CountryScope;
}

interface KeywordRow {
  ba_search_term: string | null;
  search_query_volume: number | null;
  impressions_brand_share: string | null;
  clicks_brand_share: string | null;
  purchases_brand_share: string | null;
  spend: number | null;
  sales: number | null;
  acos: number | null;
  purchases_total_count: number | null;
  basket_adds_brand_share_pct: string | null;
  basket_adds_brand_share: string | null;
  impressions_total_count: number | null;
  clicks_total_count: number | null;
  basket_adds_total_count: number | null;
  impressions_brand_count: number | null;
  clicks_brand_count: number | null;
  basket_adds_brand_count: number | null;
  purchases_brand_count: number | null;
  search_query_score: number | null;
}

type SortField = keyof KeywordRow;
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 50;

type BrandFilter = 'all' | 'branded' | 'generic';

const defaultBrandTokens = (accountName: string): string[] => {
  if (!accountName) return [];
  const first = accountName.trim().split(/\s+/)[0]?.toLowerCase();
  return first ? [first] : [];
};

const toNum = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

export function BrandAnalyticsDashboard({ accountName, scope }: BrandAnalyticsDashboardProps) {
  const [data, setData] = useState<KeywordRow[]>([]);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [minBrandShare, setMinBrandShare] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('search_query_volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<KeywordRow | null>(null);
  const [trend, setTrend] = useState<{ week: string; weekLabel: string; share: number }[]>([]);
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [brandTokens, setBrandTokens] = useState<string[]>(() => defaultBrandTokens(accountName));
  const [newToken, setNewToken] = useState('');
  const [presetFilter, setPresetFilter] = useState<'none' | 'opportunity' | 'risk'>('none');

  useEffect(() => {
    setBrandTokens(defaultBrandTokens(accountName));
  }, [accountName]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: weekData } = await supabase
          .from('vw_python_kw_weekly' as any)
          .select('week_start')
          .eq('account_name', accountName)
          .eq('has_ba', true)
          .order('week_start', { ascending: false })
          .limit(1);

        const rows = weekData as any[] | null;
        if (!rows || rows.length === 0) {
          setData([]);
          setIsLoading(false);
          return;
        }

        const latestWeek = rows[0].week_start;
        setWeekStart(latestWeek);

        const { data: keywordData } = await supabase
          .from('vw_python_kw_weekly' as any)
          .select('keyword, search_query_volume, search_query_score, impressions_total_count, impressions_brand_count, impressions_brand_share_pct, clicks_total_count, clicks_brand_count, clicks_brand_share_pct, basket_adds_total_count, basket_adds_brand_count, basket_adds_brand_share_pct, purchases_total_count, purchases_brand_count, purchases_brand_share_pct, click_rate_pct, purchase_rate_pct, spend, sales, acos')
          .eq('account_name', accountName)
          .eq('has_ba', true)
          .eq('week_start', latestWeek)
          .order('search_query_volume', { ascending: false });

        const mapped: KeywordRow[] = ((keywordData as any[] | null) || []).map((r) => ({
          ba_search_term: r.keyword ?? null,
          search_query_volume: r.search_query_volume ?? null,
          impressions_brand_share: r.impressions_brand_share_pct ?? null,
          clicks_brand_share: r.clicks_brand_share_pct ?? null,
          purchases_brand_share: r.purchases_brand_share_pct ?? null,
          spend: r.spend ?? null,
          sales: r.sales ?? null,
          acos: r.acos ?? null,
          purchases_total_count: r.purchases_total_count ?? null,
          basket_adds_brand_share_pct: r.basket_adds_brand_share_pct ?? null,
          basket_adds_brand_share: r.basket_adds_brand_share_pct ?? null,
          impressions_total_count: r.impressions_total_count ?? null,
          clicks_total_count: r.clicks_total_count ?? null,
          basket_adds_total_count: r.basket_adds_total_count ?? null,
          impressions_brand_count: r.impressions_brand_count ?? null,
          clicks_brand_count: r.clicks_brand_count ?? null,
          basket_adds_brand_count: r.basket_adds_brand_count ?? null,
          purchases_brand_count: r.purchases_brand_count ?? null,
          search_query_score: r.search_query_score ?? null,
        }));
        setData(mapped);
      } catch (err) {
        console.error('Brand Analytics fetch error:', err);
        setData([]);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [accountName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: any[] = [];
        const pageSize = 1000;
        let offset = 0;
        while (true) {
          const { data, error } = await supabase
            .from('vw_python_kw_weekly' as any)
            .select('week_start, search_query_volume, impressions_brand_share_pct')
            .eq('account_name', accountName)
            .eq('has_ba', true)
            .order('week_start', { ascending: false })
            .range(offset, offset + pageSize - 1);
          if (error) throw error;
          const batch = (data as any[]) || [];
          all.push(...batch);
          if (batch.length < pageSize) break;
          offset += pageSize;
        }
        const map = new Map<string, { volume: number; weighted: number }>();
        for (const r of all) {
          const v = Number(r.search_query_volume) || 0;
          const s = Number(r.impressions_brand_share_pct) || 0;
          const cur = map.get(r.week_start) || { volume: 0, weighted: 0 };
          cur.volume += v;
          cur.weighted += v * s;
          map.set(r.week_start, cur);
        }
        const arr = Array.from(map.entries())
          .map(([w, v]) => ({
            week: w,
            weekLabel: (() => { try { return format(new Date(w), 'dd MMM'); } catch { return w; } })(),
            share: v.volume > 0 ? v.weighted / v.volume : 0,
          }))
          .sort((a, b) => a.week.localeCompare(b.week));
        if (!cancelled) setTrend(arr);
      } catch (e) {
        console.error('Brand Analytics trend fetch error:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [accountName]);

  const isOpportunity = (row: KeywordRow) =>
    (row.search_query_volume ?? 0) > 1000 && (!row.spend || row.spend === 0);

  const isDependencyRisk = (row: KeywordRow) =>
    (row.spend ?? 0) > 5 && (row.impressions_brand_share != null ? Number(row.impressions_brand_share) : 0) < 5;

  const tokensLc = useMemo(() => brandTokens.map(t => t.toLowerCase()).filter(Boolean), [brandTokens]);
  const isBrandedKw = (kw: string | null | undefined) => {
    if (!kw || tokensLc.length === 0) return false;
    const lc = kw.toLowerCase();
    return tokensLc.some(t => lc.includes(t));
  };

  const summaryCards = useMemo(() => {
    const total = data.length;
    const avgBrandShare = total > 0
      ? data.reduce((sum, r) => sum + (r.impressions_brand_share != null ? Number(r.impressions_brand_share) : 0), 0) / total
      : 0;
    const opportunityCount = data.filter(isOpportunity).length;
    const riskCount = data.filter(isDependencyRisk).length;
    const totalPurchases = data.reduce((s, r) => s + toNum(r.purchases_total_count), 0);
    const brandedCount = data.filter(r => isBrandedKw(r.ba_search_term)).length;
    const genericCount = total - brandedCount;
    return { total, avgBrandShare, opportunityCount, riskCount, totalPurchases, brandedCount, genericCount };
  }, [data, tokensLc]);

  const overviewData = useMemo(() => {
    const totalSearchVolume = data.reduce((s, r) => s + toNum(r.search_query_volume), 0);
    const totalImpressions = data.reduce((s, r) => s + toNum(r.impressions_total_count), 0);
    const totalClicks = data.reduce((s, r) => s + toNum(r.clicks_total_count), 0);
    const totalBasketAdds = data.reduce((s, r) => s + toNum(r.basket_adds_total_count), 0);
    const totalPurchases = data.reduce((s, r) => s + toNum(r.purchases_total_count), 0);
    const brandImpressions = data.reduce((s, r) => s + toNum(r.impressions_brand_count), 0);
    const brandClicks = data.reduce((s, r) => s + toNum(r.clicks_brand_count), 0);
    const brandBasketAdds = data.reduce((s, r) => s + toNum(r.basket_adds_brand_count), 0);
    const brandPurchases = data.reduce((s, r) => s + toNum(r.purchases_brand_count), 0);
    return {
      totalSearchVolume, totalImpressions, totalClicks, totalBasketAdds, totalPurchases,
      brandImpressions, brandClicks, brandBasketAdds, brandPurchases,
    };
  }, [data]);

  const processedData = useMemo(() => {
    let filtered = data;
    if (filter) {
      const lc = filter.toLowerCase();
      filtered = filtered.filter(r => r.ba_search_term?.toLowerCase().includes(lc));
    }
    const minShare = parseFloat(minBrandShare);
    if (!isNaN(minShare)) {
      filtered = filtered.filter(r => {
        const v = r.impressions_brand_share != null ? Number(r.impressions_brand_share) : 0;
        return v >= minShare;
      });
    }
    if (brandFilter !== 'all' && brandTokens.length > 0) {
      const tokens = brandTokens.map(t => t.toLowerCase()).filter(Boolean);
      filtered = filtered.filter(r => {
        const kw = (r.ba_search_term || '').toLowerCase();
        const isBranded = tokens.some(t => kw.includes(t));
        return brandFilter === 'branded' ? isBranded : !isBranded;
      });
    }
    if (presetFilter === 'opportunity') filtered = filtered.filter(isOpportunity);
    else if (presetFilter === 'risk') filtered = filtered.filter(isDependencyRisk);
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (Number(aVal)) - (Number(bVal)) : (Number(bVal)) - (Number(aVal));
    });
    return sorted;
  }, [data, filter, minBrandShare, sortField, sortDirection, brandFilter, brandTokens, presetFilter]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / PAGE_SIZE));
  const pageData = processedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [filter, minBrandShare, sortField, sortDirection, brandFilter, brandTokens, presetFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const exportCsv = () => {
    const headers = ['Keyword', 'Search Volume', 'Brand Share Impr%', 'Brand Share Clicks%', 'Brand Share Purchases%', 'Purchases: Total Count', 'Basket Add Brand Share %', 'PPC Spend', 'PPC Sales', 'PPC ACOS'];
    const rows = processedData.map(r => [
      `"${(r.ba_search_term || '').replace(/"/g, '""')}"`,
      r.search_query_volume ?? '',
      r.impressions_brand_share ?? '',
      r.clicks_brand_share ?? '',
      r.purchases_brand_share ?? '',
      r.purchases_total_count ?? '',
      r.basket_adds_brand_share_pct ?? '',
      r.spend ?? '',
      r.sales ?? '',
      r.acos != null ? (r.acos * 100).toFixed(2) : ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `brand-analytics-${accountName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cur = getCurrencyInfo(scope);
  const fmtCurrency = (v: number | null) => v != null ? `${cur.symbol}${new Intl.NumberFormat(cur.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}` : '—';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-80" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Brand Analytics & Keyword Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Brand Analytics data not yet available for this account
          </p>
        </CardContent>
      </Card>
    );
  }

  const funnelSegments = [
    { name: 'Impressions', value: overviewData.totalImpressions, color: 'hsl(210, 70%, 55%)' },
    { name: 'Clicks', value: overviewData.totalClicks, color: 'hsl(175, 60%, 45%)' },
    { name: 'Basket Adds', value: overviewData.totalBasketAdds, color: 'hsl(30, 80%, 55%)' },
    { name: 'Purchases', value: overviewData.totalPurchases, color: 'hsl(140, 60%, 45%)' },
  ];
  const funnelTotal = funnelSegments.reduce((s, seg) => s + seg.value, 0);

  const overviewRows = [
    { label: 'Search Volume', total: overviewData.totalSearchVolume, brand: null as number | null, share: null as number | null },
    { label: 'Impressions', total: overviewData.totalImpressions, brand: overviewData.brandImpressions, share: overviewData.totalImpressions ? (overviewData.brandImpressions / overviewData.totalImpressions) * 100 : 0 },
    { label: 'Clicks', total: overviewData.totalClicks, brand: overviewData.brandClicks, share: overviewData.totalClicks ? (overviewData.brandClicks / overviewData.totalClicks) * 100 : 0 },
    { label: 'Basket Adds', total: overviewData.totalBasketAdds, brand: overviewData.brandBasketAdds, share: overviewData.totalBasketAdds ? (overviewData.brandBasketAdds / overviewData.totalBasketAdds) * 100 : 0 },
    { label: 'Purchases', total: overviewData.totalPurchases, brand: overviewData.brandPurchases, share: overviewData.totalPurchases ? (overviewData.brandPurchases / overviewData.totalPurchases) * 100 : 0 },
  ];

  return (
    <>
    <Card>
      <CardHeader className="bg-gradient-to-r from-accent to-muted border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Brand Analytics & Keyword Intelligence
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1">
                {weekStart ? `Week of ${format(new Date(weekStart), 'dd MMM yyyy')}` : ''} · {processedData.length} keywords
              </CardDescription>
              <p className="text-xs text-muted-foreground/70 mt-1 italic">ℹ️ Brand Analytics data is provided weekly by Amazon — showing the most recent available week</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={processedData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 items-stretch">
          {/* Branded / Generic split */}
          <div className="p-4 rounded-lg border bg-card flex flex-col">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Branded / Generic</span>
              <InfoTooltip content={`Branded = keyword contains one of your brand tokens (${tokensLc.join(', ') || 'none set'}); Generic = everything else. Edit tokens below the table filters.`} />
            </div>
            <p className="text-2xl font-bold leading-tight">
              <span className="text-primary">{summaryCards.brandedCount.toLocaleString()}</span>
              <span className="text-muted-foreground"> / </span>
              <span>{summaryCards.genericCount.toLocaleString()}</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">branded / generic</p>
          </div>

          {/* Brand Share Impr% */}
          <div className="p-4 rounded-lg border bg-card flex flex-col">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Brand Share Impr%</span>
              <InfoTooltip content="Your share of search-result impressions across these keywords. Overall is volume-weighted (true visibility); avg/keyword is the simple mean, inflated by small branded terms." />
            </div>
            {(() => {
              const overall = overviewData.totalImpressions > 0
                ? (overviewData.brandImpressions / overviewData.totalImpressions) * 100
                : 0;
              return (
                <>
                  <p className="text-2xl font-bold leading-tight">{overall.toFixed(1)}% <span className="text-sm font-normal text-muted-foreground">overall</span></p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">· {summaryCards.avgBrandShare.toFixed(1)}% avg/keyword</p>
                </>
              );
            })()}
          </div>

          {/* Opportunity Keywords — clickable */}
          <button
            type="button"
            onClick={() => setPresetFilter(p => p === 'opportunity' ? 'none' : 'opportunity')}
            className={`p-4 rounded-lg border text-left transition-all flex flex-col ${
              presetFilter === 'opportunity'
                ? 'bg-green-100 dark:bg-green-950/50 border-green-500 ring-2 ring-green-500/40'
                : 'bg-card border-green-200 dark:border-green-800 hover:border-green-400'
            }`}
          >
            <div className="flex items-center justify-between text-sm text-green-700 dark:text-green-400 mb-1">
              <span className="flex items-center gap-2"><Target className="h-4 w-4" /> Opportunity Keywords</span>
              <InfoTooltip
                content="Searches with >1,000 weekly volume where you have £0 PPC spend — demand you are not bidding on. Click the card to filter the table."
                className="text-green-700/60 hover:text-green-700"
              />
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400 leading-tight">{summaryCards.opportunityCount}</p>
            <p className="text-[11px] text-green-700/70 dark:text-green-400/70 mt-0.5">{presetFilter === 'opportunity' ? 'Filtering table ✓' : 'Click to filter'}</p>
          </button>

          {/* Dependency Risk — clickable */}
          <button
            type="button"
            onClick={() => setPresetFilter(p => p === 'risk' ? 'none' : 'risk')}
            className={`p-4 rounded-lg border text-left transition-all flex flex-col ${
              presetFilter === 'risk'
                ? 'bg-amber-100 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/40'
                : 'bg-card border-amber-200 dark:border-amber-800 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-400 mb-1">
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Dependency Risk</span>
              <InfoTooltip
                content="Terms where you spend >£5 but hold <5% impression share — paying to compete but barely visible. Click the card to filter the table."
                className="text-amber-700/60 hover:text-amber-700"
              />
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 leading-tight">{summaryCards.riskCount}</p>
            <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 mt-0.5">{presetFilter === 'risk' ? 'Filtering table ✓' : 'Click to filter'}</p>
          </button>

          {/* Total Purchases */}
          <div className="p-4 rounded-lg border bg-card flex flex-col">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Total Purchases</span>
              <InfoTooltip content="All purchases across these search queries this week (whole market, every brand) — your slice is the Brand Count." />
            </div>
            <p className="text-2xl font-bold leading-tight">{summaryCards.totalPurchases.toLocaleString()}</p>
          </div>
        </div>




        {/* Conversion Funnel */}
        {funnelTotal > 0 && (
          <div className="mb-6 p-5 rounded-lg border bg-card">
            <h3 className="text-base font-semibold mb-1">Conversion Funnel</h3>
            <p className="text-xs text-muted-foreground mb-4">Each stage is scaled to itself; conversion rate shown between stages.</p>
            {(() => {
              const stages = funnelSegments;
              const convRates = [
                { label: 'CTR', value: stages[0].value > 0 ? (stages[1].value / stages[0].value) * 100 : 0 },
                { label: 'Click → Basket Add', value: stages[1].value > 0 ? (stages[2].value / stages[1].value) * 100 : 0 },
                { label: 'Basket Add → Purchase', value: stages[2].value > 0 ? (stages[3].value / stages[2].value) * 100 : 0 },
              ];
              return (
                <div className="space-y-1">
                  {stages.map((stage, idx) => (
                    <div key={stage.name}>
                      {idx > 0 && (
                        <div className="flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground">
                          <ArrowDown className="h-3 w-3" />
                          <span>{convRates[idx - 1].label}: <strong className="text-foreground">{convRates[idx - 1].value.toFixed(2)}%</strong></span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-28 text-xs font-medium text-right shrink-0">{stage.name}</div>
                        <div className="flex-1 h-9 rounded-md flex items-center px-3 text-white text-xs font-semibold" style={{ backgroundColor: stage.color }}>
                          {stage.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}


        {/* Trend: Share of search-page impressions */}
        {trend.length > 1 && (
          <div className="mb-6 p-5 rounded-lg border bg-card">
            <h3 className="text-base font-semibold">Share of search-page impressions</h3>
            <p className="text-xs text-muted-foreground mb-3">Volume-weighted brand impression share over time</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="weekLabel" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={[
                      (dataMin: number) => Math.max(0, dataMin - Math.max((dataMin || 0.01) * 0.2, 0.01)),
                      (dataMax: number) => dataMax + Math.max(dataMax * 0.2, 0.01),
                    ]}
                    tickFormatter={(v: number) => `${Number(v).toFixed(2)}%`}
                    width={70}
                  />
                  <RTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Brand share']}
                  />
                  <Line type="monotone" dataKey="share" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter keywords..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="whitespace-nowrap">Min Brand Impr%:</span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 5"
                value={minBrandShare}
                onChange={e => setMinBrandShare(e.target.value)}
                className="w-24 h-9"
              />
            </div>
          </div>
          {/* Row colour legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-100 dark:bg-green-950/50 border border-green-300 dark:border-green-700" />
              Opportunity — high volume (&gt;1k), no PPC spend
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700" />
              Dependency Risk — spending &gt;£5, brand share &lt;5%
            </span>
          </div>
        </div>

        {/* Branded / Generic toggle + tokens */}
        <div className="flex flex-wrap items-center gap-3 mb-3 p-3 rounded-md border bg-muted/30">
          <div className="inline-flex rounded-md border bg-background overflow-hidden">
            {(['all', 'branded', 'generic'] as BrandFilter[]).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setBrandFilter(opt)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  brandFilter === opt
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Brand tokens:</span>
            {brandTokens.length === 0 && (
              <span className="text-xs text-muted-foreground italic">none</span>
            )}
            {brandTokens.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                {t}
                <button
                  type="button"
                  onClick={() => setBrandTokens(prev => prev.filter(x => x !== t))}
                  className="hover:text-destructive"
                  aria-label={`Remove ${t}`}
                >×</button>
              </span>
            ))}
            <Input
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = newToken.trim().toLowerCase();
                  if (v && !brandTokens.includes(v)) setBrandTokens(prev => [...prev, v]);
                  setNewToken('');
                }
              }}
              placeholder="add token (Enter)"
              className="h-7 w-36 text-xs"
            />
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            Branded = keyword contains any token (case-insensitive). Generic = everything else.
          </span>
        </div>

        {/* Preset buttons + active filter pill */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground mr-1">Quick views:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setPresetFilter('none');
              setSortField('purchases_brand_share');
              setSortDirection('desc');
            }}
          >
            <Trophy className="h-3.5 w-3.5 text-green-600" />
            Where we win
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setPresetFilter('opportunity');
              setSortField('search_query_volume');
              setSortDirection('desc');
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Demand gaps
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setPresetFilter('none');
              setSortField('search_query_volume');
              setSortDirection('desc');
            }}
          >
            Reset
          </Button>
          {presetFilter !== 'none' && (
            <span className={`ml-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
              presetFilter === 'opportunity'
                ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
            }`}>
              Filtered: {presetFilter === 'opportunity' ? 'Opportunity Keywords' : 'Dependency Risk'}
              <button type="button" onClick={() => setPresetFilter('none')} aria-label="Clear filter" className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                {([
                  ['ba_search_term', 'Keyword', 'left'],
                  ['search_query_volume', 'Search Vol', 'right'],
                  ['purchases_total_count', 'Purchases', 'right'],
                  ['impressions_brand_share', 'Impr Share%', 'right'],
                  ['clicks_brand_share', 'Click Share%', 'right'],
                  ['basket_adds_brand_share', 'Basket Share%', 'right'],
                  ['purchases_brand_share', 'Purch Share%', 'right'],
                  ['purchases_brand_count', 'Brand Purch', 'right'],
                  ['spend', 'PPC Spend', 'right'],
                  ['sales', 'PPC Sales', 'right'],
                  ['acos', 'ACOS', 'right'],
                ] as [SortField, string, 'left' | 'right'][]).map(([field, label, align]) => (
                  <TableHead
                    key={field}
                    className={`cursor-pointer select-none px-2 py-2 text-xs leading-tight ${align === 'right' ? 'text-right' : ''}`}
                    onClick={() => handleSort(field)}
                  >
                    <span className={`inline-flex items-center gap-0.5 ${align === 'right' ? 'justify-end w-full' : ''}`}>
                      {label}
                      <SortIcon field={field} />
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((row, i) => {
                const opp = isOpportunity(row);
                const risk = isDependencyRisk(row);
                const shadeShare = (raw: any) => {
                  const v = raw != null ? Number(raw) : 0;
                  if (!v || v <= 0) return '';
                  if (v >= 25) return 'bg-green-200/70 dark:bg-green-900/40';
                  if (v >= 10) return 'bg-green-100/80 dark:bg-green-950/40';
                  if (v >= 1) return 'bg-green-50 dark:bg-green-950/20';
                  return 'bg-green-50/50 dark:bg-green-950/10';
                };
                const basketShareRaw = row.basket_adds_brand_share ?? row.basket_adds_brand_share_pct;
                return (
                  <TableRow
                    key={i}
                    className={`cursor-pointer ${
                      opp ? 'bg-green-50 dark:bg-green-950/30' :
                      risk ? 'bg-amber-50 dark:bg-amber-950/30' : ''
                    }`}
                    onClick={() => setSelectedRow(row)}
                  >
                    <TableCell className="px-2 py-2 text-xs font-medium truncate" title={row.ba_search_term || ''}>{row.ba_search_term || '—'}</TableCell>
                    <TableCell className="px-2 py-2 text-xs text-right tabular-nums">{row.search_query_volume?.toLocaleString() ?? '—'}</TableCell>
                    <TableCell className="px-2 py-2 text-xs text-right tabular-nums">{row.purchases_total_count != null ? toNum(row.purchases_total_count).toLocaleString() : '—'}</TableCell>
                    <TableCell className={`px-2 py-2 text-xs text-right tabular-nums ${shadeShare(row.impressions_brand_share)}`}>{row.impressions_brand_share != null ? `${Number(row.impressions_brand_share).toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className={`px-2 py-2 text-xs text-right tabular-nums ${shadeShare(row.clicks_brand_share)}`}>{row.clicks_brand_share != null ? `${Number(row.clicks_brand_share).toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className={`px-2 py-2 text-xs text-right tabular-nums ${shadeShare(basketShareRaw)}`}>{basketShareRaw != null ? `${Number(basketShareRaw).toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className={`px-2 py-2 text-xs text-right tabular-nums ${shadeShare(row.purchases_brand_share)}`}>{row.purchases_brand_share != null ? `${Number(row.purchases_brand_share).toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className="px-2 py-2 text-xs text-right tabular-nums">{row.purchases_brand_count != null ? toNum(row.purchases_brand_count).toLocaleString() : '—'}</TableCell>
                    <TableCell className="px-2 py-2 text-xs text-right tabular-nums">{fmtCurrency(row.spend)}</TableCell>
                    <TableCell className="px-2 py-2 text-xs text-right tabular-nums">{fmtCurrency(row.sales)}</TableCell>
                    <TableCell className="px-2 py-2 text-xs text-right tabular-nums">{row.acos != null ? `${(row.acos * 100).toFixed(1)}%` : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>


        {/* Pagination */}
        {processedData.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({processedData.length} results)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Keyword Detail Modal */}
    <Dialog open={!!selectedRow} onOpenChange={(open) => { if (!open) setSelectedRow(null); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {selectedRow && (() => {
          const r = selectedRow;
          const stages = [
            { name: 'Impressions', total: toNum(r.impressions_total_count), brand: toNum(r.impressions_brand_count), share: r.impressions_brand_share != null ? Number(r.impressions_brand_share) : null, color: 'hsl(210, 70%, 55%)' },
            { name: 'Clicks', total: toNum(r.clicks_total_count), brand: toNum(r.clicks_brand_count), share: r.clicks_brand_share != null ? Number(r.clicks_brand_share) : null, color: 'hsl(175, 60%, 45%)' },
            { name: 'Basket Adds', total: toNum(r.basket_adds_total_count), brand: toNum(r.basket_adds_brand_count), share: (() => { const v = r.basket_adds_brand_share ?? r.basket_adds_brand_share_pct; return v != null ? Number(v) : null; })(), color: 'hsl(30, 80%, 55%)' },
            { name: 'Purchases', total: toNum(r.purchases_total_count), brand: toNum(r.purchases_brand_count), share: r.purchases_brand_share != null ? Number(r.purchases_brand_share) : null, color: 'hsl(140, 60%, 45%)' },
          ];
          const maxTotal = Math.max(...stages.map(s => s.total), 1);
          const convRates = [
            { label: 'Click Rate', value: stages[0].total > 0 ? (stages[1].total / stages[0].total) * 100 : 0 },
            { label: 'Basket Add Rate', value: stages[1].total > 0 ? (stages[2].total / stages[1].total) * 100 : 0 },
            { label: 'Purchase Rate', value: stages[2].total > 0 ? (stages[3].total / stages[2].total) * 100 : 0 },
          ];

          return (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {r.ba_search_term || 'Unknown Keyword'}
                </DialogTitle>
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  <span>Search Volume: <strong className="text-foreground">{r.search_query_volume?.toLocaleString() ?? '—'}</strong></span>
                  {r.search_query_score != null && (
                    <span>Search Query Score: <strong className="text-foreground">{toNum(r.search_query_score).toFixed(1)}</strong></span>
                  )}
                </div>
              </DialogHeader>

              {/* Funnel Visualization */}
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Conversion Funnel</h4>
                {stages.map((stage, idx) => {
                  const widthPct = Math.max((stage.total / maxTotal) * 100, 12);
                  return (
                    <div key={stage.name}>
                      {/* Conversion rate arrow between stages */}
                      {idx > 0 && (
                        <div className="flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground">
                          <ArrowDown className="h-3 w-3" />
                          <span>{convRates[idx - 1].label}: <strong className="text-foreground">{convRates[idx - 1].value.toFixed(1)}%</strong></span>
                        </div>
                      )}
                      {/* Funnel bar */}
                      <div className="flex items-center gap-3">
                        <div className="w-24 text-xs font-medium text-right shrink-0">{stage.name}</div>
                        <div className="flex-1 relative">
                          <div
                            className="h-10 rounded-md flex items-center px-3 text-white text-xs font-semibold transition-all"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: stage.color,
                              margin: '0 auto 0 0',
                            }}
                          >
                            {stage.total.toLocaleString()}
                          </div>
                        </div>
                        <div className="w-44 text-xs text-muted-foreground shrink-0 text-right">
                          Brand: <strong className="text-foreground">{stage.brand.toLocaleString()}</strong>
                          {' · '}
                          Share: <strong className="text-foreground">{stage.share != null ? `${stage.share.toFixed(1)}%` : '—'}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Conversion Rates Summary */}
              <div className="grid grid-cols-3 gap-3 mt-5">
                {convRates.map(cr => (
                  <div key={cr.label} className="p-3 rounded-lg border bg-card text-center">
                    <div className="text-xs text-muted-foreground mb-1">{cr.label}</div>
                    <div className="text-lg font-bold">{cr.value.toFixed(1)}%</div>
                  </div>
                ))}
              </div>

              {/* PPC context */}
              {(r.spend != null || r.sales != null) && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <div className="text-xs text-muted-foreground mb-1">PPC Spend</div>
                    <div className="text-lg font-bold">{fmtCurrency(r.spend)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <div className="text-xs text-muted-foreground mb-1">PPC Sales</div>
                    <div className="text-lg font-bold">{fmtCurrency(r.sales)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <div className="text-xs text-muted-foreground mb-1">ACoS</div>
                    <div className="text-lg font-bold">{r.acos != null ? `${(r.acos * 100).toFixed(1)}%` : '—'}</div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
    </>
  );
}
