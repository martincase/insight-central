import React from 'react';
import { cn } from '@/lib/utils';
import { HEATMAP_RAMP, HEATMAP_NO_DATA_STYLE } from '@/utils/heatmapScale';

interface HeatmapLegendProps {
  /**
   * Extra lines shown under the scale — the range label, a coverage warning,
   * anything grid-specific. Rendered inside the same column so the spacing
   * matches the swatch row.
   */
  children?: React.ReactNode;
  /**
   * Show the "for ACOS & TACOS lower is better" reversal note. Callers whose grid
   * holds no inverse metric pass false: the country grid's own subtitle says ACOS
   * and TACOS are not available at country level, and a key contradicting the
   * heading two lines above it is worse than a key that is one line shorter.
   * Drive it off the rows, not a constant, so the note reappears by itself the
   * day a cost metric is added.
   */
  showInverseNote?: boolean;
  /**
   * Show the "N/A" note. Two placeholders is one more than ideal, but the grids
   * that carry ratios genuinely hold three states, not two: reported, reported
   * but not computable (no denominator, or one too small to divide by), and not
   * reported at all. Collapsing the middle one into the hatch is what let a day
   * with no sales feed print an ACOS. Grids with no ratio row leave it off.
   */
  showNotComputableNote?: boolean;
  className?: string;
}

/**
 * The key for every intensity heatmap.
 *
 * Shared rather than copied so the grids cannot drift apart: one of them had no
 * key at all, which left the reader to guess whether a pale cell was a bad day
 * or a missing one. It sits ABOVE the grid in every caller — you need it to read
 * a cell, so it must not be 250px further down the page.
 */
export const HeatmapLegend = ({
  children,
  showInverseNote = true,
  showNotComputableNote = false,
  className,
}: HeatmapLegendProps) => (
  <div className={cn('mb-2 md:mb-3 flex flex-col gap-1.5 text-[11px] md:text-xs text-gray-700', className)}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-600">Weaker</span>
        <div className="flex items-center gap-0.5" role="img" aria-label="Blue intensity scale from weaker to stronger">
          {HEATMAP_RAMP.map(step => (
            <div
              key={step.bg}
              className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm border border-black/10"
              style={{ backgroundColor: step.bg }}
            />
          ))}
        </div>
        <span className="text-gray-600">Stronger</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm border border-black/10"
          style={HEATMAP_NO_DATA_STYLE}
        />
        <span className="text-gray-600">Hatched “—” = not reported</span>
      </div>
      {showNotComputableNote ? (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-600">
            <span className="font-semibold">N/A</span> = reported, but the figure can&apos;t be worked out
          </span>
        </div>
      ) : null}
    </div>
    {showInverseNote ? (
      <div className="text-gray-700">
        Darker blue = better. For <strong className="font-semibold">ACOS &amp; TACOS lower is better</strong>, so the lowest values are the darkest blue.
      </div>
    ) : (
      <div className="text-gray-700">Darker blue = better.</div>
    )}
    {children}
  </div>
);

export default HeatmapLegend;
