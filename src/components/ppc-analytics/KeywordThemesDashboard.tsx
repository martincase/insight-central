import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight, Tags } from 'lucide-react';
import { useKeywordThemes } from '@/hooks/useKeywordThemes';
import { KeywordCloud } from './KeywordCloud';
import { MatchTypePieChart } from './MatchTypePieChart';
import { KeywordThemesTable } from './KeywordThemesTable';
import { KeywordThemeFilters } from './KeywordThemeFilters';
import type { KeywordThemeFilters as Filters, KeywordSortField, SortDirection } from '@/types/ppcAnalytics';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

interface KeywordThemesDashboardProps {
  sellerFilter?: string;
  scope?: CountryScope;
}

const PAGE_SIZE = 25;

export function KeywordThemesDashboard({ sellerFilter, scope }: KeywordThemesDashboardProps) {
  const [filters, setFilters] = useState<Filters>({
    sellers: [],
    matchTypes: [],
    minImpressions: 10,
    acosMin: null,
    acosMax: null,
    searchTerm: ''
  });
  const [sortField, setSortField] = useState<KeywordSortField>('total_sales');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);

  const { data, totalCount, isLoading, error, matchTypes, matchTypeTotals, refetch } = useKeywordThemes({
    filters,
    sortField,
    sortDirection,
    page,
    pageSize: PAGE_SIZE,
    sellerFilter
  });

  const handleSort = useCallback((field: KeywordSortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0);
  }, [sortField]);

  const handleFiltersChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setPage(0);
  }, []);

  const handleKeywordClick = useCallback((keyword: string) => {
    setFilters(prev => ({ ...prev, searchTerm: keyword }));
    setPage(0);
  }, []);

  const handleExport = useCallback(() => {
    if (data.length === 0) return;

    const headers = ['Keyword', 'Match Type', 'Campaigns', 'Impressions', 'Clicks', 'CTR %', 'Spend', 'Sales', 'Orders', 'ACOS %'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        `"${row.keyword_text.replace(/"/g, '""')}"`,
        row.match_type,
        row.campaign_count,
        row.total_impressions,
        row.total_clicks,
        row.ctr.toFixed(2),
        row.total_spend.toFixed(2),
        row.total_sales.toFixed(2),
        row.total_orders,
        row.acos.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `keyword-themes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [data]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showingFrom = page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, totalCount);

  return (
    <Card className="bg-card border-0 shadow-lg overflow-hidden">
      {/* Purple gradient header bar */}
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
      
      <CardHeader className="pb-4 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <Tags className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Keyword Theme Analysis</CardTitle>
              <CardDescription className="text-muted-foreground">
                Past 30 days of Sponsored Product keyword data
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0 || isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters */}
        <KeywordThemeFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          matchTypes={matchTypes}
        />

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Visualizations Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Keyword Cloud */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Keyword Cloud</CardTitle>
              <CardDescription className="text-xs">Size = Sales Volume, Color = ACOS (Green = Low, Red = High)</CardDescription>
            </CardHeader>
            <CardContent>
              <KeywordCloud data={data} onKeywordClick={handleKeywordClick} maxKeywords={40} />
            </CardContent>
          </Card>

          {/* Match Type Breakdown - using aggregated totals */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Match Type Distribution</CardTitle>
              <CardDescription className="text-xs">Sales breakdown by match type</CardDescription>
            </CardHeader>
            <CardContent>
              <MatchTypePieChart matchTypeTotals={matchTypeTotals} metric="sales" />
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div>
          <KeywordThemesTable
            data={data}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            isLoading={isLoading}
            scope={scope}
          />
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {showingFrom.toLocaleString()} - {showingTo.toLocaleString()} of {totalCount.toLocaleString()} keywords
            </p>
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
