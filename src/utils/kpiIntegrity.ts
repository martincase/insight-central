/**
 * KPI integrity assertions.
 *
 * A headline KPI and the daily series drawn underneath it are supposed to be the
 * same numbers. When they are not, the headline is the one clients read and the
 * one that is wrong. Rather than print a number we cannot stand behind, the card
 * refuses to render it.
 *
 * This caught the vendor "Units Ordered" bug, where the KPI summed an unbounded
 * ~30-day fetch window while the daily grid below it showed the selected period.
 */

/** Relative tolerance for float/rounding drift between a total and its series. */
export const KPI_SUM_TOLERANCE = 0.005; // 0.5%

export interface KpiSumCheck {
  ok: boolean;
  total: number;
  seriesTotal: number;
  /** Signed relative difference, or 0 when both sides are zero. */
  drift: number;
}

/**
 * Check that an additive KPI total equals the sum of its own daily series.
 *
 * Only meaningful for additive metrics (sales, units, page views, sessions).
 * Ratios and averages — conversion, buy box, ACOS — legitimately do not sum,
 * so callers must not run this on them.
 *
 * The guard is only as good as the pairing it is handed. It fired for months on
 * Portwest "All seller markets" not because the data was wrong but because the
 * caller was comparing a total summed in native currency against a series summed
 * in GBP — 0.68% apart, just over tolerance, and entirely an artefact of the
 * comparison. Callers must pass a series built on the SAME basis as the total.
 */
export function checkTotalAgainstSeries(
  total: number,
  series?: number[] | null,
  tolerance: number = KPI_SUM_TOLERANCE,
): KpiSumCheck {
  const t = Number(total) || 0;
  if (!series || series.length === 0) {
    return { ok: true, total: t, seriesTotal: t, drift: 0 };
  }
  const seriesTotal = series.reduce((s, v) => s + (Number(v) || 0), 0);
  const scale = Math.max(Math.abs(t), Math.abs(seriesTotal));
  if (scale === 0) return { ok: true, total: t, seriesTotal, drift: 0 };
  const drift = (t - seriesTotal) / scale;
  return { ok: Math.abs(drift) <= tolerance, total: t, seriesTotal, drift };
}

// ---------------------------------------------------------------------------
// Data completeness
//
// Lockabox's SP-API credential died on 2 July 2026. For the whole of "Last
// Month" the dashboard then showed:
//
//     OVERALL SALES £5,048.24 · 91.8% worse · vs Jun 2026 · 31d vs 30d
//     TACOS 109.3%   ADVERTISING % 524.8%   "All clear — no active alerts"
//
// Two days of sales, presented as a month, compared against a real month, with
// a full month of ad spend divided into it. Every one of those numbers is a
// different kind of wrong and none of them said so. Godet France and Workwear
// Depot US are the same shape.
//
// rpc_month_end_readiness already reasons about this server-side for month-end:
// expected days = calendar days in the window up to yesterday, present days =
// days that actually carry a row, and any shortfall BLOCKs. The same reasoning
// is applied here, with one softening: month-end readiness governs whether
// Martin sends a report, so a single missing day is worth stopping for. A client
// dashboard is read every day, and Amazon's by-date feed routinely lands a day
// late, so blocking on one absent day would blank almost every screen. So:
//
//   * ANY gap is disclosed on the page.
//   * A gap of more than a tenth of the window withholds the total's framing,
//     the period-on-period comparison, and every ratio that would divide
//     complete advertising by incomplete sales.
//
// A tenth is the point at which the gap outweighs the month-on-month movements
// clients actually act on: a 4-day hole in a 31-day month moves a total by more
// than the typical swing being reported.
// ---------------------------------------------------------------------------

/** Fraction of the window that may be absent before a total stops being a total. */
export const MATERIAL_GAP_RATIO = 0.1;

/**
 * Days at the trailing edge of a window that are allowed to be empty without
 * counting as a gap. Amazon's sales & traffic feed lands the next day and the
 * vendor feed lags three, so the last couple of days of any window ending today
 * are legitimately not in yet.
 */
