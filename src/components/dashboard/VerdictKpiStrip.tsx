import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { Bucket, Verdict } from '@/hooks/useKeywordPriority';

interface SummaryRow {
  verdict: Verdict;
  keywords: number;
  spend: number;
  sales: number;
  search_volume: number | null;
}

const VERDICT_ORDER: Verdict[] = ['Working', 'Scale', 'Fix', 'Cut', 'Watch'];

const dotClass = (v: Verdict) =>
  ({
    Working: 'bg-green-500',
    Scale: 'bg-blue-500',
    Fix: 'bg-amber-500',
    Cut: 'bg-red-500',
    Watch: 'bg-gray-400',
  }[v]);

const textClass = (v: Verdict) =>
  ({
    Working: 'text-green-700',
    Scale: 'text-blue-700',
    Fix: 'text-amber-700',
    Cut: 'text-red-700',
    Watch: 'text-gray-600',
  }[v]);

interface Props {
  accountName: string;
  windowWeeks: 8 | 13;
  bucket: Bucket;
  activeVerdict: Verdict | 'all';
  onVerdictClick: (v: Verdict) => void;
}

export function VerdictKpiStrip({
  accountName,
  windowWeeks,
  bucket,
  activeVerdict,
  onVerdictClick,
}: Props) {
  const [data, setData] = useState<Record<Verdict, SummaryRow | undefined>>(
    {} as any,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountName) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: rows } = await supabase
          .from('vw_keyword_priority_summary' as any)
          .select('verdict,keywords,spend,sales,search_volume')
          .eq('account_name', accountName)
          .eq('window_weeks', windowWeeks)
          .eq('bucket', bucket);
        if (cancelled) return;
        const map: Record<string, SummaryRow> = {};
        for (const r of (rows || []) as any[]) {
          map[r.verdict] = {
            verdict: r.verdict,
            keywords: Number(r.keywords) || 0,
            spend: Number(r.spend) || 0,
            sales: Number(r.sales) || 0,
            search_volume: r.search_volume == null ? null : Number(r.search_volume),
          };
        }
        setData(map as any);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountName, windowWeeks, bucket]);

  const cards = useMemo(
    () =>
      VERDICT_ORDER.map((v) => ({
        verdict: v,
        row: data[v] || { verdict: v, keywords: 0, spend: 0, sales: 0, search_volume: 0 },
      })),
    [data],
  );

  if (loading && Object.keys(data).length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {VERDICT_ORDER.map((v) => (
          <Skeleton key={v} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map(({ verdict, row }) => {
        const active = activeVerdict === verdict;
        return (
          <Card
            key={verdict}
            onClick={() => onVerdictClick(verdict)}
            className={`cursor-pointer transition-all hover:shadow-md ${
              active ? 'ring-2 ring-primary border-primary' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block h-2 w-2 rounded-full ${dotClass(verdict)}`} />
                <span className={`text-sm font-semibold ${textClass(verdict)}`}>{verdict}</span>
              </div>
              <div className="text-2xl font-bold">{formatNumber(row.keywords)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCurrency(row.spend)} spend → {formatCurrency(row.sales)} sales
              </div>
              {verdict === 'Cut' && (
                <div className="text-[11px] text-red-600 mt-1">wasted spend candidate</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default VerdictKpiStrip;
