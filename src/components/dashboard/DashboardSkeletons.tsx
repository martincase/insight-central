import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const MetricsGridSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i} className="bg-white">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const SalesHeatmapSkeleton = () => (
  <Card className="bg-white">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex gap-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-1 flex-1">
              {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                <Skeleton key={col} className="h-8 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <Card className="bg-white">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex gap-4 pb-2 border-b">
          {[1, 2, 3, 4, 5].map((col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4 py-2">
            {[1, 2, 3, 4, 5].map((col) => (
              <Skeleton key={col} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const ChartSkeleton = () => (
  <Card className="bg-white">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-end gap-2 pt-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1" 
            style={{ height: `${Math.random() * 60 + 40}%` }} 
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const MonthlyPerformanceSkeleton = () => (
  <Card className="bg-white">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-8 w-40" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-72 flex items-end gap-3 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1">
            <Skeleton className="flex-1" style={{ height: `${Math.random() * 50 + 30}%` }} />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const PPCDashboardSkeleton = () => (
  <Card className="bg-white">
    <CardHeader>
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-4 w-48 mt-2" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-lg">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={4} />
    </CardContent>
  </Card>
);
