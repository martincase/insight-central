import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Database, Globe, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { DataSourceInfo } from '@/types/hybridData';

interface DataSourceIndicatorProps {
  source: DataSourceInfo;
  dataType: string;
  className?: string;
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  source,
  dataType,
  className = '',
}) => {
  const getSourceIcon = () => {
    switch (source.type) {
      case 'live':
        return <Globe className="h-3 w-3" />;
      case 'banked':
        return <Database className="h-3 w-3" />;
      case 'hybrid':
        return <Clock className="h-3 w-3" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getSourceColor = () => {
    if (source.hasGaps) return 'destructive';
    
    switch (source.type) {
      case 'live':
        return 'default';
      case 'banked':
        return 'secondary';
      case 'hybrid':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getTooltipContent = () => {
    let content = `${dataType} data source: ${source.type}`;
    
    if (source.type === 'hybrid') {
      content += '\n';
      if (source.bankedDataRange) {
        content += `Banked: ${format(source.bankedDataRange.from, 'MMM dd')} - ${format(source.bankedDataRange.to, 'MMM dd')}`;
      }
      if (source.liveDataRange) {
        content += `\nLive: ${format(source.liveDataRange.from, 'MMM dd')} - ${format(source.liveDataRange.to, 'MMM dd')}`;
      }
    } else if (source.type === 'banked' && source.bankedDataRange) {
      content += `\nRange: ${format(source.bankedDataRange.from, 'MMM dd')} - ${format(source.bankedDataRange.to, 'MMM dd')}`;
    } else if (source.type === 'live' && source.liveDataRange) {
      content += `\nRange: ${format(source.liveDataRange.from, 'MMM dd')} - ${format(source.liveDataRange.to, 'MMM dd')}`;
    }

    if (source.lastSyncTime) {
      content += `\nLast sync: ${format(source.lastSyncTime, 'MMM dd, HH:mm')}`;
    }

    if (source.hasGaps && source.missingDates?.length) {
      content += `\nWarning: Missing data for ${source.missingDates.length} date(s)`;
    }

    return content;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={getSourceColor()}
            className={`gap-1 text-xs ${className}`}
          >
            {getSourceIcon()}
            {source.type === 'hybrid' ? 'Mixed' : source.type === 'live' ? 'Live' : 'Banked'}
            {source.hasGaps && <AlertTriangle className="h-3 w-3 text-warning" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <pre className="text-xs whitespace-pre-wrap">{getTooltipContent()}</pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};