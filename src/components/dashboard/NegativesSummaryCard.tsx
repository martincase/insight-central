import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/utils/formatters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Props {
  accountName: string;
  merchantToken?: string | null;
}

interface Stats {
  pending: number;
  pushed: number;
  wastedSpend: number;
}

interface RecentRow {
  id: string;
  keyword: string | null;
  rule: string | null;
  status: 'pending' | 'pushed' | string;
  source_spend: number | null;
  date: string | null;
}

export function NegativesSummaryCard({ accountName, merchantToken }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Resolve profile_id via accounts_master
        let profileId: number | null = null;
        if (merchantToken) {
          const { data } = await supabase
            .from('accounts_master')
            .select('profile_id')
            .eq('merchant_token', merchantToken)
            .limit(1)
            .maybeSingle();
          profileId = (data as any)?.profile_id ?? null;
        }
        if (!profileId) {
          const { data } = await supabase
            .from('accounts_master')
            .select('profile_id')
            .eq('account_name', accountName)
            .limit(1)
            .maybeSingle();
          profileId = (data as any)?.profile_id ?? null;
        }
        if (!profileId) {
          if (!cancelled) { setStats(null); setRecent([]); }
          return;
        }

        const { data: pending } = await supabase
          .from('pending_negatives')
          .select('id, keyword_text, rule_triggered, status, source_spend, created_at')
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false });

        const rows = (pending as any[]) || [];
        const pendingCount = rows.filter((r) => r.status === 'pending').length;
        let pushedCount = rows.filter((r) => r.status === 'pushed').length;
        const wasted = rows.reduce((s, r) => s + (Number(r.source_spend) || 0), 0);

        const { data: logRows, count: logPushed } = await supabase
          .from('negative_keyword_log')
          .select('id, keyword_text, rule_triggered, pushed_at', { count: 'exact' })
          .eq('profile_id', profileId)
          .order('pushed_at', { ascending: false })
          .limit(50);
        if (typeof logPushed === 'number' && logPushed > pushedCount) pushedCount = logPushed;

        // Build merged recent list
        const merged: RecentRow[] = [
          ...rows.map((r: any) => ({
            id: `p-${r.id}`,
            keyword: r.keyword_text ?? null,
            rule: r.rule_triggered ?? null,
            status: r.status ?? 'pending',
            source_spend: r.source_spend ?? null,
            date: r.created_at ?? null,
          })),
          ...(((logRows as any[]) || []).map((r: any) => ({
            id: `l-${r.id}`,
            keyword: r.keyword_text ?? null,
            rule: r.rule_triggered ?? null,
            status: 'pushed' as const,
            source_spend: null,
            date: r.pushed_at ?? null,
          }))),
        ]
          .filter(r => r.date)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          .slice(0, 20);

        if (!cancelled) {
          if (rows.length === 0 && !logPushed) {
            setStats(null);
            setRecent([]);
          } else {
            setStats({ pending: pendingCount, pushed: pushedCount, wastedSpend: wasted });
            setRecent(merged);
          }
        }
      } catch (e) {
        console.warn('NegativesSummaryCard error', e);
        if (!cancelled) { setStats(null); setRecent([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountName, merchantToken]);

  if (loading || !stats) return null;

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Negative Keyword Automation</CardTitle>
            <CardDescription>Candidates and pushed negatives for this account</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tile label="Candidates pending" value={stats.pending.toLocaleString()} />
          <Tile label="Pushed to Amazon" value={stats.pushed.toLocaleString()} />
          <Tile
            label="Wasted spend identified"
            value={formatCurrency(stats.wastedSpend)}
            caption="All-time across logged candidates"
          />
        </div>

        {recent.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Recent negatives</h4>
              <span className="text-xs text-muted-foreground">Most recent {recent.length}</span>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword / term</TableHead>
                    <TableHead>Rule triggered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Source spend</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs max-w-[260px] truncate" title={r.keyword || ''}>{r.keyword || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.rule || '—'}</TableCell>
                      <TableCell>
                        {r.status === 'pushed' ? (
                          <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 dark:bg-green-950/40 text-xs">pushed</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs">pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">{r.source_spend != null ? formatCurrency(Number(r.source_spend)) : '—'}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{fmtDate(r.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Tile({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {caption && <div className="text-[11px] text-muted-foreground/70 mt-1">{caption}</div>}
    </div>
  );
}
