import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ASINData, ASINDataFallbackInfo } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection';
import { 
  AlertTriangle, Search, Download, Copy, Settings, Info, Package, 
  TrendingDown, DollarSign, Clock, ExternalLink, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { openAmazonProduct } from '@/utils/amazonUtils';
import { formatCurrencyByMerchantToken } from '@/utils/formatters';
import { toast } from 'sonner';

interface InventoryPlannerDashboardProps {
  merchantToken: string;
  accountName: string;
  accountType?: string | null;
  asinData?: ASINData[];
  asinStaleInfo?: ASINDataFallbackInfo | null;
}

type ReorderStatus = 'stockout' | 'reorder-now' | 'reorder-soon' | 'healthy';
type ReorderFrequency = 'weekly' | 'fortnightly' | 'monthly';
type DormantStatus = 'out-of-stock' | 'dormant';

interface PlannerSettings {
  leadTime: number;
  bufferDays: number;
  reorderFrequency: ReorderFrequency;
  maxStorage: number | null;
}

interface PlannerRow {
  asin: string;
  sku: string;
  productName: string;
  fbaStock: number;
  fbmStock: number;
  price: number;
  unitsSold: number;
  salesRevenue: number;
  ppcOrders: number;
  periodDays: number;
  avgDailySales: number;
  daysRemaining: number | null;
  stockoutDate: Date | null;
  reorderPoint: number;
  reorderQty: number;
  status: ReorderStatus;
  revenueAtRisk: number;
  source: 'fba' | 'fbm-only';
}

interface DormantRow {
  asin: string;
  sku: string;
  productName: string;
  price: number;
  lastSaleDate: string | null;
  daysOutOfStock: number | null;
  historicalAvgDailySales: number;
  dormantStatus: DormantStatus;
  manualVelocity: number | null;
  restockQty: number;
}

type SortField = 'status' | 'productName' | 'asin' | 'fbaStock' | 'avgDailySales' | 'daysRemaining' | 'stockoutDate' | 'reorderPoint' | 'reorderQty' | 'revenueAtRisk' | 'price';

const FREQ_DAYS: Record<ReorderFrequency, number> = { weekly: 7, fortnightly: 14, monthly: 30 };

const STATUS_ORDER: Record<ReorderStatus, number> = { 'stockout': 0, 'reorder-now': 1, 'reorder-soon': 2, 'healthy': 3 };

const STATUS_CONFIG: Record<ReorderStatus, { label: string; color: string; bg: string }> = {
  'stockout': { label: 'Stockout', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  'reorder-now': { label: 'Restock Now', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200' },
  'reorder-soon': { label: 'Restock Soon', color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-200' },
  'healthy': { label: 'Healthy', color: 'text-green-700', bg: 'bg-green-100 border-green-200' },
};

const PAGE_SIZE = 50;

function StatusBadge({ status }: { status: ReorderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${
        status === 'stockout' ? 'bg-red-500' :
        status === 'reorder-now' ? 'bg-orange-500' :
        status === 'reorder-soon' ? 'bg-yellow-500' : 'bg-green-500'
      }`} />
      {cfg.label}
    </span>
  );
}

export function InventoryPlannerDashboard({ merchantToken, accountName, accountType, asinData = [], asinStaleInfo = null }: InventoryPlannerDashboardProps) {
  const [settings, setSettings] = useState<PlannerSettings>(() => {
    const stored = localStorage.getItem(`inv_planner_${merchantToken}`);
    if (stored) try { return JSON.parse(stored); } catch {}
    return { leadTime: 14, bufferDays: 7, reorderFrequency: 'fortnightly' as ReorderFrequency, maxStorage: null };
  });

  const [stockData, setStockData] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [adProductData, setAdProductData] = useState<any[]>([]);
  const [snapshotRows, setSnapshotRows] = useState<any[]>([]);
  const [financialPeriodDays, setFinancialPeriodDays] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReorderStatus>('all');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const asinPeriodDays = useMemo(() => {
    if (!asinStaleInfo?.displayedRange) return financialPeriodDays || 7;
    return differenceInCalendarDays(parseISO(asinStaleInfo.displayedRange.to), parseISO(asinStaleInfo.displayedRange.from)) + 1;
  }, [asinStaleInfo, financialPeriodDays]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(`inv_planner_${merchantToken}`, JSON.stringify(settings));
  }, [settings, merchantToken]);

  // Fetch all data sources
  useEffect(() => {
    if (!merchantToken) return;
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchStock(), fetchFinancial(), fetchAdProducts(), fetchSnapshot()]);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSnapshot = async () => {
      try {
        const { data, error } = await supabase.rpc('rpc_inventory_fba_snapshot' as any, {
          p_merchant_token: merchantToken,
          p_velocity_days: 30,
        });
        if (error) { setSnapshotRows([]); return; }
        setSnapshotRows((data as any[]) || []);
      } catch {
        setSnapshotRows([]);
      }
    };

    const fetchStock = async () => {
      // Get latest FBA inventory
      const { data: fbaData } = await supabase
        .from('fba_inventory_data')
        .select('asin, sku, product_name, fulfillable_quantity, price, record_date')
        .eq('account_name', merchantToken)
        .order('record_date', { ascending: false });

      // Get latest FBM listings
      const { data: fbmData } = await supabase
        .from('perplexity_all_listings_stockprice_data')
        .select('asin, seller_sku, item_name, quantity, price, record_date, status')
        .eq('account_name', merchantToken)
        .order('record_date', { ascending: false });

      // Deduplicate to latest date per SKU
      const fbaMap = new Map<string, any>();
      (fbaData || []).forEach(r => {
        const key = r.sku || r.asin;
        if (!fbaMap.has(key)) fbaMap.set(key, r);
      });

      const fbmMap = new Map<string, any>();
      (fbmData || []).forEach(r => {
        const key = r.seller_sku || r.asin;
        if (!fbmMap.has(key)) fbmMap.set(key, r);
      });

      setStockData([...Array.from(fbaMap.values()).map(r => ({ ...r, _source: 'fba' })),
                     ...Array.from(fbmMap.values()).map(r => ({ ...r, _source: 'fbm' }))]);
    };

    const fetchFinancial = async () => {
      // Get P&L data for units sold / revenue
      const { data: accData } = await supabase
        .from('accounts_master')
        .select('python_brand_name')
        .eq('account_name', accountName)
        .limit(1)
        .maybeSingle();

      const brand = accData?.python_brand_name || accountName;

      const { data: weekData } = await supabase
        .from('python_financial_raw' as any)
        .select('week_start')
        .eq('brand', brand)
        .order('week_start', { ascending: false })
        .limit(1);

      const rows = weekData as any[] | null;
      if (!rows || rows.length === 0) { setFinancialData([]); return; }

      const latestWeek = rows[0].week_start;
      setFinancialPeriodDays(7); // P&L is weekly

      const { data: finData } = await supabase
        .from('python_financial_raw' as any)
        .select('product_asin, sales_total_units_sold, sales_total_sales_revenue')
        .eq('brand', brand)
        .eq('week_start', latestWeek);

      setFinancialData((finData as any[]) || []);
    };

    const fetchAdProducts = async () => {
      // Get the profile_id or api_account_name
      const { data: accRow } = await supabase
        .from('accounts_master')
        .select('profile_id, api_account_name')
        .eq('account_name', accountName)
        .limit(1)
        .maybeSingle();

      if (!accRow) { setAdProductData([]); return; }

      const startDate = format(addDays(new Date(), -30), 'yyyy-MM-dd');

      if (accRow.profile_id) {
        const { data } = await supabase
          .from('amazon_api_advertised_product_performance')
          .select('advertised_asin, orders_7d')
          .eq('profile_id', accRow.profile_id)
          .gte('date', startDate);
        setAdProductData(data || []);
      } else if (accRow.api_account_name) {
        const { data } = await supabase
          .from('amazon_api_advertised_product_performance')
          .select('advertised_asin, orders_7d')
          .eq('account_name', accRow.api_account_name)
          .gte('date', startDate);
        setAdProductData(data || []);
      } else {
        setAdProductData([]);
      }
    };

    fetchAll();
  }, [merchantToken, accountName]);

  // Build planner rows
  const useSnapshot = snapshotRows.length > 0;

  const plannerRows = useMemo((): PlannerRow[] => {
    // Index ad product orders by ASIN (used in both paths)
    const adMap = new Map<string, number>();
    adProductData.forEach((r: any) => {
      if (!r.advertised_asin) return;
      adMap.set(r.advertised_asin, (adMap.get(r.advertised_asin) || 0) + Number(r.orders_7d || 0));
    });

    const { leadTime, bufferDays, reorderFrequency, maxStorage } = settings;
    const freqDays = FREQ_DAYS[reorderFrequency];
    const today = new Date();

    const buildRow = (params: {
      asin: string;
      sku: string;
      productName: string;
      fbaStock: number;
      fbmStock: number;
      price: number;
      unitsSold: number;
      salesRevenue: number;
      periodDays: number;
      source: 'fba' | 'fbm-only';
    }): PlannerRow => {
      const { asin, sku, productName, fbaStock, fbmStock, price, unitsSold, salesRevenue, periodDays, source } = params;
      const ppcOrders = adMap.get(asin) || 0;
      const avgDailySales = periodDays > 0 ? unitsSold / periodDays : 0;
      const currentStock = fbaStock;
      const daysRemaining = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : (currentStock > 0 ? null : 0);
      const stockoutDate = daysRemaining !== null && daysRemaining >= 0 ? addDays(today, daysRemaining) : null;

      const reorderPoint = Math.ceil((leadTime + bufferDays) * avgDailySales);
      let reorderQty = Math.max(0, Math.ceil((leadTime + bufferDays + freqDays) * avgDailySales) - currentStock);
      if (maxStorage && maxStorage > 0) {
        reorderQty = Math.min(reorderQty, Math.max(0, maxStorage - currentStock));
      }

      let status: ReorderStatus;
      if (daysRemaining === 0 || (daysRemaining !== null && daysRemaining <= 0)) {
        status = 'stockout';
      } else if (daysRemaining !== null && daysRemaining <= leadTime + bufferDays) {
        status = 'reorder-now';
      } else if (daysRemaining !== null && daysRemaining <= leadTime + bufferDays + freqDays) {
        status = 'reorder-soon';
      } else {
        status = 'healthy';
      }

      const revenueAtRisk = avgDailySales > 0 && daysRemaining !== null && daysRemaining < leadTime
        ? avgDailySales * price * Math.max(0, leadTime - daysRemaining)
        : 0;

      return {
        asin, sku, productName, fbaStock, fbmStock, price,
        unitsSold, salesRevenue, ppcOrders, periodDays,
        avgDailySales, daysRemaining, stockoutDate, reorderPoint, reorderQty,
        status, revenueAtRisk, source,
      };
    };

    const rows: PlannerRow[] = [];

    if (useSnapshot) {
      // Primary path: authoritative RPC data for FBA rows
      const seenAsins = new Set<string>();
      snapshotRows.forEach((r: any) => {
        const asin = r.asin || '';
        if (!asin || seenAsins.has(asin)) return;
        seenAsins.add(asin);
        const unitsSold = Number(r.units_recent || 0);
        const price = Number(r.price || 0);
        rows.push(buildRow({
          asin,
          sku: r.sku || '',
          productName: r.product_name || '',
          fbaStock: Number(r.fba_stock || 0),
          fbmStock: 0,
          price,
          unitsSold,
          salesRevenue: unitsSold * price,
          periodDays: 30,
          source: 'fba',
        }));
      });

      // FBM-only rows still come from stockData (FBM listings absent from FBA snapshot)
      const fbmMap = new Map<string, any>();
      stockData.forEach((r: any) => {
        if (r._source !== 'fbm') return;
        const asin = r.asin || '';
        if (!asin || seenAsins.has(asin)) return;
        const existing = fbmMap.get(asin);
        const qty = Number(r.quantity || 0);
        if (!existing || qty > Number(existing.quantity || 0)) fbmMap.set(asin, r);
      });
      fbmMap.forEach((r: any, asin: string) => {
        const fbmStock = Number(r.quantity || 0);
        if (fbmStock <= 0) return;
        rows.push(buildRow({
          asin,
          sku: r.seller_sku || '',
          productName: r.item_name || '',
          fbaStock: 0,
          fbmStock,
          price: Number(r.price || 0),
          unitsSold: 0,
          salesRevenue: 0,
          periodDays: 30,
          source: 'fbm-only',
        }));
      });

      return rows;
    }

    // Fallback path (unchanged behaviour): legacy financial + stockData + asinData
    const finMap = new Map<string, { units: number; revenue: number }>();
    financialData.forEach((r: any) => {
      if (!r.product_asin) return;
      const existing = finMap.get(r.product_asin) || { units: 0, revenue: 0 };
      existing.units += Number(r.sales_total_units_sold || 0);
      existing.revenue += Number(r.sales_total_sales_revenue || 0);
      finMap.set(r.product_asin, existing);
    });

    const asinVelocityMap = new Map<string, { units: number; revenue: number }>();
    asinData.forEach((row) => {
      if (!row.childAsin) return;
      asinVelocityMap.set(row.childAsin, {
        units: Number(row.unitsSold) || 0,
        revenue: Number(row.sales) || 0,
      });
    });

    const asinMap = new Map<string, { sku: string; productName: string; fbaStock: number; fbmStock: number; price: number; isFbmOnly: boolean }>();
    stockData.forEach((r: any) => {
      const asin = r.asin || '';
      if (!asin) return;
      const existing = asinMap.get(asin) || { sku: '', productName: '', fbaStock: 0, fbmStock: 0, price: 0, isFbmOnly: true };
      if (r._source === 'fba') {
        existing.fbaStock = Math.max(existing.fbaStock, Number(r.fulfillable_quantity || 0));
        existing.sku = existing.sku || r.sku || '';
        existing.productName = existing.productName || r.product_name || '';
        existing.price = existing.price || Number(r.price || 0);
        existing.isFbmOnly = false;
      } else {
        existing.fbmStock = Math.max(existing.fbmStock, Number(r.quantity || 0));
        existing.sku = existing.sku || r.seller_sku || '';
        existing.productName = existing.productName || r.item_name || '';
        existing.price = existing.price || Number(r.price || 0);
      }
      asinMap.set(asin, existing);
    });

    asinMap.forEach((inv, asin) => {
      const fin = finMap.get(asin);
      const asinVelocity = asinVelocityMap.get(asin);
      const unitsSold = fin?.units || asinVelocity?.units || 0;
      const salesRevenue = fin?.revenue || asinVelocity?.revenue || 0;
      const periodDays = fin ? (financialPeriodDays || 7) : asinPeriodDays;
      rows.push(buildRow({
        asin,
        sku: inv.sku,
        productName: inv.productName,
        fbaStock: inv.fbaStock,
        fbmStock: inv.fbmStock,
        price: inv.price,
        unitsSold,
        salesRevenue,
        periodDays,
        source: inv.isFbmOnly ? 'fbm-only' : 'fba',
      }));
    });

    return rows;
  }, [useSnapshot, snapshotRows, stockData, financialData, adProductData, financialPeriodDays, asinData, asinPeriodDays, settings]);

  // Separate FBA and FBM-only
  const fbaRows = useMemo(() => plannerRows.filter(r => r.source === 'fba'), [plannerRows]);
  const fbmOnlyRows = useMemo(() => plannerRows.filter(r => r.source === 'fbm-only'), [plannerRows]);

  // Identify dormant products: 0 FBA + 0 FBM + 0 or near-zero sales
  const dormantRows = useMemo((): DormantRow[] => {
    const NEAR_ZERO_THRESHOLD = 0.05; // daily avg below this = dormant
    return plannerRows
      .filter(r => r.fbaStock === 0 && r.fbmStock === 0 && r.avgDailySales < NEAR_ZERO_THRESHOLD)
      .map(r => ({
        asin: r.asin,
        sku: r.sku,
        productName: r.productName,
        price: r.price,
        lastSaleDate: null, // Would need historical query; null for now
        daysOutOfStock: null, // Could be derived from stockout_events if available
        historicalAvgDailySales: r.unitsSold > 0 ? r.avgDailySales : 0,
        dormantStatus: (r.unitsSold === 0 ? 'dormant' : 'out-of-stock') as DormantStatus,
        manualVelocity: null,
        restockQty: 0,
      }));
  }, [plannerRows]);

  // Manual velocity overrides for dormant products
  const [dormantOverrides, setDormantOverrides] = useState<Record<string, number>>({});

  const dormantWithRestock = useMemo(() => {
    const { leadTime, bufferDays, reorderFrequency } = settings;
    const freqDays = FREQ_DAYS[reorderFrequency];
    return dormantRows.map(r => {
      const velocity = dormantOverrides[r.asin] ?? r.historicalAvgDailySales;
      const restockQty = velocity > 0 ? Math.ceil((leadTime + bufferDays + freqDays) * velocity) : 0;
      return { ...r, manualVelocity: dormantOverrides[r.asin] ?? null, restockQty };
    });
  }, [dormantRows, dormantOverrides, settings]);

  // Filtered + sorted
  const filteredRows = useMemo(() => {
    let rows = fbaRows;
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.asin.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q));
    }

    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'status': cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
        case 'productName': cmp = (a.productName || a.sku).localeCompare(b.productName || b.sku); break;
        case 'asin': cmp = a.asin.localeCompare(b.asin); break;
        case 'fbaStock': cmp = a.fbaStock - b.fbaStock; break;
        case 'avgDailySales': cmp = a.avgDailySales - b.avgDailySales; break;
        case 'daysRemaining': cmp = (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999); break;
        case 'stockoutDate': cmp = (a.stockoutDate?.getTime() ?? Infinity) - (b.stockoutDate?.getTime() ?? Infinity); break;
        case 'reorderPoint': cmp = a.reorderPoint - b.reorderPoint; break;
        case 'reorderQty': cmp = a.reorderQty - b.reorderQty; break;
        case 'revenueAtRisk': cmp = a.revenueAtRisk - b.revenueAtRisk; break;
        case 'price': cmp = a.price - b.price; break;
      }
      // Secondary sort: if sorting by status, break ties by daysRemaining
      if (sortField === 'status' && cmp === 0) cmp = (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [fbaRows, statusFilter, search, sortField, sortDir]);

  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

  // KPI summaries
  const kpis = useMemo(() => {
    const needsReorder = fbaRows.filter(r => r.status === 'stockout' || r.status === 'reorder-now');
    const hasStockout = fbaRows.some(r => r.status === 'stockout');
    const totalInvestment = fbaRows.reduce((sum, r) => sum + r.reorderQty * r.price, 0);
    const totalRevAtRisk = fbaRows.reduce((sum, r) => sum + r.revenueAtRisk, 0);
    const activeFba = fbaRows.filter(r => r.avgDailySales > 0);
    const avgDaysStock = activeFba.length > 0 
      ? activeFba.reduce((sum, r) => sum + (r.daysRemaining ?? 0), 0) / activeFba.length 
      : 0;
    return { reorderCount: needsReorder.length, hasStockout, totalInvestment, totalRevAtRisk, avgDaysStock, dormantCount: dormantWithRestock.length };
  }, [fbaRows, dormantWithRestock]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'status' || field === 'daysRemaining' ? 'asc' : 'desc'); }
    setPage(0);
  };

  const updateSetting = <K extends keyof PlannerSettings>(key: K, value: PlannerSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const fmtCurrency = (v: number) => formatCurrencyByMerchantToken(v, merchantToken);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Status', 'Product Name', 'SKU', 'ASIN', 'FBA Stock', 'Avg Daily Sales', 'Days Remaining', 'Est Stockout Date', 'Restock Point', 'Suggested Restock Qty', 'Est Revenue at Risk (GBP)', 'Price', 'Order By Date'];
    const csvRows = filteredRows.map(r => [
      STATUS_CONFIG[r.status].label,
      `"${(r.productName || r.sku).replace(/"/g, '""')}"`,
      r.sku,
      r.asin,
      r.fbaStock,
      r.avgDailySales.toFixed(1),
      r.daysRemaining ?? 'N/A',
      r.stockoutDate ? format(r.stockoutDate, 'dd MMM yyyy') : 'N/A',
      r.reorderPoint,
      r.reorderQty,
      r.revenueAtRisk.toFixed(2),
      r.price.toFixed(2),
      r.stockoutDate ? format(addDays(r.stockoutDate, -settings.leadTime), 'dd MMM yyyy') : 'N/A',
    ]);
    const meta = `# Settings: Lead Time=${settings.leadTime}d, Buffer=${settings.bufferDays}d, Frequency=${settings.reorderFrequency}, Max Storage=${settings.maxStorage || 'unlimited'}`;
    const csv = meta + '\n' + headers.join(',') + '\n' + csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `restock-plan-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Restock plan exported');
  };

  // Copy reorder list
  const handleCopyReorder = () => {
    const reorderItems = filteredRows.filter(r => r.reorderQty > 0);
    if (reorderItems.length === 0) { toast.info('No items need reordering'); return; }
    const text = reorderItems.map(r => `${r.sku}\t${r.reorderQty}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${reorderItems.length} SKUs + quantities to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <section>
        <div className="flex justify-between items-start mb-1">
          <div>
            <h2 className="text-base md:text-xl font-semibold text-foreground">📦 Inventory Planner</h2>
            <p className="text-xs md:text-sm text-muted-foreground">FBA restock planning based on current sales velocity and stock levels</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border mt-3">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{useSnapshot
            ? 'Sales velocity from native daily ASIN sales (last 30 days). Stock from the latest FBA inventory snapshot.'
            : `Sales velocity based on P&L weekly data (${financialPeriodDays}-day period). Stock levels from latest FBA/FBM inventory sync. Ad orders from past 30 days.`}</span>
        </div>
        {asinStaleInfo?.isFallback && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border mt-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>ASIN data last updated: {format(parseISO(asinStaleInfo.latestAvailableDate), 'MMM dd, yyyy')}. Using latest available ASIN window for fallback sales velocity.</span>
          </div>
        )}
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className={kpis.hasStockout ? 'border-red-300' : ''}>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              ASINs Needing Restock
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className={`text-2xl md:text-3xl font-bold ${kpis.hasStockout ? 'text-red-600' : kpis.reorderCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {kpis.reorderCount}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">of {fbaRows.length} FBA ASINs</p>
          </CardContent>
        </Card>

        <Card className={kpis.dormantCount > 0 ? 'border-gray-300' : ''}>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Stocked Out / Dormant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className={`text-2xl md:text-3xl font-bold ${kpis.dormantCount > 0 ? 'text-muted-foreground' : 'text-green-600'}`}>
              {kpis.dormantCount}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">zero stock &amp; no recent sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Restock Investment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-2xl md:text-3xl font-bold">{fmtCurrency(kpis.totalInvestment)}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">at retail price</p>
          </CardContent>
        </Card>

        <Card className={kpis.totalRevAtRisk > 0 ? 'border-red-200' : ''}>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Est Revenue at Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className={`text-2xl md:text-3xl font-bold ${kpis.totalRevAtRisk > 0 ? 'text-red-600' : ''}`}>
              {fmtCurrency(kpis.totalRevAtRisk)}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">during lead time gap</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Avg Days of Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className={`text-2xl md:text-3xl font-bold ${
              kpis.avgDaysStock < 14 ? 'text-red-600' : kpis.avgDaysStock < 30 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {Math.round(kpis.avgDaysStock)}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">across active FBA ASINs</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      <CollapsibleSection title="Planner Settings" icon={<Settings className="h-4 w-4 text-muted-foreground" />} defaultOpen={false} storageKey="inv-planner-settings">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  Lead Time (days)
                  <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent><p className="text-xs max-w-48">Days from order placement to stock arrival at FBA</p></TooltipContent></Tooltip></TooltipProvider>
                </label>
                <Input type="number" min={1} max={120} value={settings.leadTime}
                  onChange={e => updateSetting('leadTime', Math.max(1, Math.min(120, parseInt(e.target.value) || 14)))}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  Buffer / Safety Days
                  <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent><p className="text-xs max-w-48">Extra safety stock days beyond lead time</p></TooltipContent></Tooltip></TooltipProvider>
                </label>
                <Input type="number" min={0} max={60} value={settings.bufferDays}
                  onChange={e => updateSetting('bufferDays', Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  Restock Frequency
                  <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent><p className="text-xs max-w-48">How often you place restock orders</p></TooltipContent></Tooltip></TooltipProvider>
                </label>
                <Select value={settings.reorderFrequency} onValueChange={v => updateSetting('reorderFrequency', v as ReorderFrequency)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  Max Storage Limit
                  <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                  <TooltipContent><p className="text-xs max-w-48">Max units per ASIN in FBA. Leave blank for unlimited.</p></TooltipContent></Tooltip></TooltipProvider>
                </label>
                <Input type="number" min={0} placeholder="Unlimited"
                  value={settings.maxStorage ?? ''}
                  onChange={e => updateSetting('maxStorage', e.target.value ? Math.max(0, parseInt(e.target.value)) : null)}
                  className="mt-1 h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleSection>

      {/* How Restock Quantities Are Calculated */}
      <CollapsibleSection
        title="How Restock Quantities Are Calculated"
        icon={<Info className="h-4 w-4 text-blue-500" />}
        defaultOpen={true}
        storageKey="inventory_planner_formula_info"
        className=""
      >
        <div className="rounded-lg border border-accent bg-accent/30 p-4 space-y-3 text-sm text-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="font-semibold">📊 Daily Velocity</p>
              <p className="text-muted-foreground">Average units sold per day over the selected date range.</p>
              <code className="text-xs bg-background/80 px-2 py-0.5 rounded border">Units Sold ÷ Period Days</code>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">📦 Days of Stock</p>
              <p className="text-muted-foreground">How many days your current FBA stock will last at current velocity.</p>
              <code className="text-xs bg-background/80 px-2 py-0.5 rounded border">Current FBA Stock ÷ Daily Velocity</code>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">🔢 Restock Qty</p>
              <p className="text-muted-foreground">How many units to send in to cover the full planning cycle.</p>
              <code className="text-xs bg-background/80 px-2 py-0.5 rounded border">(Lead Time + Buffer + Frequency) × Velocity − Current Stock</code>
            </div>
            <div className="space-y-1">
              <p className="font-semibold">🏷️ Status Labels</p>
              <div className="space-y-0.5 text-muted-foreground">
                <p>🔴 <strong>Restock Now</strong> — Days of stock &lt; Lead Time (you'll run out before new stock arrives)</p>
                <p>🟡 <strong>Restock Soon</strong> — Days of stock &lt; Lead Time + Buffer Days</p>
                <p>🟢 <strong>In Stock</strong> — Sufficient stock for the planning period</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1 border-t border-blue-200 dark:border-blue-900">
            💡 Adjust Lead Time, Buffer Days, and Restock Frequency in the <strong>Planner Settings</strong> panel above to fine-tune recommendations.
          </p>
        </div>
      </CollapsibleSection>

      {/* Restock Table */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-base md:text-lg font-semibold">Restock Table</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[160px] md:min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search ASIN, SKU, name..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9 h-9 text-sm" />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as any); setPage(0); }}>
                <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="stockout">🔴 Stockout</SelectItem>
                  <SelectItem value="reorder-now">🟠 Restock Now</SelectItem>
                  <SelectItem value="reorder-soon">🟡 Restock Soon</SelectItem>
                  <SelectItem value="healthy">🟢 Healthy</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Export Restock Plan</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyReorder} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Copy Restock List</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:px-6 md:pb-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="status" currentField={sortField} direction={sortDir} onSort={handleSort}>Status</SortableTableHead>
                  <SortableTableHead field="productName" currentField={sortField} direction={sortDir} onSort={handleSort}>Product</SortableTableHead>
                  <SortableTableHead field="asin" currentField={sortField} direction={sortDir} onSort={handleSort}>ASIN</SortableTableHead>
                  <SortableTableHead field="fbaStock" currentField={sortField} direction={sortDir} onSort={handleSort} className="text-right">FBA Stock</SortableTableHead>
                  <SortableTableHead field="avgDailySales" currentField={sortField} direction={sortDir} onSort={handleSort} className="text-right">Avg Daily Sales</SortableTableHead>
                  <SortableTableHead field="daysRemaining" currentField={sortField} direction={sortDir} onSort={handleSort} className="text-right">Days Left</SortableTableHead>
                  <SortableTableHead field="stockoutDate" currentField={sortField} direction={sortDir} onSort={handleSort}>Stockout Date</SortableTableHead>
                  <SortableTableHead field="reorderPoint" currentField={sortField} direction={sortDir} onSort={handleSort} className="text-right">Restock Pt</SortableTableHead>
                  <SortableTableHead field="reorderQty" currentField={sortField} direction={sortDir} onSort={handleSort} className="text-right">Restock Qty</SortableTableHead>
                  <SortableTableHead field="revenueAtRisk" currentField={sortField} direction={sortDir} onSort={handleSort} className="text-right">Rev at Risk</SortableTableHead>
                  <SortableTableHead field="price" currentField={sortField} direction={sortDir} onSort={handleSort} className="text-right">Price</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                      {fbaRows.length === 0 ? 'No FBA inventory data found' : 'No items match your filters'}
                    </TableCell>
                  </TableRow>
                ) : pagedRows.map(row => (
                  <TableRow key={row.asin}>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate text-sm font-medium" title={row.productName || row.sku}>
                        {row.productName || <span className="font-mono text-muted-foreground text-xs">{row.sku || row.asin}</span>}
                      </div>
                      {row.productName && row.sku && (
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{row.sku}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => openAmazonProduct(row.asin, merchantToken)}
                        className="text-xs font-mono text-blue-600 hover:underline flex items-center gap-1">
                        {row.asin}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.fbaStock.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {row.avgDailySales > 0 ? row.avgDailySales.toFixed(1) : <span className="text-muted-foreground text-xs">No sales data</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.daysRemaining !== null ? (
                        <span className={`font-medium ${row.daysRemaining <= 0 ? 'text-red-600' : row.daysRemaining <= 14 ? 'text-orange-600' : ''}`}>
                          {row.daysRemaining}
                        </span>
                      ) : <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.stockoutDate ? (
                        <span className={row.daysRemaining !== null && row.daysRemaining <= 14 ? 'text-red-600 font-medium' : ''}>
                          {format(row.stockoutDate, 'dd MMM yyyy')}
                        </span>
                      ) : <span className="text-muted-foreground">N/A</span>}
                    </TableCell>
                    <TableCell className="text-right">{row.reorderPoint}</TableCell>
                    <TableCell className="text-right font-medium">
                      {row.reorderQty > 0 ? row.reorderQty.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.revenueAtRisk > 0 ? (
                        <span className="text-red-600 font-medium">{fmtCurrency(row.revenueAtRisk)}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmtCurrency(row.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                {filteredRows.length} items · Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stocked Out / Dormant Products Section */}
      {dormantWithRestock.length > 0 && (
        <CollapsibleSection 
          title={`Stocked Out / Dormant Products (${dormantWithRestock.length})`} 
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} 
          defaultOpen={dormantWithRestock.length > 0} 
          storageKey="inv-planner-dormant"
        >
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3">
                Products with zero stock across FBA and FBM, and no recent sales activity. Use "Plan Restock" to set an expected daily sales velocity and generate a restock recommendation.
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>ASIN</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Historical Avg Daily Sales</TableHead>
                      <TableHead className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 ml-auto">
                              Expected Velocity
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs max-w-48">Enter your expected daily sales rate to generate a restock quantity recommendation</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead className="text-right">Restock Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dormantWithRestock.map(row => (
                      <TableRow key={row.asin}>
                        <TableCell>
                          {row.dormantStatus === 'out-of-stock' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-red-100 border-red-200 text-red-700">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-100 border-gray-200 text-gray-600">
                              <span className="w-2 h-2 rounded-full bg-gray-400" />
                              Dormant
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate text-sm font-medium" title={row.productName || row.sku}>
                            {row.productName || <span className="font-mono text-muted-foreground text-xs">{row.sku || row.asin}</span>}
                          </div>
                          {row.productName && row.sku && (
                            <div className="text-[10px] text-muted-foreground font-mono truncate">{row.sku}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <button onClick={() => openAmazonProduct(row.asin, merchantToken)}
                            className="text-xs font-mono text-blue-600 hover:underline flex items-center gap-1">
                            {row.asin}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </TableCell>
                        <TableCell className="text-right text-sm">{fmtCurrency(row.price)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {row.historicalAvgDailySales > 0 
                            ? row.historicalAvgDailySales.toFixed(1)
                            : <span className="text-muted-foreground text-xs">No data</span>
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            step={0.1}
                            placeholder="e.g. 2.0"
                            value={dormantOverrides[row.asin] ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              setDormantOverrides(prev => {
                                const next = { ...prev };
                                if (val === '' || val === undefined) {
                                  delete next[row.asin];
                                } else {
                                  next[row.asin] = Math.max(0, parseFloat(val) || 0);
                                }
                                return next;
                              });
                            }}
                            className="h-8 w-20 text-sm text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {row.restockQty > 0 ? (
                            <span className="text-primary">{row.restockQty.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </CollapsibleSection>
      )}

      {fbmOnlyRows.length > 0 && (
        <CollapsibleSection title={`FBM-Only Products (${fbmOnlyRows.length})`} icon={<Package className="h-4 w-4 text-muted-foreground" />} defaultOpen={false} storageKey="inv-planner-fbm">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3">These products are fulfilled by merchant and are excluded from the FBA reorder planner.</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>ASIN</TableHead>
                      <TableHead className="text-right">FBM Stock</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fbmOnlyRows.slice(0, 20).map(row => (
                      <TableRow key={row.asin}>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {row.productName || <span className="font-mono text-muted-foreground text-xs">{row.sku || row.asin}</span>}
                        </TableCell>
                        <TableCell>
                          <button onClick={() => openAmazonProduct(row.asin, merchantToken)}
                            className="text-xs font-mono text-blue-600 hover:underline">
                            {row.asin}
                          </button>
                        </TableCell>
                        <TableCell className="text-right">{row.fbmStock}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(row.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {fbmOnlyRows.length > 20 && <p className="text-xs text-muted-foreground text-center py-2">+ {fbmOnlyRows.length - 20} more</p>}
              </div>
            </CardContent>
          </Card>
        </CollapsibleSection>
      )}
    </div>
  );
}
