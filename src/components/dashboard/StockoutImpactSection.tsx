import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { useTableSort } from '@/hooks/useTableSort';
import { AlertTriangle, Search, DollarSign, Clock, Package, TrendingDown, Info } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { useASINDetail } from '@/hooks/useASINDetail';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import type { CountryScope } from './CountrySwitcher';

interface StockoutEvent {
  id: string;
  account_name: string;
  sku: string;
  asin: string | null;
  product_name: string | null;
  status: string | null;
  days_out_of_stock: number | null;
  pre_stockout_daily_units: number | null;
  pre_stockout_avg_price: number | null;
  estimated_stockout_lost_units: number | null;
  estimated_stockout_lost_revenue: number | null;
  estimated_recovery_lost_units: number | null;
  estimated_recovery_lost_revenue: number | null;
  recovery_period_days: number | null;
  total_estimated_lost_revenue: number | null;
  stockout_start: string;
  stockout_end: string | null;
}

interface AsinGroupedEvent {
  id: string;
  asin: string;
  skus: string[];
  product_name: string | null;
  status: string | null;
  days_out_of_stock: number | null;
  pre_stockout_daily_units: number | null;
  pre_stockout_avg_price: number | null;
  estimated_stockout_lost_units: number | null;
  estimated_stockout_lost_revenue: number | null;
  estimated_recovery_lost_units: number | null;
  estimated_recovery_lost_revenue: number | null;
  recovery_period_days: number | null;
  total_estimated_lost_revenue: number | null;
  stockout_start: string;
  stockout_end: string | null;
}

const groupByAsin = (events: StockoutEvent[]): AsinGroupedEvent[] => {
  const map = new Map<string, StockoutEvent[]>();
  for (const e of events) {
    const key = e.asin || e.sku; // fallback to SKU if no ASIN
    const arr = map.get(key) || [];
    arr.push(e);
    map.set(key, arr);
  }
  
  return Array.from(map.entries()).map(([key, rows]) => {
    // Use the worst status: active > recovering > recovered
    const statusPriority: Record<string, number> = { active: 3, recovering: 2, recovered: 1 };
    const worstRow = rows.reduce((a, b) => 
      (statusPriority[a.status?.toLowerCase() || ''] || 0) >= (statusPriority[b.status?.toLowerCase() || ''] || 0) ? a : b
    );
    
    const earliestStart = rows.reduce((earliest, r) => r.stockout_start < earliest ? r.stockout_start : earliest, rows[0].stockout_start);
    const isOpen = !worstRow.stockout_end;

    // Dynamic days calculation for open events
    const dynamicDays = isOpen
      ? differenceInDays(new Date(), parseISO(earliestStart)) + 1
      : Math.max(...rows.map(r => r.days_out_of_stock ?? 0));

    const dailyUnits = rows.reduce((s, r) => s + (r.pre_stockout_daily_units ?? 0), 0) || null;
    const avgPrice = worstRow.pre_stockout_avg_price;

    // For open events, recalculate stockout lost units/revenue dynamically
    const stockoutLostUnits = isOpen && dailyUnits
      ? Math.round(dailyUnits * dynamicDays)
      : rows.reduce((s, r) => s + (r.estimated_stockout_lost_units ?? 0), 0) || null;
    const stockoutLostRevenue = isOpen && dailyUnits && avgPrice
      ? dailyUnits * dynamicDays * avgPrice
      : rows.reduce((s, r) => s + (r.estimated_stockout_lost_revenue ?? 0), 0) || null;

    const recoveryLostRevenue = rows.reduce((s, r) => s + (r.estimated_recovery_lost_revenue ?? 0), 0) || null;
    const recoveryLostUnits = rows.reduce((s, r) => s + (r.estimated_recovery_lost_units ?? 0), 0) || null;
    const recoveryDays = Math.max(...rows.map(r => r.recovery_period_days ?? 0)) || null;

    const totalLost = (stockoutLostRevenue ?? 0) + (recoveryLostRevenue ?? 0) || null;

    return {
      id: rows[0].id,
      asin: key,
      skus: [...new Set(rows.map(r => r.sku))],
      product_name: rows.find(r => r.product_name)?.product_name || null,
      status: worstRow.status,
      days_out_of_stock: dynamicDays,
      pre_stockout_daily_units: dailyUnits,
      pre_stockout_avg_price: avgPrice,
      estimated_stockout_lost_units: stockoutLostUnits,
      estimated_stockout_lost_revenue: stockoutLostRevenue,
      estimated_recovery_lost_units: recoveryLostUnits,
      estimated_recovery_lost_revenue: recoveryLostRevenue,
      recovery_period_days: recoveryDays,
      total_estimated_lost_revenue: totalLost,
      stockout_start: earliestStart,
      stockout_end: worstRow.stockout_end,
    };
  });
};

