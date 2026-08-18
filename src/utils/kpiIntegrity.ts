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
 *
 * This doubles as the CAP on how much `findLastCompleteDay` below is willing to
 * trim off a window. Three days is the longest lag any feed we take actually
 * has, so a fourth consecutive thin day is not the feed being late — it is the
 * business, and it must reach the headline untouched.
 */
export const FEED_LAG_GRACE_DAYS = 3;

// ---------------------------------------------------------------------------
// Trailing feed lag: cutting a window back to the days that have actually landed
//
// The grace window above stops a late day being CALLED a gap. It never stopped
// that day being COUNTED. Portwest, 18 August 2026:
//
//     OVERALL SALES £454,050 · 13.7% worse · vs previous 14 days
//     "All clear — no active alerts"
//
// All twelve Portwest vendor markets stop dead on 15 August — the documented
// three-day vendor lag. The seller arm did report the 16th, and the two arms
// are summed, so 16 August rendered as £432 against a ~£37,800/day run rate.
// The 17th was empty. Meanwhile the BASELINE — the previous fourteen days — is
// complete. Thirteen and a bit days of trading were being divided by fourteen
// days of trading and the shortfall printed as a business result. Every delta
// on the page read "worse", and none of them were.
//
// The fix is not to scale the short window up. A projected figure is an invented
// figure, and no invented number goes in front of a client. The fix is to stop
// BOTH windows at the last day we actually have, and compare the same number of
// days on each side.
//
// Finding that day needs care, because a day does not land all at once. The
// 16th arrived as three feeds at three different completeness levels:
//
//     sessions    5,333   ~89% of trend      looks finished
//     page views  2,238   ~8%  of trend      barely started
//     units          16   ~0.6% of trend     essentially absent
//
// A single whole-day test keyed on any one of those is wrong. So each feed is
// judged separately and the EARLIEST verdict wins.
//
// A feed's day is incomplete when it is below BOTH:
//
//   * COMPLETE_DAY_RATIO of the trailing-7-day median, and
//   * TRAILING_FLOOR_RATIO of the LOWEST of those same seven days.
//
// The ratio alone is not safe. Seven days is one whole weekly cycle, so the
// median sits mid-week, and a B2B account's Sunday can genuinely be a third of
// it — a real trading day the ratio would throw away. Worse, 16 August 2026 IS
// a Sunday, so on Portwest the ratio test and the calendar happen to agree for
// entirely different reasons, and a rule that cannot tell them apart would be
// right by luck.
//
// The floor test asks the question seasonality cannot fake: is this day less
// than HALF the quietest day this account has had all week? Last Sunday is in
// that week, so a normal Sunday is never less than half of it. A feed that has
// not landed is, by two orders of magnitude — Portwest's 16 units against a
// weekly floor in the hundreds.
//
// Half, not all, of the floor is deliberate. Requiring merely "below the
// weekly minimum" would flag any Sunday that came in slightly under the one
// before it — a real trading day, silently deleted, one week in seven. The
// halving buys a margin wide enough that only an absence fits through it.
//
// The cost is stated: a day that is, say, a quarter delivered clears the floor
// test and is KEPT, so it still drags the total. That is the deliberate
// direction to err. Keeping a thin day understates a period and is visible;
// dropping a real one overstates it and is not.
//
// The safety rails, because this decides what every client sees:
//
//   * Only a CONTIGUOUS RUN AT THE TRAILING EDGE is ever trimmed. An interior
//     day is never removed, however low it is.
//   * At most FEED_LAG_GRACE_DAYS days are trimmed. A fourth thin day is longer
//     than any feed we take actually lags, so the run is treated as real: NOTHING
//     is trimmed and the full window is shown with the shortfall disclosed.
//   * A feed with no trend to judge against abstains rather than guesses.
//   * Every excluded day is NAMED ON SCREEN with its own figure and the trend it
//     fell short of. A day is excluded in public, never dropped in private.
//
// The residual risk is stated plainly: a genuine collapse confined to the last
// one-to-three days of the window will be excluded from the headline delta,
// and will be visible only in the banner that names it. That is the deliberate
// trade against the alternative, which mislabels every vendor account as
// "worse" every single day.
// ---------------------------------------------------------------------------

/** Share of the trailing-7-day median below which a day is treated as still landing. */
export const COMPLETE_DAY_RATIO = 0.4;

/**
 * Share of the trailing-7-day MINIMUM a day must also fall under. This is the
 * test that survives seasonality: half the quietest day of the past week is a
 * level no ordinary trading day reaches, and every absent feed clears it easily.
 */
