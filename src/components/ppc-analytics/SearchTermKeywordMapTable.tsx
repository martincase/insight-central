import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ArrowUpDown, AlertTriangle } from 'lucide-react';
import type { 
  SearchTermKeywordMapData, 
  MappingSortField, 
  SortDirection,
  MappingViewMode 
} from '@/types/ppcAnalytics';
import { getMatchTypeLabel } from '@/utils/matchTypeUtils';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

interface SearchTermKeywordMapTableProps {
  data: SearchTermKeywordMapData[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sortField: MappingSortField;
  sortDirection: SortDirection;
  onSort: (field: MappingSortField) => void;
  viewMode: MappingViewMode;
  drillDownValue: string | null;
  onKeywordClick: (keyword: string) => void;
  onSearchTermClick: (searchTerm: string) => void;
  onResetDrillDown: () => void;
  scope?: CountryScope;
}

export const SearchTermKeywordMapTable: React.FC<SearchTermKeywordMapTableProps> = ({
  data,
  loading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDirection,
  onSort,
  viewMode,
  drillDownValue,
  onKeywordClick,
  onSearchTermClick,
  onResetDrillDown,
  scope,
}) => {
  const cur = getCurrencyInfo(scope);
  const fmtMoney = (v: number) => `${cur.symbol}${new Intl.NumberFormat(cur.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;
  const totalPages = Math.ceil(totalCount / pageSize);

  const SortableHeader = ({ field, children }: { field: MappingSortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb / Drill-down indicator */}
      {viewMode !== 'all' && drillDownValue && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Button variant="ghost" size="sm" onClick={onResetDrillDown}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            All Mappings
          </Button>
          <span className="text-muted-foreground">/</span>
          <Badge variant="secondary">
            {viewMode === 'by-keyword' ? 'Keyword' : 'Search Term'}: "{drillDownValue}"
          </Badge>
          <span className="text-sm text-muted-foreground ml-2">
            ({totalCount} {viewMode === 'by-keyword' ? 'search terms' : 'keywords'})
          </span>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortableHeader field="customer_search_term">Search Term</SortableHeader>
              <SortableHeader field="keyword_text">Keyword</SortableHeader>
              <SortableHeader field="match_type">Match</SortableHeader>
              <TableHead>Campaign</TableHead>
              <SortableHeader field="total_spend">Spend</SortableHeader>
              <SortableHeader field="total_sales">Sales</SortableHeader>
              <SortableHeader field="acos">ACOS</SortableHeader>
              <SortableHeader field="total_clicks">Clicks</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No mappings found
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow 
                  key={index}
                  className={row.is_negative_candidate ? 'bg-destructive/5' : ''}
                >
                  <TableCell className="max-w-[200px]">
                    <div className="flex items-center gap-2">
                      {row.is_negative_candidate && (
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                      <button
                        onClick={() => onSearchTermClick(row.customer_search_term)}
                        className="text-sm font-medium hover:text-primary truncate text-left"
                        title={row.customer_search_term}
                      >
                        {row.customer_search_term}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => onKeywordClick(row.keyword_text)}
                      className="text-sm hover:text-primary truncate max-w-[160px] block text-left"
                      title={row.keyword_text}
                    >
                      {row.keyword_text}
                    </button>
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
                  <TableCell className="max-w-[180px]">
                    <div className="text-xs text-muted-foreground truncate" title={row.campaign_name}>
                      {row.campaign_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {fmtMoney(row.total_spend)}
                  </TableCell>
                  <TableCell className={row.total_sales === 0 ? 'text-destructive' : ''}>
                    {fmtMoney(row.total_sales)}
                  </TableCell>
                  <TableCell>
                    <span className={
                      (!Number.isFinite(row.acos) || (row.acos === 0 && row.total_spend > 0)) ? 'text-muted-foreground' :
                      row.acos > 50 ? 'text-destructive' :
                      row.acos > 30 ? 'text-amber-500' :
                      'text-emerald-500'
                    }>
                      {(!Number.isFinite(row.acos) || (row.total_spend > 0 && row.total_sales === 0)) ? 'N/A' : row.acos > 0 ? `${row.acos.toFixed(1)}%` : '-'}
                    </span>
                  </TableCell>
                  <TableCell>{row.total_clicks}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} – {Math.min(page * pageSize, totalCount)} of {totalCount}
            </span>
            {onPageSizeChange && (
              <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
