import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, isToday, isAfter } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Activity, Clock, AlertTriangle } from 'lucide-react';
import { ExcelExportButton } from './ExcelExportButton';

interface ApiUsageQueueProps {
  accountName: string;
}

export const ApiUsageQueue = ({ accountName }: ApiUsageQueueProps) => {
  const { data: calls, isLoading } = useQuery({
    queryKey: ['js-api-usage', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_api_usage' as any)
        .select('*')
        .eq('account_name', accountName)
        .order('called_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const stats = useMemo(() => {
    if (!calls?.length) return { total: 0, today: 0, thisWeek: 0 };
    const now = new Date();
    const weekAgo = subDays(startOfDay(now), 7);
    return {
      total: calls.length,
      today: calls.filter((c) => c.called_at && isToday(new Date(c.called_at))).length,
      thisWeek: calls.filter((c) => c.called_at && isAfter(new Date(c.called_at), weekAgo)).length,
    };
  }, [calls]);

  const chartData = useMemo(() => {
    if (!calls?.length) return [];
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      days[format(subDays(new Date(), i), 'yyyy-MM-dd')] = 0;
    }
    calls.forEach((c) => {
      if (!c.called_at) return;
      const day = format(new Date(c.called_at), 'yyyy-MM-dd');
      if (day in days) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: format(new Date(date), 'EEE'),
      calls: count,
    }));
  }, [calls]);

  if (isLoading) {
    return <div className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;
  }

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Total Calls</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Today</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{stats.today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> This Week</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{stats.thisWeek}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {calls?.length ? (
        <div className="flex justify-end mb-2">
          <ExcelExportButton data={calls} filename={`api-usage-${accountName}`} sheetName="API Usage" />
        </div>) : null}

      {calls?.length ? (
        <div className="border rounded-lg overflow-auto max-h-[350px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Called At</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.slice(0, 50).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.endpoint}</TableCell>
                  <TableCell className="text-right">{row.credits_used ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={row.response_status && row.response_status < 400 ? 'default' : 'destructive'}>
                      {row.response_status ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{row.called_at ? format(new Date(row.called_at), 'dd MMM HH:mm') : '—'}</TableCell>
                  <TableCell className="text-xs text-destructive max-w-[200px] truncate">{row.error_message ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No API calls recorded yet.</p>
      )}
    </div>
  );
};