export const FEED_LAG_GRACE_DAYS = 3;

export type CompletenessLevel = 'unknown' | 'complete' | 'partial' | 'severe' | 'empty';

export interface DataCompleteness {
  level: CompletenessLevel;
  /** Days in the window that could reasonably have reported by now. */
  expectedDays: number;
  presentDays: number;
  missingDays: number;
  /** presentDays / expectedDays, 1 when nothing is assessable. */
  coverage: number;
  /** yyyy-MM-dd of the most recent day carrying data, null when none does. */
  lastDataDate: string | null;
  /** Up to eight missing days, for naming them rather than just counting. */
  missingDates: string[];
  /**
   * True when the period total must not be presented as a period total: the
   * comparison, and any ads-over-sales ratio, are withheld.
   */
  materiallyIncomplete: boolean;
  /** One plain sentence naming what is missing. Null when nothing is. */
  headline: string | null;
}

export const COMPLETENESS_UNKNOWN: DataCompleteness = {
  level: 'unknown',
  expectedDays: 0,
  presentDays: 0,
  missingDays: 0,
  coverage: 1,
  lastDataDate: null,
  missingDates: [],
  materiallyIncomplete: false,
  headline: null,
};

const dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/**
 * Work out how much of the selected window the sales series actually covers.
 *
 * @param windowDays every calendar day in the selected period, in order.
 * @param presentKeys the yyyy-MM-dd days that carry a sales row.
 * @param now         injected for testability; defaults to the current time.
 */
export function assessCompleteness(
  windowDays: Date[],
  presentKeys: Iterable<string>,
  now: Date = new Date(),
): DataCompleteness {
  if (!windowDays.length) return COMPLETENESS_UNKNOWN;

  // The trailing edge of the window is not assessable yet: the feed has not had
  // time to land. Everything up to that cutoff should be here by now.
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - (1 + FEED_LAG_GRACE_DAYS));
  const cutoffKey = dayKey(cutoff);

  const assessable = windowDays.map(dayKey).filter((k) => k <= cutoffKey);
  if (!assessable.length) return COMPLETENESS_UNKNOWN;

  const present = new Set(presentKeys);
  const missing = assessable.filter((k) => !present.has(k));
  const expectedDays = assessable.length;
  const presentDays = expectedDays - missing.length;
  const coverage = presentDays / expectedDays;

  // The last day with data anywhere in the window, not just the assessable part.
  const windowKeys = windowDays.map(dayKey);
  let lastDataDate: string | null = null;
  for (const k of windowKeys) if (present.has(k)) lastDataDate = k;

  let level: CompletenessLevel;
  if (presentDays === 0) level = 'empty';
  else if (missing.length === 0) level = 'complete';
  else if (missing.length / expectedDays > MATERIAL_GAP_RATIO) level = 'severe';
  else level = 'partial';

  const materiallyIncomplete = level === 'empty' || level === 'severe';

  let headline: string | null = null;
  if (level === 'empty') {
    headline = `No sales data has been received for any of the ${expectedDays} days in this period.`;
  } else if (level === 'severe' || level === 'partial') {
    const stops = lastDataDate ? ` Data stops on ${prettyDate(lastDataDate)}.` : '';
    headline =
      `Only ${presentDays} of ${expectedDays} days of sales data have been received` +
      ` — ${missing.length} ${missing.length === 1 ? 'day is' : 'days are'} missing.${stops}`;
  }

  return {
    level,
    expectedDays,
    presentDays,
    missingDays: missing.length,
    coverage,
    lastDataDate,
    missingDates: missing.slice(0, 8),
    materiallyIncomplete,
    headline,
  };
}

/** Human list of the missing days, truncated. */
export function describeMissingDates(c: DataCompleteness): string | null {
  if (!c.missingDates.length) return null;
  const named = c.missingDates.map(prettyDate).join(', ');
  const rest = c.missingDays - c.missingDates.length;
  return rest > 0 ? `Missing: ${named} and ${rest} more.` : `Missing: ${named}.`;
}
