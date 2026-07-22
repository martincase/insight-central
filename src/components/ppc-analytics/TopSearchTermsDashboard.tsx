import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTopSearchTerms } from '@/hooks/useTopSearchTerms';
import { SearchTermFilters } from './SearchTermFilters';
import { SearchTermInsightCards } from './SearchTermInsightCards';
import { SearchTermsTable } from './SearchTermsTable';
import { ExportButton } from './ExportButton';
import type { SearchTermFilters as FilterType, SortField, SortDirection, SearchTermType } from '@/types/ppcAnalytics';

interface TopSearchTermsDashboardProps {
  sellerFilter?: string; // For client/shared views to filter by seller
}

export function TopSearchTermsDashboard({ sellerFilter }: TopSearchTermsDashboardProps) {
  const [filters, setFilters] = useState<FilterType>({
    sellers: [],
    minImpressions: 10,
    acosMin: null,
    acosMax: null,
    searchTermType: 'keywords',
    searchTerm: ''
  });
  const [sortField, setSortField] = useState<SortField>('total_sales');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const { data, totalCount, isLoading, error, sellers, refetch } = useTopSearchTerms({
    filters,
    sortField,
    sortDirection,
    page,
    pageSize,
    sellerFilter
  });

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0);
  }, [sortField]);

  const handleFiltersChange = useCallback((newFilters: FilterType) => {
    setFilters(newFilters);
    setPage(0);
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);
  const showingFrom = page * pageSize + 1;
  const showingTo = Math.min((page + 1) * pageSize, totalCount);

  return (
    <Card className="bg-card border-0 shadow-lg overflow-hidden">
      {/* Purple gradient header bar */}
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
      
      <CardHeader className="pb-4 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Top Performing Search Terms</CardTitle>
              <CardDescription className="text-muted-foreground">
                Past 30 days of Sponsored Product data
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ToggleGroup 
              type="single" 
              value={filters.searchTermType}
              onValueChange={(value) => {
                if (value) handleFiltersChange({ ...filters, searchTermType: value as SearchTermType });
              }}
              disabled={isLoading}
              size="sm"
            >
              <ToggleGroupItem value="all" aria-label="All terms" className="text-xs px-2 h-8">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="keywords" aria-label="Keywords only" className="text-xs px-2 h-8">
                Keywords
              </ToggleGroupItem>
              <ToggleGroupItem value="asins" aria-label="ASINs only" className="text-xs px-2 h-8">
                ASINs
              </ToggleGroupItem>
            </ToggleGroup>
            <ExportButton data={data} filename="top-search-terms" isLoading={isLoading} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters - Full for admin, minimal for focus/client view */}
        {!sellerFilter ? (
          <SearchTermFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            sellers={sellers}
            isLoading={isLoading}
          />
        ) : (
          <Input
            type="text"
            placeholder="Filter search terms..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleFiltersChange({ 
              ...filters, 
              searchTerm: e.target.value 
            })}
            disabled={isLoading}
            className="max-w-xs"
          />
        )}

        {/* Insight Cards */}
        <SearchTermInsightCards data={data} isLoading={isLoading} />

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Data Table */}
        <SearchTermsTable
          data={data}
          isLoading={isLoading}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-border flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Showing {showingFrom.toLocaleString()} – {showingTo.toLocaleString()} of {totalCount.toLocaleString()} search terms
              </p>
              <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
