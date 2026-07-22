import { format } from 'date-fns';
import { CheckCircle2, XCircle, MinusCircle, Clock, HelpCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BidImpactData } from '@/types/bidImpact';

interface BidImpactTableProps {
  data: BidImpactData[];
  loading?: boolean;
}

const VerdictBadge = ({ verdict, daysSinceChange }: { verdict: string; daysSinceChange?: number | null }) => {
  switch (verdict) {
    case 'positive':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Positive
        </Badge>
      );
    case 'negative':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Negative
        </Badge>
      );
    case 'neutral':
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
          <MinusCircle className="h-3 w-3 mr-1" />
          Neutral
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          <HelpCircle className="h-3 w-3 mr-1" />
          No Data
        </Badge>
      );
  }
};

const MaturityIndicator = ({ pct }: { pct: number }) => {
  const color = pct >= 70 ? 'bg-green-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className="w-16 h-2" />
      <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
    </div>
  );
};

const DeltaCell = ({ before, after, deltaPercent, prefix = '', suffix = '', maturityPct }: { 
  before: number; 
  after: number | null; 
  deltaPercent: number | null;
  prefix?: string;
  suffix?: string;
  maturityPct?: number;
}) => {
  // Show "before" value with pending status when no "after" data yet
  if (after === null) {
    return (
      <div className="text-sm">
        <span className="text-foreground font-medium">{prefix}{before.toLocaleString()}{suffix}</span>
        <span className="text-muted-foreground text-xs ml-1">→ pending</span>
      </div>
    );
  }
  
  const isPositive = deltaPercent !== null && deltaPercent > 0;
  const isNegative = deltaPercent !== null && deltaPercent < 0;
  
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{prefix}{before.toLocaleString()}{suffix}</span>
      <span className="mx-1">→</span>
      <span className={isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : ''}>
        {prefix}{after.toLocaleString()}{suffix}
      </span>
      {deltaPercent !== null && (
        <span className={`text-xs ml-1 ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'}`}>
          ({isPositive ? '+' : ''}{deltaPercent.toFixed(1)}%)
        </span>
      )}
    </div>
  );
};

export const BidImpactTable = ({ data, loading }: BidImpactTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-pulse text-muted-foreground">Loading impact data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No bid change impact data available
      </div>
    );
  }

  // Count ready vs pending
  const readyCount = data.filter(d => d.impact_verdict !== 'pending').length;
  const pendingCount = data.filter(d => d.impact_verdict === 'pending').length;

  return (
    <div className="space-y-3">
      <Alert className="bg-muted/30 border-border/50">
        <AlertDescription className="text-xs text-muted-foreground space-y-1">
          <div>
            <strong>Rolling 30-Day Windows:</strong> Each snapshot contains 30 days of cumulative data ending on that date. 
            The "Before" column shows the 30-day period ending before the bid change, and "After" shows the 30-day period ending after. 
            Since windows overlap significantly, changes reflect the marginal impact over the non-overlapping days.
          </div>
          <div>
            Showing <span className="text-foreground font-medium">{readyCount}</span> ready for analysis, 
            <span className="text-foreground font-medium ml-1">{pendingCount}</span> pending more data.
          </div>
        </AlertDescription>
      </Alert>
      <div className="rounded-md border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-20">Date</TableHead>
            <TableHead>Keyword</TableHead>
            <TableHead className="w-16">Match</TableHead>
            <TableHead className="max-w-[120px]">Ad Group</TableHead>
            <TableHead className="max-w-[140px]">Campaign</TableHead>
            <TableHead className="w-20">Bid Δ</TableHead>
            <TableHead>Impressions</TableHead>
            <TableHead>Sales</TableHead>
            <TableHead>ACOS</TableHead>
            <TableHead className="w-24">Verdict</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 50).map((row, idx) => (
            <TableRow key={`${row.keyword_id}-${row.bid_change_date}-${idx}`} className="hover:bg-muted/20">
              <TableCell className="font-mono text-xs">
                {format(new Date(row.bid_change_date), 'MMM d')}
              </TableCell>
              <TableCell className="max-w-[150px] truncate" title={row.keyword_text}>
                {row.keyword_text}
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {row.match_type || '-'}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground" title={row.ad_group_name || ''}>
                {row.ad_group_name || '-'}
              </TableCell>
              <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground" title={row.campaign_name || ''}>
                {row.campaign_name || '-'}
              </TableCell>
              <TableCell>
                <div className="text-xs">
                  <div className="text-muted-foreground">
                    £{Number(row.previous_bid).toFixed(2)} → £{Number(row.new_bid).toFixed(2)}
                  </div>
                  <span className={row.bid_change_pct >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {row.bid_change_pct >= 0 ? '+' : ''}{row.bid_change_pct.toFixed(1)}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <DeltaCell 
                  before={row.impressions_before} 
                  after={row.impressions_after} 
                  deltaPercent={row.impressions_delta_pct}
                  maturityPct={row.data_maturity_pct}
                />
              </TableCell>
              <TableCell>
                <DeltaCell 
                  before={row.sales_before} 
                  after={row.sales_after} 
                  deltaPercent={row.sales_delta_pct}
                  prefix="£"
                  maturityPct={row.data_maturity_pct}
                />
              </TableCell>
              <TableCell>
                <DeltaCell 
                  before={row.acos_before} 
                  after={row.acos_after} 
                  deltaPercent={row.acos_delta_pct}
                  suffix="%"
                  maturityPct={row.data_maturity_pct}
                />
              </TableCell>
              <TableCell>
                <VerdictBadge verdict={row.impact_verdict} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};
