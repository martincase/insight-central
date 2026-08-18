
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ComparisonLabel } from '@/utils/comparisonLabels';

/**
 * Valence = is this change good or bad for the client?
 *
 * Direction (up/down) is carried by the arrow. Valence must NEVER be carried by
 * colour alone — roughly 1 in 12 men cannot reliably separate the red from the
 * green, and a falling ACOS (good) and falling sales (bad) render identically
 * once desaturated. So every non-flat delta also spells out "better" / "worse".
 */
export type DeltaValence = 'better' | 'worse' | 'flat' | 'unknown';

const VALENCE_WORD: Record<DeltaValence, string> = {
  better: 'better',
  worse: 'worse',
  flat: 'no change',
  unknown: '',
};

interface TrendIndicatorProps {
  currentValue: number;
  previousValue: number;
  isPercentage?: boolean;
  showAbsoluteDifference?: boolean;
  /**
   * What the change is measured against. A plain string is treated as the
   * on-face caption; a ComparisonLabel additionally supplies hover detail and
   * an unequal-period-length warning.
   */
  comparisonLabel?: string | ComparisonLabel;
  invertSentiment?: boolean;
  /**
   * Render the baseline caption on the face of the card (default). Set false
   * only where the surrounding component prints the baseline itself, e.g. a
   * table with a "vs …" column header.
   */
  showBaselineOnFace?: boolean;
  /** Stack the baseline caption under the delta instead of beside it. */
  stacked?: boolean;
  /**
   * Tight layouts (narrow table cells) where the words "better"/"worse" will
   * not fit. Valence is carried by a ✓ / ✕ glyph instead — still independent of
   * both direction and colour — with the word in the hover text and for screen
   * readers.
   */
  compact?: boolean;
  className?: string;
}

const normalise = (label?: string | ComparisonLabel): ComparisonLabel | undefined => {
  if (!label) return undefined;
  if (typeof label === 'string') {
    return { short: label, detail: label, unequalLength: false, currentDays: 0, previousDays: 0 };
  }
  return label;
};

