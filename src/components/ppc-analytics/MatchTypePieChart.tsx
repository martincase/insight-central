import React, { useMemo } from 'react';
import { getMatchTypeFriendlyName } from '@/utils/matchTypeUtils';

interface MatchTypeTotals {
  name: string;
  total_spend: number;
  total_sales: number;
  count: number;
}

interface MatchTypePieChartProps {
  matchTypeTotals: MatchTypeTotals[];
  metric?: 'spend' | 'sales';
}

const MATCH_TYPE_COLORS: Record<string, string> = {
  'Auto': '#06b6d4',
  'Exact': '#3b82f6',
  'Broad': '#22c55e',
  'Product': '#f97316',
  'Phrase': '#8b5cf6',
};

const FALLBACK_COLORS = ['#06b6d4', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899'];

export function MatchTypePieChart({ matchTypeTotals, metric = 'sales' }: MatchTypePieChartProps) {
  const chartData = useMemo(() => {
    return matchTypeTotals
      .map((item, i) => {
        const label = getMatchTypeFriendlyName(item.name);
        return {
          label,
          value: metric === 'spend' ? item.total_spend : item.total_sales,
          spend: item.total_spend,
          sales: item.total_sales,
          count: item.count,
          color: MATCH_TYPE_COLORS[label] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [matchTypeTotals, metric]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (chartData.length === 0 || total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 192, color: '#9ca3af', fontSize: 14 }}>
        No match type data available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stacked horizontal bar */}
      <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', width: '100%' }}>
        {chartData.map((d, i) => (
          <div
            key={i}
            style={{
              backgroundColor: d.color,
              width: `${(d.value / total) * 100}%`,
              minWidth: 2,
              transition: 'width 0.3s ease',
            }}
            title={`${d.label}: ${((d.value / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Individual bars with labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chartData.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: d.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'inherit' }}>{d.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7280' }}>£{d.value.toFixed(0)}</span>
                  <span style={{ fontWeight: 600, color: 'inherit', minWidth: 36, textAlign: 'right' }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: d.color,
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
