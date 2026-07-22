import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Package, RotateCcw, TrendingUp, Percent, ExternalLink, PiggyBank, Info } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrencyInfo, getCountryFromMerchantToken } from '@/utils/currencyUtils';
import { WeeklyFinancialTrend } from './WeeklyFinancialTrend';
import { InfoTooltip } from '@/components/common/InfoTooltip';
// recharts imports removed – modal now uses HTML stacked bar + table

interface ProductFinancialDashboardProps {
  accountName: string;
}

interface FinancialRow {
  product_product_name: string | null;
  product_asin: string | null;
  sales_total_sales_revenue: number | null;
  sales_total_units_sold: number | null;
  sales_return_rate: number | null;
  referral_fee_total: number | null;
  fba_fulfilment_fees_total: number | null;
  sponsored_products_charges_total: number | null;
  selling_fees_total: number | null;
  net_proceed_total: number | null;
  cost_price: number | null;
}

type SortField = keyof FinancialRow | 'net_margin' | 'gross_profit';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 50;

const toNum = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const getNetMargin = (row: FinancialRow) => {
  const revenue = row.sales_total_sales_revenue ?? 0;
  const net = row.net_proceed_total ?? 0;
  return revenue !== 0 ? (net / revenue) * 100 : 0;
};

const getGrossProfit = (row: FinancialRow) => {
  const revenue = row.sales_total_sales_revenue ?? 0;
  const referral = Math.abs(row.referral_fee_total ?? 0);
  const fba = Math.abs(row.fba_fulfilment_fees_total ?? 0);
  const ad = Math.abs(row.sponsored_products_charges_total ?? 0);
  const cogs = (row.cost_price ?? 0) * (row.sales_total_units_sold ?? 0);
  return revenue - referral - fba - ad - cogs;
};

// Colors used inline in modal stacked bar

