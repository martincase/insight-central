import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Check, X, Download, Upload } from 'lucide-react';
import { ASINLink } from '@/components/common/ASINLink';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { useTableSort } from '@/hooks/useTableSort';
import { CountryScope } from './CountrySwitcher';
import { DateFilter } from '@/types/dashboard';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import * as XLSX from 'xlsx';

interface Props {
  spid: string;
  scope: CountryScope;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
}

interface ProductRow {
  asin: string;
  sku: string | null;
  product_name: string | null;
  units: number;
  sales_gbp: number;
  fees_gbp: number;
  ads_gbp: number;
  net_proceeds_gbp: number;
  cogs_gbp: number;
  profit_gbp: number;
  has_cost: boolean;
  sales_native?: number | null;
  fees_native?: number | null;
  ads_native?: number | null;
  net_proceeds_native?: number | null;
  cogs_native?: number | null;
  profit_native?: number | null;
  currency?: string | null;
}

const fmtInt = (v: number) => new Intl.NumberFormat('en-GB').format(Math.round(v || 0));
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

type ParsedRow = { identifier: string; cost: number };
type UploadResult = { identifier: string; status: 'asin' | 'sku' | 'unmatched' | 'no-brand' | 'error'; error?: string };

export function ProductPnlTable({ spid, scope, dateFilter, customDateRange }: Props) {
  const fmtMoney = (v: number, rowCurrency?: string | null) => {
    const code = rowCurrency || getCurrencyInfo(scope).code;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(v || 0);
  };
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editingAsin, setEditingAsin] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Bulk upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const range = useMemo(() => getCurrentDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const pStart = useMemo(() => format(range.from, 'yyyy-MM-dd'), [range.from]);
  const pEnd = useMemo(() => format(range.to, 'yyyy-MM-dd'), [range.to]);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await (supabase.rpc as any)('rpc_pnl_products', {
        p_spid: spid, p_scope: scope, p_start: pStart, p_end: pEnd,
      });
      if (res.error) throw res.error;
      setRows((res.data as ProductRow[]) || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load product P&L');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchRows();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spid, scope, pStart, pEnd]);

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort<ProductRow>({
    data: rows,
    defaultSortField: 'sales_gbp',
    defaultSortDirection: 'desc',
  });

  const visible = showAll ? sortedData : sortedData.slice(0, 25);

  const getMoneyVal = (r: ProductRow, nativeKey: keyof ProductRow, gbpKey: keyof ProductRow) =>
    r.currency ? Number(r[nativeKey] || 0) : Number(r[gbpKey] || 0);

  const totals = useMemo(() => {
    return {
      units: rows.reduce((s, r) => s + Number(r.units || 0), 0),
      sales: rows.reduce((s, r) => s + getMoneyVal(r, 'sales_native', 'sales_gbp'), 0),
      fees: Math.abs(rows.reduce((s, r) => s + getMoneyVal(r, 'fees_native', 'fees_gbp'), 0)),
      ads: Math.abs(rows.reduce((s, r) => s + getMoneyVal(r, 'ads_native', 'ads_gbp'), 0)),
      netProceeds: rows.reduce((s, r) => s + getMoneyVal(r, 'net_proceeds_native', 'net_proceeds_gbp'), 0),
      cogs: Math.abs(rows.reduce((s, r) => s + getMoneyVal(r, 'cogs_native', 'cogs_gbp'), 0)),
      profit: rows.reduce((s, r) => s + getMoneyVal(r, 'profit_native', 'profit_gbp'), 0),
    };
  }, [rows]);

  const totalMargin = totals.sales > 0 ? totals.profit / totals.sales : 0;
  const totalCurrency = rows.find(r => r.currency)?.currency ?? null;

  const startEdit = (r: ProductRow) => {
    setEditingAsin(r.asin);
    const perUnit = r.units > 0 && r.has_cost ? Math.abs(r.cogs_gbp) / r.units : 0;
    setEditValue(perUnit > 0 ? perUnit.toFixed(2) : '');
  };

  const cancelEdit = () => {
    setEditingAsin(null);
    setEditValue('');
  };

  const saveEdit = async (asin: string) => {
    const cost = Number(editValue);
    if (!isFinite(cost) || cost < 0) {
      toast.error('Enter a valid cost');
      return;
    }
    setSaving(true);
    try {
      const res = await (supabase.rpc as any)('rpc_set_asin_cost', {
        p_spid: spid, p_asin: asin, p_cost: cost,
      });
      if (res.error) throw res.error;
      toast.success(`Saved cost for ${asin}`);
      cancelEdit();
      await fetchRows();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save cost');
    } finally {
      setSaving(false);
    }
  };

  // ----- Bulk upload -----
  const downloadTemplate = () => {
    const csv = [
      '# identifier can be an ASIN (e.g. B08NT4HY64) OR a SKU. cost is per-unit in GBP.',
      'identifier,cost',
      'B08NT4HY64,65',
      'PGLIDEWHT,55',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cost-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCost = (v: any): number | null => {
    if (v == null) return null;
    const s = String(v).replace(/[£$€,\s]/g, '').trim();
    if (!s) return null;
    const n = Number(s);
    return isFinite(n) && n >= 0 ? n : null;
  };

  const parseFile = async (file: File): Promise<ParsedRow[]> => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
    const out: ParsedRow[] = [];
    for (const row of raw) {
      if (!row || row.length < 2) continue;
      const id = String(row[0] ?? '').trim();
      if (!id || id.startsWith('#')) continue;
      const cost = parseCost(row[1]);
      if (cost == null) continue; // header or invalid
      out.push({ identifier: id, cost });
    }
    return out;
  };

  const runUpload = async (file: File) => {
    setUploading(true);
    setResults(null);
    setProgress(null);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        toast.error('No valid rows found in file');
        setUploading(false);
        return;
      }
      setProgress({ done: 0, total: parsed.length });
      const results: UploadResult[] = [];
      const CONCURRENCY = 4;
      let idx = 0;
      const worker = async () => {
        while (idx < parsed.length) {
          const i = idx++;
          const row = parsed[i];
          try {
            const res = await (supabase.rpc as any)('rpc_set_cost_by_key', {
              p_spid: spid, p_key: row.identifier, p_cost: row.cost,
            });
            if (res.error) {
              results[i] = { identifier: row.identifier, status: 'error', error: res.error.message };
            } else {
              const status = (res.data as string) as UploadResult['status'];
              results[i] = { identifier: row.identifier, status };
            }
          } catch (e: any) {
            results[i] = { identifier: row.identifier, status: 'error', error: e?.message };
          }
          setProgress({ done: Math.min(parsed.length, results.filter(Boolean).length), total: parsed.length });
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, parsed.length) }, worker));
      setResults(results);
      const saved = results.filter(r => r.status === 'asin' || r.status === 'sku').length;
      toast.success(`Saved ${saved} of ${parsed.length} costs`);
      await fetchRows();
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runUpload(file);
  };

  const summary = useMemo(() => {
    if (!results) return null;
    const s = { asin: 0, sku: 0, unmatched: 0, error: 0, noBrand: 0 };
    for (const r of results) {
      if (r.status === 'asin') s.asin++;
      else if (r.status === 'sku') s.sku++;
      else if (r.status === 'unmatched') s.unmatched++;
      else if (r.status === 'no-brand') s.noBrand++;
      else s.error++;
    }
    return s;
  }, [results]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-sm md:text-base">Product-level P&amp;L</CardTitle>
            <p className="text-[11px] text-muted-foreground">Cost per unit (GBP) — saved permanently.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download template
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setResults(null); setProgress(null); setUploadOpen(true); }}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload costs
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">Error: {error}</div>
        )}
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No products in this range.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <SortableTableHead field="units" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Units</SortableTableHead>
                  <SortableTableHead field="sales_gbp" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Sales</SortableTableHead>
                  <SortableTableHead field="fees_gbp" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Fees</SortableTableHead>
                  <SortableTableHead field="ads_gbp" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Ads</SortableTableHead>
                  <SortableTableHead field="net_proceeds_gbp" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Net proceeds</SortableTableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <SortableTableHead field="profit_gbp" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Net profit</SortableTableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => {
                  const sales = getMoneyVal(r, 'sales_native', 'sales_gbp');
                  const profit = getMoneyVal(r, 'profit_native', 'profit_gbp');
                  const margin = sales > 0 ? profit / sales : 0;
                  const isEditing = editingAsin === r.asin;
                  const fees = Math.abs(getMoneyVal(r, 'fees_native', 'fees_gbp'));
                  const ads = Math.abs(getMoneyVal(r, 'ads_native', 'ads_gbp'));
                  const cogs = Math.abs(getMoneyVal(r, 'cogs_native', 'cogs_gbp'));
                  const netProceeds = getMoneyVal(r, 'net_proceeds_native', 'net_proceeds_gbp');
                  return (
                    <TableRow key={r.asin}>
                      <TableCell className="max-w-xs">
                        <div className="text-sm truncate" title={r.product_name || r.asin}>
                          {r.product_name || r.asin}
                        </div>
                        <div className="text-[11px] mt-0.5">
                          <ASINLink asin={r.asin} />
                          {r.sku && <span className="ml-2 text-muted-foreground font-mono">{r.sku}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtInt(r.units)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(sales, r.currency)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmtMoney(fees, r.currency)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmtMoney(ads, r.currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(netProceeds, r.currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-xs text-muted-foreground">£</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 w-20 text-right text-xs"
                              autoFocus
                              disabled={saving}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(r.asin);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(r.asin)} disabled={saving}>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit} disabled={saving}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end group">
                            <span className={r.has_cost ? '' : 'text-muted-foreground italic'}>
                              {r.has_cost ? fmtMoney(cogs, r.currency) : 'set cost'}
                            </span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-40 group-hover:opacity-100" onClick={() => startEdit(r)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {fmtMoney(profit, r.currency)}
                        {!r.has_cost && <div className="text-[10px] font-normal text-muted-foreground">before COGS</div>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(margin)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold bg-muted/40">
                  <TableCell>Total ({rows.length} products)</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(totals.units)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(totals.sales, totalCurrency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(totals.fees, totalCurrency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(totals.ads, totalCurrency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(totals.netProceeds, totalCurrency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.cogs === 0 ? '—' : fmtMoney(totals.cogs, totalCurrency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(totals.profit, totalCurrency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(totalMargin)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            {rows.length > 25 && (
              <div className="mt-3 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show top 25' : `Show all ${rows.length} products`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!uploading) setUploadOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload costs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a spreadsheet with two columns: an <strong>ASIN or SKU</strong>, and the <strong>cost per unit (£)</strong>. Either identifier works — costs are saved permanently.
            </p>

            {!results && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm font-medium">Drop CSV or XLSX file here</div>
                <div className="text-xs text-muted-foreground mt-1">or click to browse</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) runUpload(f);
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {uploading && progress && (
              <div className="text-sm text-center py-2">
                Saving {progress.done} / {progress.total}…
              </div>
            )}

            {results && summary && (
              <div className="space-y-2">
                <div className="text-sm">
                  <div className="font-medium mb-1">Results</div>
                  <ul className="text-xs space-y-0.5 text-muted-foreground">
                    <li>Saved by ASIN: <span className="text-foreground font-medium">{summary.asin}</span></li>
                    <li>Saved by SKU: <span className="text-foreground font-medium">{summary.sku}</span></li>
                    {summary.unmatched > 0 && <li className="text-amber-700">Unmatched: {summary.unmatched}</li>}
                    {summary.noBrand > 0 && <li className="text-amber-700">No brand match: {summary.noBrand}</li>}
                    {summary.error > 0 && <li className="text-red-700">Errors: {summary.error}</li>}
                  </ul>
                </div>
                {results.some(r => r.status !== 'asin' && r.status !== 'sku') && (
                  <div className="border rounded p-2 max-h-40 overflow-y-auto">
                    <div className="text-xs font-medium mb-1">Rows to fix:</div>
                    <ul className="text-xs font-mono space-y-0.5">
                      {results.filter(r => r.status !== 'asin' && r.status !== 'sku').map((r, i) => (
                        <li key={i} className="text-muted-foreground">
                          <span className="text-foreground">{r.identifier}</span> — {r.status}
                          {r.error && <span className="text-red-600 ml-1">({r.error})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setResults(null); setProgress(null); }}>Upload another</Button>
                  <Button size="sm" onClick={() => setUploadOpen(false)}>Done</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ProductPnlTable;
