import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScatterDataPoint {
  x: number;
  y: number;
  keyword: string;
  verdict: string;
  maturity: number;
}

interface BidImpactScatterChartProps {
  data: ScatterDataPoint[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm truncate max-w-[200px]">{data.keyword}</p>
        <div className="text-xs text-muted-foreground mt-1 space-y-1">
          <p>Bid Change: <span className={data.x >= 0 ? 'text-green-500' : 'text-red-500'}>{data.x >= 0 ? '+' : ''}{data.x.toFixed(1)}%</span></p>
          <p>Sales Change: <span className={data.y >= 0 ? 'text-green-500' : 'text-red-500'}>{data.y >= 0 ? '+' : ''}{data.y.toFixed(1)}%</span></p>
          <p>Data Maturity: {data.maturity.toFixed(0)}%</p>
        </div>
      </div>
    );
  }
  return null;
};

const getPointColor = (verdict: string): string => {
  switch (verdict) {
    case 'positive': return '#22c55e';
    case 'negative': return '#ef4444';
    case 'neutral': return '#f59e0b';
    default: return '#6b7280';
  }
};

export const BidImpactScatterChart = ({ data, loading }: BidImpactScatterChartProps) => {
  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Bid vs Sales Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Bid vs Sales Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for scatter chart
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Bid vs Sales Impact</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Bid Change" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                label={{ value: 'Bid Change %', position: 'bottom', offset: 0, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Sales Change" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                label={{ value: 'Sales Change %', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={2} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter name="Impact" data={data}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getPointColor(entry.verdict)} 
                    opacity={0.7 + (entry.maturity / 100) * 0.3}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Positive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Neutral</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
