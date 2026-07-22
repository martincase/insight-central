import { useBidImpact } from '@/hooks/useBidImpact';
import { BidImpactSummaryCards } from './BidImpactSummaryCards';
import { BidImpactTable } from './BidImpactTable';
import { BidImpactScatterChart } from './BidImpactScatterChart';
import { BidChangeHeatmapCalendar } from './BidChangeHeatmapCalendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface BidImpactDashboardProps {
  sellerFilter?: string;
}

export const BidImpactDashboard = ({ sellerFilter }: BidImpactDashboardProps) => {
  const {
    impactData,
    loading,
    error,
    sellers,
    filters,
    setFilters,
    summary,
    calendarData,
    scatterData,
    limit,
    setLimit,
    daysBack,
    setDaysBack,
  } = useBidImpact(sellerFilter);

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading impact data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        {!sellerFilter && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Seller</Label>
            <Select
              value={filters.seller}
              onValueChange={(value) => setFilters(prev => ({ ...prev, seller: value }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select seller" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map(seller => (
                  <SelectItem key={seller} value={seller}>{seller}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Analysis Status</Label>
          <Select
            value={filters.analysisStatus}
            onValueChange={(value: any) => setFilters(prev => ({ ...prev, analysisStatus: value }))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Changes</SelectItem>
              <SelectItem value="ready">Ready for Analysis</SelectItem>
              <SelectItem value="pending">Pending Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Verdict</Label>
          <Select
            value={filters.verdict}
            onValueChange={(value: any) => setFilters(prev => ({ ...prev, verdict: value }))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="no_data">No Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Direction</Label>
          <Select
            value={filters.direction}
            onValueChange={(value: any) => setFilters(prev => ({ ...prev, direction: value }))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="increase">Increases</SelectItem>
              <SelectItem value="decrease">Decreases</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 w-[200px]">
          <Label className="text-xs text-muted-foreground">
            Min Maturity: {filters.minMaturity}%
          </Label>
          <Slider
            value={[filters.minMaturity]}
            onValueChange={([value]) => setFilters(prev => ({ ...prev, minMaturity: value }))}
            max={100}
            step={10}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Days Back</Label>
          <Select
            value={String(daysBack)}
            onValueChange={(value) => setDaysBack(Number(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Max Results</Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => setLimit(Number(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <BidImpactSummaryCards summary={summary} loading={loading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BidImpactScatterChart data={scatterData} loading={loading} />
        <BidChangeHeatmapCalendar data={calendarData} loading={loading} />
      </div>

      {/* Impact Table */}
      <div>
        <h3 className="text-sm font-medium mb-3">Before/After Comparison</h3>
        <BidImpactTable data={impactData} loading={loading} />
      </div>
    </div>
  );
};