export const TrendIndicator = ({
  currentValue,
  previousValue,
  isPercentage = false,
  showAbsoluteDifference = false,
  comparisonLabel,
  invertSentiment = false,
  showBaselineOnFace = true,
  stacked = false,
  compact = false,
  className = '',
}: TrendIndicatorProps) => {
  const comparison = normalise(comparisonLabel);

  const baselineCaption = (extra?: string) => {
    if (!comparison || !showBaselineOnFace) return null;
    // Four notes can ride on the badge and at most three ever appear at once:
    // lengthNote only fires when the windows differ in length, and
    // completenessNote only fires when truncation has just made them equal, so
    // they are mutually exclusive. A client needs both what this is compared
    // against and how much of the period it actually covers.
    const text = [comparison.short, comparison.lengthNote, comparison.completenessNote, extra]
      .filter(Boolean)
      .join(' · ');
    return (
      <span className="text-[10px] leading-tight text-gray-500 font-normal whitespace-normal">
        {text}
      </span>
    );
  };

  const wrap = (badge: JSX.Element, detail?: string, captionExtra?: string) => {
    const caption = baselineCaption(captionExtra);
    const body = caption ? (
      <span className={stacked ? 'inline-flex flex-col items-end gap-0' : 'inline-flex flex-wrap items-center gap-x-1.5 gap-y-0'}>
        {badge}
        {caption}
      </span>
    ) : (
      badge
    );

    if (!detail) return body;
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">{body}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[260px]">
            {detail}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // No usable baseline. Previously this rendered a flat "0.0%", which claims a
  // real like-for-like comparison that does not exist.
  if (previousValue === 0 || isNaN(previousValue) || isNaN(currentValue)) {
    const badge = (
      <span className={`inline-flex items-center text-xs text-gray-500 ${className}`}>
        <Minus className="h-3 w-3 mr-1" aria-hidden="true" />
        <span>n/a</span>
        <span className="sr-only">No comparable figure for the previous period</span>
      </span>
    );
    const detail = comparison
      ? `No comparable figure for the previous period (${comparison.short.replace(/^vs /, '')}), so no change can be shown.`
      : 'No comparable figure for the previous period, so no change can be shown.';
    return wrap(badge, detail);
  }

  const percentChange = ((currentValue - previousValue) / previousValue) * 100;
  const absoluteDifference = currentValue - previousValue;
  const isUp = showAbsoluteDifference ? absoluteDifference > 0 : percentChange > 0;
  const isDown = showAbsoluteDifference ? absoluteDifference < 0 : percentChange < 0;
  const isStatic = showAbsoluteDifference ? Math.abs(absoluteDifference) < 0.01 : Math.abs(percentChange) < 0.1;

  // Reuse the existing red/green rule rather than re-deriving which metrics
  // invert (falling ACOS/TACOS/CPC/ad spend is good; falling sales is bad).
  const isPositive = invertSentiment ? isDown : isUp;
  const isNegative = invertSentiment ? isUp : isDown;
  const valence: DeltaValence = isStatic ? 'flat' : isPositive ? 'better' : isNegative ? 'worse' : 'flat';

  const displayValue = showAbsoluteDifference ? Math.abs(absoluteDifference) : Math.abs(percentChange);
  const displayText = isStatic && !showAbsoluteDifference ? '0.0%' : `${displayValue.toFixed(1)}%`;

  // Zero has no direction. CPC printed "£0.31, 0.0% down" — a falling arrow on
  // a move too small to print — because the arrow was chosen from the raw sign
  // rather than from what the badge actually says.
  const directionWord = isStatic ? 'unchanged' : isUp ? 'up' : 'down';
  const valenceWord = VALENCE_WORD[valence];

  const valenceMark =
    valence === 'flat' ? null : compact ? (
      <span
        className="ml-0.5 font-semibold"
        aria-hidden="true"
        title={valence === 'better' ? 'better for this metric' : 'worse for this metric'}
      >
        {valence === 'better' ? '✓' : '✕'}
      </span>
    ) : (
      <span className="ml-1 font-medium">{valenceWord}</span>
    );

  const badge = (
    <span
      data-delta-badge="true"
      data-valence={valence}
      className={`inline-flex items-center whitespace-nowrap text-xs ${
        valence === 'better' ? 'text-green-600' : valence === 'worse' ? 'text-red-600' : 'text-gray-500'
      } ${className}`}
    >
      {isStatic ? (
        <Minus className="h-3 w-3 mr-1" aria-hidden="true" />
      ) : isUp ? (
        <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
      ) : (
        <TrendingDown className="h-3 w-3 mr-1" aria-hidden="true" />
      )}
      <span>{displayText}</span>
      {valenceMark}
      <span className="sr-only">
        {` ${directionWord}${valence === 'flat' ? '' : `, ${valenceWord}`}${comparison ? ` ${comparison.short}` : ''}`}
      </span>
    </span>
  );

  // A delta on a metric that is itself a percentage has two readings. Buy Box
  // going 84.9% → 85.0% is a 0.1 percentage-POINT move and a 0.1% RELATIVE one,
  // and "0.1% worse" on the card face never said which. This badge has always
  // shown the relative change; it now says so, and prints both figures and the
  // percentage-point move so the other reading is there too.
  const showsRelativePercent = isPercentage && !showAbsoluteDifference;
  const relativeNote = showsRelativePercent
    ? `The ${displayText} is a relative change: ${previousValue.toFixed(1)}% → ${currentValue.toFixed(1)}%, `
      + `a ${Math.abs(currentValue - previousValue).toFixed(1)} percentage-point move.`
    : undefined;
  const detail = [comparison?.detail, relativeNote].filter(Boolean).join(' ') || undefined;

  return wrap(badge, detail, showsRelativePercent ? 'relative change' : undefined);
};
