import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { SearchTermData, SortField, SortDirection } from '@/types/ppcAnalytics';

interface SearchTermsTableProps {
  data: SearchTermData[];
  isLoading?: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export function SearchTermsTable({ 
  data, 
  isLoading, 
  sortField, 
  sortDirection, 
  onSort 
}: SearchTermsTableProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

  const formatNumber = (value: number) => 
    new Intl.NumberFormat('en-GB').format(value);

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  // Calculate ACOS as Spend / Sales * 100
  const calculateAcos = (spend: number, sales: number) => {
    if (sales <= 0) return Infinity;
    return (spend / sales) * 100;
  };

  const isValueInvalid = (val: number) => val == null || !Number.isFinite(val);

  // Calculate Conversion Rate as Orders / Clicks * 100
  const calculateConversionRate = (orders: number, clicks: number) => {
    if (clicks <= 0) return 0;
    return (orders / clicks) * 100;
  };

  // Generate Amazon UK search URL
  const getAmazonSearchUrl = (searchTerm: string) => {
    const encodedTerm = encodeURIComponent(searchTerm).replace(/%20/g, '+');
    return `https://www.amazon.co.uk/s?k=${encodedTerm}`;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 -ml-3 font-semibold text-foreground hover:bg-muted/50"
        onClick={() => onSort(field)}
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="ml-1 h-4 w-4 text-primary" />
          ) : (
            <ArrowDown className="ml-1 h-4 w-4 text-primary" />
          )
        ) : (
          <ArrowUpDown className="ml-1 h-4 w-4 opacity-40" />
        )}
      </Button>
    );
  };

  // Color helpers
  const getAcosColor = (acos: number) => {
    if (acos > 30) return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400';
    if (acos < 15) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
  };

  const getRoasColor = (roas: number) => {
    if (roas >= 3) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
    if (roas < 1) return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400';
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400';
  };

  if (isLoading) {
    return (
      <div className="border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <TableHead>Search Term</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
              <TableHead className="text-right">ACOS</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(10)].map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                {[...Array(10)].map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border rounded-xl p-8 text-center bg-muted/20">
        <p className="text-muted-foreground">No search terms found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b-2">
              <TableHead className="min-w-[200px]">
                <SortableHeader field="customer_search_term">Search Term</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="total_impressions">Impressions</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="total_clicks">Clicks</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="ctr">CTR</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="total_spend">Spend</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="total_sales">Sales</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="total_orders">Orders</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
              <TableHead className="text-right">
                <SortableHeader field="acos">ACOS</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="roas">ROAS</SortableHeader>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => {
              const calculatedAcos = calculateAcos(row.total_spend, row.total_sales);
              const conversionRate = calculateConversionRate(row.total_orders, row.total_clicks);
              return (
                <TableRow 
                  key={`${row.customer_search_term}-${row.sellername}-${index}`} 
                  className={`hover:bg-muted/40 transition-colors ${index % 2 === 0 ? 'bg-muted/10' : ''}`}
                >
                  <TableCell className="font-medium max-w-[300px]" title={row.customer_search_term}>
                    <a 
                      href={getAmazonSearchUrl(row.customer_search_term)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate block"
                    >
                      {row.customer_search_term}
                    </a>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.total_impressions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.total_clicks)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md tabular-nums bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 text-sm font-medium">
                      {formatPercentage(row.ctr)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md tabular-nums bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 text-sm font-medium">
                      {formatCurrency(row.total_spend)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md tabular-nums bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-sm font-semibold">
                      {formatCurrency(row.total_sales)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatNumber(row.total_orders)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md tabular-nums bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 text-sm font-medium">
                      {formatPercentage(conversionRate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {isValueInvalid(calculatedAcos) ? (
                      <span className="inline-block px-2 py-0.5 rounded-md tabular-nums text-sm font-medium text-muted-foreground">N/A</span>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded-md tabular-nums text-sm font-medium ${getAcosColor(calculatedAcos)}`}>
                        {formatPercentage(calculatedAcos)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isValueInvalid(row.roas) ? (
                      <span className="inline-block px-2 py-0.5 rounded-md tabular-nums text-sm font-medium text-muted-foreground">N/A</span>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded-md tabular-nums text-sm font-semibold ${getRoasColor(row.roas)}`}>
                        {row.roas.toFixed(2)}x
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
