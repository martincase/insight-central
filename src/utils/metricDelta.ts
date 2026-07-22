/**
 * Shared semantic colour helper for delta / change indicators.
 *
 * Performance metrics: higher = better (green ↑, red ↓).
 * Cost-sentiment-inverted metrics: lower = better (green ↓, red ↑).
 *
 * Pass a delta as either a percentage (e.g. WoW %) or absolute difference;
 * sign is what matters.
 */

export type MetricKey =
  // performance (higher is better)
  | 'sales'
  | 'units'
  | 'orders'
  | 'clicks'
  | 'impressions'
  | 'ctr'
  | 'cvr'
  | 'roas'
  | 'ppcSales'
  | 'brandShare'
  | 'profit'
  | 'margin'
  // cost / efficiency (lower is better)
  | 'acos'
  | 'tacos'
  | 'cpc'
  | 'cpa'
  | 'spend'
  | 'ppcSpend'
  | 'cost';

const INVERTED: ReadonlySet<MetricKey> = new Set([
  'acos',
  'tacos',
  'cpc',
  'cpa',
  'spend',
  'ppcSpend',
  'cost',
]);

export const isInvertedMetric = (key: MetricKey): boolean => INVERTED.has(key);

/** Returns a Tailwind text-colour class for the delta given the metric semantics. */
export function metricDeltaTone(key: MetricKey, delta: number | null | undefined): string {
  if (delta == null || !Number.isFinite(delta) || Math.abs(delta) < 0.01) {
    return 'text-muted-foreground';
  }
  const positive = delta > 0;
  const good = INVERTED.has(key) ? !positive : positive;
  return good ? 'text-green-600' : 'text-red-600';
}

/** Convenience: pick from a small palette by tone. */
export function deltaToneFor(invert: boolean, delta: number | null | undefined): string {
  if (delta == null || !Number.isFinite(delta) || Math.abs(delta) < 0.01) {
    return 'text-muted-foreground';
  }
  const positive = delta > 0;
  const good = invert ? !positive : positive;
  return good ? 'text-green-600' : 'text-red-600';
}
