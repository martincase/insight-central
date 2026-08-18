import { isToday, isYesterday } from 'date-fns';
import { isAcosDefined, isRatioMeaningful, RATIO_MIN_DENOMINATOR } from './formatters';

/**
 * What one heatmap cell should say — resolved once, for every grid.
 *
 * This lives outside SalesHeatmap because that component builds the same figures
 * twice (once per account for the selected metric, once per metric for the
 * focused account) and the two copies of the guard had already drifted into a
 * single shared bug. A rule that decides whether a client sees a percentage is
 * not something to keep two of.
 */
export type HeatmapMetric =
  | 'sales'
  | 'ppcSpend'
  | 'ppcSales'
  | 'acos'
  | 'tacos'
  | 'unitsOrdered'
  | 'pageViews'
  | 'buyBoxPercentage'
  | 'conversionRate';

/** One period's figures for one account, plus which feeds actually produced them. */
export interface PeriodInputs {
  sales: number;
  ppcSpend: number;
  ppcSales: number;
  unitsOrdered: number;
  pageViews: number;
  buyBoxPercentage: number;
  conversionRate: number;
  /** The sales/traffic feed returned a row for this period. NOT `sales > 0`. */
  hasSalesData: boolean;
  /** The ads feed returned a row for this period. NOT `spend > 0`. */
  hasPpcData: boolean;
}

/**
 * A cell in three states rather than two.
 *
 * `hasData` drives the hatch and nothing else — a shop that sold nothing on a
 * Sunday reported a zero, and a real zero belongs on the weakest ramp step, never
 * hatched. `isDefined` separates a figure that exists from one that cannot be
 * computed off a period that WAS reported; collapsing that middle state into
 * "we have a number" is how a day with no sales feed printed an ACOS.
 */
export interface MetricCell {
  value: number;
  hasData: boolean;
  isDefined: boolean;
  /** Why there is no figure, for the tooltip. Empty when there is one. */
  reason: string;
}

const NOT_REPORTED_REASON = 'not reported yet';

/**
 * Resolve one metric for one period.
 *
 * The ratios are the reason this exists. Cottam's 17 Aug held £1 of PPC spend
 * against £5 of attributed PPC sales while the sales feed had delivered nothing
 * at all for that day, and the old guard — `ppcSales > 0` — was happy to divide
 * them and print "ACOS 22.6%" beside a blank Sales cell and a blank Units cell.
 *
 * So a ratio is printed only when BOTH feeds have landed for the period AND the
 * denominator clears `RATIO_MIN_DENOMINATOR`. The first trickle of a
 * part-delivered day cannot become a headline percentage, and a day whose ads
 * feed arrived before its sales feed says so rather than guessing.
 */
export const resolveMetricCell = (metric: HeatmapMetric, p: PeriodInputs, date?: Date): MetricCell => {
  const reported = (value: number): MetricCell => ({
    value,
    hasData: p.hasSalesData,
    isDefined: p.hasSalesData,
    reason: p.hasSalesData ? '' : NOT_REPORTED_REASON,
  });

  // Both ratios need the sales feed, not just the ads feed: an efficiency figure
  // sitting next to an empty Sales cell is read as the day's real efficiency.
  const bothFeeds = p.hasSalesData && p.hasPpcData;
  const ratio = (numerator: number, denominator: number, denominatorLabel: string): MetricCell => {
    if (!bothFeeds) {
      return { value: 0, hasData: false, isDefined: false, reason: NOT_REPORTED_REASON };
    }
    if (isRatioMeaningful(numerator, denominator)) {
      return { value: (numerator / denominator) * 100, hasData: true, isDefined: true, reason: '' };
    }
    return {
      value: 0,
      hasData: true,
      isDefined: false,
      reason: isAcosDefined(numerator, denominator)
        ? `too little ${denominatorLabel} to divide by (under ${RATIO_MIN_DENOMINATOR})`
        : `no ${denominatorLabel} to divide by`,
    };
  };

  switch (metric) {
    case 'sales':
      return reported(p.sales);
    case 'unitsOrdered':
      return reported(p.unitsOrdered);
    case 'ppcSpend':
      return {
        value: p.ppcSpend,
        hasData: p.hasPpcData,
        isDefined: p.hasPpcData,
        reason: p.hasPpcData ? '' : NOT_REPORTED_REASON,
      };
    case 'ppcSales':
      return {
        value: p.ppcSales,
        hasData: p.hasPpcData,
        isDefined: p.hasPpcData,
        reason: p.hasPpcData ? '' : NOT_REPORTED_REASON,
      };
    case 'acos':
      return ratio(p.ppcSpend, p.ppcSales, 'attributed sales');
    case 'tacos':
      return ratio(p.ppcSpend, p.sales, 'total sales');
    case 'pageViews':
    case 'buyBoxPercentage':
    case 'conversionRate': {
      const raw = metric === 'pageViews'
        ? p.pageViews
        : metric === 'buyBoxPercentage' ? p.buyBoxPercentage : p.conversionRate;
      // Traffic lags the sales row it sits in, so a zero on today or yesterday is
      // the feed still in flight rather than a day nobody visited.
      if (raw === 0 && date && (isToday(date) || isYesterday(date))) {
        return { value: 0, hasData: false, isDefined: false, reason: 'awaiting data (reporting lag)' };
      }
      // One click can carry more than one order, so units ÷ sessions genuinely
      // resolves above 1. The DATA is right; calling it a rate is what is wrong.
      if (metric === 'conversionRate' && raw > 100) {
        return {
          value: 0,
          hasData: p.hasSalesData,
          isDefined: false,
          reason: 'units exceed sessions — not a conversion rate',
        };
      }
      return reported(raw);
    }
    default:
      return reported(0);
  }
};
