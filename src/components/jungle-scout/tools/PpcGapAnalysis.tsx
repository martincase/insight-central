import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Zap } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { ExcelExportButton } from './ExcelExportButton';

interface PpcGapAnalysisProps {
  accountName: string;
}

const gapTypeColor: Record<string, string> = {
  missing: 'bg-red-100 text-red-800',
  underbid: 'bg-amber-100 text-amber-800',
  overbid: 'bg-blue-100 text-blue-800',
  opportunity: 'bg-green-100 text-green-800',
};

export const PpcGapAnalysis = ({ accountName }: PpcGapAnalysisProps) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['js-ppc-sessions', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_research_sessions')
        .select('id, seed_keyword, marketplace, created_at')
        .eq('account_name', accountName)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeSessionId = selectedSessionId || (sessions?.[0]?.id ?? '');

  const { data: results, isLoading: loadingResults, refetch } = useQuery({
    queryKey: ['js-ppc-gap-results', activeSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_ppc_gap_analysis_results')
        .select('*')
        .eq('session_id', activeSessionId)
        .order('priority_score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeSessionId,
  });

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
    data: results ?? [],
    defaultSortField: 'priority_score' as any,
  });

  const handleAnalyze = async () => {
    if (!activeSessionId) {
      toast({ title: 'Select a session first', variant: 'destructive' });
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ppc-gap-analysis', {
        body: { session_id: activeSessionId, account_name: accountName },
      });
      if (error) throw error;

      if (data?.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else if (data?.message) {
        toast({ title: 'Notice', description: data.message });
      } else {
        const count = data?.results_count ?? data?.gaps_found ?? 0;
        toast({ title: 'PPC Gap Analysis complete', description: `${count} gap${count !== 1 ? 's' : ''} found.` });
        setTimeout(() => refetch(), 2000);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
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
        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="gap-2">
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Run PPC Gap Analysis
        </Button>
        <p className="text-xs text-muted-foreground self-center">Requires: Keyword Rank Tracker data → Keyword Relevance Scoring → then PPC Gap Analysis</p>
      </div>

      {sortedData?.length > 0 && (
        <div className="flex justify-end">
          <ExcelExportButton data={sortedData} filename={`ppc-gap-${accountName}`} sheetName="PPC Gaps" />
        </div>
      )}

      {loadingResults ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : sortedData?.length ? (
        <div className="border rounded-lg overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead field="keyword" currentField={sortField} direction={sortDirection} onSort={handleSort}>Keyword</SortableTableHead>
                <SortableTableHead field="gap_type" currentField={sortField} direction={sortDirection} onSort={handleSort}>Gap Type</SortableTableHead>
                <SortableTableHead field="relevance_score" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Relevance</SortableTableHead>
                <SortableTableHead field="search_volume" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Search Vol</SortableTableHead>
                <SortableTableHead field="current_bid" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Current Bid</SortableTableHead>
                <SortableTableHead field="recommended_action" currentField={sortField} direction={sortDirection} onSort={handleSort}>Recommended Action</SortableTableHead>
                <SortableTableHead field="priority_score" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Priority</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-sm">{row.keyword}</TableCell>
                  <TableCell>
                    <Badge className={gapTypeColor[row.gap_type] ?? 'bg-muted text-muted-foreground'}>
                      {row.gap_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.relevance_score ?? '—'}</TableCell>
                  <TableCell className="text-right">{row.search_volume?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell className="text-right">{row.current_bid != null ? `£${row.current_bid.toFixed(2)}` : '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{row.recommended_action ?? '—'}</TableCell>
                  <TableCell className="text-right font-semibold">{row.priority_score ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No PPC gap results yet. Click "Run PPC Gap Analysis" to generate.</p>
      )}
    </div>
  );
};
