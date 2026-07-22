import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceDot,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { BidHistoryTimelineData } from '@/types/bidHistory';
import { format } from 'date-fns';

interface BidTimelineChartProps {
  timelineData: BidHistoryTimelineData[];
  onClearSelection: () => void;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 87%, 65%)',
  'hsl(199, 89%, 48%)',
];

export const BidTimelineChart = ({ timelineData, onClearSelection }: BidTimelineChartProps) => {
  // Merge all data points into a unified dataset
  const chartData = useMemo(() => {
    if (timelineData.length === 0) return [];

    // Get all unique dates
    const allDates = new Set<string>();
    timelineData.forEach(kw => {
      kw.dataPoints.forEach(dp => allDates.add(dp.date));
    });

    // Sort dates
    const sortedDates = Array.from(allDates).sort();

    // Build chart data
    return sortedDates.map(date => {
      const point: Record<string, any> = { date };
      
      timelineData.forEach(kw => {
        const dp = kw.dataPoints.find(p => p.date === date);
        if (dp) {
          point[String(kw.keyword_id)] = dp.bid;
          point[`${kw.keyword_id}_isChange`] = dp.isChange;
          point[`${kw.keyword_id}_changeAmount`] = dp.changeAmount;
          point[`${kw.keyword_id}_changePct`] = dp.changePct;
        }
      });

      return point;
    });
  }, [timelineData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">
          {format(new Date(label), 'dd MMM yyyy')}
        </p>
        {payload.map((entry: any, index: number) => {
          const keywordId = entry.dataKey;
          const keyword = timelineData.find(k => String(k.keyword_id) === keywordId);
          const isChange = entry.payload[`${keywordId}_isChange`];
          const changeAmount = entry.payload[`${keywordId}_changeAmount`];
          const changePct = entry.payload[`${keywordId}_changePct`];

          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground truncate max-w-[150px]">
                {keyword?.keyword_text}:
              </span>
              <span className="font-medium">£{entry.value?.toFixed(2)}</span>
              {isChange && changeAmount !== undefined && (
                <span className={changeAmount >= 0 ? 'text-green-500' : 'text-red-500'}>
                  ({changeAmount >= 0 ? '+' : ''}£{changeAmount.toFixed(2)}, {changePct >= 0 ? '+' : ''}{changePct}%)
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (timelineData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Bid Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>Click on a row in the table below to add keywords to the chart</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Bid Timeline</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'dd MMM')}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => `£${value.toFixed(2)}`}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => {
                  const kw = timelineData.find(k => k.keyword_id === value);
                  return kw?.keyword_text || value;
                }}
              />
              {timelineData.map((kw, index) => (
                <Line
                  key={kw.keyword_id}
                  type="monotone"
                  dataKey={String(kw.keyword_id)}
                  name={String(kw.keyword_id)}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload, dataKey } = props;
                    const isChange = payload[`${dataKey}_isChange`];
                    const changeAmount = payload[`${dataKey}_changeAmount`];
                    
                    if (!isChange) {
                      return <circle cx={cx} cy={cy} r={3} fill={COLORS[index % COLORS.length]} />;
                    }
                    
                    const fillColor = changeAmount >= 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)';
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={6} 
                        fill={fillColor}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {timelineData.map((kw, index) => (
            <div 
              key={kw.keyword_id}
              className="flex items-center gap-2 text-xs bg-muted/50 rounded-full px-3 py-1"
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate max-w-[200px]">{kw.keyword_text}</span>
              <span className="text-muted-foreground">({kw.sellername})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
