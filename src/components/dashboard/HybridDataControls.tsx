import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings, Database, Globe, AlertTriangle, Info, Zap } from 'lucide-react';
import { hybridDataService } from '@/utils/hybridDataService';
import { useToast } from '@/hooks/use-toast';
import type { DataSourceConfig } from '@/utils/hybridDataService';
import type { HybridDataStatus } from '@/types/hybridData';

interface HybridDataControlsProps {
  dataStatus?: HybridDataStatus;
  onConfigChange?: (config: DataSourceConfig) => void;
  className?: string;
}

export const HybridDataControls: React.FC<HybridDataControlsProps> = ({
  dataStatus,
  onConfigChange,
  className = '',
}) => {
  const { toast } = useToast();
  const [config, setConfig] = useState(hybridDataService.getConfig());
  const [isExpanded, setIsExpanded] = useState(false);

  const handleConfigUpdate = (updates: Partial<DataSourceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    hybridDataService.updateConfig(newConfig);
    onConfigChange?.(newConfig);
    
    toast({
      title: "Data Source Configuration Updated",
      description: "Your data source preferences have been saved.",
    });
  };

  const getOverallStatus = () => {
    if (!dataStatus) return { type: 'unknown', hasIssues: false };
    
    const sources = Object.values(dataStatus);
    const hasLive = sources.some(s => s.type === 'live' || s.type === 'hybrid');
    const hasBanked = sources.some(s => s.type === 'banked' || s.type === 'hybrid');
    const hasGaps = sources.some(s => s.hasGaps);
    
    let type = 'unknown';
    if (hasLive && hasBanked) type = 'hybrid';
    else if (hasLive) type = 'live';
    else if (hasBanked) type = 'banked';
    
    return { type, hasIssues: hasGaps };
  };

  const status = getOverallStatus();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Data Sources
          </CardTitle>
          <div className="flex items-center gap-2">
            {status.hasIssues && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Issues
              </Badge>
            )}
            {config.preferBanked && (
              <Badge variant="default" className="gap-1">
                <Zap className="h-3 w-3" />
                Optimized
              </Badge>
            )}
            <Badge 
              variant={status.type === 'hybrid' ? 'outline' : status.type === 'live' ? 'default' : 'secondary'}
              className="gap-1"
            >
              {status.type === 'hybrid' && <Database className="h-3 w-3" />}
              {status.type === 'live' && <Globe className="h-3 w-3" />}
              {status.type === 'banked' && <Database className="h-3 w-3" />}
              {status.type.charAt(0).toUpperCase() + status.type.slice(1)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Configure'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cutoff-days">Cutoff Days</Label>
                <Input
                  id="cutoff-days"
                  type="number"
                  min="1"
                  max="90"
                  value={config.cutoffDays}
                  onChange={(e) => handleConfigUpdate({ cutoffDays: parseInt(e.target.value) || 7 })}
                  className="h-8"
                />
                <div className="text-xs text-muted-foreground">
                  <p>Use banked data for dates older than this many days</p>
                  <Badge variant="outline" className="mt-1 text-xs gap-1">
                    <Database className="h-3 w-3" />
                    Faster for historical data
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prefer-banked" className="text-sm flex items-center gap-2">
                    Prefer Banked Data
                    {config.preferBanked && (
                      <Badge variant="secondary" className="text-xs">
                        Fast Mode
                      </Badge>
                    )}
                  </Label>
                  <Switch
                    id="prefer-banked"
                    checked={config.preferBanked}
                    onCheckedChange={(checked) => handleConfigUpdate({ preferBanked: checked })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {config.preferBanked 
                    ? "🚀 Using optimized database queries for better performance" 
                    : "Uses live Google Sheets data when available"}
                </p>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="fallback-live" className="text-sm">
                    Fallback to Live
                  </Label>
                  <Switch
                    id="fallback-live"
                    checked={config.fallbackToLive}
                    onCheckedChange={(checked) => handleConfigUpdate({ fallbackToLive: checked })}
                  />
                </div>
              </div>
            </div>

            {dataStatus && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Data Source Status
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(dataStatus).map(([key, source]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="capitalize">{key}</span>
                        <Badge
                          variant={source.hasGaps ? 'destructive' : 
                                 source.type === 'hybrid' ? 'outline' :
                                 source.type === 'live' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {source.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Supabase Tables
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs font-mono">perplexity_sales_data</Badge>
                    <Badge variant="outline" className="text-xs font-mono">perplexity_ppc_campaigns</Badge>
                    <Badge variant="outline" className="text-xs font-mono">daily_asin_data</Badge>
                    <Badge variant="outline" className="text-xs font-mono">daily_campaign_data</Badge>
                    <Badge variant="outline" className="text-xs font-mono">daily_inventory_data</Badge>
                    <Badge variant="outline" className="text-xs font-mono">accounts_master</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Data synced automatically from Google Sheets via edge functions
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};