
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, ChevronDown, ChevronUp, ArrowUpDown, AlertTriangle, Info, X } from 'lucide-react';
import type { ASINData, ASINDataFallbackInfo, DateFilter } from '@/types/dashboard';
import { formatCurrencyByMerchantToken } from '@/utils/formatters';
import { TrendIndicator } from './TrendIndicator';
import { getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
import { format, eachDayOfInterval, parseISO, subDays } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { getAmazonProductUrl } from '@/utils/amazonUtils';
import { useASINDetail } from '@/hooks/useASINDetail';
import { useProductLookup } from '@/hooks/useProductLookup';

interface ASINDataTableProps {
  asinData: ASINData[];
  isBlurred?: boolean;
  dateFilter: DateFilter;
  customDateRange?: { from: Date; to: Date };
  accountMerchantToken?: string;
  enableDetailModal?: boolean;
  enableInventoryLookup?: boolean;
  hideBuyBoxAndConversion?: boolean;
  missingDates?: string[];
  staleInfo?: ASINDataFallbackInfo | null;
}

type SortField = 'sales' | 'unitsSold' | 'shippedCogs' | 'shippedRevenue';
type SortDirection = 'asc' | 'desc';

export const ASINDataTable: React.FC<ASINDataTableProps> = ({ 
  asinData, 
  isBlurred = false, 
  dateFilter, 
  customDateRange, 
  accountMerchantToken,
  enableDetailModal = true,
  enableInventoryLookup = true,
  hideBuyBoxAndConversion = false,
  missingDates = [],
  staleInfo = null,
}) => {
  const [sortField, setSortField] = useState<SortField>('sales');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAll, setShowAll] = useState(false);
  const { openASINDetail } = useASINDetail();
  const [showComparison, setShowComparison] = useState(true);
  const [showGapWarning, setShowGapWarning] = useState(true);
  
  const merchantToken = accountMerchantToken || '';
  const { getProductName, loading: productLoading } = useProductLookup(merchantToken);
  const isVendorAccount = accountMerchantToken?.startsWith('amzn1.vg') || false;
  const staleUpdatedText = staleInfo ? format(parseISO(staleInfo.latestAvailableDate), 'MMM dd, yyyy') : null;
  const staleRangeText = staleInfo
    ? `${format(parseISO(staleInfo.displayedRange.from), 'MMM dd')} - ${format(parseISO(staleInfo.displayedRange.to), 'MMM dd')}`
    : null;

  // Pie chart data
  const pieChartData = React.useMemo(() => {
    if (asinData.length === 0) return [];
    
    const sortedByRevenue = [...asinData].sort((a, b) => b.sales - a.sales);
    const top5 = sortedByRevenue.slice(0, 5);
    const otherRevenue = sortedByRevenue.slice(5).reduce((sum, asin) => sum + asin.sales, 0);
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    const chartData = top5.map((asin, index) => ({
      name: asin.productTitle || getProductName(asin.childAsin, merchantToken),
      value: asin.sales,
      asin: asin.childAsin,
      color: colors[index],
      percentage: 0
    }));
    
    if (otherRevenue > 0) {
      chartData.push({ name: 'Other Products', value: otherRevenue, asin: 'other', color: colors[5], percentage: 0 });
    }
    
    const totalRevenue = chartData.reduce((sum, item) => sum + item.value, 0);
    chartData.forEach(item => { item.percentage = ((item.value / totalRevenue) * 100); });
    
    return chartData;
  }, [asinData, getProductName, merchantToken]);

  if (asinData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>ASIN Performance</CardTitle></CardHeader>
        <CardContent>
          {staleInfo?.isFallback && staleUpdatedText && staleRangeText && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-foreground/80">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-foreground">ASIN data last updated: {staleUpdatedText}.</span>{' '}
                Showing latest available data ({staleRangeText}).
              </div>
            </div>
          )}
          <p className="text-muted-foreground">No ASIN data available for this account and date range.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const sortedASINs = [...asinData].sort((a, b) => {
    const aValue = (a as any)[sortField] ?? 0;
    const bValue = (b as any)[sortField] ?? 0;
    return sortDirection === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
  });

  const displayedASINs = showAll ? sortedASINs : sortedASINs.slice(0, 10);

  const handleProductClick = (asin: string) => {
    if (!enableDetailModal) return;
    if (asin !== 'other') openASINDetail(asin, accountMerchantToken);
  };

  const getPeriodName = (df: DateFilter) => {
    switch (df) {
      case 'last-7-days': return 'Past 7 Days';
      case 'last-14-days': return 'Past 14 Days';
      case 'yesterday': return 'Yesterday';
      case 'this-week': return 'This Week';
      case 'last-week': return 'Last Week';
      case 'this-month': return 'This Month';
      case 'last-month': return 'Last Month';
      case 'past-30-days': return 'Past 30 Days';
      case 'this-year': return 'This Year';
      case 'custom': return 'Custom Range';
      default: return 'Current Period';
    }
  };

  const periodName = getPeriodName(dateFilter);
  let currentPeriodText = 'Current Period';
  let previousPeriodText = 'Previous Period';

  try {
    const isVendor = accountMerchantToken?.startsWith('amzn1.vg') || false;
    const currentDateRange = isVendor 
      ? getVendorDateRange(dateFilter, customDateRange) 
      : getCurrentDateRange(dateFilter, customDateRange);
    const previousDateRange = isVendor
      ? getVendorPreviousDateRange(dateFilter, customDateRange)
      : getPreviousDateRange(dateFilter, customDateRange);
    if (currentDateRange?.from && currentDateRange?.to) {
      currentPeriodText = `${format(currentDateRange.from, 'MMM dd')} - ${format(currentDateRange.to, 'MMM dd')}`;
    }
    if (previousDateRange?.from && previousDateRange?.to) {
      previousPeriodText = `${format(previousDateRange.from, 'MMM dd')} - ${format(previousDateRange.to, 'MMM dd')}`;
    }
  } catch (error) {
    console.error('Date formatting error in ASINDataTable:', error);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>ASIN Performance ({sortedASINs.length} Products)</CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground text-center">
              <div className="font-medium">{periodName}</div>
              <div><strong>{currentPeriodText}</strong> vs {previousPeriodText}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)} className="text-xs">
              {showComparison ? 'Hide' : 'Show'} Comparison
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {staleInfo?.isFallback && staleUpdatedText && staleRangeText && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-foreground/80">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-foreground">ASIN data last updated: {staleUpdatedText}.</span>{' '}
              Showing latest available data ({staleRangeText}).
            </div>
          </div>
        )}

        {/* Data gap warning */}
        {missingDates.length > 0 && showGapWarning && !staleInfo?.isFallback && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
            <div className="flex-1 text-orange-800 dark:text-orange-300">
              <span className="font-medium">Warning:</span> Data missing for {missingDates.join(', ')} ({missingDates.length} day{missingDates.length !== 1 ? 's' : ''} within selected range)
            </div>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-orange-500 hover:text-orange-700" onClick={() => setShowGapWarning(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">ASIN</TableHead>
                <TableHead className="min-w-[200px] max-w-[400px]">Product Name</TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('sales')}>
                  <div className="flex items-center justify-end gap-1">Sales{getSortIcon('sales')}</div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('unitsSold')}>
                  <div className="flex items-center justify-end gap-1">Units Sold{getSortIcon('unitsSold')}</div>
                </TableHead>
                {isVendorAccount && (
                  <>
                    <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('shippedCogs')}>
                      <div className="flex items-center justify-end gap-1">Shipped COGS{getSortIcon('shippedCogs')}</div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('shippedRevenue')}>
                      <div className="flex items-center justify-end gap-1">Shipped Revenue{getSortIcon('shippedRevenue')}</div>
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedASINs.map((asin, index) => (
                <TableRow key={`${asin.childAsin}-${index}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span 
                        className={`cursor-pointer hover:text-primary hover:underline ${isBlurred ? 'blur-sm' : ''}`}
                        onClick={() => handleProductClick(asin.childAsin)}
                        title="Click to view detailed ASIN analytics"
                      >
                        {asin.childAsin}
                      </span>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => window.open(getAmazonProductUrl(asin.childAsin, accountMerchantToken), '_blank')}
                        className="h-6 w-6 p-0" title="View on Amazon"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className={`${isBlurred ? 'blur-sm' : ''} min-w-[200px] max-w-[400px]`}>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="truncate cursor-help">
                            {asin.productTitle || getProductName(asin.childAsin, merchantToken)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
                          <p className="text-sm">{asin.productTitle || getProductName(asin.childAsin, merchantToken)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  {/* Sales */}
                  <TableCell className="text-right font-medium">
                    <div className="flex items-center justify-end gap-2 min-h-[20px]">
                      <span>{formatCurrencyByMerchantToken(asin.sales ?? 0, accountMerchantToken || '')}</span>
                      <div className="w-[60px] flex justify-center">
                        {showComparison && <TrendIndicator currentValue={asin.sales} previousValue={asin.previousPeriod?.sales || 0} />}
                      </div>
                    </div>
                  </TableCell>
                  {/* Units Sold */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 min-h-[20px]">
                      <span>{(asin.unitsSold ?? 0).toLocaleString()}</span>
                      <div className="w-[60px] flex justify-center">
                        {showComparison && <TrendIndicator currentValue={asin.unitsSold} previousValue={asin.previousPeriod?.unitsSold || 0} />}
                      </div>
                    </div>
                  </TableCell>
                  {/* Vendor-only columns */}
                  {isVendorAccount && (
                    <>
                      <TableCell className="text-right font-medium">
                        <div className="flex items-center justify-end gap-2 min-h-[20px]">
                          <span>{formatCurrencyByMerchantToken(asin.shippedCogs ?? 0, accountMerchantToken || '')}</span>
                          <div className="w-[60px] flex justify-center">
                            {showComparison && <TrendIndicator currentValue={asin.shippedCogs ?? 0} previousValue={asin.previousPeriod?.shippedCogs || 0} />}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <div className="flex items-center justify-end gap-2 min-h-[20px]">
                          <span>{formatCurrencyByMerchantToken(asin.shippedRevenue ?? 0, accountMerchantToken || '')}</span>
                          <div className="w-[60px] flex justify-center">
                            {showComparison && <TrendIndicator currentValue={asin.shippedRevenue ?? 0} previousValue={asin.previousPeriod?.shippedRevenue || 0} />}
                          </div>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Expand/Collapse Button */}
        {sortedASINs.length > 10 && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setShowAll(!showAll)} className="flex items-center gap-2">
              {showAll ? (<>Show Top 10<ChevronUp className="h-4 w-4" /></>) : (<>Show All {sortedASINs.length} Products<ChevronDown className="h-4 w-4" /></>)}
            </Button>
          </div>
        )}
        
        {/* Revenue Distribution Chart */}
        {pieChartData.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Revenue Distribution by Product</h3>
                <div className="h-96 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={150} paddingAngle={2} dataKey="value"
                        onClick={(data) => { if (data && data.asin) handleProductClick(data.asin); }}
                        style={{ cursor: 'pointer' }}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2}
                            style={{ cursor: entry.asin !== 'other' ? 'pointer' : 'default' }} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-sm truncate max-w-[200px]">{data.name}</p>
                              <p className="text-sm text-muted-foreground">{data.asin}</p>
                              <p className="font-bold text-sm mt-1">
                                {formatCurrencyByMerchantToken(data.value, accountMerchantToken || '')} ({data.percentage.toFixed(1)}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Top Products</h3>
                <div className="space-y-3">
                  {pieChartData.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.asin !== 'other' ? item.asin : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">
                          {formatCurrencyByMerchantToken(item.value, accountMerchantToken || '')}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Get vendor-adjusted current date range (offset by 3 days)
 */
function getVendorDateRange(dateFilter: DateFilter, customDateRange?: { from: Date; to: Date }) {
  const range = getCurrentDateRange(dateFilter, customDateRange);
  return {
    from: subDays(range.from, 3),
    to: subDays(range.to, 3),
  };
}

/**
 * Get vendor-adjusted previous date range (offset by 3 days)
 */
function getVendorPreviousDateRange(dateFilter: DateFilter, customDateRange?: { from: Date; to: Date }) {
  const range = getPreviousDateRange(dateFilter, customDateRange);
  return {
    from: subDays(range.from, 3),
    to: subDays(range.to, 3),
  };
}
