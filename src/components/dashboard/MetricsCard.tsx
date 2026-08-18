
import { Card, CardContent } from '@/components/ui/card';
import { TrendIndicator } from './TrendIndicator';
import { InfoTooltip } from '@/components/common/InfoTooltip';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Check, Plus } from 'lucide-react';
import { checkTotalAgainstSeries } from '@/utils/kpiIntegrity';
import type { ComparisonLabel } from '@/utils/comparisonLabels';

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
  /** What the delta is measured against — printed on the card face, not hidden in a tooltip. */
  comparisonLabel?: string | ComparisonLabel;
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
  /**
   * Set when the period is too incomplete for a period-on-period delta to mean
   * anything. Lockabox held two days of July against the whole of June and
   * called it "91.8% worse". The reason replaces the delta badge — a blank
   * space would just look like a card that failed to load.
   */
  comparisonSuppressedReason?: string;
  /**
   * The previous period's figure formatted EXACTLY as `value` is.
   *
   * When both periods print the same thing, the delta is a claim the card
   * cannot show its working for: CTR read "0.3%" in both periods and still
   * announced "3.8% better" (the whole move was impressions falling faster
   * than clicks). Supplying this replaces the badge with a plain statement
   * instead of asking the client to reconcile two numbers that agree.
   * Only worth passing on rate/money cards, whose display precision is coarse.
   */
  previousDisplayValue?: string;
  /**
   * Short qualifier printed against the headline figure, e.g. "2 of 31 days".
   * Use when the number is real but is not the period total it appears to be.
   */
  qualifier?: string;
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
  comparisonSuppressedReason,
  previousDisplayValue,
  qualifier,
}: MetricsCardProps) => {
  // '—' is "we have no figure", not a figure that happens to match.
  const roundsToSame =
    !!previousDisplayValue && previousDisplayValue === value && value !== '—';
  const suppressedReason =
    comparisonSuppressedReason
    ?? (roundsToSame ? `No change at this precision — both periods show ${value}` : undefined);
  const sumCheck = seriesSemantics === 'sum'
    ? checkTotalAgainstSeries(currentValue, sparklineData)
    : null;
  const sumMismatch = !!sumCheck && !sumCheck.ok;
  const chartData = sparklineData?.map((v, i) => ({ v, i }));
  // Colour the sparkline from the SAME comparison the delta badge uses. It used
  // to compare the first and last points of the spark, which is a different
  // question — so a card could show a green line above a red delta.
  const hasBaseline = previousValue !== 0 && !isNaN(previousValue) && !isNaN(currentValue);
  const isUpward = hasBaseline ? currentValue >= previousValue : true;
  // Good direction depends on whether sentiment is inverted (cost metrics)
  const isGoodDirection = invertSentiment ? !isUpward : isUpward;

  return (
    <Card
      className={`group relative border shadow-sm transition-all duration-200 bg-white/70 backdrop-blur-sm ${
        onClick
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
          : ''
      } ${
        isSelected
          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/40'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
      // A card that changes the chart is a control, so it behaves like one:
      // reachable by keyboard and announced with its on/off state. It looked
      // like a static tile before, which is why nobody found the interaction.
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* The affordance, on the card face rather than only after the fact.
          A filled tick means the series is already plotted; the outlined plus
          appears on hover/focus so the tile reads as pressable at a glance. */}
      {onClick && (
        <span
          aria-hidden="true"
          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border transition-opacity ${
            isSelected
              ? 'border-blue-500 bg-blue-500 text-white opacity-100'
              : 'border-gray-300 bg-white text-gray-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
        >
          {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </span>
      )}
      <CardContent className="p-3 md:p-6">
        <div className="space-y-2 md:space-y-3">
          {/* Title — kept clear of the add/remove badge pinned top-right */}
          <div className={`flex items-center justify-between gap-2 ${onClick ? 'pr-5' : ''}`}>
            <h3 className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wide truncate flex items-center gap-1">
              <span className="truncate">{title}</span>
              {info && <InfoTooltip content={info} />}
            </h3>
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
              <div>
                <div className={`text-lg md:text-2xl font-bold tracking-tight ${color} ${onClick ? 'group-hover:scale-105' : ''} transition-transform duration-200`}>
                  {value}
                </div>
                {qualifier && (
                  <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                    {qualifier}
                  </div>
                )}
              </div>
            )}
            {!sumMismatch && chartData && chartData.length > 1 && (
              <div className="w-14 h-6 md:w-20 md:h-8 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={!hasBaseline ? '#94a3b8' : isGoodDirection ? '#22c55e' : '#ef4444'}
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

          {/* Change vs baseline — sits directly under the headline number so the
              big figure is never carried by colour alone. */}
          <div className="-mt-0.5">
            {suppressedReason ? (
              <p className={`text-[10px] md:text-[11px] leading-tight ${roundsToSame && !comparisonSuppressedReason ? 'text-gray-500' : 'text-amber-700'}`}>
                {suppressedReason}
              </p>
            ) : (
              <TrendIndicator
                currentValue={currentValue}
                previousValue={previousValue}
                isPercentage={isPercentage}
                comparisonLabel={comparisonLabel}
                invertSentiment={invertSentiment}
              />
            )}
          </div>

          {subtitle && (
            <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
          )}

          {/* Selection indicator. The unselected copy is shown on hover only —
              printing it on every card at rest would shout over the numbers,
              but leaving it off entirely is how the feature stayed hidden. */}
          {onClick && (
            isSelected ? (
              <div className="text-xs text-blue-600 font-medium">
                On chart — click to remove
              </div>
            ) : (
              <div className="text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Click to add to chart
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};
