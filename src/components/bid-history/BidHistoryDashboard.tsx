import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBidHistory } from '@/hooks/useBidHistory';
import { BidChangeSummaryCards } from './BidChangeSummaryCards';
import { BidTimelineChart } from './BidTimelineChart';
import { BidChangesTable } from './BidChangesTable';
import { BidHistoryFilters } from './BidHistoryFilters';
import { BidImpactDashboard } from './BidImpactDashboard';
import { BidHistorySortField } from '@/types/bidHistory';

interface BidHistoryDashboardProps {
  sellerFilter?: string;
}

export const BidHistoryDashboard = ({ sellerFilter }: BidHistoryDashboardProps) => {
  const {
    bidChanges,
    allBidChanges,
    loading,
    error,
    sellers,
    filters,
    setFilters,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    page,
    setPage,
    totalPages,
    summary,
    timelineData,
    selectedKeywords,
    toggleKeywordSelection,
    clearSelectedKeywords,
  } = useBidHistory(sellerFilter);

  const handleSort = (field: BidHistorySortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Keyword', 'Seller', 'Previous CPC', 'Current CPC', 'Change', 'Change %'];
    const rows = allBidChanges.map(row => [
      row.snapshot_date,
      row.keyword_text,
      row.sellername,
      row.previous_bid.toFixed(2),
      row.new_bid.toFixed(2),
      row.bid_change.toFixed(2),
      row.bid_change_pct.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bid-changes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <p>Error loading bid history: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">CPC & Cost Trends</CardTitle>
            <CardDescription>
              Track daily CPC changes and their impact on performance
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
              Tracking actual CPC paid. Keyword bid tracking will be added once regular bid history data is available.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="timeline">Bid Timeline (CPC)</TabsTrigger>
            <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            <BidHistoryFilters
              filters={filters}
              onFiltersChange={setFilters}
              sellers={sellers}
              loading={loading}
            />

            <BidChangeSummaryCards summary={summary} loading={loading} />

            <BidTimelineChart
              timelineData={timelineData}
              onClearSelection={clearSelectedKeywords}
            />

            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Click any row to add the keyword to the timeline chart (max 5)
              </p>
              <BidChangesTable
                data={bidChanges}
                selectedKeywords={selectedKeywords}
                onRowClick={toggleKeywordSelection}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                loading={loading}
              />
            </div>
          </TabsContent>

          <TabsContent value="impact">
            <BidImpactDashboard sellerFilter={sellerFilter || filters.sellers[0]} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};