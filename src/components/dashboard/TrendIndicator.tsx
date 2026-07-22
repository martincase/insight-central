
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TrendIndicatorProps {
  currentValue: number;
  previousValue: number;
  isPercentage?: boolean;
  showAbsoluteDifference?: boolean;
  comparisonLabel?: string;
  invertSentiment?: boolean;
}

export const TrendIndicator = ({ 
  currentValue, 
  previousValue, 
  isPercentage = false,
  showAbsoluteDifference = false,
  comparisonLabel,
  invertSentiment = false,
}: TrendIndicatorProps) => {
  if (previousValue === 0 || isNaN(previousValue) || isNaN(currentValue)) {
    return (
      <div className="flex items-center text-xs text-gray-500">
        <Minus className="h-3 w-3 mr-1" />
        <span>0.0%</span>
      </div>
    );
  }
  
  const percentChange = ((currentValue - previousValue) / previousValue) * 100;
  const absoluteDifference = currentValue - previousValue;
  const isUp = showAbsoluteDifference ? absoluteDifference > 0 : percentChange > 0;
  const isDown = showAbsoluteDifference ? absoluteDifference < 0 : percentChange < 0;
  const isPositive = invertSentiment ? isDown : isUp;
  const isNegative = invertSentiment ? isUp : isDown;
  const isStatic = showAbsoluteDifference ? Math.abs(absoluteDifference) < 0.01 : Math.abs(percentChange) < 0.1;
  
  const displayValue = showAbsoluteDifference ? Math.abs(absoluteDifference) : Math.abs(percentChange);
  const displayText = showAbsoluteDifference 
    ? `${displayValue.toFixed(1)}%` 
    : isStatic ? '0.0%' : `${displayValue.toFixed(1)}%`;
  
  const indicator = (
    <div className={`flex items-center text-xs ${
      isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
    }`}>
      {isUp ? (
        <TrendingUp className="h-3 w-3 mr-1" />
      ) : isDown ? (
        <TrendingDown className="h-3 w-3 mr-1" />
      ) : isStatic ? (
        <Minus className="h-3 w-3 mr-1" />
      ) : null}
      <span>{displayText}</span>
    </div>
  );

  if (comparisonLabel) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {comparisonLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
};
