import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Search, Package, ChevronDown, ChevronUp, ArrowUpDown, Loader2, Download, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrencyByMerchantToken } from '@/utils/formatters';
import { openAmazonProduct } from '@/utils/amazonUtils';
import { useASINDetail } from '@/hooks/useASINDetail';
import { useCurrentStockSnapshot, type CurrentStockRow } from '@/hooks/useCurrentStockSnapshot';
import * as XLSX from 'xlsx';

interface StockInventoryTableProps {
  merchantToken: string;
  accountType?: string | null;
}

type SortField = 'productName' | 'sku' | 'asin' | 'fbaStock' | 'fbmStock' | 'totalStock' | 'price' | 'openPoUnits' | 'unfilledUnits' | 'oosRate' | 'sellThroughRate';
type SortDir = 'asc' | 'desc';
type StockFilter = 'none' | 'oos' | 'low' | 'unknown';

const fmtDate = (d: string | null) => {
  if (!d) return null;
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
};

/** Card shown when there is nothing trustworthy to display. Never a blank, never a zero. */
const UnavailableCard: React.FC<{ title: string; body: React.ReactNode; warn?: boolean }> = ({ title, body, warn }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Stock &amp; Inventory</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
      {warn
        ? <AlertTriangle className="h-8 w-8 mb-2 text-amber-500" />
        : <Package className="h-8 w-8 mb-2 text-muted-foreground" />}
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground max-w-md mt-1">{body}</p>
    </CardContent>
  </Card>
);

