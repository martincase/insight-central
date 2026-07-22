import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrencyByMerchantToken, formatPercentage } from '@/utils/formatters';
import { Loader2, ChevronDown, Database } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TopProductsMiniTableProps {
  accountName: string;
  merchantToken: string;
}

const PAGE_SIZE = 5;

export const TopProductsMiniTable = ({ accountName, merchantToken }: TopProductsMiniTableProps) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: products, isLoading } = useQuery({
    queryKey: ['top-products-mini', accountName],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: accountMapping } = await supabase
        .from('accounts_master')
        .select('profile_id, api_account_name')
        .eq('merchant_token', merchantToken)
        .limit(1)
        .maybeSingle();
      
      let query = supabase
        .from('amazon_api_advertised_product_performance')
        .select('advertised_asin, spend, sales_7d, clicks, impressions, orders_7d')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .not('advertised_asin', 'is', null);

      if (accountMapping?.profile_id) {
        query = query.eq('profile_id', accountMapping.profile_id);
      } else if (accountMapping?.api_account_name) {
        query = query.eq('account_name', accountMapping.api_account_name);
      } else {
        query = query.eq('account_name', accountName);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data?.length) return [];

      const asinMap = new Map<string, { asin: string; sales: number; spend: number; orders: number }>();
      data.forEach(row => {
        const asin = row.advertised_asin!;
        const existing = asinMap.get(asin) || { asin, sales: 0, spend: 0, orders: 0 };
        existing.sales += Number(row.sales_7d) || 0;
        existing.spend += Number(row.spend) || 0;
        existing.orders += Number(row.orders_7d) || 0;
        asinMap.set(asin, existing);
      });

      const sorted = Array.from(asinMap.values())
        .sort((a, b) => b.sales - a.sales);

      const asins = sorted.map(p => p.asin);
      const { data: invData } = await supabase
        .from('daily_inventory_data')
        .select('asin, product_name')
        .in('asin', asins);

      const nameMap = new Map<string, string>();
      invData?.forEach(r => { if (r.asin && r.product_name) nameMap.set(r.asin, r.product_name); });

      return sorted.map(p => ({
        ...p,
        title: nameMap.get(p.asin) || p.asin,
        acos: p.sales > 0 ? (p.spend / p.sales) * 100 : 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
    data: products ?? [],
    defaultSortField: 'sales' as any,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading top products...
      </div>
    );
  }

  if (!sortedData?.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No top product rows are available from the current Ad Products source for this account.
      </div>
    );
  }

  const displayedProducts = sortedData.slice(0, visibleCount);
  const hasMore = visibleCount < sortedData.length;
  const totalCount = sortedData.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <div className="w-1 h-6 bg-amber-500 rounded-full mr-3"></div>
          Top Products
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({displayedProducts.length} of {totalCount})
          </span>
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                <Database className="h-3.5 w-3.5" />
                <span>PPC Ad Products · Last 30 days</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              <p className="font-medium mb-1">Data source:</p>
              <p><strong>Table:</strong> amazon_api_advertised_product_performance</p>
              <p><strong>Period:</strong> Last 30 days</p>
              <p><strong>Grouped by:</strong> advertised_asin</p>
              <p><strong>Sorted by:</strong> Total PPC sales (desc)</p>
              <p className="mt-1 text-muted-foreground">Product names from daily_inventory_data</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="asin" currentField={sortField} direction={sortDirection} onSort={handleSort} className="w-24">ASIN</SortableTableHead>
              <SortableTableHead field="title" currentField={sortField} direction={sortDirection} onSort={handleSort}>Product</SortableTableHead>
              <SortableTableHead field="sales" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">PPC Sales</SortableTableHead>
              <SortableTableHead field="orders" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">PPC Orders</SortableTableHead>
              <SortableTableHead field="spend" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">PPC Spend</SortableTableHead>
              <SortableTableHead field="acos" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">ACOS</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedProducts.map(p => (
              <TableRow key={p.asin}>
                <TableCell>
                  <a
                    href={`https://www.amazon.co.uk/dp/${p.asin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs font-mono"
                  >
                    {p.asin}
                  </a>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm" title={p.title}>
                  {p.title}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatCurrencyByMerchantToken(p.sales, merchantToken)}
                </TableCell>
                <TableCell className="text-right text-sm">{p.orders}</TableCell>
                <TableCell className="text-right text-sm">
                  {formatCurrencyByMerchantToken(p.spend, merchantToken)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {p.sales > 0 ? formatPercentage(p.acos) : <span className="text-muted-foreground">N/A</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {hasMore && (
        <div className="flex justify-center mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalCount))}
            className="gap-1.5"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Load More ({Math.min(PAGE_SIZE, totalCount - visibleCount)} more)
          </Button>
        </div>
      )}
    </div>
  );
};