export const TRAILING_FLOOR_RATIO = 0.5;

/** Days of history a feed compares a candidate day against. One weekly cycle. */
export const TREND_WINDOW_DAYS = 7;

/** Fewest trailing days that will support a verdict. Below this a feed abstains. */
export const MIN_TREND_SAMPLES = 3;

/** Days carrying real volume before a feed is considered live enough to judge. */
export const MIN_FEED_ACTIVE_DAYS = 4;

/** One metric's daily values, index-aligned with the window's days. */
export interface FeedSeries {
  key: string;
  /** Lower-case noun for prose, e.g. "units", "page views". */
  label: string;
  values: number[];
}

export interface FeedVerdict {
  key: string;
  label: string;
  /** Last index this feed considers landed. days.length - 1 when nothing is thin. */
  lastCompleteIndex: number;
  /** False when the feed had no usable trend and took no view. */
  judged: boolean;
}

/** What one excluded day was short of, for naming it on the page. */
export interface ExcludedDay {
  index: number;
  /** False when the feed produced no row for the day at all. */
  hasRow: boolean;
  /** Feeds that came in under trend, worst first. */
  shortfalls: { label: string; value: number; trend: number }[];
}

export type TruncationReason = 'complete' | 'feed-lag' | 'beyond-grace' | 'unjudgeable';

export interface WindowTruncation {
  /** Last day every judging feed has landed. -1 only when the window is empty. */
  lastCompleteIndex: number;
  /** Trailing days removed from BOTH windows. 0 when nothing was removed. */
  trimmedDays: number;
  /** Days that survive — the number actually compared on each side. */
  completeDays: number;
  feeds: FeedVerdict[];
  /** Oldest first, so the newest excluded day reads last. */
  excluded: ExcludedDay[];
  /**
   * 'complete'     every day in the window has landed;
   * 'feed-lag'     a trailing run inside the known lag was excluded;
   * 'beyond-grace' more days looked thin than feed lag can explain, so NOTHING
   *                was excluded and the full window stands;
   * 'unjudgeable'  no feed had enough history to take a view.
   */
  reason: TruncationReason;
}

export const NO_TRUNCATION: WindowTruncation = {
  lastCompleteIndex: -1,
  trimmedDays: 0,
  completeDays: 0,
  feeds: [],
  excluded: [],
  reason: 'unjudgeable',
};

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** The up-to-7 days before `i` that carry a row, newest first. */
const trailingContext = (values: number[], hasRow: boolean[], i: number): number[] => {
  const out: number[] = [];
  for (let j = i - 1; j >= 0 && out.length < TREND_WINDOW_DAYS; j--) {
    if (hasRow[j]) out.push(Number(values[j]) || 0);
  }
  return out;
};

/**
 * Find the last day of a window that every feed has finished reporting.
 *
 * @param hasRow per day: did the feed produce a row at all.
 * @param feeds  one entry per metric, values index-aligned with `hasRow`.
 * @param graceDays most trailing days that may be excluded. See FEED_LAG_GRACE_DAYS.
 */