export const StockInventoryTable: React.FC<StockInventoryTableProps> = ({ merchantToken, accountType }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalStock');
  // Descending, not ascending. Ascending opened a vendor catalogue on its zeros
  // — Portwest's first page was 25 rows of nothing, which reads as "we are out
  // of stock everywhere" rather than "these are the ones to look at". The
  // out-of-stock and no-stock-data chips above are the way into the zeros.
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAll, setShowAll] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>('none');
  const { openASINDetail } = useASINDetail();

  const snapshot = useCurrentStockSnapshot(merchantToken, accountType);
  const { rows, loading, isVendor, snapshotDate, isStale, snapshotAgeDays, feedMissing, feedErrorRows, feedErrorOnly, lastGoodDate } = snapshot;

  const lowStockThreshold = isVendor ? 10 : 5;

  const filtered = useMemo(() => {
    let result = rows;

    if (stockFilter === 'oos') {
      result = result.filter(r => r.totalStock === 0);
    } else if (stockFilter === 'low') {
      result = result.filter(r => r.totalStock !== null && r.totalStock > 0 && r.totalStock < lowStockThreshold);
    } else if (stockFilter === 'unknown') {
      result = result.filter(r => r.totalStock === null);
    }

    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(r =>
      r.sku.toLowerCase().includes(q) ||
      r.asin.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q)
    );
  }, [rows, search, stockFilter, lowStockThreshold]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];
      // Unknown values sort last in both directions — they are not "smallest".
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal as string).toLowerCase(); }
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [filtered, sortField, sortDir]);

  const displayed = showAll ? sorted : sorted.slice(0, 25);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleExportExcel = () => {
    const exportData = sorted.map(row => {
      if (isVendor) {
        return {
          'Product Name': row.productName || row.asin || '—',
          'ASIN': row.asin,
          'Sellable Units': row.totalStock ?? 'No data',
          'Open PO Units': row.openPoUnits ?? '',
          'Unfilled Orders': row.unfilledUnits ?? '',
          'OOS Rate %': row.oosRate != null ? Number(row.oosRate.toFixed(1)) : '',
          'Sell-Through %': row.sellThroughRate != null ? Number(row.sellThroughRate.toFixed(1)) : '',
        };
      }
      return {
        'Product Name': row.productName || row.sku || '—',
        'SKU': row.sku,
        'ASIN': row.asin,
        'FBA Stock': row.fbaStock ?? 'No data',
        'FBM Stock': row.fbmStock ?? 'No data',
        'Total Stock': row.totalStock ?? 'No data',
        'Price': row.price ?? '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${isVendor ? 'vendor-' : ''}inventory-${merchantToken}-${today}.xlsx`);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-primary shrink-0" />
      : <ChevronDown className="h-3 w-3 text-primary shrink-0" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading inventory data…</span>
        </CardContent>
      </Card>
    );
  }

  // Every usable row was a supplier feed error — the feed is broken, not empty.
  if (feedErrorOnly || (rows.length === 0 && feedErrorRows > 0)) {
    return (
      <UnavailableCard
        warn
        title="Stock feed unavailable"
        body={
          <>
            The inventory feed for this account is returning a supplier error instead of stock data, so
            there is nothing to show. This is a data-collection problem, not a report of zero stock.
            {lastGoodDate && (
              <> Real stock data last arrived on <strong>{fmtDate(lastGoodDate)}</strong>.</>
            )}
          </>
        }
      />
    );
  }

  if (rows.length === 0) {
    return (
      <UnavailableCard
        title={feedMissing ? 'Stock feed unavailable' : 'No inventory data available'}
        body={feedMissing
          ? 'No inventory snapshot has been received for this account, so current stock is unknown. This is not a report of zero stock.'
          : 'No listings with stock or recent sales were found in the latest inventory snapshot.'}
      />
    );
  }

  // ── Counts. Each one says exactly what it counts. ──
  const unitLabel = isVendor ? 'ASIN' : 'SKU';
  const knownRows = rows.filter(r => r.totalStock !== null);
  const outOfStockCount = knownRows.filter(r => r.totalStock === 0).length;
  const lowOnlyCount = knownRows.filter(r => (r.totalStock as number) > 0 && (r.totalStock as number) < lowStockThreshold).length;
  const unknownCount = rows.length - knownRows.length;
  const snapshotLabel = fmtDate(snapshotDate);

  /**
   * [field, label, classes, basis?]
   *
   * `basis` is a subheader naming what the column is measured on. Two of the
   * vendor columns sit next to each other and are measured on different things
   * — "Sellable 0" is a stock LEVEL as at the snapshot date, "OOS Rate 0.0%" is
   * a RATE Amazon reports over time — so unlabelled they read as contradicting
   * each other when in fact both are right.
   */
  type Column = [SortField, string, string, string?];

  const sellerColumns: Column[] = [
    ['productName', 'Product Name', ''],
    ['sku', 'SKU', 'w-28'],
    ['asin', 'ASIN', 'w-28'],
    ['fbaStock', 'FBA', 'text-right w-20'],
    ['fbmStock', 'FBM', 'text-right w-20'],
    ['totalStock', 'Total', 'text-right w-20'],
    ['price', 'Price', 'text-right w-24'],
  ];

  const vendorColumns: Column[] = [
    ['productName', 'Product', ''],
    ['asin', 'ASIN', 'w-28'],
    ['totalStock', 'Sellable Units', 'text-right w-28', snapshotLabel ? `on hand, ${snapshotLabel}` : 'on hand'],
    ['openPoUnits', 'Open PO Units', 'text-right w-28'],
    ['unfilledUnits', 'Unfilled Orders', 'text-right w-28'],
    ['oosRate', 'OOS Rate %', 'text-right w-24', "Amazon's rate over time"],
    ['sellThroughRate', 'Sell-Through %', 'text-right w-28', "Amazon's rate over time"],
  ];

  const columns = isVendor ? vendorColumns : sellerColumns;

  const renderStock = (v: number | null, cls = '') => (
    v === null
      ? <span className="text-muted-foreground" title="No stock figure reported by the feed">—</span>
      : <span className={cls}>{v.toLocaleString()}</span>
  );

  return (
    <TooltipProvider delayDuration={200}>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-lg">Stock &amp; Inventory</CardTitle>
            {isVendor && (
              <Badge className="text-xs bg-purple-500/15 text-purple-700 border-purple-200">Vendor</Badge>
            )}
            <Badge variant="secondary" className="text-xs">{rows.length} {unitLabel}s</Badge>
            {outOfStockCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Badge
                      variant="destructive"
                      className={`text-xs cursor-pointer transition-all ${stockFilter === 'oos' ? 'ring-2 ring-destructive ring-offset-1' : 'hover:opacity-80'}`}
                      onClick={() => setStockFilter(f => f === 'oos' ? 'none' : 'oos')}
                    >
                      {outOfStockCount} {unitLabel}s at zero stock
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {unitLabel}s the latest inventory snapshot{snapshotLabel ? ` (${snapshotLabel})` : ''} reports as holding zero units. Counts {unitLabel.toLowerCase()}s, not parent products.
                </TooltipContent>
              </Tooltip>
            )}
            {lowOnlyCount > 0 && (
              <Badge
                className={`text-xs cursor-pointer transition-all bg-amber-500/15 text-amber-700 border-amber-200 ${stockFilter === 'low' ? 'ring-2 ring-amber-500 ring-offset-1' : 'hover:opacity-80'}`}
                onClick={() => setStockFilter(f => f === 'low' ? 'none' : 'low')}
              >
                {lowOnlyCount} low stock (&lt;{lowStockThreshold})
              </Badge>
            )}
            {unknownCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Badge
                      variant="outline"
                      className={`text-xs cursor-pointer transition-all ${stockFilter === 'unknown' ? 'ring-2 ring-muted-foreground ring-offset-1' : 'hover:opacity-80'}`}
                      onClick={() => setStockFilter(f => f === 'unknown' ? 'none' : 'unknown')}
                    >
                      {unknownCount} no stock data
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  No feed reported a stock figure for these {unitLabel.toLowerCase()}s. Their stock is unknown — they are not counted as out of stock.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ASIN or product..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={sorted.length === 0} className="gap-1.5 h-9">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {snapshotLabel
            ? <>Latest inventory snapshot: <strong>{snapshotLabel}</strong>. Stock is {isVendor ? 'sellable units on hand at Amazon' : 'FBA fulfillable + merchant-fulfilled units'} per {unitLabel.toLowerCase()}.</>
            : <>Snapshot date unknown.</>}
        </p>
        {isVendor && (
          // Sellable Units and OOS Rate are both correct and are not on the same
          // time base, which is why "Sellable 0" can sit beside "OOS Rate 0.0%".
          <p className="text-xs text-muted-foreground mt-1">
            Sellable Units is the stock level at that snapshot. OOS Rate % and Sell-Through % are rates Amazon
            measures over time and delivers with the feed — they are not readings of today's shelf, so they will
            not always agree with the units beside them.
          </p>
        )}
        {isStale && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              This snapshot is {snapshotAgeDays} days old{snapshotLabel ? ` (${snapshotLabel})` : ''}. Treat the stock figures as last-known, not live.
            </span>
          </div>
        )}
        {feedErrorRows > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-muted px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {feedErrorRows} row{feedErrorRows === 1 ? '' : 's'} from the inventory feed contained a supplier error message instead of product data and {feedErrorRows === 1 ? 'has' : 'have'} been excluded from this table and every count above.
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                {columns.map(([field, label, cls, basis]) => (
                  <TableHead
                    key={field}
                    className={`cursor-pointer select-none hover:bg-muted/50 align-bottom ${cls}`}
                    onClick={() => handleSort(field)}
                  >
                    <div className={`flex items-center gap-1 ${cls.includes('text-right') ? 'justify-end' : ''}`}>
                      {label}
                      <SortIcon field={field} />
                    </div>
                    {basis && (
                      <div className={`text-[10px] font-normal normal-case text-muted-foreground ${cls.includes('text-right') ? 'text-right' : ''}`}>
                        {basis}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    No {unitLabel.toLowerCase()}s match your filters
                  </TableCell>
                </TableRow>
              )}
              {displayed.map((row: CurrentStockRow, i) => {
                const known = row.totalStock !== null;
                const isOut = known && row.totalStock === 0;
                const isLow = known && (row.totalStock as number) > 0 && (row.totalStock as number) < lowStockThreshold;
                const rowCls = isOut ? 'bg-destructive/8' : isLow ? 'bg-amber-500/8' : '';
                const totalCls = !known ? '' : isOut ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-emerald-600';

                if (isVendor) {
                  const displayName = row.productName || row.asin || '—';
                  const isFallback = !row.productName && !!row.asin;
                  const truncated = displayName.length > 40 ? displayName.slice(0, 40) + '…' : displayName;
                  return (
                    <TableRow key={`${row.asin}-${i}`} className={rowCls}>
                      <TableCell className="max-w-[250px]">
                        <div className={`truncate text-xs ${isFallback ? 'font-mono text-muted-foreground' : ''}`} title={displayName}>{truncated}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span
                            className="font-mono text-xs cursor-pointer hover:text-primary hover:underline"
                            onClick={() => openASINDetail(row.asin, merchantToken)}
                          >
                            {row.asin || '—'}
                          </span>
                          {row.asin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAmazonProduct(row.asin, merchantToken)}
                              className="h-5 w-5 p-0 shrink-0"
                              title="View on Amazon"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{renderStock(row.totalStock, totalCls)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {row.openPoUnits != null ? row.openPoUnits.toLocaleString() : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${(row.unfilledUnits ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                        {row.unfilledUnits != null ? row.unfilledUnits.toLocaleString() : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${(row.oosRate ?? 0) > 5 ? 'text-destructive' : (row.oosRate ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                        {row.oosRate != null ? `${row.oosRate.toFixed(1)}%` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.sellThroughRate != null ? `${row.sellThroughRate.toFixed(1)}%` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                }

                // Seller rows
                return (
                  <TableRow key={`${row.sku}-${i}`} className={rowCls}>
                    <TableCell className="max-w-[250px]">
                      <div className={`truncate ${!row.productName && row.sku ? 'font-mono text-xs text-muted-foreground' : ''}`} title={row.productName || row.sku}>{row.productName || row.sku || '—'}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.sku || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span
                          className="font-mono text-xs cursor-pointer hover:text-primary hover:underline"
                          onClick={() => openASINDetail(row.asin, merchantToken)}
                        >
                          {row.asin || '—'}
                        </span>
                        {row.asin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAmazonProduct(row.asin, merchantToken)}
                            className="h-5 w-5 p-0 shrink-0"
                            title="View on Amazon"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {renderStock(row.fbaStock, row.fbaStock === 0 ? 'text-destructive' : '')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {renderStock(row.fbmStock, row.fbmStock === 0 ? 'text-destructive' : '')}
                    </TableCell>
                    <TableCell className="text-right font-bold">{renderStock(row.totalStock, totalCls)}</TableCell>
                    <TableCell className="text-right">
                      {row.price != null && row.price > 0
                        ? formatCurrencyByMerchantToken(row.price, merchantToken)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {sorted.length > 25 && (
          <div className="mt-3 text-center">
            <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)} className="text-xs">
              {showAll ? 'Show Top 25' : `Show All ${sorted.length} ${unitLabel}s`}
              {showAll ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};
