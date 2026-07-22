import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, TrendingDown, Package } from 'lucide-react';

interface ClientAlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantToken: string;
  accountName: string;
  onUpdate: () => void;
}

interface AlertConfig {
  enabled: boolean;
  thresholds: {
    buy_box: number;
    conversion_rate_drop: number;
  };
  enabled_alert_types: string[];
}

export const ClientAlertConfigDialog = ({
  open,
  onOpenChange,
  merchantToken,
  accountName,
  onUpdate
}: ClientAlertConfigDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({
    enabled: false,
    thresholds: {
      buy_box: 98,
      conversion_rate_drop: 25
    },
    enabled_alert_types: ['buy_box', 'conversion_rate']
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('accounts_master')
          .select('alert_config')
          .eq('merchant_token', merchantToken)
          .maybeSingle();

        if (error) throw error;

        const existingConfig = data?.alert_config as Partial<AlertConfig> | null;
        if (existingConfig && typeof existingConfig === 'object' && 'enabled' in existingConfig) {
          setConfig({
            enabled: existingConfig.enabled ?? false,
            thresholds: {
              buy_box: existingConfig.thresholds?.buy_box ?? 98,
              conversion_rate_drop: existingConfig.thresholds?.conversion_rate_drop ?? 25
            },
            enabled_alert_types: existingConfig.enabled_alert_types ?? ['buy_box', 'conversion_rate']
          });
        } else {
          setConfig({
            enabled: false,
            thresholds: { buy_box: 98, conversion_rate_drop: 25 },
            enabled_alert_types: ['buy_box', 'conversion_rate']
          });
        }
      } catch (e) {
        console.error('Failed to load alert config', e);
      }
    };

    if (open && merchantToken) loadConfig();
  }, [open, merchantToken]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('accounts_master')
        .update({ alert_config: config as any })
        .eq('merchant_token', merchantToken);

      if (error) throw error;

      toast({
        title: 'Alert Configuration Saved',
        description: 'Performance alert settings have been updated.'
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAlertType = (type: string) => {
    setConfig(prev => ({
      ...prev,
      enabled_alert_types: prev.enabled_alert_types.includes(type)
        ? prev.enabled_alert_types.filter(t => t !== type)
        : [...prev.enabled_alert_types, type]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Performance Alerts - {accountName}
          </DialogTitle>
          <DialogDescription>
            Configure thresholds for performance alerts that will appear on your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Alerts Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-semibold">Enable Alerts</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor performance and show alerts on dashboard
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {/* Alert Types */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Alert Types</Label>
            
            {/* Buy Box Alert */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Buy Box Percentage</Label>
                </div>
                <Switch
                  checked={config.enabled_alert_types.includes('buy_box')}
                  onCheckedChange={() => toggleAlertType('buy_box')}
                  disabled={!config.enabled}
                />
              </div>
              
              {config.enabled_alert_types.includes('buy_box') && config.enabled && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Alert when below:</Label>
                    <span className="text-sm font-semibold">{config.thresholds.buy_box}%</span>
                  </div>
                  <Slider
                    value={[config.thresholds.buy_box]}
                    onValueChange={([value]) => setConfig(prev => ({
                      ...prev,
                      thresholds: { ...prev.thresholds, buy_box: value }
                    }))}
                    min={90}
                    max={100}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Triggers when Buy Box drops below this percentage
                  </p>
                </div>
              )}
            </div>

            {/* Conversion Rate Alert */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Conversion Rate Drop</Label>
                </div>
                <Switch
                  checked={config.enabled_alert_types.includes('conversion_rate')}
                  onCheckedChange={() => toggleAlertType('conversion_rate')}
                  disabled={!config.enabled}
                />
              </div>
              
              {config.enabled_alert_types.includes('conversion_rate') && config.enabled && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Alert when drops by:</Label>
                    <span className="text-sm font-semibold">{config.thresholds.conversion_rate_drop}%</span>
                  </div>
                  <Slider
                    value={[config.thresholds.conversion_rate_drop]}
                    onValueChange={([value]) => setConfig(prev => ({
                      ...prev,
                      thresholds: { ...prev.thresholds, conversion_rate_drop: value }
                    }))}
                    min={10}
                    max={50}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Triggers when conversion rate decreases by this percentage day-over-day
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {config.enabled && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-semibold">Alert Summary</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Active alert types: {config.enabled_alert_types.length}</li>
                <li>• Alerts will appear on your dashboard when thresholds are breached</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
