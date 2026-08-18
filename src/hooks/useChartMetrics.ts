import { useCallback, useState } from 'react';

/**
 * The series the performance chart opens on.
 *
 * Sales is the figure every client looks for first; PPC impressions is the
 * volume context sitting behind it. They live on opposite axes, so neither
 * flattens the other the way two money series do.
 */
export const DEFAULT_CHART_METRICS = ['sales', 'impressions'];

/**
 * Metrics a vendor account cannot honestly plot.
 *
 * vw_daily_vendor_data carries no advertising columns at all, so the vendor
 * path in MonthlyPerformanceView writes a literal 0 for impressions. Drawing
 * that reads as a broken chart rather than as "Amazon does not give us this
 * for 1P" — so the series is withheld instead of flat-lined at zero.
 */
export const VENDOR_UNPLOTTABLE_METRICS = ['impressions'];

/** Whether this metric can be drawn for this account at all. */
export const isMetricPlottable = (metricKey: string, isVendor: boolean): boolean =>
  !isVendor || !VENDOR_UNPLOTTABLE_METRICS.includes(metricKey);

export interface UseChartMetricsResult {
  selectedChartMetrics: string[];
  setSelectedChartMetrics: React.Dispatch<React.SetStateAction<string[]>>;
  toggleChartMetric: (metricKey: string) => void;
}

/**
 * The KPI-card → chart selection.
 *
 * This lived as a byte-identical copy in SharedView, ClientView and Index,
 * which is three chances for the opening series to quietly drift apart — and
 * they had: two pages opened on sales + PPC sales, the third on units sold.
 *
 * Vendor filtering deliberately does NOT happen here. The pages do not know
 * the focused account at the point this hook runs (SharedView and ClientView
 * both fetch it), whereas the two components that actually draw the series —
 * MonthlyPerformanceView and MetricsGrid — already derive isVendor from the
 * merchant token. They apply isMetricPlottable at render instead, which also
 * keeps the raw selection intact so switching back to a seller account
 * restores what the user had chosen.
 */
export const useChartMetrics = (
  initialMetrics: string[] = DEFAULT_CHART_METRICS
): UseChartMetricsResult => {
  const [selectedChartMetrics, setSelectedChartMetrics] = useState<string[]>(initialMetrics);

  const toggleChartMetric = useCallback((metricKey: string) => {
    setSelectedChartMetrics(prev =>
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  }, []);

  return { selectedChartMetrics, setSelectedChartMetrics, toggleChartMetric };
};
