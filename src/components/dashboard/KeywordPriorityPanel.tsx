import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { Target, Info, Search as SearchIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { InfoTooltip } from '@/components/common/InfoTooltip';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/formatters';
import {
  useKeywordPriority,
  useKeywordPriorityMeta,
  type Bucket,
  type Verdict,
  type BrandedFilter,
  type KeywordPriorityRow,
  type SortDir,
} from '@/hooks/useKeywordPriority';
import { VerdictKpiStrip } from '@/components/dashboard/VerdictKpiStrip';
import { KeywordQuadrantScatter } from '@/components/dashboard/KeywordQuadrantScatter';
import { KeywordDrilldownSheet } from '@/components/dashboard/KeywordDrilldownSheet';
import { TargetAcosEditor } from '@/components/dashboard/TargetAcosEditor';

interface Props {
  accountName: string;
}

const VERDICTS: Verdict[] = ['Working', 'Scale', 'Fix', 'Cut', 'Watch'];

const verdictStyle = (v: Verdict | null | undefined): string => {
  switch (v) {
    case 'Working':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Scale':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Fix':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Cut':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Watch':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const fmtNum = (v: number | null | undefined) => (v == null ? '—' : formatNumber(Number(v)));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : formatPercentage(Number(v)));
const fmtCur = (v: number | null | undefined) => (v == null ? '—' : formatCurrency(Number(v)));

const PAGE_SIZE = 50;

export function KeywordPriorityPanel({ accountName }: Props) {
  const [windowWeeks, setWindowWeeks] = useState<8 | 13>(8);
  const [bucket, setBucket] = useState<Bucket>('keyword');
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'all'>('all');
  const [branded, setBranded] = useState<BrandedFilter>('all');
  const [search, setSearch] = useState('');
  const [actionableOnly, setActionableOnly] = useState(true);
  const [sortField, setSortField] = useState<keyof KeywordPriorityRow>('priority_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [drillRow, setDrillRow] = useState<KeywordPriorityRow | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [targetAcosOverride, setTargetAcosOverride] = useState<number | null>(null);

  const meta = useKeywordPriorityMeta(accountName, windowWeeks, bucket);
  const effectiveTargetAcos = targetAcosOverride ?? meta.target_acos;

  // Resolve profile_id once per account (for drill-down ads-api joins)
  useEffect(() => {
    if (!accountName) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('accounts_master')
        .select('profile_id')
        .ilike('account_name', accountName)
        .limit(1)
        .maybeSingle();
      if (!cancelled) setProfileId(((data as any)?.profile_id as string) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountName]);

  // Reset override when account changes
  useEffect(() => {
    setTargetAcosOverride(null);
  }, [accountName]);

  const { rows, count, loading, error } = useKeywordPriority({
    accountName,
    windowWeeks,
    bucket,
    verdicts: verdictFilter === 'all' ? [] : [verdictFilter],
    branded,
    search,
    actionableOnly,
    sortField,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });

  const isAdsApi = meta.data_source === 'ads_api';

  // Hide enrichment columns when all-null on current page
  const hideOrganicRank = useMemo(() => rows.every((r) => r.js_organic_rank == null), [rows]);
  const hideRelevance = useMemo(() => rows.every((r) => r.relevance_score == null), [rows]);

  const handleSort = (field: keyof KeywordPriorityRow) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };


  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const latestDateStr = (() => {
    if (!meta.latest_data_date) return '—';
    try {
      return format(new Date(meta.latest_data_date), 'dd MMM yyyy');
    } catch {
      return meta.latest_data_date;
    }
  })();

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-accent to-muted border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Keyword Priority
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 flex-wrap">
                  Data through <span className="font-medium text-foreground">{latestDateStr}</span> · scored over trailing{' '}
                  <span className="font-medium text-foreground">{windowWeeks} weeks</span> · target ACOS{' '}
                  <span className="font-medium text-foreground">
                    {effectiveTargetAcos != null ? `${Number(effectiveTargetAcos).toFixed(1)}%` : '—'}
                  </span>
                  <TargetAcosEditor
                    accountName={accountName}
                    value={effectiveTargetAcos}
                    onSaved={(v) => setTargetAcosOverride(v)}
                  />
                </span>
                <InfoTooltip
                  content={
                    <div className="space-y-1">
                      <div><b>Working</b> — converting at/above target, keep funding.</div>
                      <div><b>Scale</b> — winning the click; pour more budget in.</div>
                      <div><b>Fix</b> — clicks but weak conversion; tighten bids/copy.</div>
                      <div><b>Cut</b> — spend with no return; pause or negate.</div>
                      <div><b>Watch</b> — long tail with too little data to act.</div>
                    </div>
                  }
                />
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {isAdsApi && (
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              PPC-only scoring — this account isn&apos;t on the Brand Analytics pipeline yet, so verdicts use the
              account&apos;s own conversion benchmark instead of the market.
            </span>
          </div>
        )}

        {/* Verdict KPI strip */}
        <VerdictKpiStrip
          accountName={accountName}
          windowWeeks={windowWeeks}
          bucket={bucket}
          activeVerdict={verdictFilter}
          onVerdictClick={(v) => {
            setPage(0);
            setVerdictFilter((cur) => (cur === v ? 'all' : v));
          }}
        />

        {/* Quadrant scatter */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors w-full">
              <ChevronDown className="h-4 w-4" />
              Quadrant view — search volume × relative conversion
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <KeywordQuadrantScatter
              accountName={accountName}
              windowWeeks={windowWeeks}
              bucket={bucket}
              onPointClick={(r) => {
                setDrillRow(r);
                setDrillOpen(true);
              }}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Window toggle */}
          <div className="inline-flex rounded-md border bg-background p-0.5">
            {[8, 13].map((w) => (
              <button
                key={w}
                onClick={() => { setPage(0); setWindowWeeks(w as 8 | 13); }}
                className={`px-3 py-1 text-xs rounded ${
                  windowWeeks === w ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {w}w
              </button>
            ))}
          </div>

          {/* Bucket toggle */}
          <div className="inline-flex rounded-md border bg-background p-0.5">
            {([
              ['keyword', 'Keywords'],
              ['asin_target', 'ASIN targets'],
            ] as [Bucket, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setPage(0); setBucket(k); }}
                className={`px-3 py-1 text-xs rounded ${
                  bucket === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Branded segment */}
          <div className="inline-flex rounded-md border bg-background p-0.5">
            {([
              ['all', 'All'],
              ['branded', 'Branded'],
              ['generic', 'Generic'],
            ] as [BrandedFilter, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setPage(0); setBranded(k); }}
                className={`px-3 py-1 text-xs rounded ${
                  branded === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(0);
                setSearch(e.target.value);
              }}
              placeholder="Search keyword…"
              className="h-8 pl-7 text-sm"
            />
          </div>

          {/* Actionable only */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
            <Switch
              checked={actionableOnly}
              onCheckedChange={(v) => {
                setPage(0);
                setActionableOnly(v);
              }}
            />
            Actionable only
          </label>
        </div>

        {/* Verdict chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => { setPage(0); setVerdictFilter('all'); }}
            className={`px-2.5 py-1 rounded-full text-xs border ${
              verdictFilter === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground'
            }`}
          >
            All
          </button>
          {VERDICTS.map((v) => (
            <button
              key={v}
              onClick={() => { setPage(0); setVerdictFilter(v); }}
              className={`px-2.5 py-1 rounded-full text-xs border ${
                verdictFilter === v
                  ? verdictStyle(v) + ' font-semibold'
                  : 'bg-background text-muted-foreground'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  field="keyword"
                  currentField={sortField}
                  direction={sortDir}
                  onSort={handleSort}
                >
                  Keyword
                </SortableTableHead>
                <SortableTableHead
                  field="verdict"
                  currentField={sortField}
                  direction={sortDir}
                  onSort={handleSort}
                >
                  Verdict
                </SortableTableHead>
                <SortableTableHead
                  field="priority_score"
                  currentField={sortField}
                  direction={sortDir}
                  onSort={handleSort}
                  className="text-right"
                >
                  Priority
                </SortableTableHead>
                {!isAdsApi && (
                  <SortableTableHead
                    field="sq_volume"
                    currentField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  >
                    Search Vol
                  </SortableTableHead>
                )}
                <SortableTableHead
                  field="our_cvr_pct"
                  currentField={sortField}
                  direction={sortDir}
                  onSort={handleSort}
                  className="text-right"
                >
                  Our CVR{!isAdsApi ? ' / Market' : ''}
                </SortableTableHead>
                {!isAdsApi && (
                  <SortableTableHead
                    field="purchase_share_pct"
                    currentField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  >
                    Purchase Share
                  </SortableTableHead>
                )}
                <SortableTableHead
                  field="ppc_spend"
                  currentField={sortField}
                  direction={sortDir}
                  onSort={handleSort}
                  className="text-right"
                >
                  Spend
                </SortableTableHead>
                <SortableTableHead
                  field="ppc_sales"
                  currentField={sortField}
                  direction={sortDir}
                  onSort={handleSort}
                  className="text-right"
                >
                  Sales
                </SortableTableHead>
                <SortableTableHead
                  field="acos"
                  currentField={sortField}
                  direction={sortDir}
                  onSort={handleSort}
                  className="text-right"
                >
                  ACOS
                </SortableTableHead>
                {!hideOrganicRank && (
                  <SortableTableHead
                    field="js_organic_rank"
                    currentField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  >
                    Org Rank
                  </SortableTableHead>
                )}
                {!hideRelevance && (
                  <SortableTableHead
                    field="relevance_score"
                    currentField={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  >
                    Relevance
                  </SortableTableHead>
                )}
                <SortableTableHead
                  field="confidence"
                  currentField={sortField}
                  direction={sortDir}
                  onSort={handleSort}
                >
                  Conf
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={12}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-destructive py-8">
                    {error}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    No rows match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const insufficient = r.confidence === 'insufficient';
                  const overTarget =
                    r.acos != null && r.target_acos != null && Number(r.acos) > Number(r.target_acos);
                  const ourCvr = r.our_cvr_pct != null ? Number(r.our_cvr_pct) : null;
                  const mktCvr = r.market_cvr_pct != null ? Number(r.market_cvr_pct) : null;
                  const cvrWin = ourCvr != null && mktCvr != null && ourCvr >= mktCvr;
                  return (
                    <TableRow
                      key={`${r.bucket}-${r.keyword}`}
                      className={`cursor-pointer ${insufficient ? 'opacity-60' : ''}`}
                      onClick={() => { setDrillRow(r); setDrillOpen(true); }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{r.keyword}</span>
                          {r.bucket === 'asin_target' && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              ASIN
                            </Badge>
                          )}
                          {r.is_branded && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-purple-300 text-purple-700">
                              Brand
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.verdict ? (
                          <InfoTooltip
                            content={r.verdict_reason || r.verdict}
                            className="!p-0"
                          />
                        ) : null}
                        {r.verdict && (
                          <span
                            className={`inline-block ml-1 px-2 py-0.5 rounded-full border text-xs font-medium ${verdictStyle(
                              r.verdict
                            )}`}
                            title={r.verdict_reason || ''}
                          >
                            {r.verdict}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {r.priority_score ?? '—'}
                      </TableCell>
                      {!isAdsApi && (
                        <TableCell className="text-right tabular-nums">{fmtNum(r.sq_volume)}</TableCell>
                      )}
                      <TableCell className="text-right tabular-nums">
                        <span className={cvrWin ? 'text-green-600 font-medium' : ourCvr != null && mktCvr != null ? 'text-red-600' : ''}>
                          {fmtPct(ourCvr ?? undefined)}
                        </span>
                        {!isAdsApi && (
                          <span className="text-muted-foreground"> / {fmtPct(mktCvr ?? undefined)}</span>
                        )}
                      </TableCell>
                      {!isAdsApi && (
                        <TableCell className="text-right tabular-nums">{fmtPct(r.purchase_share_pct)}</TableCell>
                      )}
                      <TableCell className="text-right tabular-nums">{fmtCur(r.ppc_spend)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCur(r.ppc_sales)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={overTarget ? 'text-red-600 font-medium' : r.acos != null ? 'text-green-600' : ''}>
                          {fmtPct(r.acos)}
                        </span>
                      </TableCell>
                      {!hideOrganicRank && (
                        <TableCell className="text-right tabular-nums">{r.js_organic_rank ?? '—'}</TableCell>
                      )}
                      {!hideRelevance && (
                        <TableCell className="text-right tabular-nums">{r.relevance_score ?? '—'}</TableCell>
                      )}
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${
                              r.confidence === 'high'
                                ? 'bg-green-500'
                                : r.confidence === 'low'
                                ? 'bg-amber-500'
                                : 'bg-gray-400'
                            }`}
                          />
                          {r.confidence}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {count.toLocaleString()} row{count === 1 ? '' : 's'} · page {page + 1} of {totalPages}
          </div>
          <Pagination className="m-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>

      <KeywordDrilldownSheet
        row={drillRow}
        open={drillOpen}
        onOpenChange={setDrillOpen}
        accountName={accountName}
        profileId={drillRow?.profile_id ?? profileId}
        isAdsApi={isAdsApi}
      />
    </Card>
  );
}

export default KeywordPriorityPanel;
