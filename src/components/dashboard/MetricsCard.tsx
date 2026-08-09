
import { Card, CardContent } from '@/components/ui/card';
import { TrendIndicator } from './TrendIndicator';
import { InfoTooltip } from '@/components/common/InfoTooltip';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { checkTotalAgainstSeries } from '@/utils/kpiIntegrity';

interface MetricsCardProps {
  title: string;
  value: string;
  color: string;
  currentValue: number;
  previousValue: number;
  isPercentage?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  sparklineData?: number[];
  comparisonLabel?: string;
  invertSentiment?: boolean;
  /** Optional explainer shown via standardised ⓘ hover tooltip. */
  info?: React.ReactNode;
  subtitle?: React.ReactNode;
  /**
   * Set to 'sum' on additive metrics (sales, units, page views) whose
   * sparklineData is the same daily series the headline was totalled from.
   * The card then refuses to print a headline that disagrees with its own
   * series rather than showing a number nobody can reconcile.
   * Leave unset for ratios and averages, which legitimately do not sum.
   */
  seriesSemantics?: 'sum' | 'average';
}

export const MetricsCard = ({
  title,
  value,
  color,
  currentValue,
  previousValue,
  isPercentage = false,
  onClick,
  isSelected = false,
  sparklineData,
  comparisonLabel,
  invertSentiment = false,
  info,
  subtitle,
  seriesSemantics,
}: MetricsCardProps) => {
  const sumCheck = seriesSemantics === 'sum'
    ? checkTotalAgainstSeries(currentValue, sparklineData)
    : null;
  const sumMismatch = !!sumCheck && !sumCheck.ok;
  const chartData = sparklineData?.map((v, i) => ({ v, i }));
  const isUpward = sparklineData && sparklineData.length >= 2
    ? sparklineData[sparklineData.length - 1] >= sparklineData[0]
    : true;
  // Good direction depends on whether sentiment is inverted (cost metrics)
  const isGoodDirection = invertSentiment ? !isUpward : isUpward;

  return (
    <Card
      className={`group border shadow-sm transition-all duration-200 bg-white/70 backdrop-blur-sm ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        isSelected
          ? 'border-blue-500 bg-blue-50/50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 md:p-6">
        <div className="space-y-2 md:space-y-3">
          {/* Title */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide truncate flex items-center gap-1">
              <span className="truncate">{title}</span>
              {info && <InfoTooltip content={info} />}
            </h3>
            <TrendIndicator
              currentValue={currentValue}
              previousValue={previousValue}
              isPercentage={isPercentage}
              comparisonLabel={comparisonLabel}
              invertSentiment={invertSentiment}
            />
          </div>

          {/* Value + Sparkline */}
          <div className="flex items-end justify-between gap-1 md:gap-2">
            {sumMismatch ? (
              <div className="text-xs md:text-sm font-semibold text-red-600 leading-tight">
                Unavailable
                <span className="block text-[10px] md:text-[11px] font-normal text-red-500">
                  Total disagrees with the daily figures — withheld
                </span>
              </div>
            ) : (
              <div className={`text-lg md:text-2xl font-bold tracking-tight ${color} ${onClick ? 'group-hover:scale-105' : ''} transition-transform duration-200`}>
                {value}
              </div>
            )}
            {!sumMismatch && chartData && chartData.length > 1 && (
              <div className="w-14 h-6 md:w-20 md:h-8 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={isGoodDirection ? '#22c55e' : '#ef4444'}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {subtitle && (
            <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
          )}

          {/* Selection indicator */}
          {isSelected && onClick && (
            <div className="text-xs text-blue-600 font-medium">
              Added to chart
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
