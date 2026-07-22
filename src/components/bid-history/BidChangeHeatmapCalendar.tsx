import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarDataPoint {
  date: string;
  count: number;
  avgChange: number;
}

interface BidChangeHeatmapCalendarProps {
  data: CalendarDataPoint[];
  loading?: boolean;
}

export const BidChangeHeatmapCalendar = ({ data, loading }: BidChangeHeatmapCalendarProps) => {
  const dataMap = useMemo(() => {
    const map = new Map<string, CalendarDataPoint>();
    data.forEach(d => map.set(d.date, d));
    return map;
  }, [data]);

  const months = useMemo(() => {
    const now = new Date();
    return [subMonths(now, 1), now];
  }, []);

  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-muted/30';
    if (count === 1) return 'bg-primary/20';
    if (count <= 3) return 'bg-primary/40';
    if (count <= 5) return 'bg-primary/60';
    return 'bg-primary/80';
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Bid Change Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Bid Change Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="space-y-4">
            {months.map((month) => {
              const start = startOfMonth(month);
              const end = endOfMonth(month);
              const days = eachDayOfInterval({ start, end });
              const startDay = start.getDay(); // 0 = Sunday

              return (
                <div key={format(month, 'yyyy-MM')}>
                  <p className="text-xs text-muted-foreground mb-2">{format(month, 'MMMM yyyy')}</p>
                  <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={i} className="text-[10px] text-muted-foreground text-center">
                        {day}
                      </div>
                    ))}
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-6 h-6" />
                    ))}
                    {days.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayData = dataMap.get(dateStr);
                      const count = dayData?.count || 0;
                      const avgChange = dayData?.avgChange || 0;

                      return (
                        <Tooltip key={dateStr}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-6 h-6 rounded-sm ${getIntensity(count)} cursor-default transition-colors hover:ring-1 hover:ring-primary/50`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">{format(day, 'MMM d, yyyy')}</p>
                            {count > 0 ? (
                              <>
                                <p>{count} bid change{count > 1 ? 's' : ''}</p>
                                <p>Avg: {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}%</p>
                              </>
                            ) : (
                              <p className="text-muted-foreground">No bid changes</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
        <div className="flex items-center justify-center gap-1 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-muted/30" />
          <div className="w-3 h-3 rounded-sm bg-primary/20" />
          <div className="w-3 h-3 rounded-sm bg-primary/40" />
          <div className="w-3 h-3 rounded-sm bg-primary/60" />
          <div className="w-3 h-3 rounded-sm bg-primary/80" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
};