interface StockoutImpactSectionProps {
  merchantToken: string;
  accountKeys?: string[];
  scope: CountryScope;
}



const StatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  const s = status.toLowerCase();
  if (s === 'active') return <Badge className="bg-red-500/15 text-red-700 border-red-200 hover:bg-red-500/20">Out of Stock</Badge>;
  if (s === 'recovering') return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/20">Recovering</Badge>;
  if (s === 'recovered') return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20">Recovered</Badge>;
  return <Badge variant="outline">{status}</Badge>;
};

export const StockoutImpactSection = ({ merchantToken, accountKeys, scope }: StockoutImpactSectionProps) => {
  const cur = getCurrencyInfo(scope);
  const formatCurrency = (val: number | null) => {
    if (val == null) return '—';
    return `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(val)}`;
  };
  const [data, setData] = useState<StockoutEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNoSalesData, setShowNoSalesData] = useState(false);
  const { openASINDetail } = useASINDetail();

  const keysKey = accountKeys && accountKeys.length ? accountKeys.slice().sort().join(',') : '';

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      let query = supabase
        .from('stockout_events')
        .select('*')
        .is('stockout_end', null)
        .order('total_estimated_lost_revenue', { ascending: false, nullsFirst: false });

      if (accountKeys && accountKeys.length > 0) {
        query = query.in('account_name', accountKeys);
      } else {
        query = query.eq('account_name', merchantToken);
      }

      const { data: rows, error } = await query;

      if (!error && rows) {
        setData(rows as StockoutEvent[]);
      }
      setIsLoading(false);
    };
    if (merchantToken || (accountKeys && accountKeys.length)) fetchData();
  }, [merchantToken, keysKey]);

  // Group raw SKU-level data by ASIN
  const groupedData = useMemo(() => groupByAsin(data), [data]);

  const filteredData = useMemo(() => {
    let items = groupedData;
    if (!showNoSalesData) {
      items = items.filter(r => (r.pre_stockout_daily_units ?? 0) > 0);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(r =>
        r.skus.some(sku => sku.toLowerCase().includes(q)) ||
        r.asin.toLowerCase().includes(q) ||
        (r.product_name && r.product_name.toLowerCase().includes(q))
      );
    }
    return items;
  }, [groupedData, showNoSalesData, searchTerm]);

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort<AsinGroupedEvent>({
    data: filteredData,
    defaultSortField: 'total_estimated_lost_revenue',
    defaultSortDirection: 'desc',
  });

  // Summary metrics from ASIN-grouped items with sales data only
  const withSales = useMemo(() => groupedData.filter(r => (r.pre_stockout_daily_units ?? 0) > 0), [groupedData]);
  const activeCount = useMemo(() => withSales.filter(r => r.status?.toLowerCase() === 'active').length, [withSales]);
  const totalActiveCount = useMemo(() => groupedData.filter(r => r.status?.toLowerCase() === 'active').length, [groupedData]);
  const totalStockoutRev = useMemo(() => withSales.reduce((s, r) => s + (r.estimated_stockout_lost_revenue ?? 0), 0), [withSales]);
  const totalRecoveryRev = useMemo(() => withSales.reduce((s, r) => s + (r.estimated_recovery_lost_revenue ?? 0), 0), [withSales]);
  const totalMissedRev = useMemo(() => withSales.reduce((s, r) => s + (r.total_estimated_lost_revenue ?? 0), 0), [withSales]);

  // Earliest stockout_start across open events for period label
  const periodLabel = useMemo(() => {
    const openEvents = withSales.filter(r => !r.stockout_end);
    if (openEvents.length === 0) return '';
    const earliest = openEvents.reduce((min, r) => r.stockout_start < min ? r.stockout_start : min, openEvents[0].stockout_start);
    return `Since ${format(parseISO(earliest), 'd MMM')}`;
  }, [withSales]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingDown className="h-5 w-5" /> Stockout Impact</CardTitle></CardHeader>
        <CardContent><div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading stockout data...</div></CardContent>
      </Card>
    );
  }

  if (data.length === 0) return null;

  const summaryCards = [
    { label: 'Items Currently OOS', value: activeCount > 0 ? activeCount.toString() : `0 of ${totalActiveCount}`, icon: Package, color: 'text-red-600', tooltip: `${activeCount} items with sales history are OOS. ${totalActiveCount > activeCount ? `${totalActiveCount - activeCount} additional items are OOS but have no recent sales data.` : ''}`, showPeriod: false },
    { label: 'Est. Lost Revenue (Stockout)', value: formatCurrency(totalStockoutRev), icon: DollarSign, color: 'text-red-600', tooltip: 'Revenue lost during the actual out-of-stock period, calculated as: average daily units sold (14-day pre-stockout) × days out of stock × average selling price. This is the cumulative impact since each item went out of stock (all-time), not limited to the date range selected above.', showPeriod: true },
    { label: 'Est. Recovery Impact', value: formatCurrency(totalRecoveryRev), icon: Clock, color: 'text-amber-600', tooltip: 'Additional revenue expected to be lost during the recovery period after restocking. Amazon estimates 1 week OOS = ~1 month to regain full sales velocity. During recovery, sales gradually ramp from ~25% back to 100% of normal levels.', showPeriod: true },
    { label: 'Total Missed Revenue', value: formatCurrency(totalMissedRev), icon: AlertTriangle, color: 'text-red-700', tooltip: 'Combined impact of direct stockout losses plus the recovery period. This is the true cost of going out of stock - often the recovery penalty is larger than the stockout itself. This is the cumulative impact since each item went out of stock (all-time), not limited to the date range selected above.', showPeriod: true },
  ];

  const columnTooltips: Record<string, string> = {
    'Daily Run Rate': 'Average daily units sold in the 14 days before this product went out of stock',
    'Recovery': 'Estimated days to regain full sales velocity (1 week OOS ≈ 1 month recovery)',
    'Recovery Lost': 'Revenue lost during the recovery ramp-up period at reduced sales rates',
    'Total Impact': 'Stockout losses + Recovery losses = the true cost of this stockout',
  };

  const HeaderWithTooltip = ({ label, className }: { label: string; className?: string }) => (
    <TableHead className={className}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {label}
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{columnTooltips[label]}</TooltipContent>
      </Tooltip>
    </TableHead>
  );

  return (
    <TooltipProvider delayDuration={200}>
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Stockout Impact
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-xs leading-relaxed">
                This section tracks products that have gone out of stock and estimates the financial impact. It includes both direct lost sales during the stockout period AND the recovery period after restocking. Amazon data shows that for every 1 week out of stock, it takes approximately 1 month to recover your previous sales velocity due to lost ranking, suppressed listings, and reduced organic visibility.
              </TooltipContent>
            </Tooltip>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              All-time open stockouts
            </span>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search SKU, ASIN, product..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Switch checked={showNoSalesData} onCheckedChange={setShowNoSalesData} className="scale-75" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Show no-sales items</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Shows every ASIN that is currently out of stock, regardless of the date range selected above — an open stockout that began months ago is still costing sales today.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map(c => (
            <Tooltip key={c.label}>
              <TooltipTrigger asChild>
                <div className="rounded-lg border bg-card p-3 cursor-help">
                  <div className="flex items-center gap-1.5 mb-1">
                    <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                    <span className="text-[11px] text-muted-foreground">{c.label}</span>
                  </div>
                  <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
                  {c.showPeriod && periodLabel && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">{`Open ${periodLabel.replace(/^Since /, 'since ')}`}</div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{c.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Info Banner */}
        <div className="rounded-md border border-muted px-3 py-2 text-xs text-muted-foreground">
          ℹ️ Revenue impact is only estimated for items with recent sales history. Items that were OOS but had no prior sales are excluded from revenue calculations{totalActiveCount > activeCount ? ` — ${totalActiveCount - activeCount} such item${totalActiveCount - activeCount !== 1 ? 's are' : ' is'} currently OOS` : ''}.
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          💡 <strong>Recovery Model:</strong> Based on Amazon's guideline that every 1 week of stockout requires ~1 month to recover previous sales levels. Recovery assumes a gradual ramp from 25% to 100% of pre-stockout daily sales rate.
        </div>

        {/* Table */}
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No stockout events with sales history found.
            {totalActiveCount > 0 && (
              <p className="mt-1 text-xs">
                {totalActiveCount} item{totalActiveCount !== 1 ? 's are' : ' is'} currently out of stock but {totalActiveCount !== 1 ? 'have' : 'has'} no recent sales data — use the toggle below to view them.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">ASIN</TableHead>
                  <SortableTableHead field="days_out_of_stock" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-xs">Days OOS</SortableTableHead>
                  <SortableTableHead field="pre_stockout_daily_units" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-xs">
                    <Tooltip><TooltipTrigger asChild><span className="inline-flex items-center gap-1 cursor-help">Daily Run Rate <Info className="h-3 w-3 text-muted-foreground" /></span></TooltipTrigger><TooltipContent className="max-w-xs text-xs">{columnTooltips['Daily Run Rate']}</TooltipContent></Tooltip>
                  </SortableTableHead>
                  <SortableTableHead field="estimated_stockout_lost_units" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-xs">Lost Units</SortableTableHead>
                  <SortableTableHead field="estimated_stockout_lost_revenue" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-xs">Lost Rev (OOS)</SortableTableHead>
                  <HeaderWithTooltip label="Recovery" className="text-xs" />
                  <SortableTableHead field="estimated_recovery_lost_revenue" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-xs">
                    <Tooltip><TooltipTrigger asChild><span className="inline-flex items-center gap-1 cursor-help">Recovery Lost <Info className="h-3 w-3 text-muted-foreground" /></span></TooltipTrigger><TooltipContent className="max-w-xs text-xs">{columnTooltips['Recovery Lost']}</TooltipContent></Tooltip>
                  </SortableTableHead>
                  <SortableTableHead field="total_estimated_lost_revenue" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-xs">
                    <Tooltip><TooltipTrigger asChild><span className="inline-flex items-center gap-1 cursor-help">Total Impact <Info className="h-3 w-3 text-muted-foreground" /></span></TooltipTrigger><TooltipContent className="max-w-xs text-xs">{columnTooltips['Total Impact']}</TooltipContent></Tooltip>
                  </SortableTableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map(row => (
                  <TableRow key={row.id} className={row.status?.toLowerCase() === 'active' ? 'bg-red-500/5' : ''}>
                    <TableCell className="text-xs max-w-[180px] truncate" title={row.product_name || ''}>{row.product_name || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">
                      <div className="flex flex-col gap-0.5">
                        {row.skus.map((sku, i) => (
                          <span key={i} className="text-[11px] leading-tight">{sku}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className="font-mono cursor-pointer hover:text-primary hover:underline"
                        onClick={() => openASINDetail(row.asin, merchantToken)}
                      >
                        {row.asin || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-center">{row.days_out_of_stock ?? '—'}</TableCell>
                    <TableCell className="text-xs text-center">{row.pre_stockout_daily_units != null ? `${row.pre_stockout_daily_units.toFixed(1)}/day` : '—'}</TableCell>
                    <TableCell className="text-xs text-center">{row.estimated_stockout_lost_units ?? '—'}</TableCell>
                    <TableCell className="text-xs font-medium text-red-600">{formatCurrency(row.estimated_stockout_lost_revenue)}</TableCell>
                    <TableCell className="text-xs text-center">{row.recovery_period_days != null ? `${row.recovery_period_days}d` : '—'}</TableCell>
                    <TableCell className="text-xs font-medium text-amber-600">{formatCurrency(row.estimated_recovery_lost_revenue)}</TableCell>
                    <TableCell className="text-xs font-bold">{formatCurrency(row.total_estimated_lost_revenue)}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="text-[10px] text-muted-foreground">
          Showing {sortedData.length} of {groupedData.length} ASINs ({data.length} SKU events) • Sorted by {String(sortField).replace(/_/g, ' ')}
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};