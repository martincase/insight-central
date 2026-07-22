import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Rocket, CheckCircle2, XCircle, Circle, Clock, Zap, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FullResearchPipelineProps {
  accountName: string;
}

type StepStatus = 'idle' | 'running' | 'success' | 'failed' | 'waiting';

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  error?: string;
  apiCall?: boolean;
}

const MARKETPLACES = [
  { value: 'uk', label: '🇬🇧 UK' },
  { value: 'us', label: '🇺🇸 US' },
  { value: 'de', label: '🇩🇪 DE' },
  { value: 'fr', label: '🇫🇷 FR' },
  { value: 'it', label: '🇮🇹 IT' },
  { value: 'es', label: '🇪🇸 ES' },
];

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'session', label: 'Create Session', description: 'Insert research session into database', status: 'idle' },
  { id: 'sov', label: 'Share of Voice', description: 'Fetch share of voice data from JS API', status: 'idle', apiCall: true },
  { id: 'kw-by-kw', label: 'Keywords by Keyword', description: 'Fetch keyword data from JS API', status: 'idle', apiCall: true },
  { id: 'kw-by-asin', label: 'Keywords by ASIN', description: 'Fetch ASIN keyword data from JS API', status: 'idle', apiCall: true },
  { id: 'relevance', label: 'AI Relevance Scoring', description: 'Score keywords with AI (after step 3)', status: 'idle' },
  { id: 'ppc-gap', label: 'PPC Gap Analysis', description: 'Analyze PPC gaps (after steps 3 + 5)', status: 'idle' },
];

const StatusIcon = ({ status }: { status: StepStatus }) => {
  switch (status) {
    case 'idle': return <Circle className="h-5 w-5 text-muted-foreground" />;
    case 'waiting': return <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />;
    case 'running': return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'failed': return <XCircle className="h-5 w-5 text-destructive" />;
  }
};

