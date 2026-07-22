import { useState, useEffect, useCallback } from 'react';
import { Settings2, Save, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

interface ConfigData {
  id: number;
  profile_id: number;
  account_name: string;
  is_active: boolean;
  rule1_enabled: boolean | null;
  rule1_kw_click_threshold: number | null;
  rule1_pt_click_threshold: number | null;
  rule1_lookback_days: number | null;
  rule2_enabled: boolean | null;
  rule2_kw_max_acos: number | null;
  rule2_pt_max_acos: number | null;
  rule2_lookback_days: number | null;
  min_impressions: number | null;
}

interface NegativeKeywordConfigProps {
  focusedAccountName: string;
}

const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, '');

export const NegativeKeywordConfig = ({ focusedAccountName }: NegativeKeywordConfigProps) => {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: master } = await supabase
        .from('accounts_master')
        .select('ppc_sellername')
        .eq('account_name', focusedAccountName)
        .single();

      const { data: configs } = await supabase
        .from('negative_keyword_config')
        .select('id, profile_id, account_name, is_active, rule1_enabled, rule1_kw_click_threshold, rule1_pt_click_threshold, rule1_lookback_days, rule2_enabled, rule2_kw_max_acos, rule2_pt_max_acos, rule2_lookback_days, min_impressions');

      const namesToMatch = [
        master?.ppc_sellername ? normalize(master.ppc_sellername) : null,
        normalize(focusedAccountName),
      ].filter(Boolean) as string[];

      const matched = configs?.find(c =>
        namesToMatch.some(n => normalize(c.account_name || '') === n)
      );

      setConfig(matched as ConfigData || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [focusedAccountName]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateField = (field: keyof ConfigData, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    setSaveStatus('unsaved');
  };

  const handleSave = async () => {
    if (!config) return;
    setSaveStatus('saving');
    try {
      const { error: updateError } = await supabase
        .from('negative_keyword_config')
        .update({
          is_active: config.is_active,
          rule1_enabled: config.rule1_enabled,
          rule1_kw_click_threshold: config.rule1_kw_click_threshold,
          rule1_pt_click_threshold: config.rule1_pt_click_threshold,
          rule1_lookback_days: config.rule1_lookback_days,
          rule2_enabled: config.rule2_enabled,
          rule2_kw_max_acos: config.rule2_kw_max_acos,
          rule2_pt_max_acos: config.rule2_pt_max_acos,
          rule2_lookback_days: config.rule2_lookback_days,
          min_impressions: config.min_impressions,
        })
        .eq('id', config.id);

      if (updateError) throw updateError;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    }
  };

  const numInput = (value: number | null) => value?.toString() ?? '';
  const parseNum = (v: string) => v === '' ? null : Number(v);
  const parseFloat_ = (v: string) => v === '' ? null : parseFloat(v);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading config...</span>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2 py-4">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            Automation not actively configured for <span className="font-medium">"{focusedAccountName}"</span> — any historical negative-keyword activity is shown above.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Current Config
            <Badge variant="outline" className="text-xs font-normal">
              Profile: {config.profile_id}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            {saveStatus === 'unsaved' && (
              <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs">Unsaved</Badge>
            )}
            {saveStatus === 'saving' && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs">
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...
              </Badge>
            )}
            {saveStatus === 'saved' && (
              <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Saved
              </Badge>
            )}
            {saveStatus === 'error' && (
              <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-xs">Error saving</Badge>
            )}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Active</Label>
              <Switch checked={config.is_active} onCheckedChange={v => updateField('is_active', v)} />
            </div>
            <Button size="sm" onClick={handleSave} disabled={saveStatus === 'saving' || saveStatus === 'idle'}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save Config
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-destructive mb-3">{error}</div>}

        <Alert className="mb-4 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
            <strong>Lookback Windows:</strong> Rule 1 (Zero Conversion) is evaluated across 4 time windows — 7 days, 14 days, 28 days, and 56 days. Rule 2 (High ACOS) uses only recent data — 7 days and 14 days. Data is pulled weekly on Mondays. A search term only needs to trigger a rule in any one of its applicable windows to be flagged.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rule 1 */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Rule 1: Zero Conversion</h4>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Enabled</Label>
                <Switch checked={config.rule1_enabled ?? false} onCheckedChange={v => updateField('rule1_enabled', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">KW Click Threshold</Label>
                <Input type="number" value={numInput(config.rule1_kw_click_threshold)} onChange={e => updateField('rule1_kw_click_threshold', parseNum(e.target.value))} className="mt-1" placeholder="e.g. 10" />
              </div>
              <div>
                <Label className="text-xs">PT Click Threshold</Label>
                <Input type="number" value={numInput(config.rule1_pt_click_threshold)} onChange={e => updateField('rule1_pt_click_threshold', parseNum(e.target.value))} className="mt-1" placeholder="e.g. 15" />
              </div>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Rule 2: High ACOS</h4>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Enabled</Label>
                <Switch checked={config.rule2_enabled ?? false} onCheckedChange={v => updateField('rule2_enabled', v)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">KW Max ACOS %</Label>
                <Input type="number" step="0.1" value={numInput(config.rule2_kw_max_acos)} onChange={e => updateField('rule2_kw_max_acos', parseFloat_(e.target.value))} className="mt-1" placeholder="e.g. 30" />
              </div>
              <div>
                <Label className="text-xs">PT Max ACOS %</Label>
                <Input type="number" step="0.1" value={numInput(config.rule2_pt_max_acos)} onChange={e => updateField('rule2_pt_max_acos', parseFloat_(e.target.value))} className="mt-1" placeholder="e.g. 40" />
              </div>
            </div>
          </div>
        </div>

        {/* General */}
        <div className="mt-3 flex items-center gap-4">
          <div>
            <Label className="text-xs">Min Impressions</Label>
            <Input type="number" value={numInput(config.min_impressions)} onChange={e => updateField('min_impressions', parseNum(e.target.value))} className="mt-1 w-32" placeholder="e.g. 100" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
