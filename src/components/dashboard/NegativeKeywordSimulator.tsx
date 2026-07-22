import { useState, useEffect, useMemo, useCallback } from 'react';
import { FlaskConical, ChevronDown, ChevronRight, Search, Download, Loader2, Info, Check, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'nk_simulator_params';

interface SimResult {
  account_name: string;
  rule_triggered: string;
  lookback_window: string;
  search_term: string;
  keyword_text: string;
  negative_type: string;
  match_type: string | null;
  campaign_name: string;
  ad_group_name: string;
  campaign_id: string;
  ad_group_id: string;
  total_clicks: number;
  total_spend: number;
  total_orders: number;
  total_sales: number;
  calculated_acos: number | null;
  already_pending: boolean;
  reason: string;
}

interface NegativeKeywordSimulatorProps {
  focusedAccountName: string;
}

// Unique key for a result row
const rowKey = (r: SimResult, i: number) => `${r.keyword_text}|${r.campaign_id}|${r.ad_group_id}|${r.lookback_window}|${r.rule_triggered}|${i}`;

export const NegativeKeywordSimulator = ({ focusedAccountName }: NegativeKeywordSimulatorProps) => {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SimResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [resolvedProfileId, setResolvedProfileId] = useState<number | null>(null);

  // Threshold state with localStorage persistence
  const [params, setParams] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      rule1KwClicks: '',
      rule1PtClicks: '',
      rule2KwAcos: '',
      rule2PtAcos: '',
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  }, [params]);

  // Filters & search
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ruleFilter, setRuleFilter] = useState<string>('all');
  const [windowFilter, setWindowFilter] = useState<string>('all');
  const [sortCol, setSortCol] = useState<string>('total_spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const updateParam = (key: string, value: string) => {
    setParams((p: typeof params) => ({ ...p, [key]: value }));
  };

  const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, '');

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setPage(0);
    setSelectedKeys(new Set());

    try {
      const { data: master } = await supabase
        .from('accounts_master')
        .select('ppc_sellername')
        .eq('account_name', focusedAccountName)
        .single();

      const { data: configs } = await supabase
        .from('negative_keyword_config')
        .select('profile_id, account_name');

      const namesToMatch = [
        master?.ppc_sellername ? normalize(master.ppc_sellername) : null,
        normalize(focusedAccountName),
      ].filter(Boolean) as string[];

      const config = configs?.find(c =>
        namesToMatch.some(n => normalize(c.account_name || '') === n)
      );

      if (!config) {
        setError(`No negative keyword config found for "${focusedAccountName}". Tried matching against ${namesToMatch.join(', ')}. Make sure the account is configured in the negative_keyword_config table.`);
        setLoading(false);
        return;
      }

      setResolvedProfileId(config.profile_id);

      const { data, error: rpcError } = await supabase.rpc('simulate_negative_rules', {
        p_profile_id: config.profile_id,
        p_rule1_kw_click_threshold: params.rule1KwClicks ? parseInt(params.rule1KwClicks) : null,
        p_rule1_pt_click_threshold: params.rule1PtClicks ? parseInt(params.rule1PtClicks) : null,
        p_rule2_kw_max_acos: params.rule2KwAcos ? parseFloat(params.rule2KwAcos) : null,
        p_rule2_pt_max_acos: params.rule2PtAcos ? parseFloat(params.rule2PtAcos) : null,
      });

      if (rpcError) {
        setError(rpcError.message);
      } else {
        setResults((data as SimResult[]) || []);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    if (!results) return null;
    const keywords = results.filter(r => r.negative_type === 'keyword');
    const products = results.filter(r => r.negative_type === 'product');
    const rule1 = results.filter(r => r.rule_triggered === 'rule1_zero_conversion');
    const rule2 = results.filter(r => r.rule_triggered === 'rule2_high_acos');
    const wastedSpend = rule1.reduce((s, r) => s + (r.total_spend || 0), 0);
    const pending = results.filter(r => r.already_pending).length;
    return {
      total: results.length,
      keywords: keywords.length,
      products: products.length,
      wastedSpend,
      pending,
      rule1: rule1.length,
      rule2: rule2.length,
    };
  }, [results]);

  // Filtered & sorted results
  const filteredResults = useMemo(() => {
    if (!results) return [];
    let filtered = results;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(r =>
        r.search_term?.toLowerCase().includes(q) ||
        r.keyword_text?.toLowerCase().includes(q) ||
        r.campaign_name?.toLowerCase().includes(q) ||
        r.ad_group_name?.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') filtered = filtered.filter(r => r.negative_type === typeFilter);
    if (ruleFilter !== 'all') filtered = filtered.filter(r => r.rule_triggered === ruleFilter);
    if (windowFilter !== 'all') filtered = filtered.filter(r => r.lookback_window === windowFilter);

    filtered.sort((a: any, b: any) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return filtered;
  }, [results, searchFilter, typeFilter, ruleFilter, windowFilter, sortCol, sortDir]);

  const pageResults = filteredResults.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);

  const windows = useMemo(() => {
    if (!results) return [];
    return [...new Set(results.map(r => r.lookback_window))].sort();
  }, [results]);

  // Selection logic
  const selectableFiltered = useMemo(() =>
    filteredResults.filter(r => !r.already_pending),
    [filteredResults]
  );

  const allSelectableKeys = useMemo(() => {
    if (!results) return new Set<string>();
    return new Set(selectableFiltered.map((r, i) => {
      const globalIndex = results.indexOf(r);
      return rowKey(r, globalIndex);
    }));
  }, [results, selectableFiltered]);

  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every((r) => {
    const globalIndex = results?.indexOf(r) ?? 0;
    return selectedKeys.has(rowKey(r, globalIndex));
  });

  const someFilteredSelected = selectableFiltered.some((r) => {
    const globalIndex = results?.indexOf(r) ?? 0;
    return selectedKeys.has(rowKey(r, globalIndex));
  });

  const toggleSelectAll = useCallback(() => {
    if (!results) return;
    if (allFilteredSelected) {
      // Deselect all filtered selectable
      setSelectedKeys(prev => {
        const next = new Set(prev);
        selectableFiltered.forEach(r => {
          const globalIndex = results.indexOf(r);
          next.delete(rowKey(r, globalIndex));
        });
        return next;
      });
    } else {
      // Select all filtered selectable
      setSelectedKeys(prev => {
        const next = new Set(prev);
        selectableFiltered.forEach(r => {
          const globalIndex = results.indexOf(r);
          next.add(rowKey(r, globalIndex));
        });
        return next;
      });
    }
  }, [results, selectableFiltered, allFilteredSelected]);

  const toggleRow = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Selected results for deploy
  const selectedResults = useMemo(() => {
    if (!results) return [];
    return results.filter((r, i) => selectedKeys.has(rowKey(r, i)));
  }, [results, selectedKeys]);

  const selectedKeywordCount = selectedResults.filter(r => r.negative_type === 'keyword').length;
  const selectedProductCount = selectedResults.filter(r => r.negative_type === 'product').length;

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const handleDeploy = async () => {
    if (!resolvedProfileId || selectedResults.length === 0) return;
    setDeploying(true);

    try {
      const rows = selectedResults.map(r => ({
        profile_id: resolvedProfileId,
        account_name: r.account_name || focusedAccountName,
        campaign_id: parseInt(r.campaign_id) || 0,
        campaign_name: r.campaign_name,
        ad_group_id: parseInt(r.ad_group_id) || 0,
        ad_group_name: r.ad_group_name,
        keyword_text: r.keyword_text,
        negative_type: r.negative_type,
        match_type: r.match_type || (r.negative_type === 'keyword' ? 'NEGATIVE_EXACT' : 'NEGATIVE_TARGETING'),
        rule_triggered: r.rule_triggered,
        lookback_window: r.lookback_window,
        status: 'pending',
        source_clicks: r.total_clicks != null ? Number(r.total_clicks) : null,
        source_spend: r.total_spend != null ? Number(r.total_spend) : null,
        source_orders: r.total_orders != null ? Number(r.total_orders) : null,
        source_sales: r.total_sales != null ? Number(r.total_sales) : null,
        source_acos: r.calculated_acos != null ? Number(r.calculated_acos) : null,
      }));

      const { error: insertError } = await supabase
        .from('pending_negatives')
        .insert(rows);

      if (insertError) {
        toast({
          title: 'Deploy Failed',
          description: insertError.message,
          variant: 'destructive',
        });
      } else {
        // Mark deployed rows as already_pending in local state
        setResults(prev => {
          if (!prev) return prev;
          return prev.map((r, i) => {
            if (selectedKeys.has(rowKey(r, i))) {
              return { ...r, already_pending: true };
            }
            return r;
          });
        });
        setSelectedKeys(new Set());
        toast({
          title: 'Deployed Successfully',
          description: `${selectedResults.length} items added to pending queue.`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Deploy Error',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeploying(false);
      setDeployDialogOpen(false);
    }
  };

  const exportCsv = () => {
    if (!filteredResults.length) return;
    const headers = ['Search Term', 'Keyword Text', 'Type', 'Rule', 'Window', 'Clicks', 'Spend', 'Orders', 'Sales', 'ACOS%', 'Campaign', 'Ad Group', 'Pending', 'Reason'];
    const rows = filteredResults.map(r => [
      `"${(r.search_term || '').replace(/"/g, '""')}"`,
      `"${(r.keyword_text || '').replace(/"/g, '""')}"`,
      r.negative_type,
      r.rule_triggered,
      r.lookback_window,
      r.total_clicks,
      r.total_spend?.toFixed(2),
      r.total_orders,
      r.total_sales?.toFixed(2),
      r.calculated_acos?.toFixed(2) ?? '',
      `"${(r.campaign_name || '').replace(/"/g, '""')}"`,
      `"${(r.ad_group_name || '').replace(/"/g, '""')}"`,
      r.already_pending ? 'Yes' : 'No',
      `"${(r.reason || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nk-simulation-${focusedAccountName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const InfoTip = ({ text }: { text: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-muted-foreground inline ml-1 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  );

  const SortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(col)}>
      <span className="flex items-center gap-1">
        {children}
        {sortCol === col && (sortDir === 'asc' ? '↑' : '↓')}
      </span>
    </TableHead>
  );

  return (
    <TooltipProvider>
      <div className="mt-8">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <FlaskConical className="h-4 w-4" />
          <span>Negative Keyword Simulator</span>
        </button>

        {!collapsed && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Threshold Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Keywords</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">
                      Rule 1: Click Threshold (zero conversion)
                      <InfoTip text="Flag keywords with this many clicks but zero orders. Leave blank to disable." />
                    </Label>
                    <Input type="number" placeholder="e.g. 10" value={params.rule1KwClicks} onChange={e => updateParam('rule1KwClicks', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Rule 2: Max ACOS %
                      <InfoTip text="Flag keywords with ACOS above this percentage. Leave blank to disable." />
                    </Label>
                    <Input type="number" step="0.1" placeholder="e.g. 30" value={params.rule2KwAcos} onChange={e => updateParam('rule2KwAcos', e.target.value)} className="mt-1" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Product Targets (ASINs)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">
                      Rule 1: Click Threshold (zero conversion)
                      <InfoTip text="Flag product targets with this many clicks but zero orders. Leave blank to disable." />
                    </Label>
                    <Input type="number" placeholder="e.g. 15" value={params.rule1PtClicks} onChange={e => updateParam('rule1PtClicks', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Rule 2: Max ACOS %
                      <InfoTip text="Flag product targets with ACOS above this percentage." />
                    </Label>
                    <Input type="number" step="0.1" placeholder="e.g. 40" value={params.rule2PtAcos} onChange={e => updateParam('rule2PtAcos', e.target.value)} className="mt-1" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={runSimulation} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running Simulation...</> : 'Run Simulation'}
              </Button>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Rule 1 simulates across 7d, 14d, 28d, 56d windows. Rule 2 simulates across 7d, 14d windows only.
              </span>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}

            {/* Summary Stats */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Total Flagged', value: stats.total },
                  { label: 'Keywords', value: stats.keywords },
                  { label: 'Product Targets', value: stats.products },
                  { label: 'Wasted Spend', value: `£${stats.wastedSpend.toFixed(2)}` },
                  { label: 'Already Pending', value: stats.pending },
                  { label: 'Rule 1 Hits', value: stats.rule1 },
                  { label: 'Rule 2 Hits', value: stats.rule2 },
                ].map(s => (
                  <Card key={s.label}>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-lg font-bold">{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Results Table */}
            {results !== null && (
              <div className="space-y-3">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search terms, campaigns..." value={searchFilter} onChange={e => { setSearchFilter(e.target.value); setPage(0); }} className="pl-9" />
                  </div>
                  <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="keyword">Keywords</SelectItem>
                      <SelectItem value="product">Products</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ruleFilter} onValueChange={v => { setRuleFilter(v); setPage(0); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rule" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rules</SelectItem>
                      <SelectItem value="rule1_zero_conversion">Zero Conversion</SelectItem>
                      <SelectItem value="rule2_high_acos">High ACOS</SelectItem>
                    </SelectContent>
                  </Select>
                  {windows.length > 0 && (
                    <Select value={windowFilter} onValueChange={v => { setWindowFilter(v); setPage(0); }}>
                      <SelectTrigger className="w-[110px]"><SelectValue placeholder="Window" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Windows</SelectItem>
                        {windows.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="outline" size="sm" onClick={exportCsv} disabled={filteredResults.length === 0}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                  {selectedKeys.size > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setDeployDialogOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Rocket className="h-4 w-4 mr-1" /> Deploy Selected ({selectedKeys.size})
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">{filteredResults.length} results</span>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {results.length === 0 ? 'No terms flagged with these thresholds.' : 'No results match current filters.'}
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[40px]">
                              <Checkbox
                                checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                                onCheckedChange={toggleSelectAll}
                                disabled={selectableFiltered.length === 0}
                                aria-label="Select all"
                              />
                            </TableHead>
                            <SortHeader col="keyword_text">Search Term / ASIN</SortHeader>
                            <TableHead>Type</TableHead>
                            <TableHead>Rule</TableHead>
                            <SortHeader col="lookback_window">Window</SortHeader>
                            <SortHeader col="total_clicks">Clicks</SortHeader>
                            <SortHeader col="total_spend">Spend</SortHeader>
                            <SortHeader col="total_orders">Orders</SortHeader>
                            <SortHeader col="total_sales">Sales</SortHeader>
                            <SortHeader col="calculated_acos">ACOS%</SortHeader>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Ad Group</TableHead>
                            <TableHead>Pending</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageResults.map((r, pageIndex) => {
                            const globalIndex = results.indexOf(r);
                            const key = rowKey(r, globalIndex);
                            const isPending = r.already_pending;
                            return (
                              <TableRow key={key} className={`text-xs ${isPending ? 'opacity-60' : ''}`}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedKeys.has(key)}
                                    onCheckedChange={() => toggleRow(key)}
                                    disabled={isPending}
                                    aria-label={`Select ${r.keyword_text}`}
                                    className={isPending ? 'opacity-40' : ''}
                                  />
                                </TableCell>
                                <TableCell className="font-medium max-w-[200px] truncate" title={r.keyword_text}>
                                  {r.keyword_text}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={r.negative_type === 'keyword' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-purple-300 text-purple-700 bg-purple-50'}>
                                    {r.negative_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={r.rule_triggered === 'rule1_zero_conversion' ? 'border-red-300 text-red-700 bg-red-50' : 'border-orange-300 text-orange-700 bg-orange-50'}>
                                    {r.rule_triggered === 'rule1_zero_conversion' ? 'Zero Conversion' : 'High ACOS'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{r.lookback_window}</TableCell>
                                <TableCell className="text-right">{r.total_clicks}</TableCell>
                                <TableCell className="text-right">£{r.total_spend?.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{r.total_orders}</TableCell>
                                <TableCell className="text-right">£{r.total_sales?.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{r.calculated_acos != null ? `${r.calculated_acos.toFixed(1)}%` : '—'}</TableCell>
                                <TableCell className="max-w-[150px] truncate" title={r.campaign_name}>{r.campaign_name}</TableCell>
                                <TableCell className="max-w-[120px] truncate" title={r.ad_group_name}>{r.ad_group_name}</TableCell>
                                <TableCell>
                                  {isPending && (
                                    <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                      <Check className="h-3 w-3 mr-0.5" /> Pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-muted-foreground" title={r.reason}>{r.reason}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          Page {page + 1} of {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Empty state before first run */}
            {results === null && !loading && !error && (
              <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Configure thresholds above and click "Run Simulation" to preview negative keyword candidates.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deploy Confirmation Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Deploy {selectedResults.length} Negative Keywords/ASINs</DialogTitle>
            <DialogDescription>
              Add selected items to the pending queue for <strong>{focusedAccountName}</strong>. This stages them for review — it does NOT push to Amazon API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-4 text-sm">
              {selectedKeywordCount > 0 && (
                <span className="flex items-center gap-1">
                  <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">keyword</Badge>
                  × {selectedKeywordCount}
                </span>
              )}
              {selectedProductCount > 0 && (
                <span className="flex items-center gap-1">
                  <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">product</Badge>
                  × {selectedProductCount}
                </span>
              )}
            </div>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
              {selectedResults.slice(0, 50).map((r, i) => (
                <div key={i} className="text-xs flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {r.negative_type === 'keyword' ? 'KW' : 'PT'}
                  </Badge>
                  <span className="truncate font-medium text-foreground">{r.keyword_text}</span>
                  <span className="text-muted-foreground">→ {r.campaign_name}</span>
                </div>
              ))}
              {selectedResults.length > 50 && (
                <p className="text-xs text-muted-foreground text-center pt-1">...and {selectedResults.length - 50} more</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployDialogOpen(false)} disabled={deploying}>
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={deploying}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {deploying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deploying...</> : 'Confirm Deploy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
