import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Info, AlertTriangle } from 'lucide-react';
import { ExcelExportButton } from './ExcelExportButton';

interface KeywordRelevanceScoringProps {
  accountName: string;
}

const scoreColor = (score: number | null) => {
  if (score == null) return 'bg-muted text-muted-foreground';
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
};

export const KeywordRelevanceScoring = ({ accountName }: KeywordRelevanceScoringProps) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [isScoring, setIsScoring] = useState(false);
  const [productDescription, setProductDescription] = useState('');
  const [targetCategory, setTargetCategory] = useState('');

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['js-research-sessions', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_research_sessions')
        .select('id, seed_keyword, marketplace, created_at, target_category')
        .eq('account_name', accountName)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeSessionId = selectedSessionId || (sessions?.[0]?.id ?? '');
  const activeSession = sessions?.find(s => s.id === activeSessionId);

  // Sync productDescription when active session changes
  useEffect(() => {
    if (activeSession?.seed_keyword) {
      setProductDescription(activeSession.seed_keyword);
    }
  }, [activeSession?.seed_keyword]);

  const { data: keywordCount, isLoading: loadingCount } = useQuery({
    queryKey: ['js-keyword-count', activeSession?.seed_keyword, activeSession?.marketplace, accountName],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('jungle_scout_keywords_by_keyword' as any)
        .select('*', { count: 'exact', head: true })
        .eq('seed_keyword', activeSession!.seed_keyword)
        .eq('country', activeSession!.marketplace)
        .eq('account_name', accountName);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!activeSession?.seed_keyword && !!activeSession?.marketplace,
  });

  const { data: scores, isLoading: loadingScores, refetch } = useQuery({
    queryKey: ['js-relevance-scores', activeSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_keyword_relevance_scores')
        .select('*')
        .eq('session_id', activeSessionId)
        .order('relevance_score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeSessionId,
  });

  const handleScore = async () => {
    if (!activeSessionId) {
      toast({ title: 'Select a session first', variant: 'destructive' });
      return;
    }
    if (!productDescription.trim()) {
      toast({ title: 'Product description is required', variant: 'destructive' });
      return;
    }

    setIsScoring(true);
    try {
      const seedKeyword = activeSession?.seed_keyword;
      const marketplace = activeSession?.marketplace;

      // Fetch keywords using composite key
      const { data: kwData } = await supabase
        .from('jungle_scout_keywords_by_keyword' as any)
        .select('keyword, monthly_search_volume_exact, dominant_category')
        .eq('seed_keyword', seedKeyword)
        .eq('country', marketplace)
        .eq('account_name', accountName);

      const keywords = (kwData ?? []).map((r: any) => ({
        keyword: r.keyword,
        search_volume: r.monthly_search_volume_exact,
        dominant_category: r.dominant_category,
      }));

      // Fetch ASINs using composite key (deduplicate)
      const { data: asinData } = await supabase
        .from('jungle_scout_keywords_by_asin' as any)
        .select('asin, keyword, organic_rank, sponsored_rank, relevancy_score')
        .eq('keyword', seedKeyword)
        .eq('country', marketplace)
        .eq('account_name', accountName);

      const asinMap = new Map<string, any>();
      (asinData ?? []).forEach((r: any) => {
        if (r.asin && !asinMap.has(r.asin)) {
          asinMap.set(r.asin, {
            asin: r.asin,
            organic_rank: r.organic_rank,
            sponsored_rank: r.sponsored_rank,
            relevancy_score: r.relevancy_score,
          });
        }
      });
      const asins = Array.from(asinMap.values());

      const { data, error } = await supabase.functions.invoke('ai-relevance-scorer', {
        body: {
          session_id: activeSessionId,
          product_description: productDescription.trim(),
          target_category: targetCategory.trim() || 'General',
          keywords: keywords.length > 0 ? keywords : undefined,
          asins: asins.length > 0 ? asins : undefined,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: 'Scoring error', description: data.error, variant: 'destructive' });
      } else {
        const count = data?.count ?? data?.scored ?? 0;
        toast({ title: data?.message || `Scored ${count} keywords` });
        setTimeout(() => refetch(), 3000);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsScoring(false);
    }
  };

  if (loadingSessions) {
    return <div className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading sessions...</div>;
  }

  if (!sessions?.length) {
    return <p className="text-sm text-muted-foreground py-4">No research sessions found. Use Research Launcher first.</p>;
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Select value={activeSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger>
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.seed_keyword} ({s.marketplace?.toUpperCase()}) — {new Date(s.created_at!).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>
      {activeSession && (
        <div className={`flex items-center gap-2 text-sm px-1 ${loadingCount ? 'text-muted-foreground' : (keywordCount ?? 0) > 0 ? 'text-primary' : 'text-destructive'}`}>
          {loadingCount ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking keywords…</>
          ) : (keywordCount ?? 0) > 0 ? (
            <><Info className="h-3.5 w-3.5" /> {keywordCount} keywords found for scoring</>
          ) : (
            <><AlertTriangle className="h-3.5 w-3.5" /> 0 keywords found — fetch keywords via Keyword Rank Tracker or Keyword Expansion first</>
          )}
        </div>
      )}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Product Description <span className="text-destructive">*</span></label>
        <Textarea
          placeholder="Describe your product in detail, e.g. 'Cordless stick vacuum cleaner for hardwood floors with HEPA filter'"
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-foreground mb-1 block">Target Category <span className="text-muted-foreground text-xs">(optional)</span></label>
          <Input
            placeholder="e.g. Floor Care"
            value={targetCategory}
            onChange={(e) => setTargetCategory(e.target.value)}
          />
        </div>
        <Button onClick={handleScore} disabled={isScoring || !productDescription.trim()} className="gap-2">
          {isScoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Score Keywords
        </Button>
      </div>

      {scores?.length > 0 && (
        <div className="flex justify-end">
          <ExcelExportButton data={scores} filename={`relevance-scores-${accountName}`} sheetName="Relevance Scores" />
        </div>
      )}

      {loadingScores ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : scores?.length ? (
        <div className="border rounded-lg overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead className="text-center">Relevance</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Search Vol</TableHead>
                <TableHead>Reasoning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-sm">{row.keyword}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={scoreColor(row.relevance_score)}>
                      {row.relevance_score ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.category ?? '—'}</TableCell>
                  <TableCell className="text-right">{row.search_volume?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{row.reasoning ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No relevance scores yet. Click "Score Keywords" to generate.</p>
      )}
    </div>
  );
};
