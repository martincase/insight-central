
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import type { TargetNotification } from '@/utils/targetNotifications';

interface TargetNotificationsProps {
  notifications: TargetNotification[];
}

export const TargetNotifications = ({ notifications }: TargetNotificationsProps) => {
  if (notifications.length === 0) return null;

  const formatValue = (value: number, metric: string) => {
    if (metric.includes('Sales') || metric.includes('Spend')) {
      return formatCurrency(value);
    }
    return formatPercentage(value);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Target Alerts</h3>
      <div className="grid gap-2">
        {notifications.map((notification, index) => (
          <Alert 
            key={`${notification.accountId}-${notification.metric}-${index}`}
            variant={notification.isGood ? "default" : "destructive"}
            className="border-l-4"
          >
            <div className="flex items-center space-x-2">
              {notification.isGood ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              )}
              <div className="flex-1">
                <AlertTitle className="text-sm font-medium">
                  {notification.accountName} - {notification.metric}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Current: {formatValue(notification.current, notification.metric)} | 
                  Target: {formatValue(notification.target, notification.metric)}
                  <Badge 
                    variant={notification.isGood ? "default" : "destructive"}
                    className="ml-2 text-xs"
                  >
                    {notification.isGood ? 'Target Met' : 'Target Missed'}
                  </Badge>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
};
