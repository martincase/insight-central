import type { CSSProperties } from 'react';

/**
 * The one heatmap scale for the whole app.
 *
 * Every intensity heatmap in this codebase reads off this module. It used to be
 * per-component: the metrics heatmap had this ramp, the country grid had two
 * ramps (blue AND emerald) in a single table with no stated difference in
 * meaning, and the bid calendar had Tailwind opacity steps on --primary. Three
 * grids, three visual languages, one reader. Colour now means the same thing
 * everywhere: darker = stronger.
 *
 * Accessible monochrome-blue heatmap ramp.
 *
 * Kept deliberately monochrome (safe for deuteranopia / protanopia). The ramp is
 * spread across the widest usable luminance range (relative luminance 0.81 -> 0.05,
 * i.e. an 8.5:1 span, vs the previous blue-100 -> blue-500 span of 3.0:1) so that
 * adjacent steps are as separable as a 5-step sequential scale can be.
 *
 * Ink is chosen per step so every cell's label clears WCAG AA (4.5:1):
 *   #dbeafe + #0a1633 = 14.6:1
 *   #7bb6fc + #0a1633 =  8.5:1
 *   #3b82f6 + #0a1633 =  4.9:1
 *   #2055df + #ffffff =  6.1:1
 *   #1e3a8a + #ffffff = 10.4:1
 */
export const HEATMAP_INK_DARK = '#0a1633';
export const HEATMAP_INK_LIGHT = '#ffffff';

export interface HeatmapRampStep {
  bg: string;
  fg: string;
  label: string;
}

export const HEATMAP_RAMP: HeatmapRampStep[] = [
  { bg: '#dbeafe', fg: HEATMAP_INK_DARK, label: 'weakest' },
  { bg: '#7bb6fc', fg: HEATMAP_INK_DARK, label: 'weak' },
  { bg: '#3b82f6', fg: HEATMAP_INK_DARK, label: 'mid' },
  { bg: '#2055df', fg: HEATMAP_INK_LIGHT, label: 'strong' },
  { bg: '#1e3a8a', fg: HEATMAP_INK_LIGHT, label: 'strongest' },
];

// "No data" is encoded with a diagonal hatch, NOT just a pale colour, so an empty
// day can never be mistaken for a bad day. Ink clears 4.5:1 on both the base and
// the hatch lines (13.4:1 and 5.7:1).
export const HEATMAP_NO_DATA_STYLE: CSSProperties = {
  backgroundColor: '#f1f5f9',
  backgroundImage:
    'repeating-linear-gradient(45deg, #94a3b8 0, #94a3b8 1px, transparent 1px, transparent 6px)',
  color: '#1e293b',
};

/** Which of the five steps an already-normalised 0..1 intensity lands on. */
export const getHeatmapRampStep = (intensity: number): HeatmapRampStep => {
  const i = Number.isFinite(intensity) ? Math.min(Math.max(intensity, 0), 1) : 0;
  const idx = i < 0.2 ? 0 : i < 0.4 ? 1 : i < 0.6 ? 2 : i < 0.8 ? 3 : 4;
  return HEATMAP_RAMP[idx];
};

/**
 * `hasValue` must drive the hatch, NOT `intensity === 0`. For the inverse metrics
 * (ACOS / TACOS) intensity is `1 - value/max`, so the single WORST day in the window
 * lands on exactly 0 — which would paint a real, reported, bad day as "no data".
 *
 * Callers that can tell a reported zero from an absent row (the country grid can:
 * the feed either produced a row for that day or it did not) should pass that,
 * not `value !== 0`. A real zero belongs on the weakest ramp step, never hatched.
 */
export const getHeatmapCellStyle = (intensity: number, hasValue: boolean): CSSProperties => {
  if (!hasValue) return HEATMAP_NO_DATA_STYLE;
  const step = getHeatmapRampStep(intensity);
  return { backgroundColor: step.bg, color: step.fg };
};

/**
 * Metrics where lower values = better performance, so the ramp is flipped and the
 * cheapest day is the darkest. Keys are the metric identifiers each grid uses;
 * matching is case-insensitive so a grid labelling its row "ACOS" still inverts.
 */
export const HEATMAP_INVERSE_METRICS: ReadonlySet<string> = new Set(['acos', 'tacos']);

export const isInverseHeatmapMetric = (metric: string): boolean =>
  HEATMAP_INVERSE_METRICS.has(metric.toLowerCase());

/**
 * Normalise a value against its row/column max into a 0..1 intensity, flipping
 * it for cost metrics so darker blue always reads as "better".
 *
 * Zero short-circuits to 0 rather than to `1 - 0 = 1`: an unreported inverse-metric
 * day would otherwise come out the darkest cell in the row. An unusable max does
 * the same, for the same reason — a value that cannot be normalised must land on
 * the palest step, never be promoted to the strongest cell on screen.
 */
export const heatmapIntensity = (value: number, maxValue: number, inverse = false): number => {
  if (!value || !(maxValue > 0)) return 0;
  const raw = value / maxValue;
  return inverse ? 1 - raw : raw;
};
