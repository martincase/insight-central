import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BidChangeData, BidHistorySortField } from '@/types/bidHistory';
import { format } from 'date-fns';

interface BidChangesTableProps {
  data: BidChangeData[];
  selectedKeywords: number[];
  onRowClick: (keywordId: number) => void;
  sortField: BidHistorySortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: BidHistorySortField) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export const BidChangesTable = ({
  data,
  selectedKeywords,
  onRowClick,
  sortField,
  sortDirection,
  onSort,
  page,
  totalPages,
  onPageChange,
  loading,
}: BidChangesTableProps) => {
  const handleSort = (field: BidHistorySortField) => {
    onSort(field);
  };

  const SortableHeader = ({ field, children }: { field: BidHistorySortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (loading) {
    return (
      <div className="rounded-md border border-border/50">
        <div className="h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-border/50">
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          No bid changes found matching the filters
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[100px]">
                <SortableHeader field="snapshot_date">Date</SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader field="keyword_text">Keyword</SortableHeader>
              </TableHead>
              <TableHead>Seller</TableHead>
              <TableHead className="text-right">Previous CPC</TableHead>
              <TableHead className="text-right">
                <SortableHeader field="new_bid">Current CPC</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="bid_change">Change</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="bid_change_pct">Change %</SortableHeader>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => {
              const isSelected = selectedKeywords.includes(row.keyword_id);
              const isIncrease = row.bid_change > 0;

              return (
                <TableRow
                  key={`${row.keyword_id}-${row.snapshot_date}-${index}`}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onRowClick(row.keyword_id)}
                >
                  <TableCell className="font-mono text-sm">
                    {format(new Date(row.snapshot_date), 'dd MMM')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[200px]">
                        {row.keyword_text}
                      </span>
                      {isSelected && (
                        <Badge variant="secondary" className="text-xs">
                          On chart
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.sellername}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    £{row.previous_bid.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    £{row.new_bid.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono font-medium ${isIncrease ? 'text-green-500' : 'text-red-500'}`}>
                      {isIncrease ? '+' : ''}£{row.bid_change.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline"
                      className={`font-mono ${
                        isIncrease 
                          ? 'border-green-500/50 text-green-500 bg-green-500/10' 
                          : 'border-red-500/50 text-red-500 bg-red-500/10'
                      }`}
                    >
                      {isIncrease ? '+' : ''}{row.bid_change_pct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
