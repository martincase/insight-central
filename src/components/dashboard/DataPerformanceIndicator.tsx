import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, Globe, Zap, Clock } from 'lucide-react';

interface DataPerformanceIndicatorProps {
  mode: 'fast' | 'hybrid' | 'standard' | 'fallback';
  totalTime?: number;
  recordCount?: number;
  usedBanked: boolean;
  usedLive: boolean;
  className?: string;
}

export const DataPerformanceIndicator: React.FC<DataPerformanceIndicatorProps> = ({
  mode,
  totalTime,
  recordCount,
  usedBanked,
  usedLive,
  className = '',
}) => {
  const getIndicatorInfo = () => {
    switch (mode) {
      case 'fast':
        return {
          variant: 'default' as const,
          icon: <Zap className="h-3 w-3" />,
          text: 'Fast Mode',
          color: 'text-emerald-600',
          description: 'Using optimized database queries for historical data. Up to 10x faster than live data!',
        };
      case 'hybrid':
        return {
          variant: 'outline' as const,
          icon: <Database className="h-3 w-3" />,
          text: 'Hybrid',
          color: 'text-blue-600',
          description: 'Using a mix of fast database queries and live data for optimal performance.',
        };
      case 'standard':
        return {
          variant: 'secondary' as const,
          icon: <Globe className="h-3 w-3" />,
          text: 'Live Data',
          color: 'text-orange-600',
          description: 'Using live Google Sheets data. Consider switching to banked data for better performance.',
        };
      case 'fallback':
        return {
          variant: 'destructive' as const,
          icon: <Clock className="h-3 w-3" />,
          text: 'Fallback',
          color: 'text-red-600',
          description: 'Fallback mode active. Some data sources may be unavailable.',
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: <Database className="h-3 w-3" />,
          text: 'Unknown',
          color: 'text-gray-600',
          description: 'Data source status unknown.',
        };
    }
  };

  const indicator = getIndicatorInfo();
  
  const tooltipContent = (
    <div className="space-y-2">
      <p className="font-medium">{indicator.description}</p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <Database className="h-3 w-3" />
          <span>Database: {usedBanked ? '✅ Used' : '❌ Not used'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-3 w-3" />
          <span>Live Sheets: {usedLive ? '✅ Used' : '❌ Not used'}</span>
        </div>
        {totalTime && (
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Load time: {totalTime.toFixed(0)}ms</span>
          </div>
        )}
        {recordCount && (
          <div>Records: {recordCount.toLocaleString()}</div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={indicator.variant} className={`gap-1 ${className}`}>
            {indicator.icon}
            {indicator.text}
            {mode === 'fast' && totalTime && totalTime < 1000 && (
              <span className="text-xs">⚡</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};