import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { usePythonFinancialWeekly } from '@/hooks/usePythonFinancialWeekly';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  accountName: string;
}

const fmtWeek = (w: string) => {
  try {
    return format(new Date(w), 'dd MMM');
  } catch {
    return w;
  }
};

export function WeeklyFinancialTrend({ accountName }: Props) {
  const { weekly, loading, error, cogsSupplied } = usePythonFinancialWeekly(accountName);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly P&L Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !weekly.length) {
    return null;
  }

  const marginLabel = cogsSupplied ? 'Net margin %' : 'Pre-COGS margin %';
  const chartData = weekly.map((w) => ({
    week: fmtWeek(w.week_start),
    revenue: Math.round(w.total_sales_revenue),
    netProceeds: Math.round(w.net_proceeds),
    margin: Number(w.net_margin_pct.toFixed(2)),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Weekly P&L Trend</CardTitle>
              <CardDescription>
                Revenue, net proceeds and {marginLabel.toLowerCase()} across all available weeks
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={cogsSupplied ? 'default' : 'secondary'}
            className={
              cogsSupplied
                ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-500 text-white'
            }
          >
            COGS supplied: {cogsSupplied ? 'Yes' : 'No'}
          </Badge>
        </div>
        {!cogsSupplied && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            No COGS data supplied — margin shown excludes product cost ("pre-COGS").
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                yAxisId="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(v: any, name: any) => {
                  if (name === marginLabel) return [`${Number(v).toFixed(2)}%`, name];
                  return [formatCurrency(Number(v)), name];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Total revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="netProceeds"
                name="Net proceeds"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="margin"
                name={marginLabel}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
