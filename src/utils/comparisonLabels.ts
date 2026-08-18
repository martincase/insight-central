import { differenceInCalendarDays, format, isSameMonth, isSameYear, subDays } from 'date-fns';
import { getCurrentDateRange, getPreviousDateRange, isWholeCalendarMonth } from './dataProcessor';
import type { DateFilter } from '@/types/dashboard';

/**
 * Human-readable description of what a percentage-change ("delta") badge is
 * comparing against.
 *
 * Every delta on a client-facing page must name its baseline ON THE CARD FACE —
 * a tooltip is not enough. `short` is the on-face caption, `detail` is the
 * fuller explanation surfaced on hover.
 */
export interface ComparisonLabel {
  /** On-face caption, e.g. "vs Jun 2026" or "vs previous 14 days". */
  short: string;
  /** Full sentence naming both periods and their lengths (hover text). */
  detail: string;
  /** True when the two periods contain a different number of days. */
  unequalLength: boolean;
  /** e.g. "31d vs 30d" — only set when `unequalLength`. */
  lengthNote?: string;
  /**
   * e.g. "12 complete days vs 12" — set only when the selected window was cut
   * back to the days that have landed. It says two things at once and has to
   * say both: the comparison IS like-for-like, and it is not the fourteen days
   * the picker says. Without it a client reads "vs previous 14 days" over a
   * figure covering twelve.
   */
  completenessNote?: string;
  currentDays: number;
  previousDays: number;
}

type Range = { from: Date; to: Date };

const dayCount = (r: Range) => differenceInCalendarDays(r.to, r.from) + 1;

/* Whole-calendar-month detection lives in dataProcessor, next to the baseline
   rule that depends on it — two copies of "is this a whole month?" is how the
   label and the figure it captions could disagree. */

/** "3–9 Aug 2026" when inside one month, otherwise "28 Jul – 3 Aug 2026". */
export const formatRangeShort = (r: Range) => {
  if (isSameMonth(r.from, r.to) && isSameYear(r.from, r.to)) {
    if (differenceInCalendarDays(r.to, r.from) === 0) return format(r.from, 'd MMM yyyy');
    return `${format(r.from, 'd')}–${format(r.to, 'd MMM yyyy')}`;
  }
  return `${format(r.from, 'd MMM')} – ${format(r.to, 'd MMM yyyy')}`;
};

/** Rolling-window filters where "vs previous N days" reads better than dates. */
const ROLLING_FILTERS: DateFilter[] = ['last-7-days', 'last-14-days', 'past-30-days'];

/**
 * Build the comparison label for a pair of periods.
 * Pass ranges straight through when a component already has them (e.g. the
 * country-scoped view), otherwise use `getComparisonLabel`.
 */
export const buildComparisonLabel = (
  current: Range,
  previous: Range,
  opts: { rolling?: boolean; truncatedDays?: number } = {}
): ComparisonLabel => {
  const currentDays = dayCount(current);
  const previousDays = dayCount(previous);
  const unequalLength = currentDays !== previousDays;
  const lengthNote = unequalLength ? `${currentDays}d vs ${previousDays}d` : undefined;
  const truncatedDays = opts.truncatedDays ?? 0;
  const completenessNote =
    truncatedDays > 0 ? `${currentDays} complete days vs ${previousDays}` : undefined;

  let short: string;
  if (isWholeCalendarMonth(previous)) {
    short = `vs ${format(previous.from, 'MMM yyyy')}`;
  } else if (opts.rolling && !unequalLength) {
    // Say the number of days actually compared, not the number the picker
    // offered. "vs previous 14 days" over twelve days of data is the caption
    // that made Portwest's shortfall look like trading.
    short = `vs previous ${previousDays} days`;
  } else if (previousDays === 1) {
    short = `vs ${format(previous.from, 'd MMM')}`;
  } else {
    short = `vs ${formatRangeShort(previous)}`;
  }

  let detail =
    `${formatRangeShort(current)} (${currentDays} ${currentDays === 1 ? 'day' : 'days'}) ` +
    `compared with ${formatRangeShort(previous)} (${previousDays} ${previousDays === 1 ? 'day' : 'days'}).`;
  if (unequalLength) {
    detail +=
      ` The two periods are not the same length — ${currentDays} days against ${previousDays} — ` +
      `so part of any change is calendar length rather than trading.`;
  }
  if (truncatedDays > 0) {
    detail +=
      ` The last ${truncatedDays} ${truncatedDays === 1 ? 'day' : 'days'} of the selected period ` +
      `${truncatedDays === 1 ? 'has' : 'have'} not fully arrived yet, so both periods have been cut ` +
      `to the same ${currentDays} complete days. The figures are not scaled up to the full period — ` +
      `they are what actually happened in the days shown.`;
  }

  return { short, detail, unequalLength, lengthNote, completenessNote, currentDays, previousDays };
};

/**
 * Comparison label derived from the dashboard's date filter.
 * `vendorLagDays` shifts both periods to match the vendor reporting lag so the
 * dates named on the card are the dates actually compared.
 */
export const getComparisonLabel = (
  dateFilter?: DateFilter,
  customDateRange?: { from: Date; to: Date },
  opts: { vendorLagDays?: number } = {}
): ComparisonLabel => {
  const filter: DateFilter = dateFilter ?? 'last-7-days';
  const lag = opts.vendorLagDays ?? 0;
  const shift = (r: Range): Range => (lag ? { from: subDays(r.from, lag), to: subDays(r.to, lag) } : r);

  const current = shift(getCurrentDateRange(filter, customDateRange));
  const previous = shift(getPreviousDateRange(filter, customDateRange));

  return buildComparisonLabel(current, previous, { rolling: ROLLING_FILTERS.includes(filter) });
};