export function ProductFinancialDashboard({ accountName }: ProductFinancialDashboardProps) {
  const [data, setData] = useState<FinancialRow[]>([]);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('sales_total_sales_revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [brandName, setBrandName] = useState('');
  const [isVendor, setIsVendor] = useState(false);
  const [selectedRow, setSelectedRow] = useState<FinancialRow | null>(null);
  const [editingCost, setEditingCost] = useState<{ asin: string; value: string } | null>(null);
  const [merchantToken, setMerchantToken] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: accountData } = await supabase
          .from('accounts_master')
          .select('python_brand_name, account_type, merchant_token')
          .eq('account_name', accountName)
          .limit(1)
          .single();
        setMerchantToken(((accountData as any)?.merchant_token as string | null) ?? null);

        const brand = accountData?.python_brand_name || accountName;
        setBrandName(brand);
        const acctType = (accountData as any)?.account_type;
        setIsVendor(typeof acctType === 'string' && acctType.toLowerCase() === 'vendor');

        const { data: weekData } = await supabase
          .from('python_financial_raw' as any)
          .select('week_start')
          .eq('brand', brand)
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

        const [{ data: financialData }, { data: costData }] = await Promise.all([
          supabase
            .from('python_financial_raw' as any)
            .select('product_product_name, product_asin, sales_total_sales_revenue, sales_total_units_sold, sales_return_rate, referral_fee_total, fba_fulfilment_fees_total, sponsored_products_charges_total, selling_fees_total, net_proceed_total')
            .eq('brand', brand)
            .eq('week_start', latestWeek)
            .order('sales_total_sales_revenue', { ascending: false }),
          supabase
            .from('asin_cost_prices')
            .select('asin, cost_price')
            .eq('brand', brand),
        ]);

        const costMap = new Map<string, number>();
        ((costData as any[] | null) || []).forEach((c: any) => {
          costMap.set(c.asin, Number(c.cost_price) || 0);
        });

        const parsed = ((financialData as any[] | null) || []).map((r: any) => ({
          product_product_name: r.product_product_name ?? null,
          product_asin: r.product_asin ?? null,
          sales_total_sales_revenue: toNum(r.sales_total_sales_revenue),
          sales_total_units_sold: toNum(r.sales_total_units_sold),
          sales_return_rate: toNum(r.sales_return_rate),
          referral_fee_total: toNum(r.referral_fee_total),
          fba_fulfilment_fees_total: toNum(r.fba_fulfilment_fees_total),
          sponsored_products_charges_total: toNum(r.sponsored_products_charges_total),
          selling_fees_total: toNum(r.selling_fees_total),
          net_proceed_total: toNum(r.net_proceed_total),
          cost_price: r.product_asin ? (costMap.get(r.product_asin) ?? null) : null,
        })) as FinancialRow[];
        setData(parsed);
      } catch (err) {
        console.error('Product Financial fetch error:', err);
        setData([]);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [accountName]);

  const handleCostPriceSave = useCallback(async (asin: string, value: string) => {
    const numVal = Number(value);
    if (isNaN(numVal) || numVal < 0) return;
    setEditingCost(null);

    setData(prev => prev.map(r =>
      r.product_asin === asin ? { ...r, cost_price: numVal } : r
    ));

    await supabase
      .from('asin_cost_prices')
      .upsert(
        { brand: brandName, asin, cost_price: numVal, updated_at: new Date().toISOString(), updated_by: 'dashboard' },
        { onConflict: 'brand,asin' }
      );
  }, [brandName]);

  const summaryCards = useMemo(() => {
    const totalRevenue = data.reduce((s, r) => s + (r.sales_total_sales_revenue ?? 0), 0);
    const totalUnits = data.reduce((s, r) => s + (r.sales_total_units_sold ?? 0), 0);
    const avgReturnRate = data.length > 0
      ? data.reduce((s, r) => s + (r.sales_return_rate ?? 0), 0) / data.length
      : 0;
    const totalNetProceeds = data.reduce((s, r) => s + (r.net_proceed_total ?? 0), 0);
    const netMargin = totalRevenue !== 0 ? (totalNetProceeds / totalRevenue) * 100 : 0;
    const totalGrossProfit = data.reduce((s, r) => s + getGrossProfit(r), 0);
    return { totalRevenue, totalUnits, avgReturnRate, totalNetProceeds, netMargin, totalGrossProfit };
  }, [data]);

  const processedData = useMemo(() => {
    let filtered = data;
    if (filter) {
      const lc = filter.toLowerCase();
      filtered = data.filter(r =>
        r.product_product_name?.toLowerCase().includes(lc) ||
        r.product_asin?.toLowerCase().includes(lc)
      );
    }
    filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (sortField === 'net_margin') {
        aVal = getNetMargin(a);
        bVal = getNetMargin(b);
      } else if (sortField === 'gross_profit') {
        aVal = getGrossProfit(a);
        bVal = getGrossProfit(b);
      } else if (sortField === 'product_product_name' || sortField === 'product_asin') {
        aVal = (a[sortField] ?? '') as string;
        bVal = (b[sortField] ?? '') as string;
        return sortDirection === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string);
      } else {
        aVal = (a[sortField] ?? 0) as number;
        bVal = (b[sortField] ?? 0) as number;
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return filtered;
  }, [data, filter, sortField, sortDirection]);

  const totalPages = Math.ceil(processedData.length / PAGE_SIZE);
  const pageData = processedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [filter, sortField, sortDirection]);

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
    const headers = ['Product Name', 'ASIN', 'Sales Revenue', 'Units Sold', 'Return Rate %', 'Referral Fee', 'FBA Fees', 'Ad Cost', 'Selling Fees', 'Net Proceeds', 'Net Margin %', 'Cost Price', 'Gross Profit'];
    const rows = processedData.map(r => [
      `"${(r.product_product_name || '').replace(/"/g, '""')}"`,
      r.product_asin ?? '',
      r.sales_total_sales_revenue ?? '',
      r.sales_total_units_sold ?? '',
      r.sales_return_rate ?? '',
      r.referral_fee_total ?? '',
      r.fba_fulfilment_fees_total ?? '',
      r.sponsored_products_charges_total ?? '',
      r.selling_fees_total ?? '',
      r.net_proceed_total ?? '',
      getNetMargin(r).toFixed(1),
      r.cost_price ?? '',
      getGrossProfit(r).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `product-financials-${accountName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currencyInfo = useMemo(() => getCurrencyInfo(getCountryFromMerchantToken(merchantToken || '')), [merchantToken]);
  const fmtCurrency = (v: number | null) => v != null
    ? new Intl.NumberFormat(currencyInfo.locale, { style: 'currency', currency: currencyInfo.code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
    : '—';
  const fmtNum = (v: number | null) => v != null ? v.toLocaleString() : '—';
  const fmtPct = (v: number | string | null) => v != null ? `${Number(v).toFixed(1)}%` : '—';

  const marginColor = (margin: number) => {
    if (margin > 20) return 'text-green-700 dark:text-green-400';
    if (margin >= 0) return 'text-amber-700 dark:text-amber-400';
    return 'text-red-700 dark:text-red-400';
  };

  // getPieData and getWaterfallData removed – modal uses inline calculations

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <>
      <WeeklyFinancialTrend accountName={accountName} />
      <Card>
        <CardHeader className="bg-gradient-to-r from-accent to-muted border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Product P&L Analysis
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-1">
                  ASIN-level profitability breakdown from Amazon financial reports
                  {weekStart ? ` · Week of ${format(new Date(weekStart), 'dd MMM yyyy')}` : ''} · {processedData.length} products
                </CardDescription>
                <p className="text-xs text-muted-foreground/70 mt-1 italic">ℹ️ P&L data is based on Amazon settlement reports — showing the most recent available week</p>
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" /> Total Sales Revenue
              </div>
              <p className="text-2xl font-bold">{fmtCurrency(summaryCards.totalRevenue)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Package className="h-4 w-4" /> Total Units Sold
              </div>
              <p className="text-2xl font-bold">{fmtNum(summaryCards.totalUnits)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <RotateCcw className="h-4 w-4" /> Avg Return Rate
              </div>
              <p className="text-2xl font-bold">{fmtPct(summaryCards.avgReturnRate)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Total Net Proceeds</span>
                <InfoTooltip content="Revenue after ALL Amazon fees (referral, FBA/fulfilment, selling fees) and ad cost — but BEFORE your product COGS. The cash Amazon pays out at the account level." />
              </div>
              <p className="text-2xl font-bold">{fmtCurrency(summaryCards.totalNetProceeds)}</p>
            </div>
            <div className={`p-4 rounded-lg border bg-card ${summaryCards.netMargin > 20 ? 'border-green-200 dark:border-green-800' : summaryCards.netMargin >= 0 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span className="flex items-center gap-2"><Percent className="h-4 w-4" /> Net Margin %</span>
                <InfoTooltip content="Net Proceeds ÷ Sales Revenue. Account-level profitability AFTER Amazon fees & ads but BEFORE COGS." />
              </div>
              <p className={`text-2xl font-bold ${marginColor(summaryCards.netMargin)}`}>{summaryCards.netMargin.toFixed(1)}%</p>
            </div>
            <div className={`p-4 rounded-lg border bg-card ${summaryCards.totalGrossProfit > 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span className="flex items-center gap-2"><PiggyBank className="h-4 w-4" /> Total Gross Profit</span>
                <InfoTooltip content={`Revenue − Referral − ${isVendor ? '' : 'FBA − '}Ad Cost − COGS. The product-level bottom line after subtracting your own cost of goods.`} />
              </div>
              <p className={`text-2xl font-bold ${marginColor(summaryCards.totalGrossProfit)}`}>{fmtCurrency(summaryCards.totalGrossProfit)}</p>
            </div>

          </div>


          {/* Overall P&L Breakdown */}
          {(() => {
            const totalRevenue = data.reduce((s, r) => s + (r.sales_total_sales_revenue ?? 0), 0);
            const totalReferral = data.reduce((s, r) => s + Math.abs(r.referral_fee_total ?? 0), 0);
            const totalFba = data.reduce((s, r) => s + Math.abs(r.fba_fulfilment_fees_total ?? 0), 0);
            const totalAd = data.reduce((s, r) => s + Math.abs(r.sponsored_products_charges_total ?? 0), 0);
            const totalCogs = data.reduce((s, r) => s + ((r.cost_price ?? 0) * (r.sales_total_units_sold ?? 0)), 0);
            const totalProfit = totalRevenue - totalReferral - totalFba - totalAd - totalCogs;
            const pnlSegments = [
              { name: 'Referral Fees', value: totalReferral, color: 'hsl(0, 70%, 55%)' },
              ...(isVendor ? [] : [{ name: 'FBA Fees', value: totalFba, color: 'hsl(30, 80%, 55%)' }]),
              { name: 'Ad Cost', value: totalAd, color: 'hsl(45, 90%, 50%)' },
              { name: 'COGS', value: totalCogs, color: 'hsl(270, 60%, 55%)' },
              { name: 'Gross Profit', value: Math.max(totalProfit, 0), color: 'hsl(140, 60%, 45%)' },
            ];
            const pnlTotal = pnlSegments.reduce((s, seg) => s + seg.value, 0);
            const waterfallLines = [
              { label: 'Revenue', amount: totalRevenue, pct: 100, type: 'revenue' as const },
              { label: 'Referral Fees', amount: -totalReferral, pct: totalRevenue ? (totalReferral / totalRevenue) * 100 : 0, type: 'cost' as const },
              ...(isVendor
                ? [{ label: 'FBA Fees', amount: 0, pct: 0, type: 'na' as const }]
                : [{ label: 'FBA Fees', amount: -totalFba, pct: totalRevenue ? (totalFba / totalRevenue) * 100 : 0, type: 'cost' as const }]),
              { label: 'Ad Cost', amount: -totalAd, pct: totalRevenue ? (totalAd / totalRevenue) * 100 : 0, type: 'cost' as const },
              { label: 'COGS', amount: -totalCogs, pct: totalRevenue ? (totalCogs / totalRevenue) * 100 : 0, type: 'cost' as const },
              { label: 'Gross Profit', amount: totalProfit, pct: totalRevenue ? (totalProfit / totalRevenue) * 100 : 0, type: 'profit' as const },
            ];

            return totalRevenue > 0 ? (
              <div className="mb-6 p-5 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold">Overall P&L Breakdown</h3>
                  {isVendor && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Vendor account — FBA fees N/A</span>
                  )}
                </div>

                {/* Stacked bar */}
                <div className="w-full h-10 rounded-md overflow-hidden flex" role="img" aria-label="P&L breakdown bar">
                  {pnlSegments.map((seg) => {
                    const pct = pnlTotal > 0 ? (seg.value / pnlTotal) * 100 : 0;
                    if (pct < 0.5) return null;
                    return (
                      <div
                        key={seg.name}
                        className="h-full flex items-center justify-center text-[11px] font-semibold text-white overflow-hidden px-1.5"
                        style={{ width: `${pct}%`, backgroundColor: seg.color, minWidth: pct > 3 ? undefined : 0 }}
                        title={`${seg.name}: ${fmtCurrency(seg.value)} (${pct.toFixed(1)}%)`}
                      >
                        <span className="truncate">
                          {pct >= 12 ? `${seg.name} ${pct.toFixed(1)}%` : pct >= 6 ? `${pct.toFixed(0)}%` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>


                {/* Legend */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-muted-foreground">
                  {pnlSegments.map((seg) => (
                    <span key={seg.name} className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
                      {seg.name}: {fmtCurrency(seg.value)}
                    </span>
                  ))}
                </div>

                {/* Waterfall table */}
                <table className="w-full mt-4 text-sm border-t border-border">
                  <thead>
                    <tr className="text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">Item</th>
                      <th className="text-right py-2 font-medium">Amount</th>
                      <th className="text-right py-2 font-medium">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waterfallLines.map((line, idx) => {
                      const isNA = line.type === 'na';
                      const cls = line.type === 'profit' ? 'text-green-700 dark:text-green-400'
                        : line.type === 'cost' ? 'text-red-700 dark:text-red-400'
                        : isNA ? 'text-muted-foreground/60 italic'
                        : '';
                      return (
                        <tr key={line.label} className={idx === waterfallLines.length - 1 ? 'border-t-2 border-border font-semibold' : 'border-t border-border/50'}>
                          <td className={`py-1.5 ${cls}`}>
                            {line.type === 'cost' ? '− ' : line.type === 'profit' ? '= ' : isNA ? '   ' : ''}{line.label}
                          </td>
                          <td className={`text-right py-1.5 font-mono ${cls}`}>
                            {isNA ? 'N/A (Vendor)' : fmtCurrency(Math.abs(line.amount))}
                          </td>
                          <td className={`text-right py-1.5 ${isNA ? 'text-muted-foreground/60 italic' : (line.type === 'profit' ? 'text-green-700 dark:text-green-400' : line.type === 'cost' ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground')}`}>
                            {isNA ? '—' : `${line.pct.toFixed(1)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            ) : null;
          })()}

          {/* Filter */}
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by product name or ASIN..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {(([
                    ['product_product_name', 'Product Name'],
                    ['product_asin', 'ASIN'],
                    ['sales_total_sales_revenue', 'Sales Revenue'],
                    ['sales_total_units_sold', 'Units Sold'],
                    ['sales_return_rate', 'Return Rate %'],
                    ['referral_fee_total', 'Referral Fee'],
                    ['fba_fulfilment_fees_total', 'FBA Fees'],
                    ['sponsored_products_charges_total', 'Ad Cost'],
                    ['selling_fees_total', 'Selling Fees'],
                    ['net_proceed_total', 'Net Proceeds'],
                    ['net_margin', 'Net Margin %'],
                    ['cost_price', 'Cost Price'],
                    ['gross_profit', 'Gross Profit'],
                  ] as [SortField, string][]).filter(([f]) => !(isVendor && f === 'fba_fulfilment_fees_total'))).map(([field, label]) => (
                    <TableHead
                      key={field}
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => handleSort(field)}
                    >
                      <span className="inline-flex items-center">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((row, i) => {
                  const margin = getNetMargin(row);
                  const gp = getGrossProfit(row);
                  const isEditing = editingCost?.asin === row.product_asin;
                  return (
                    <TableRow
                      key={i}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRow(row)}
                    >
                      <TableCell className="font-medium max-w-[240px] truncate" title={row.product_product_name || ''}>{row.product_product_name || '—'}</TableCell>
                      <TableCell
                        onClick={e => e.stopPropagation()}
                      >
                        {row.product_asin ? (
                          <a
                            href={`https://www.amazon.co.uk/dp/${row.product_asin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-mono text-xs"
                          >
                            {row.product_asin}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{fmtCurrency(row.sales_total_sales_revenue)}</TableCell>
                      <TableCell className="text-right">{fmtNum(row.sales_total_units_sold)}</TableCell>
                      <TableCell className="text-right">{fmtPct(row.sales_return_rate)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(row.referral_fee_total)}</TableCell>
                      {!isVendor && (
                        <TableCell className="text-right">{fmtCurrency(row.fba_fulfilment_fees_total)}</TableCell>
                      )}
                      <TableCell className="text-right">{fmtCurrency(row.sponsored_products_charges_total)}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(row.selling_fees_total)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtCurrency(row.net_proceed_total)}</TableCell>
                      <TableCell className={`text-right font-bold ${marginColor(margin)}`}>{margin.toFixed(1)}%</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        {isEditing ? (
                          <Input
                            autoFocus
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-20 h-7 text-xs text-right"
                            defaultValue={editingCost.value}
                            onBlur={e => handleCostPriceSave(row.product_asin!, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleCostPriceSave(row.product_asin!, (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingCost(null);
                            }}
                          />
                        ) : (
                          <span
                            className="cursor-text text-xs hover:bg-muted px-1 py-0.5 rounded"
                            onClick={() => setEditingCost({ asin: row.product_asin!, value: String(row.cost_price ?? '') })}
                          >
                            {row.cost_price != null ? fmtCurrency(row.cost_price) : '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${marginColor(gp)}`}>{fmtCurrency(gp)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
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

      {/* Row Detail Modal */}
      <Dialog open={!!selectedRow} onOpenChange={open => !open && setSelectedRow(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedRow && (() => {
            const row = selectedRow;
            const margin = getNetMargin(row);
            const gp = getGrossProfit(row);
            const revenue = row.sales_total_sales_revenue ?? 0;
            const referralFee = Math.abs(row.referral_fee_total ?? 0);
            const fbaFee = Math.abs(row.fba_fulfilment_fees_total ?? 0);
            const adCost = Math.abs(row.sponsored_products_charges_total ?? 0);
            const cogs = (row.cost_price ?? 0) * (row.sales_total_units_sold ?? 0);
            const netProfit = Math.max(0, revenue - referralFee - fbaFee - adCost - cogs);

            const barSegments = [
              { name: 'Referral Fee', value: referralFee, color: 'hsl(0, 70%, 55%)' },
              { name: 'FBA Fees', value: fbaFee, color: 'hsl(30, 80%, 55%)' },
              { name: 'Ad Cost', value: adCost, color: 'hsl(45, 90%, 50%)' },
              { name: 'COGS', value: cogs, color: 'hsl(270, 60%, 55%)' },
              { name: 'Gross Profit', value: netProfit, color: 'hsl(140, 60%, 45%)' },
            ];
            const barTotal = barSegments.reduce((s, seg) => s + seg.value, 0) || 1;

            const waterfallLines = [
              { label: 'Revenue', amount: revenue, pct: 100, type: 'revenue' as const },
              { label: 'Referral Fee', amount: -referralFee, pct: revenue ? (referralFee / revenue) * 100 : 0, type: 'cost' as const },
              { label: 'FBA Fees', amount: -fbaFee, pct: revenue ? (fbaFee / revenue) * 100 : 0, type: 'cost' as const },
              { label: 'Ad Cost', amount: -adCost, pct: revenue ? (adCost / revenue) * 100 : 0, type: 'cost' as const },
              { label: 'COGS', amount: -cogs, pct: revenue ? (cogs / revenue) * 100 : 0, type: 'cost' as const },
              { label: 'Gross Profit', amount: gp, pct: revenue ? (gp / revenue) * 100 : 0, type: 'profit' as const },
            ];

            return (
              <>
                {/* 1. HEADER */}
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold pr-8">
                    {row.product_product_name || 'Unknown Product'}
                  </DialogTitle>
                  {row.product_asin && (
                    <a
                      href={`https://www.amazon.co.uk/dp/${row.product_asin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm mt-1"
                    >
                      {row.product_asin}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </DialogHeader>

                {/* 2. METRICS ROW: 4 cols x 2 rows */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {[
                    { label: 'Revenue', val: fmtCurrency(row.sales_total_sales_revenue) },
                    { label: 'Units Sold', val: fmtNum(row.sales_total_units_sold) },
                    { label: 'Net Proceeds', val: fmtCurrency(row.net_proceed_total) },
                    { label: 'Net Margin', val: `${margin.toFixed(1)}%`, color: marginColor(margin) },
                    { label: 'Cost Price', val: row.cost_price != null ? fmtCurrency(row.cost_price) : '—' },
                    { label: 'Gross Profit', val: fmtCurrency(gp), color: marginColor(gp) },
                    { label: 'Return Rate', val: fmtPct(row.sales_return_rate) },
                    { label: 'Ad Cost', val: fmtCurrency(row.sponsored_products_charges_total) },
                  ].map(m => (
                    <div key={m.label} className="p-3 rounded-lg border bg-card">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className={`text-lg font-bold ${m.color || ''}`}>{m.val}</p>
                    </div>
                  ))}
                </div>

                {/* 3. COST BREAKDOWN: Horizontal stacked bar */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Cost Breakdown</h4>
                  <div className="w-full h-10 rounded-lg overflow-hidden flex">
                    {barSegments.map(seg => {
                      const pct = (seg.value / barTotal) * 100;
                      if (pct < 1) return null;
                      return (
                        <div
                          key={seg.name}
                          className="h-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden"
                          style={{ width: `${pct}%`, backgroundColor: seg.color, minWidth: pct > 4 ? undefined : '0' }}
                          title={`${seg.name}: ${fmtCurrency(seg.value)} (${pct.toFixed(1)}%)`}
                        >
                          {pct > 6 ? `${pct.toFixed(0)}%` : ''}
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend with amounts */}
                  <div className="flex flex-wrap gap-4 mt-3">
                    {barSegments.map(seg => (
                      <div key={seg.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-muted-foreground">{seg.name}:</span>
                        <span className="font-medium">{fmtCurrency(seg.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. PROFIT WATERFALL TABLE */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Profit Waterfall</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Item</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">% of Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waterfallLines.map((line, idx) => (
                          <tr
                            key={line.label}
                            className={`border-b last:border-0 ${idx === waterfallLines.length - 1 ? 'bg-muted/30 font-bold' : ''}`}
                          >
                            <td className="px-4 py-2.5">
                              {line.type === 'cost' && <span className="text-muted-foreground mr-1">−</span>}
                              {line.type === 'profit' && <span className="mr-1">=</span>}
                              {line.label}
                            </td>
                            <td className={`text-right px-4 py-2.5 font-mono ${
                              line.type === 'cost' ? 'text-red-600 dark:text-red-400' :
                              line.type === 'profit' ? (line.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') :
                              ''
                            }`}>
                              {line.type === 'cost' ? `(${fmtCurrency(Math.abs(line.amount))})` : fmtCurrency(line.amount)}
                            </td>
                            <td className={`text-right px-4 py-2.5 font-mono ${
                              line.type === 'cost' ? 'text-red-600 dark:text-red-400' :
                              line.type === 'profit' ? (line.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') :
                              ''
                            }`}>
                              {line.pct.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
