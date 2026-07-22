import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Download } from 'lucide-react';
import { useSearchTermKeywordMap } from '@/hooks/useSearchTermKeywordMap';
import { MatchTypeComparisonCards } from './MatchTypeComparisonCards';
import { SearchTermKeywordMapFilters } from './SearchTermKeywordMapFilters';
import { SearchTermKeywordMapTable } from './SearchTermKeywordMapTable';
import { useToast } from '@/hooks/use-toast';
import type { MappingSortField } from '@/types/ppcAnalytics';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

interface SearchTermKeywordMapDashboardProps {
  sellerFilter: string;
  scope?: CountryScope;
}

export const SearchTermKeywordMapDashboard: React.FC<SearchTermKeywordMapDashboardProps> = ({
  sellerFilter,
  scope,
}) => {
  const { toast } = useToast();
  const {
    data,
    loading,
    totalCount,
    negativeCandidates,
    matchTypeSummaries,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filters,
    setFilters,
    viewMode,
    setViewMode,
    drillDownValue,
    setDrillDownValue,
  } = useSearchTermKeywordMap(sellerFilter);

  const handleSort = useCallback((field: MappingSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection, setSortField, setSortDirection]);

  const handleKeywordClick = useCallback((keyword: string) => {
    setViewMode('by-keyword');
    setDrillDownValue(keyword);
  }, [setViewMode, setDrillDownValue]);

  const handleSearchTermClick = useCallback((searchTerm: string) => {
    setViewMode('by-search-term');
    setDrillDownValue(searchTerm);
  }, [setViewMode, setDrillDownValue]);

  const handleResetDrillDown = useCallback(() => {
    setViewMode('all');
    setDrillDownValue(null);
  }, [setViewMode, setDrillDownValue]);

  const handleMatchTypeClick = useCallback((matchType: string) => {
    setFilters({
      ...filters,
      matchTypes: [matchType],
    });
  }, [filters, setFilters]);

  const handleExport = useCallback(() => {
    if (data.length === 0) return;

    const headers = [
      'Search Term',
      'Keyword',
      'Match Type',
      'Campaign',
      'Ad Group',
      'Impressions',
      'Clicks',
      'Spend',
      'Sales',
      'Orders',
      'CTR',
      'ACOS',
      'Negative Candidate'
    ];

    const rows = data.map(item => [
      item.customer_search_term,
      item.keyword_text,
      item.match_type,
      item.campaign_name,
      item.ad_group_name,
      item.total_impressions,
      item.total_clicks,
      item.total_spend.toFixed(2),
      item.total_sales.toFixed(2),
      item.total_orders,
      item.ctr.toFixed(2),
      item.acos.toFixed(2),
      item.is_negative_candidate ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-term-keyword-map-${sellerFilter.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: `${data.length} mappings exported to CSV`,
    });
  }, [data, sellerFilter, toast]);

  const availableMatchTypes = matchTypeSummaries.map(s => s.match_type);

  return (
    <Card className="bg-card border-0 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Search Term → Keyword Mapping
              </h2>
              <p className="text-sm text-white/80">
                Understand which keywords trigger which search terms
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={data.length === 0}
            className="bg-white/20 text-white hover:bg-white/30 border-0"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Match Type Comparison */}
        <MatchTypeComparisonCards
          summaries={matchTypeSummaries}
          onMatchTypeClick={handleMatchTypeClick}
        />

        {/* Filters */}
        <SearchTermKeywordMapFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableMatchTypes={availableMatchTypes}
        />

        {/* Data Table */}
        <SearchTermKeywordMapTable
          data={data}
          loading={loading}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          viewMode={viewMode}
          drillDownValue={drillDownValue}
          onKeywordClick={handleKeywordClick}
          onSearchTermClick={handleSearchTermClick}
          onResetDrillDown={handleResetDrillDown}
          scope={scope}
        />
      </CardContent>
    </Card>
  );
};
