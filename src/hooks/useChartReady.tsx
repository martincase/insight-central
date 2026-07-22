import { useEffect, useRef, useState } from 'react';

/**
 * Fixes the Recharts ResponsiveContainer "blank until resize" race, and also
 * the "sectors never draw because data arrived after mount" race.
 * Pass `readyDep` = something that changes when the chart's data becomes
 * available (e.g. the number of data points). Returns a ref for the wrapper
 * div and a `key` that changes once the container is measured AND whenever
 * readyDep changes, forcing the ResponsiveContainer/chart to remount cleanly.
 */
export function useChartReady(readyDep?: unknown) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let settled = false;
    const bump = () => {
      if (settled) return;
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        settled = true;
        setChartKey((k) => k + 1);
      }
    };

    bump();
    raf = requestAnimationFrame(bump);
    const t = setTimeout(bump, 120);

    const ro = new ResizeObserver(() => bump());
    ro.observe(el);

    const t2 = setTimeout(() => window.dispatchEvent(new Event('resize')), 60);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      clearTimeout(t2);
      ro.disconnect();
    };
    // Re-run (fresh measure + a new remount) whenever the data-ready signal changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyDep]);

  return { ref, chartKey };
}
