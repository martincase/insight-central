import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import type { Bucket, Verdict, KeywordPriorityRow } from '@/hooks/useKeywordPriority';

interface Props {
  accountName: string;
  windowWeeks: 8 | 13;
  bucket: Bucket;
  onPointClick: (row: KeywordPriorityRow) => void;
}

const colorFor = (v: Verdict | null | undefined): string => {
  switch (v) {
    case 'Working':
      return '#22c55e';
    case 'Scale':
      return '#3b82f6';
    case 'Fix':
      return '#f59e0b';
    case 'Cut':
      return '#ef4444';
    case 'Watch':
    default:
      return '#9ca3af';
  }
};

export function KeywordQuadrantScatter({ accountName, windowWeeks, bucket, onPointClick }: Props) {
  const [rows, setRows] = useState<KeywordPriorityRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('vw_keyword_priority' as any)
          .select('*')
          .eq('account_name', accountName)
          .eq('window_weeks', windowWeeks)
          .eq('bucket', bucket)
          .gte('ppc_clicks', 10)
          .order('ppc_spend', { ascending: false })
          .limit(300);
        if (!cancelled) setRows((data || []) as unknown as KeywordPriorityRow[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountName, windowWeeks, bucket]);

  const points = useMemo(() => {
    return rows
      .map((r) => {
        const xRaw = r.sq_volume != null ? Number(r.sq_volume) : Number(r.ppc_impressions ?? 0);
        const rc = r.rel_conversion != null ? Number(r.rel_conversion) : null;
        const x = Math.sqrt(Math.max(xRaw, 0));
        const y = rc == null ? null : Math.max(0, Math.min(2, rc));
        const z = Math.max(Number(r.ppc_spend ?? 0), 1);
        return { x, y, z, raw: r, verdict: r.verdict };
      })
      .filter((p) => p.y != null) as Array<{
      x: number;
      y: number;
      z: number;
      raw: KeywordPriorityRow;
      verdict: Verdict | null;
    }>;
  }, [rows]);

  const medianX = useMemo(() => {
    if (points.length === 0) return 0;
    const xs = [...points.map((p) => p.x)].sort((a, b) => a - b);
    return xs[Math.floor(xs.length / 2)];
  }, [points]);

  if (loading && points.length === 0) {
    return <Skeleton className="h-72 w-full" />;
  }
  if (!loading && points.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Not enough data (need keywords with ≥10 clicks and a relative-conversion signal).
      </div>
    );
  }

  return (
    <div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              dataKey="x"
              name="Search volume"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(v) => {
                const n = Math.round(v * v);
                if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                return `${n}`;
              }}
              label={{ value: 'Search volume (√)', position: 'insideBottom', offset: -10, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 2]}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              label={{
                value: 'Our CVR ÷ market',
                angle: -90,
                position: 'insideLeft',
                fontSize: 11,
              }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 400]} />
            <ReferenceLine y={1} stroke="#6b7280" strokeDasharray="3 3" label={{ value: 'market rate', fontSize: 10, fill: '#6b7280' }} />
            <ReferenceLine x={medianX} stroke="#6b7280" strokeDasharray="3 3" />
            <RTooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: 12,
              }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = (payload[0] as any).payload as typeof points[number];
                const r = p.raw;
                return (
                  <div className="rounded-md border bg-background p-2 text-xs">
                    <div className="font-semibold">{r.keyword}</div>
                    <div className="text-muted-foreground">{r.verdict ?? '—'}</div>
                    <div>Spend: {formatCurrency(Number(r.ppc_spend ?? 0))}</div>
                    <div>Sales: {formatCurrency(Number(r.ppc_sales ?? 0))}</div>
                    <div>ACOS: {r.acos != null ? `${Number(r.acos).toFixed(1)}%` : '—'}</div>
                  </div>
                );
              }}
            />
            <Scatter data={points} onClick={(e: any) => e?.raw && onPointClick(e.raw)}>
              {points.map((p, i) => (
                <Cell key={i} fill={colorFor(p.verdict)} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground text-center mt-1">
        Top 300 by spend, min 10 clicks · bubble size = spend · colour = verdict
      </div>
    </div>
  );
}

export default KeywordQuadrantScatter;
