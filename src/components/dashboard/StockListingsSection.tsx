import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-header';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend,
} from 'recharts';
import {
  Package, Search, ChevronDown, ChevronUp, ExternalLink,
  ListChecks, TrendingUp, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useStockData, type StockCurrentListing } from '@/hooks/useStockData';
import { formatCurrencyByMerchantToken } from '@/utils/formatters';
import { openAmazonProduct } from '@/utils/amazonUtils';
import { useASINDetail } from '@/hooks/useASINDetail';
import { ProductStockHistoryModal } from './ProductStockHistoryModal';

interface StockListingsSectionProps {
  merchantToken: string;
}

type SortField = 'seller_sku' | 'asin' | 'item_name' | 'status' | 'price' | 'quantity' | 'fulfillment_channel';
type SortDir = 'asc' | 'desc';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-500',
  Inactive: 'bg-red-500',
  Incomplete: 'bg-yellow-500',
};

export const StockListingsSection: React.FC<StockListingsSectionProps> = ({ merchantToken }) => {
  const { dailySummary, currentListings, loading } = useStockData(merchantToken);
  const { openASINDetail } = useASINDetail();

  const [chartOpen, setChartOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('quantity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAll, setShowAll] = useState(false);
  const [historyModal, setHistoryModal] = useState<{ sku: string; asin: string; name: string } | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Check if quantity is tracked (any non-zero day)
  const hasQuantity = useMemo(() => dailySummary.some(d => d.total_quantity > 0), [dailySummary]);

  // Latest summary for cards
  const latest = dailySummary.length > 0 ? dailySummary[0] : null;

  // Chart data (chronological)
  const chartData = useMemo(() =>
    [...dailySummary].reverse().map(d => ({
      date: format(parseISO(d.record_date), 'dd MMM'),
      fullDate: format(parseISO(d.record_date), 'dd MMM yyyy'),
      quantity: d.total_quantity,
    })),
    [dailySummary]
  );

  // Filtered & sorted listings
  const filteredListings = useMemo(() => {
    let list = currentListings;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(l =>
        l.asin.toLowerCase().includes(s) ||
        l.seller_sku.toLowerCase().includes(s) ||
        l.item_name.toLowerCase().includes(s)
      );
    }
    if (statusFilter) {
      list = list.filter(l => l.status === statusFilter);
    }
    return [...list].sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [currentListings, searchTerm, statusFilter, sortField, sortDir]);

  const displayed = showAll ? filteredListings : filteredListings.slice(0, 50);

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    currentListings.forEach(l => { map[l.status] = (map[l.status] || 0) + 1; });
    return map;
  }, [currentListings]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (dailySummary.length === 0 && currentListings.length === 0) {
    return null; // No stock data for this account
  }

  const fmtPrice = (v: number) => formatCurrencyByMerchantToken(v, merchantToken);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Stock & Listings</h3>
        <span className="text-xs text-muted-foreground ml-1">
          {currentListings.length} listings
        </span>
      </div>

      {/* ── Summary Cards ── */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="Active Listings" value={latest.active_listings} color="text-green-600" bgColor="bg-green-50" />
          <SummaryCard label="Inactive Listings" value={latest.inactive_listings} color="text-red-600" bgColor="bg-red-50" />
          <SummaryCard label="Avg Price" value={latest.avg_price != null ? fmtPrice(latest.avg_price) : 'N/A'} color="text-blue-600" bgColor="bg-blue-50" />
          <SummaryCard label="Total Quantity" value={hasQuantity && latest.total_quantity != null ? latest.total_quantity.toLocaleString() : 'N/A'} color="text-purple-600" bgColor="bg-purple-50" />
          <SummaryCard label="Total Value" value={hasQuantity && latest.total_value != null ? fmtPrice(latest.total_value) : 'N/A'} color="text-amber-600" bgColor="bg-amber-50" tooltip="Estimated value of stock on hand (avg price × total quantity)" />
        </div>
      )}

      {/* ── Chart ── */}
      {hasQuantity && chartData.length > 1 && (
        <Card>
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
            onClick={() => setChartOpen(o => !o)}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Stock Over Time
            </div>
            {chartOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
          {chartOpen && (
            <CardContent className="pt-0 pb-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="quantityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => v.toLocaleString()} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    formatter={(value: number) => [value.toLocaleString(), 'Total Quantity']}
                  />
                  <Line type="monotone" dataKey="quantity" name="Total Quantity" stroke="#8b5cf6" strokeWidth={2} dot={false} fill="url(#quantityFill)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Table ── */}
      {currentListings.length > 0 && (
        <Card>
          <div className="px-4 py-3 flex flex-col sm:flex-row gap-2 sm:items-center justify-between border-b">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search SKU, ASIN, name..."
                  className="pl-8 h-9 text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5">
                <FilterPill label="All" count={currentListings.length} active={!statusFilter} onClick={() => setStatusFilter(null)} />
                {Object.entries(statusCounts).map(([s, c]) => (
                  <FilterPill key={s} label={s} count={c} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? null : s)} />
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{filteredListings.length} results</span>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <SortableTableHead field="seller_sku" currentField={sortField} direction={sortDir} onSort={handleSort} className="w-28">SKU</SortableTableHead>
                    <SortableTableHead field="asin" currentField={sortField} direction={sortDir} onSort={handleSort} className="w-28">ASIN</SortableTableHead>
                    <SortableTableHead field="item_name" currentField={sortField} direction={sortDir} onSort={handleSort} className="max-w-[200px]">Product Name</SortableTableHead>
                    <SortableTableHead field="status" currentField={sortField} direction={sortDir} onSort={handleSort} className="w-24">Status</SortableTableHead>
                    <SortableTableHead field="price" currentField={sortField} direction={sortDir} onSort={handleSort} className="w-20 text-right">Price</SortableTableHead>
                    <SortableTableHead field="quantity" currentField={sortField} direction={sortDir} onSort={handleSort} className="w-20 text-right">Qty</SortableTableHead>
                    <SortableTableHead field="fulfillment_channel" currentField={sortField} direction={sortDir} onSort={handleSort} className="w-24">Fulfillment</SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((item, i) => (
                    <TableRow key={`${item.seller_sku}-${i}`} className={cn('h-11', i % 2 === 1 && 'bg-muted/10')}>
                      <TableCell className="font-medium">
                        <span
                          className="truncate block max-w-[120px] cursor-pointer hover:text-primary hover:underline"
                          title={item.seller_sku}
                          onClick={() => setHistoryModal({ sku: item.seller_sku, asin: item.asin, name: item.item_name })}
                        >{item.seller_sku || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span
                            className="truncate cursor-pointer hover:text-primary hover:underline"
                            title={item.asin}
                            onClick={() => openASINDetail(item.asin, merchantToken)}
                          >
                            {item.asin || 'N/A'}
                          </span>
                          {item.asin && (
                            <Button variant="ghost" size="sm" onClick={() => openAmazonProduct(item.asin, merchantToken)} className="h-5 w-5 p-0 flex-shrink-0" title="View on Amazon">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span
                          className="truncate block cursor-pointer hover:text-primary hover:underline"
                          title={item.item_name}
                          onClick={() => setHistoryModal({ sku: item.seller_sku, asin: item.asin, name: item.item_name })}
                        >{item.item_name || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={cn('h-2 w-2 rounded-full', STATUS_COLORS[item.status] || 'bg-gray-400')} />
                          <span className="text-xs">{item.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtPrice(item.price)}</TableCell>
                      <TableCell className={cn('text-right font-medium', item.quantity === 0 ? 'text-red-600' : item.quantity < 10 ? 'text-yellow-600' : 'text-green-600')}>
                        {item.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-xs text-white', item.fulfillment_channel?.toLowerCase().includes('amazon') ? 'bg-blue-500' : 'bg-green-500')}>
                          {item.fulfillment_channel?.toLowerCase().includes('amazon') ? 'FBA' : item.fulfillment_channel === 'DEFAULT' ? 'FBM' : item.fulfillment_channel || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayed.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No listings match your filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredListings.length > 50 && (
              <div className="py-3 text-center border-t">
                <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)} className="gap-1.5">
                  {showAll ? <>Show Top 50 <ChevronUp className="h-3.5 w-3.5" /></> : <>Show All {filteredListings.length} <ChevronDown className="h-3.5 w-3.5" /></>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {historyModal && (
        <ProductStockHistoryModal
          open={!!historyModal}
          onOpenChange={(open) => { if (!open) setHistoryModal(null); }}
          sellerSku={historyModal.sku}
          asin={historyModal.asin}
          itemName={historyModal.name}
          merchantToken={merchantToken}
        />
      )}
    </div>
  );
};

/* ── Helpers ── */

function SummaryCard({ label, value, color, bgColor, tooltip }: { label: string; value: string | number; color: string; bgColor: string; tooltip?: string }) {
  return (
    <Card title={tooltip}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={cn('text-lg font-bold', color)}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </CardContent>
    </Card>
  );
}

function FilterPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:bg-muted/50'
      )}
    >
      {label} ({count})
    </button>
  );
}
