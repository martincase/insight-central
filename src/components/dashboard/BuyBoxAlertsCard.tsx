import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useBuyBoxAlerts, BuyBoxAlert } from '@/hooks/useBuyBoxAlerts';
import { AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BuyBoxAlertsCardProps {
  merchantToken: string;
  accountName: string;
}

export const BuyBoxAlertsCard = ({ merchantToken, accountName }: BuyBoxAlertsCardProps) => {
  const { alerts, loading, error } = useBuyBoxAlerts(merchantToken);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-muted-foreground" />
            Buy Box Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Buy Box Alerts — Error loading
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Buy Box — All Healthy
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const criticalCount = alerts.filter(a => a.alert_level === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.alert_level === 'WARNING').length;

  return (
    <Card className={criticalCount > 0 
      ? 'border-red-200 bg-red-50/50' 
      : 'border-orange-200 bg-orange-50/50'
    }>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className={criticalCount > 0 ? 'h-4 w-4 text-red-500' : 'h-4 w-4 text-orange-500'} />
          Buy Box Alerts
          <div className="flex gap-1.5 ml-auto">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400 text-orange-600 bg-orange-100">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-0">
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-7 text-xs py-1">ASIN</TableHead>
                <TableHead className="h-7 text-xs py-1">Level</TableHead>
                <TableHead className="h-7 text-xs py-1 text-right">Current</TableHead>
                <TableHead className="h-7 text-xs py-1 text-right">Previous</TableHead>
                <TableHead className="h-7 text-xs py-1 text-right">Days at 0%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.slice(0, 10).map((alert, i) => (
                <TableRow key={`${alert.child_asin}-${i}`} className="h-8">
                  <TableCell className="py-1 text-xs font-mono">
                    <a
                      href={`https://www.amazon.co.uk/dp/${alert.child_asin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {alert.child_asin}
                    </a>
                  </TableCell>
                  <TableCell className="py-1">
                    <Badge 
                      variant={alert.alert_level === 'CRITICAL' ? 'destructive' : 'outline'}
                      className={`text-[10px] px-1.5 py-0 ${alert.alert_level !== 'CRITICAL' ? 'border-orange-400 text-orange-600 bg-orange-100' : ''}`}
                    >
                      {alert.alert_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1 text-xs text-right font-medium">
                    {alert.buy_box_percentage}%
                  </TableCell>
                  <TableCell className="py-1 text-xs text-right text-muted-foreground">
                    {alert.previous_day_bb !== null ? `${alert.previous_day_bb}%` : '—'}
                  </TableCell>
                  <TableCell className="py-1 text-xs text-right">
                    {alert.consecutive_days_at_zero > 0 ? (
                      <span className="text-red-600 font-medium">{alert.consecutive_days_at_zero}</span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {alerts.length > 10 && (
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            +{alerts.length - 10} more
          </p>
        )}
      </CardContent>
    </Card>
  );
};