export function findLastCompleteDay(
  hasRow: boolean[],
  feeds: FeedSeries[],
  graceDays: number = FEED_LAG_GRACE_DAYS,
): WindowTruncation {
  const n = hasRow.length;
  if (n === 0) return NO_TRUNCATION;

  const untouched = (reason: TruncationReason, verdicts: FeedVerdict[]): WindowTruncation => ({
    lastCompleteIndex: n - 1,
    trimmedDays: 0,
    completeDays: n,
    feeds: verdicts,
    excluded: [],
    reason,
  });

  // Is one feed's day short of both the trailing median and the trailing floor?
  const isThin = (values: number[], i: number): { thin: boolean; value: number; trend: number } => {
    const value = Number(values[i]) || 0;
    const context = trailingContext(values, hasRow, i);
    if (context.length < MIN_TREND_SAMPLES) return { thin: false, value, trend: 0 };
    const trend = median(context);
    if (trend <= 0) return { thin: false, value, trend };
    const floor = Math.min(...context);
    const thin = value < trend * COMPLETE_DAY_RATIO && value < floor * TRAILING_FLOOR_RATIO;
    return { thin, value, trend };
  };

  const verdicts: FeedVerdict[] = feeds.map((feed) => {
    // A feed that barely reports anything has no trend worth trusting. Every
    // vendor scope carries a sessions series that is null on every single day;
    // letting it "judge" would veto the whole window on no evidence at all.
    const activeDays = feed.values.reduce(
      (c, v, i) => c + (hasRow[i] && (Number(v) || 0) > 0 ? 1 : 0),
      0,
    );
    if (activeDays < MIN_FEED_ACTIVE_DAYS) {
      return { key: feed.key, label: feed.label, lastCompleteIndex: n - 1, judged: false };
    }
    let idx = n - 1;
    while (idx >= 0 && (!hasRow[idx] || isThin(feed.values, idx).thin)) idx--;
    return { key: feed.key, label: feed.label, lastCompleteIndex: idx, judged: true };
  });

  // A day with no row at all is absent, not late — no feed has to vouch for that.
  let lastRowIndex = n - 1;
  while (lastRowIndex >= 0 && !hasRow[lastRowIndex]) lastRowIndex--;

  const judging = verdicts.filter((v) => v.judged);
  if (!judging.length && lastRowIndex === n - 1) return untouched('unjudgeable', verdicts);

  const lastCompleteIndex = Math.min(
    lastRowIndex,
    ...judging.map((v) => v.lastCompleteIndex),
  );

  if (lastCompleteIndex >= n - 1) return untouched('complete', verdicts);

  const trimmedDays = n - 1 - lastCompleteIndex;

  // More thin days than any feed lag explains, or nothing left to stand on.
  // Trimming here would hide a real collapse, so the window is left whole and
  // the shortfall is disclosed instead.
  if (lastCompleteIndex < 0 || trimmedDays > graceDays) {
    return untouched('beyond-grace', verdicts);
  }

  const excluded: ExcludedDay[] = [];
  for (let i = lastCompleteIndex + 1; i < n; i++) {
    const shortfalls = feeds
      .filter((f) => verdicts.find((v) => v.key === f.key)?.judged)
      .map((f) => ({ label: f.label, ...isThin(f.values, i) }))
      .filter((s) => s.thin || !hasRow[i])
      .map(({ label, value, trend }) => ({ label, value, trend }))
      .sort((a, b) => (a.trend ? a.value / a.trend : 0) - (b.trend ? b.value / b.trend : 0));
    excluded.push({ index: i, hasRow: hasRow[i], shortfalls });
  }

  return {
    lastCompleteIndex,
    trimmedDays,
    completeDays: lastCompleteIndex + 1,
    feeds: verdicts,
    excluded,
    reason: 'feed-lag',
  };
}

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
  /**
   * Trailing days excluded from the reported window because the feed is still
   * landing. These are NOT missing data and NOT an alert — the numbers on the
   * page simply stop before them, and this says where.
   */
  pendingDays: number;
  /** yyyy-MM-dd of each excluded day, oldest first. */
  pendingDates: string[];
  /**
   * The informational sentence for those days, naming the shortfall. Set
   * whenever pendingDays > 0. It has its own field because it must not be
   * rendered in the same amber as `headline`: "the last two days are still
   * arriving" is routine, "eleven days never arrived" is not, and a client who
   * sees the same warning for both learns to ignore the one that matters.
   */
  pendingHeadline: string | null;
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
  pendingDays: 0,
  pendingDates: [],
  pendingHeadline: null,
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
 * Days still inside the feed-lag grace window that have not produced a row.
 *
 * These are the days the assessment below deliberately does not count against
 * the account. Reporting them as nothing at all is what let "All clear — no
 * active alerts" render directly above a £432 day: the grace window took them
 * out of the assessment and nobody put them back anywhere else.
 */
const gracePending = (windowDays: Date[], present: Set<string>, cutoffKey: string): string[] =>
  windowDays.map(dayKey).filter((k) => k > cutoffKey && !present.has(k));

/**
 * Work out how much of the selected window the sales series actually covers.
 *
 * @param windowDays every calendar day in the selected period, in order.
 * @param presentKeys the yyyy-MM-dd days that carry a sales row.
 * @param now         injected for testability; defaults to the current time.
 * @param pending     trailing days already cut from the window by
 *                    `findLastCompleteDay`, with the sentence explaining them.
 *                    Supplying this means the trailing edge has been established
 *                    by VOLUME, so the blanket grace cutoff is not applied on
 *                    top: every day still in `windowDays` is one we expect to
 *                    be whole, and a hole in it is a real hole.
 */
