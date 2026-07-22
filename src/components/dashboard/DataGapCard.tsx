import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import type { DataGapResult } from '@/utils/dataGapAnalyzer';

interface DataGapCardProps {
  gap: DataGapResult;
  onRefresh?: (merchantToken: string, dataType: string) => void;
  isRefreshing?: boolean;
}

const DataGapCard = ({ gap, onRefresh, isRefreshing }: DataGapCardProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getDataTypeLabel = (dataType: string) => {
    switch (dataType) {
      case 'sales':
        return 'Sales Data';
      case 'campaign':
        return 'Campaign Data';
      case 'vendor':
        return 'Vendor Data';
      case 'inventory':
        return 'Inventory Data';
      default:
        return dataType.charAt(0).toUpperCase() + dataType.slice(1);
    }
  };

  const formatDateRange = (dates: Date[]) => {
    if (dates.length === 0) return '';
    if (dates.length === 1) return format(dates[0], 'MMM dd');
    
    dates.sort((a, b) => a.getTime() - b.getTime());
    return `${format(dates[0], 'MMM dd')} - ${format(dates[dates.length - 1], 'MMM dd')}`;
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              gap.severity === 'high' ? 'bg-destructive/10' :
              gap.severity === 'medium' ? 'bg-muted' :
              'bg-muted/50'
            }`}>
              {getSeverityIcon(gap.severity)}
            </div>
            <div>
              <CardTitle className="text-base">{gap.accountName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {getDataTypeLabel(gap.dataType)}
              </p>
            </div>
          </div>
          <Badge variant={getSeverityColor(gap.severity)} className="capitalize">
            {gap.severity}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Missing
            </p>
            <p className="text-lg font-semibold">
              {gap.totalDaysMissing} day{gap.totalDaysMissing !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Consecutive
            </p>
            <p className="text-lg font-semibold">
              {gap.consecutiveDaysMissing} day{gap.consecutiveDaysMissing !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {gap.missingDates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Missing Date Range
            </p>
            <p className="text-sm">
              {formatDateRange(gap.missingDates)}
            </p>
          </div>
        )}

        {gap.lastDataDate && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last Data Received
            </p>
            <p className="text-sm">
              {format(gap.lastDataDate, 'MMM dd, yyyy')}
            </p>
          </div>
        )}

        {onRefresh && (
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => onRefresh(gap.merchantToken, gap.dataType)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataGapCard;