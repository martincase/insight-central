import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Search, Package, ChevronDown, ChevronUp, ArrowUpDown, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyByMerchantToken } from '@/utils/formatters';
import { openAmazonProduct } from '@/utils/amazonUtils';
import { useASINDetail } from '@/hooks/useASINDetail';
import { isVendorAccount } from '@/utils/vendorUtils';
import * as XLSX from 'xlsx';

interface StockInventoryTableProps {
  merchantToken: string;
  accountType?: string | null;
}

interface StockRow {
  sku: string;
  asin: string;
  productName: string;
  fbaStock: number | null;
  fbmStock: number | null;
  totalStock: number;
  price: number;
  source: 'seller' | 'vendor';
  // Vendor-specific fields
  openPoUnits?: number | null;
  unfilledUnits?: number | null;
  oosRate?: number | null;
  sellThroughRate?: number | null;
}

type SortField = 'productName' | 'sku' | 'asin' | 'fbaStock' | 'fbmStock' | 'totalStock' | 'price' | 'openPoUnits' | 'unfilledUnits' | 'oosRate' | 'sellThroughRate';
type SortDir = 'asc' | 'desc';
type StockFilter = 'none' | 'oos' | 'low';

export const StockInventoryTable: React.FC<StockInventoryTableProps> = ({ merchantToken, accountType }) => {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalStock');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showAll, setShowAll] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>('none');
  const { openASINDetail } = useASINDetail();

  const isVendor = accountType ? accountType === 'vendor' : isVendorAccount(merchantToken);

  useEffect(() => {
    if (!merchantToken) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isVendor) {
          await fetchVendorData();
        } else {
          await fetchSellerData();
        }
      } catch (err) {
        console.error('Stock inventory fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchVendorData = async () => {
      const { data: vendorData } = await supabase
        .from('vendor_inventory_data')
        .select('asin, record_date, sellable_on_hand_units, open_purchase_order_units, unfilled_customer_ordered_units, procurable_product_out_of_stock_rate, sell_through_rate, product_title')
        .eq('account_name', merchantToken)
        .order('record_date', { ascending: false });

      if (!vendorData || vendorData.length === 0) {
        setRows([]);
        return;
      }

      // Get latest date
      const latestDate = vendorData[0].record_date;
      const latestRows = vendorData.filter(r => r.record_date === latestDate);

      const vendorRows: StockRow[] = latestRows.map(r => ({
        sku: '',
        asin: r.asin || '',
        productName: (r as any).product_title || '',
        fbaStock: null,
        fbmStock: null,
        totalStock: Number(r.sellable_on_hand_units) || 0,
        price: 0,
        source: 'vendor' as const,
        openPoUnits: r.open_purchase_order_units != null ? Number(r.open_purchase_order_units) : null,
        unfilledUnits: r.unfilled_customer_ordered_units != null ? Number(r.unfilled_customer_ordered_units) : null,
        oosRate: r.procurable_product_out_of_stock_rate != null ? Number(r.procurable_product_out_of_stock_rate) : null,
        sellThroughRate: r.sell_through_rate != null ? Number(r.sell_through_rate) : null,
      }));

      setRows(vendorRows);
    };

    const fetchSellerData = async () => {
      // Determine the latest snapshot date for each source first (cheap, 1 row), then
      // fetch ONLY that date's rows — avoids pulling the entire history (which 500s/times out
      // for large-catalogue accounts like A1 Lawn ~61k rows).
      const [{ data: fbmDateRow }, { data: fbaDateRow }] = await Promise.all([
        supabase
          .from('perplexity_all_listings_stockprice_data')
          .select('record_date')
          .eq('account_name', merchantToken)
          .order('record_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('fba_inventory_data')
          .select('record_date')
          .eq('account_name', merchantToken)
          .order('record_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const fbmLatest = fbmDateRow?.record_date;
      const fbaLatest = fbaDateRow?.record_date;

      const [{ data: fbmData }, { data: fbaData }, { data: rpcSnapshot }] = await Promise.all([
        fbmLatest
          ? supabase
              .from('perplexity_all_listings_stockprice_data')
              .select('seller_sku, asin, item_name, quantity, price, status, record_date')
              .eq('account_name', merchantToken)
              .eq('record_date', fbmLatest)
          : Promise.resolve({ data: [] as any[] }),
        fbaLatest
          ? supabase
              .from('fba_inventory_data')
              .select('sku, asin, product_name, fulfillable_quantity, price, record_date')
              .eq('account_name', merchantToken)
              .eq('record_date', fbaLatest)
          : Promise.resolve({ data: [] as any[] }),
        supabase.rpc('rpc_inventory_fba_snapshot', { p_merchant_token: merchantToken, p_velocity_days: 30 }),
      ]);

      const fbmLatestRows = (fbmData || [])
        .filter(r => {
          const s = (r.status || '').toLowerCase();
          return s !== 'inactive' && s !== 'incomplete';
        });

      const fbaLatestRows = fbaData || [];

      // Build a map by SKU
      const skuMap = new Map<string, StockRow>();

      for (const r of fbmLatestRows) {
        const sku = r.seller_sku || '';
        skuMap.set(sku, {
          sku,
          asin: r.asin || '',
          productName: r.item_name || '',
          fbaStock: null,
          fbmStock: r.quantity ?? 0,
          totalStock: r.quantity ?? 0,
          price: r.price ?? 0,
          source: 'seller',
        });
      }

      for (const r of fbaLatestRows) {
        const sku = r.sku || '';
        const existing = skuMap.get(sku);
        const fbaQty = r.fulfillable_quantity ?? 0;
        if (existing) {
          existing.fbaStock = fbaQty;
          existing.totalStock = (existing.fbmStock ?? 0) + fbaQty;
          if (!existing.productName && r.product_name) existing.productName = r.product_name;
          if (!existing.asin && r.asin) existing.asin = r.asin;
          if (existing.price === 0 && r.price) existing.price = r.price;
        } else {
          skuMap.set(sku, {
            sku,
            asin: r.asin || '',
            productName: r.product_name || '',
            fbaStock: fbaQty,
            fbmStock: null,
            totalStock: fbaQty,
            price: r.price ?? 0,
            source: 'seller',
          });
        }
      }

      // Drop zero-stock never-sold orphans by cross-referencing the authoritative
      // FBA/sales snapshot. When the snapshot is unavailable, keep legacy behaviour.
      const validAsins = new Set((rpcSnapshot || []).map((r: any) => r.asin).filter(Boolean));

      let sellerRows = Array.from(skuMap.values());
      if (validAsins.size > 0) {
        sellerRows = sellerRows.filter(row => validAsins.has(row.asin) || row.totalStock > 0);
      }

      setRows(sellerRows);
    };

    fetchData();
  }, [merchantToken, isVendor]);

  const filtered = useMemo(() => {
    let result = rows;

    // Apply stock filter
    if (stockFilter === 'oos') {
      result = result.filter(r => r.totalStock === 0);
    } else if (stockFilter === 'low') {
      result = result.filter(r => r.totalStock > 0 && r.totalStock < (isVendor ? 10 : 5));
    }

    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(r =>
      r.sku.toLowerCase().includes(q) ||
      r.asin.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q)
    );
  }, [rows, search, stockFilter, isVendor]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (aVal === null || aVal === undefined) aVal = sortDir === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDir === 'asc' ? Infinity : -Infinity;
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
        'Product Name': row.productName || row.sku || row.asin || '—',
          'ASIN': row.asin,
          'Sellable Units': row.totalStock,
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
        'FBA Stock': row.fbaStock ?? '',
        'FBM Stock': row.fbmStock ?? '',
        'Total Stock': row.totalStock,
        'Price': row.price || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `vendor-inventory-${merchantToken}-${today}.xlsx`);
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
          <span className="ml-2 text-muted-foreground">Loading inventory data...</span>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-8 w-8 mb-2" />
          <p>No inventory data available for this account.</p>
        </CardContent>
      </Card>
    );
  }

  const lowStockThreshold = isVendor ? 10 : 5;
  const lowStockCount = rows.filter(r => r.totalStock < lowStockThreshold).length;
  const outOfStockCount = rows.filter(r => r.totalStock === 0).length;
  const lowOnlyCount = lowStockCount - outOfStockCount;

  // Define columns based on account type
  const sellerColumns: [SortField, string, string][] = [
    ['productName', 'Product Name', ''],
    ['sku', 'SKU', 'w-28'],
    ['asin', 'ASIN', 'w-28'],
    ['fbaStock', 'FBA', 'text-right w-20'],
    ['fbmStock', 'FBM', 'text-right w-20'],
    ['totalStock', 'Total', 'text-right w-20'],
    ['price', 'Price', 'text-right w-24'],
  ];

  const vendorColumns: [SortField, string, string][] = [
    ['productName', 'Product', ''],
    ['asin', 'ASIN', 'w-28'],
    ['totalStock', 'Sellable Units', 'text-right w-28'],
    ['openPoUnits', 'Open PO Units', 'text-right w-28'],
    ['unfilledUnits', 'Unfilled Orders', 'text-right w-28'],
    ['oosRate', 'OOS Rate %', 'text-right w-24'],
    ['sellThroughRate', 'Sell-Through %', 'text-right w-28'],
  ];

  const columns = isVendor ? vendorColumns : sellerColumns;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-lg">Stock & Inventory</CardTitle>
            {isVendor && (
              <Badge className="text-xs bg-purple-500/15 text-purple-700 border-purple-200">Vendor</Badge>
            )}
            <Badge variant="secondary" className="text-xs">{rows.length} products</Badge>
            {outOfStockCount > 0 && (
              <Badge
                variant="destructive"
                className={`text-xs cursor-pointer transition-all ${stockFilter === 'oos' ? 'ring-2 ring-destructive ring-offset-1' : 'hover:opacity-80'}`}
                onClick={() => setStockFilter(f => f === 'oos' ? 'none' : 'oos')}
              >
                {outOfStockCount} out of stock
              </Badge>
            )}
            {lowOnlyCount > 0 && (
              <Badge
                className={`text-xs cursor-pointer transition-all bg-amber-500/15 text-amber-700 border-amber-200 ${stockFilter === 'low' ? 'ring-2 ring-amber-500 ring-offset-1' : 'hover:opacity-80'}`}
                onClick={() => setStockFilter(f => f === 'low' ? 'none' : 'low')}
              >
                {lowOnlyCount} low stock
              </Badge>
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
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                {columns.map(([field, label, cls]) => (
                  <TableHead
                    key={field}
                    className={`cursor-pointer select-none hover:bg-muted/50 ${cls}`}
                    onClick={() => handleSort(field)}
                  >
                    <div className={`flex items-center gap-1 ${cls.includes('text-right') ? 'justify-end' : ''}`}>
                      {label}
                      <SortIcon field={field} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((row, i) => {
                const isLow = row.totalStock < lowStockThreshold;
                const isOut = row.totalStock === 0;

                if (isVendor) {
                  const displayName = row.productName || row.sku || row.asin || '—';
                  const isFallback = !row.productName && (row.sku || row.asin);
                  const truncated = displayName.length > 40 ? displayName.slice(0, 40) + '…' : displayName;
                  return (
                    <TableRow
                      key={`${row.asin}-${i}`}
                      className={isOut ? 'bg-destructive/8' : isLow ? 'bg-amber-500/8' : ''}
                    >
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
                      <TableCell className={`text-right font-bold ${isOut ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {row.totalStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.openPoUnits != null ? row.openPoUnits.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${(row.unfilledUnits ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                        {row.unfilledUnits != null ? row.unfilledUnits.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${(row.oosRate ?? 0) > 5 ? 'text-destructive' : (row.oosRate ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                        {row.oosRate != null ? `${row.oosRate.toFixed(1)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.sellThroughRate != null ? `${row.sellThroughRate.toFixed(1)}%` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                }

                // Seller rows
                return (
                  <TableRow
                    key={`${row.sku}-${i}`}
                    className={isOut ? 'bg-destructive/8' : isLow ? 'bg-amber-500/8' : ''}
                  >
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
                    <TableCell className={`text-right font-medium ${row.fbaStock === null ? 'text-muted-foreground' : row.fbaStock === 0 ? 'text-destructive' : ''}`}>
                      {row.fbaStock !== null ? row.fbaStock.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.fbmStock === null ? 'text-muted-foreground' : row.fbmStock === 0 ? 'text-destructive' : ''}`}>
                      {row.fbmStock !== null ? row.fbmStock.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${isOut ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {row.totalStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.price > 0 ? formatCurrencyByMerchantToken(row.price, merchantToken) : '—'}
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
              {showAll ? 'Show Top 25' : `Show All ${sorted.length} Products`}
              {showAll ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