export const FullResearchPipeline = ({ accountName }: FullResearchPipelineProps) => {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [marketplace, setMarketplace] = useState('uk');
  const [productAsin, setProductAsin] = useState('');
  const [competitorAsins, setCompetitorAsins] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<{ succeeded: number; failed: number; total: number } | null>(null);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const queryClient = useQueryClient();

  const updateStep = useCallback((id: string, update: Partial<PipelineStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
  }, []);

  const runPipeline = async () => {
    if (!seedKeyword.trim()) {
      toast({ title: 'Seed keyword is required', variant: 'destructive' });
      return;
    }
    if (!productAsin.trim()) {
      toast({ title: 'Your Product ASIN is required', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    setSummary(null);
    setCompletedSessionId(null);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'idle' as StepStatus })));

    let sessionId: string | null = null;
    let kwByKwDone = false;
    let relevanceDone = false;

    const asins = competitorAsins.split(',').map(a => a.trim()).filter(Boolean);

    // Step 1: Create Session
    updateStep('session', { status: 'running' });
    try {
      const { data, error } = await supabase
        .from('jungle_scout_research_sessions')
        .insert({
          account_name: accountName,
          seed_keyword: seedKeyword.trim(),
          marketplace,
          product_description: productDescription.trim() || null,
          target_asin: productAsin.trim(),
          target_category: targetCategory.trim() || null,
          status: 'running',
          product_asin: productAsin.trim(),
        } as any)
        .select('id')
        .single();

      if (error) throw error;
      sessionId = data.id;
      updateStep('session', { status: 'success' });
    } catch (err: any) {
      updateStep('session', { status: 'failed', error: err.message });
      setIsRunning(false);
      setSummary({ succeeded: 0, failed: 1, total: 6 });
      toast({ title: 'Pipeline failed at session creation', variant: 'destructive' });
      return;
    }

    // Steps 2, 3, 4: Parallel API calls
    updateStep('sov', { status: 'running' });
    updateStep('kw-by-kw', { status: 'running' });
    updateStep('kw-by-asin', { status: 'running' });
    updateStep('relevance', { status: 'waiting' });
    updateStep('ppc-gap', { status: 'waiting' });

    const sovPromise = supabase.functions.invoke('jungle-scout-share-of-voice', {
      body: { keyword: seedKeyword.trim(), marketplace, account_name: accountName },
    }).then(({ error }) => {
      if (error) throw error;
      updateStep('sov', { status: 'success' });
    }).catch((err: any) => {
      updateStep('sov', { status: 'failed', error: err.message });
    });

    const kwByKwPromise = supabase.functions.invoke('jungle-scout-keywords-by-keyword', {
      body: { search_term: seedKeyword.trim(), marketplace, account_name: accountName },
    }).then(({ error, data }) => {
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      kwByKwDone = true;
      updateStep('kw-by-kw', { status: 'success' });
    }).catch((err: any) => {
      updateStep('kw-by-kw', { status: 'failed', error: err.message });
    });

    const kwByAsinPromise = (async () => {
      if (asins.length === 0) {
        updateStep('kw-by-asin', { status: 'success' });
        return;
      }
      try {
        const { error, data } = await supabase.functions.invoke('jungle-scout-keywords-by-asin', {
          body: { asins, marketplace, account_name: accountName },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        updateStep('kw-by-asin', { status: 'success' });
      } catch (err: any) {
        updateStep('kw-by-asin', { status: 'failed', error: err.message });
      }
    })();

    await Promise.all([sovPromise, kwByKwPromise, kwByAsinPromise]);

    // Step 5: Relevance scoring (needs step 3 done)
    if (kwByKwDone) {
      updateStep('relevance', { status: 'running' });
      try {
        const { data: kwData } = await supabase
          .from('jungle_scout_keywords_by_keyword' as any)
          .select('keyword')
          .eq('seed_keyword', seedKeyword.trim())
          .eq('account_name', accountName);

        const keywordsArray = (kwData ?? []).map((r: any) => r.keyword as string);

        const { error, data } = await supabase.functions.invoke('ai-relevance-scorer', {
          body: {
            session_id: sessionId,
            product_description: productDescription.trim() || seedKeyword.trim(),
            target_category: targetCategory.trim() || 'General',
            keywords: keywordsArray,
            asins: asins.length > 0 ? asins : [],
            product_asin: productAsin.trim(),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        relevanceDone = true;
        updateStep('relevance', { status: 'success' });
      } catch (err: any) {
        updateStep('relevance', { status: 'failed', error: err.message });
      }
    } else {
      updateStep('relevance', { status: 'failed', error: 'Skipped: Keywords by Keyword failed' });
    }

    // Step 6: PPC Gap Analysis (needs steps 3 + 5)
    if (kwByKwDone && relevanceDone) {
      updateStep('ppc-gap', { status: 'running' });
      try {
        const { error, data } = await supabase.functions.invoke('ppc-gap-analysis', {
          body: { session_id: sessionId, account_name: accountName },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        updateStep('ppc-gap', { status: 'success' });
      } catch (err: any) {
        updateStep('ppc-gap', { status: 'failed', error: err.message });
      }
    } else {
      updateStep('ppc-gap', { status: 'failed', error: 'Skipped: Prerequisites not met' });
    }

    // Update session status
    if (sessionId) {
      await supabase
        .from('jungle_scout_research_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
    }

    // Invalidate queries so individual tools refresh and pick up the new session
    queryClient.invalidateQueries({ queryKey: ['js-research-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['js-ppc-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['js-relevance-scores'] });
    queryClient.invalidateQueries({ queryKey: ['js-ppc-gap-results'] });
    queryClient.invalidateQueries({ queryKey: ['js-keyword-count'] });

    // Build summary
    setSteps(prev => {
      const succeeded = prev.filter(s => s.status === 'success').length;
      const failed = prev.filter(s => s.status === 'failed').length;
      setSummary({ succeeded, failed, total: 6 });
      if (succeeded > 0) {
        setCompletedSessionId(sessionId);
      }
      return prev;
    });

    setIsRunning(false);
    toast({ title: 'Pipeline complete', description: 'Check results in individual tools below.' });
  };

  const handleDownloadExcel = async () => {
    if (!completedSessionId) return;
    setIsDownloading(true);

    try {
      const wb = XLSX.utils.book_new();

      // Tab 1: Share of Voice
      const { data: sovData } = await supabase
        .from('jungle_scout_share_of_voice')
        .select('*')
        .eq('keyword', seedKeyword.trim())
        .eq('marketplace', marketplace)
        .eq('account_name', accountName);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sovData ?? []), 'Share of Voice');

      // Tab 2: Keywords by Keyword
      const { data: kwData } = await supabase
        .from('jungle_scout_keywords_by_keyword' as any)
        .select('*')
        .eq('seed_keyword', seedKeyword.trim())
        .eq('account_name', accountName);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kwData ?? []), 'Keywords');

      // Tab 3: ASIN Keywords
      const { data: asinKwData } = await supabase
        .from('jungle_scout_keywords_by_asin' as any)
        .select('*')
        .eq('account_name', accountName)
        .eq('country', marketplace);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(asinKwData ?? []), 'ASIN Keywords');

      // Tab 4: Relevance Scores
      const { data: relData } = await supabase
        .from('jungle_scout_keyword_relevance_scores')
        .select('*')
        .eq('session_id', completedSessionId);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(relData ?? []), 'Relevance Scores');

      // Tab 5: PPC Gap Analysis
      const { data: gapData } = await supabase
        .from('jungle_scout_ppc_gap_analysis_results')
        .select('*')
        .eq('session_id', completedSessionId);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gapData ?? []), 'PPC Gap Analysis');

      const today = new Date().toISOString().split('T')[0];
      const filename = `research_${seedKeyword.trim().replace(/\s+/g, '-')}_${today}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({ title: 'Excel downloaded', description: filename });
    } catch (err: any) {
      toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const apiCallCount = INITIAL_STEPS.filter(s => s.apiCall).length;

  return (
    <div className="space-y-4 py-2">
      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Seed Keyword <span className="text-destructive">*</span></Label>
          <Input
            placeholder="e.g. hard floor cleaner"
            value={seedKeyword}
            onChange={(e) => setSeedKeyword(e.target.value)}
            disabled={isRunning}
          />
        </div>
        <div className="space-y-2">
          <Label>Marketplace</Label>
          <Select value={marketplace} onValueChange={setMarketplace} disabled={isRunning}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKETPLACES.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Your Product ASIN <span className="text-destructive">*</span></Label>
          <Input
            placeholder="e.g. B0XXXXXXXXX"
            value={productAsin}
            onChange={(e) => setProductAsin(e.target.value.toUpperCase())}
            disabled={isRunning}
            maxLength={10}
          />
          <p className="text-[11px] text-muted-foreground">Your own product ASIN for relevance scoring</p>
        </div>
        <div className="space-y-2">
          <Label>Target Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            placeholder="e.g. Floor Care"
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
            disabled={isRunning}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Competitor ASINs <span className="text-muted-foreground text-xs">(comma-separated, optional)</span></Label>
          <Textarea
            placeholder="B0XXXXXXXXX, B0YYYYYYYYY"
            value={competitorAsins}
            onChange={(e) => setCompetitorAsins(e.target.value)}
            rows={2}
            disabled={isRunning}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Product Description <span className="text-muted-foreground text-xs">(for AI scoring)</span></Label>
          <Textarea
            placeholder="Describe your product for relevance scoring..."
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={2}
            disabled={isRunning}
          />
        </div>
      </div>

      {/* Run button */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={runPipeline} disabled={isRunning || !seedKeyword.trim() || !productAsin.trim()} className="gap-2" size="lg">
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Run Full Pipeline
        </Button>
        <Badge variant="secondary" className="gap-1.5 text-xs py-1">
          <Zap className="h-3 w-3" />
          {apiCallCount} API Calls
        </Badge>
        {completedSessionId && (
          <Button onClick={handleDownloadExcel} disabled={isDownloading} variant="outline" className="gap-2">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Excel Report
          </Button>
        )}
      </div>

      {/* Pipeline stepper */}
      {steps.some(s => s.status !== 'idle') && (
        <div className="border rounded-lg p-4 space-y-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Pipeline Progress</p>
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <StatusIcon status={step.status} />
                {i < steps.length - 1 && (
                  <div className={`w-px h-8 ${step.status === 'success' ? 'bg-green-300' : step.status === 'failed' ? 'bg-destructive/30' : 'bg-border'}`} />
                )}
              </div>
              <div className="pb-4 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{step.label}</span>
                  {step.apiCall && <Badge variant="outline" className="text-[10px] px-1.5 py-0">API</Badge>}
                  {(step.id === 'sov' || step.id === 'kw-by-kw' || step.id === 'kw-by-asin') && step.status === 'running' && (
                    <span className="text-[10px] text-muted-foreground">parallel</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                {step.status === 'failed' && step.error && (
                  <p className="text-xs text-destructive mt-0.5">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className={`rounded-lg p-3 text-sm font-medium ${summary.failed === 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
          Pipeline complete: {summary.succeeded}/{summary.total} steps succeeded
          {summary.failed > 0 && `, ${summary.failed} failed`}
        </div>
      )}
    </div>
  );
};
