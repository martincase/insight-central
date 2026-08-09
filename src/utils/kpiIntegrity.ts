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