export function assessCompleteness(
  windowDays: Date[],
  presentKeys: Iterable<string>,
  now: Date = new Date(),
  pending?: { dates: string[]; note: string | null } | null,
): DataCompleteness {
  const pendingDates = pending?.dates ?? [];
  const pendingHeadline = pendingDates.length ? (pending?.note ?? null) : null;
  const withPending = (c: DataCompleteness): DataCompleteness => ({
    ...c,
    pendingDays: pendingDates.length,
    pendingDates,
    pendingHeadline,
  });

  if (!windowDays.length) return withPending(COMPLETENESS_UNKNOWN);

  const present = new Set(presentKeys);

  // The trailing edge of the window is not assessable yet: the feed has not had
  // time to land. Everything up to that cutoff should be here by now.
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoff.setDate(cutoff.getDate() - (1 + FEED_LAG_GRACE_DAYS));
  const cutoffKey = dayKey(cutoff);

  // When the caller has already truncated by volume, the whole window is fair
  // game; otherwise fall back to the blanket cutoff and surface whatever it
  // swallowed as pending rather than as silence.
  const truncated = pendingDates.length > 0;
  const allKeys = windowDays.map(dayKey);
  const assessable = truncated ? allKeys : allKeys.filter((k) => k <= cutoffKey);

  if (!truncated) {
    const swallowed = gracePending(windowDays, present, cutoffKey);
    if (swallowed.length) {
      const last = swallowed.length === 1 ? prettyDate(swallowed[0]) : null;
      const note = last
        ? `${last} has not been delivered yet. Amazon's feeds land a day behind, and the vendor feed three, so the most recent day of a period is routinely still in transit.`
        : `The last ${swallowed.length} days have not been delivered yet. Amazon's feeds land a day behind, and the vendor feed three, so the most recent days of a period are routinely still in transit.`;
      return withPending({
        ...assessOn(assessable, present, allKeys),
        pendingDays: swallowed.length,
        pendingDates: swallowed,
        pendingHeadline: note,
      });
    }
  }

  if (!assessable.length) return withPending(COMPLETENESS_UNKNOWN);
  return withPending(assessOn(assessable, present, allKeys));
}

/** The presence assessment itself, over whichever days the caller ruled fair. */
function assessOn(
  assessable: string[],
  present: Set<string>,
  windowKeys: string[],
): DataCompleteness {
  if (!assessable.length) return COMPLETENESS_UNKNOWN;

  const missing = assessable.filter((k) => !present.has(k));
  const expectedDays = assessable.length;
  const presentDays = expectedDays - missing.length;
  const coverage = presentDays / expectedDays;

  // The last day with data anywhere in the window, not just the assessable part.
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
    // Filled in by assessCompleteness, which is the only thing that knows what
    // was cut off the trailing edge before this ran.
    pendingDays: 0,
    pendingDates: [],
    pendingHeadline: null,
  };
}

const compact = (v: number) =>
  new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Math.round(v));

/**
 * Turn a truncation into the dates it removed and the sentence explaining them.
 *
 * The sentence names every excluded day WITH ITS OWN FIGURE and the trend it
 * fell short of, because that is the difference between excluding a day and
 * hiding one. If the 16th really did collapse rather than merely arrive late,
 * the number that says so is right there in the note.
 *
 * @param dayKeys yyyy-MM-dd for every day of the untruncated window, in order.
 */
export function describeTrailingLag(
  truncation: WindowTruncation,
  dayKeys: string[],
): { dates: string[]; note: string | null } {
  if (truncation.reason !== 'feed-lag' || !truncation.excluded.length) {
    return { dates: [], note: null };
  }
  const dates = truncation.excluded.map((e) => dayKeys[e.index]).filter(Boolean);
  if (!dates.length) return { dates: [], note: null };

  const detail = truncation.excluded
    .map((e) => {
      const when = prettyDate(dayKeys[e.index] ?? '');
      if (!e.hasRow) return `${when} (nothing delivered yet)`;
      const worst = e.shortfalls[0];
      if (!worst) return `${when} (part-delivered)`;
      return `${when} (${worst.label} ${compact(worst.value)} against a ${compact(worst.trend)}/day trend)`;
    })
    .join(', ');

  const lastComplete = prettyDate(dayKeys[truncation.lastCompleteIndex] ?? '');
  const n = truncation.trimmedDays;
  return {
    dates,
    note:
      `The last ${n === 1 ? 'day is' : `${n} days are`} still landing, so both this period and the one ` +
      `it is compared against stop on ${lastComplete} — ${truncation.completeDays} complete days each side. ` +
      `Excluded: ${detail}.`,
  };
}

/** Human list of the missing days, truncated. */
export function describeMissingDates(c: DataCompleteness): string | null {
  if (!c.missingDates.length) return null;
  const named = c.missingDates.map(prettyDate).join(', ');
  const rest = c.missingDays - c.missingDates.length;
  return rest > 0 ? `Missing: ${named} and ${rest} more.` : `Missing: ${named}.`;
}
