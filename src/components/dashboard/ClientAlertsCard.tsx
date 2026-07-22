import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, TrendingDown, Package, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ClientAlertConfigDialog } from './ClientAlertConfigDialog';

interface ClientAlert {
  id: string;
  account_name: string;
  alert_type: string;
  metric_value: number;
  threshold_value: number;
  detection_date: string;
  message: string;
  status: string;
  created_at: string;
}

interface ClientAlertsCardProps {
  merchantToken: string;
  accountName: string;
  hideConfigButton?: boolean;
}

export const ClientAlertsCard = ({ merchantToken, accountName, hideConfigButton }: ClientAlertsCardProps) => {
  const [alerts, setAlerts] = useState<ClientAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [merchantToken]);

  const fetchAlerts = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('client_threshold_alerts')
        .select('*')
        .eq('merchant_token', merchantToken)
        .gte('detection_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('detection_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching client alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureClick = () => {
    setConfigOpen(true);
  };

  if (loading) {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Performance Alerts
                </CardTitle>
                <CardDescription>Loading recent alerts...</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <ClientAlertConfigDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
          merchantToken={merchantToken}
          accountName={accountName}
          onUpdate={fetchAlerts}
        />
      </>
    );
  }

  if (alerts.length === 0) {
    return (
      <>
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <AlertTriangle className="h-5 w-5" />
                  Performance Alerts
                </CardTitle>
                <CardDescription className="text-green-600">
                  No alerts in the last 7 days. All metrics are within thresholds.
                </CardDescription>
              </div>
              {!hideConfigButton && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleConfigureClick}
                  className="shrink-0"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>
        <ClientAlertConfigDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
          merchantToken={merchantToken}
          accountName={accountName}
          onUpdate={fetchAlerts}
        />
      </>
    );
  }

  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <>
      <Card className={activeAlerts.length > 0 ? 'border-orange-200 bg-orange-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Performance Alerts
                {activeAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {activeAlerts.length} Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Recent performance alerts for {accountName}
              </CardDescription>
            </div>
            {!hideConfigButton && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleConfigureClick}
                className="shrink-0"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            )}
          </div>
        </CardHeader>

      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const AlertIcon = alert.alert_type === 'buy_box' ? Package : TrendingDown;
          const alertColor = alert.status === 'active' ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50';
          
          return (
            <Alert key={alert.id} className={alertColor}>
              <AlertIcon className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {alert.alert_type === 'buy_box' ? '📦 Buy Box Alert' : '📉 Conversion Rate Alert'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(alert.detection_date), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'} className="text-xs">
                    {alert.status}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>

      <ClientAlertConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        merchantToken={merchantToken}
        accountName={accountName}
        onUpdate={fetchAlerts}
      />
    </>
  );
};
