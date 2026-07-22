import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { KeywordThemeData, KeywordSortField, SortDirection } from '@/types/ppcAnalytics';
import { getMatchTypeLabel } from '@/utils/matchTypeUtils';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

interface KeywordThemesTableProps {
  data: KeywordThemeData[];
  sortField: KeywordSortField;
  sortDirection: SortDirection;
  onSort: (field: KeywordSortField) => void;
  isLoading?: boolean;
  scope?: CountryScope;
}

export function KeywordThemesTable({
  data,
  sortField,
  sortDirection,
  onSort,
  isLoading,
  scope,
}: KeywordThemesTableProps) {
  const cur = getCurrencyInfo(scope);
  const formatCurrency = (value: number) => `${cur.symbol}${new Intl.NumberFormat(cur.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  const SortButton = ({ field, children }: { field: KeywordSortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => onSort(field)}
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </Button>
    );
  };

  const getAcosColor = (acos: number) => {
    if (acos < 20) return 'text-green-600 dark:text-green-400';
    if (acos < 30) return 'text-yellow-600 dark:text-yellow-400';
    if (acos < 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Use shared match type utility - imported at top

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading keyword data...
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <SortButton field="keyword_text">Keyword</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="match_type">Match Type</SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="total_impressions">Impressions</SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="total_clicks">Clicks</SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="ctr">CTR</SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="total_spend">Spend</SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="total_sales">Sales</SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="acos">ACOS</SortButton>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No keywords found
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={`${row.keyword_text}-${row.match_type}-${index}`}>
                <TableCell className="font-medium max-w-[250px] truncate" title={row.keyword_text}>
                  {row.keyword_text}
                </TableCell>
                <TableCell>
                  {(() => {
                    const mt = getMatchTypeLabel(row.match_type);
                    return (
                      <span className={`inline-block whitespace-nowrap text-[10px] px-2 py-0.5 rounded-full font-medium border ${mt.color}`}>
                        {mt.label}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-right">{formatNumber(row.total_impressions)}</TableCell>
                <TableCell className="text-right">{formatNumber(row.total_clicks)}</TableCell>
                <TableCell className="text-right">{formatPercent(row.ctr)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.total_spend)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(row.total_sales)}</TableCell>
                <TableCell className={`text-right font-medium ${getAcosColor(row.acos)}`}>
                  {formatPercent(row.acos)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
