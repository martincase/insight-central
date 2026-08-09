/**
 * Data-quality guards for the stock / inventory panels.
 *
 * Background: Windsor.ai was a third-party data pipeline that fed several
 * inventory tables before being progressively replaced by native SP-API feeds.
 * Its subscription lapsed and the API now returns its own billing error string
 * in place of real rows:
 *
 *   "Uh-oh! License expired. Buy here: https://windsor.ai/pricing/"
 *
 * That string was ingested and now sits in the identifier and name columns of
 * `fba_inventory_data` and `vendor_inventory_data`. It is not a product. It must
 * never be listed, counted toward a product/stock total, linked to Amazon, or
 * exported to a client.
 *
 * These helpers are the single place that decides what a supplier error row
 * looks like, so every stock fetcher filters it identically.
 */

const FEED_ERROR_PATTERNS: RegExp[] = [
  /licen[cs]e\s+expired/i,
  /windsor\.ai/i,
  /^\s*uh-?oh[!,.:\s]/i,
];

/** True when a single field value is a supplier feed error rather than real data. */
export function isFeedErrorValue(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  return FEED_ERROR_PATTERNS.some((re) => re.test(value));
}

/** True when any identifier/name field on a row carries the supplier error signature. */
export function isFeedErrorRow(...values: unknown[]): boolean {
  return values.some(isFeedErrorValue);
}

/**
 * Strip supplier error rows from a fetched result set.
 * Returns the clean rows plus how many were removed, so a panel can tell the
 * difference between "no data" and "the whole feed was an error message".
 */
export function stripFeedErrorRows<T>(
  rows: T[] | null | undefined,
  pick: (row: T) => unknown[],
): { clean: T[]; removed: number } {
  const all = rows || [];
  const clean = all.filter((r) => !isFeedErrorRow(...pick(r)));
  return { clean, removed: all.length - clean.length };
}

/**
 * Coerce a numeric field without turning absence into zero.
 * `null`/`undefined`/'' stay null so the UI can render "—" rather than
 * claiming a real value of 0 (which for stock reads as "out of stock").
 */
export function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Whole days between a yyyy-mm-dd (or ISO) date and today. Null if unparseable. */
export function ageInDays(date: string | null | undefined): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(t))) / 86_400_000);
}

/** A stock snapshot older than this is reported as stale rather than as fact. */
export const STOCK_SNAPSHOT_STALE_DAYS = 3;

/** Stockout history older than this is reported as frozen rather than as "current". */
export const STOCKOUT_HISTORY_STALE_DAYS = 14;
