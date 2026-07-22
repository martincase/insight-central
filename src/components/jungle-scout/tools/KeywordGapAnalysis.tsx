import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { ExcelExportButton } from './ExcelExportButton';

interface KeywordGapAnalysisProps {
  accountName: string;
}

export const KeywordGapAnalysis = ({ accountName }: KeywordGapAnalysisProps) => {
  const [clientAsin, setClientAsin] = useState('');
  const [competitorAsin, setCompetitorAsin] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { data: storedGaps, isLoading: loadingStored } = useQuery({
    queryKey: ['js-keyword-gaps-stored', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_keyword_gaps')
        .select('*')
        .eq('account_name', accountName)
        .order('monthly_search_volume_exact', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: gapResults, isLoading: loadingGap, refetch } = useQuery({
    queryKey: ['js-keyword-gap-compare', accountName, clientAsin, competitorAsin],
    queryFn: async () => {
      const { data: compKw, error: e1 } = await supabase
        .from('jungle_scout_keywords_by_asin')
        .select('keyword, organic_rank, monthly_search_volume_exact, ease_of_ranking_score')
        .eq('asin', competitorAsin.trim())
        .eq('account_name', accountName)
        .order('monthly_search_volume_exact', { ascending: false })
        .limit(200);
      if (e1) throw e1;

      const { data: clientKw, error: e2 } = await supabase
        .from('jungle_scout_keywords_by_asin')
        .select('keyword, organic_rank')
        .eq('asin', clientAsin.trim())
        .eq('account_name', accountName);
      if (e2) throw e2;

      const clientRanks = new Map((clientKw ?? []).map((k) => [k.keyword, k.organic_rank]));

      return (compKw ?? []).map((ck) => ({
        keyword: ck.keyword,
        competitor_rank: ck.organic_rank,
        client_rank: clientRanks.get(ck.keyword ?? '') ?? null,
        search_volume: ck.monthly_search_volume_exact,
        ease_score: ck.ease_of_ranking_score,
        is_gap: !clientRanks.has(ck.keyword ?? ''),
      }));
    },
    enabled: showResults && !!clientAsin.trim() && !!competitorAsin.trim(),
  });

  const handleCompare = () => {
    if (!clientAsin.trim() || !competitorAsin.trim()) return;
    setShowResults(true);
    refetch();
  };

  const displayData = showResults ? gapResults : null;
  const isLoading = showResults ? loadingGap : loadingStored;

  const { sortedData: sortedDisplayData, sortField: sf1, sortDirection: sd1, handleSort: hs1 } = useTableSort({
    data: displayData ?? [],
    defaultSortField: 'search_volume' as any,
  });

  const { sortedData: sortedStoredGaps, sortField: sf2, sortDirection: sd2, handleSort: hs2 } = useTableSort({
    data: storedGaps ?? [],
    defaultSortField: 'monthly_search_volume_exact' as any,
  });

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[160px]">
          <Label>Your ASIN</Label>
          <Input placeholder="B0XXXXXXX" value={clientAsin} onChange={(e) => setClientAsin(e.target.value)} />
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <Label>Competitor ASIN</Label>
          <Input placeholder="B0YYYYYYY" value={competitorAsin} onChange={(e) => setCompetitorAsin(e.target.value)} />
        </div>
        <Button onClick={handleCompare} disabled={!clientAsin.trim() || !competitorAsin.trim()} className="gap-2">
          <Search className="h-4 w-4" /> Compare
        </Button>
      </div>

      {(sortedDisplayData?.length > 0 || (sortedStoredGaps?.length > 0 && !showResults)) && (
        <div className="flex justify-end">
          <ExcelExportButton data={showResults ? sortedDisplayData ?? [] : sortedStoredGaps ?? []} filename={`keyword-gap-${accountName}`} sheetName="Keyword Gaps" />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : sortedDisplayData?.length ? (
        <div className="border rounded-lg overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead field="keyword" currentField={sf1} direction={sd1} onSort={hs1}>Keyword</SortableTableHead>
                <SortableTableHead field="competitor_rank" currentField={sf1} direction={sd1} onSort={hs1} className="text-right">Competitor Rank</SortableTableHead>
                <SortableTableHead field="client_rank" currentField={sf1} direction={sd1} onSort={hs1} className="text-right">Your Rank</SortableTableHead>
                <SortableTableHead field="search_volume" currentField={sf1} direction={sd1} onSort={hs1} className="text-right">Search Volume</SortableTableHead>
                <SortableTableHead field="ease_score" currentField={sf1} direction={sd1} onSort={hs1} className="text-right">Ease Score</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDisplayData.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{row.keyword ?? '—'}</TableCell>
                  <TableCell className="text-right">{row.competitor_rank ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {row.client_rank != null ? (
                      row.client_rank
                    ) : (
                      <Badge className="bg-red-100 text-red-800 text-xs">Not ranking</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{row.search_volume?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell className="text-right">{row.ease_score ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : sortedStoredGaps?.length && !showResults ? (
        <>
          <p className="text-xs text-muted-foreground">Showing stored gap analysis. Enter ASINs above for a live comparison.</p>
          <div className="border rounded-lg overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="keyword" currentField={sf2} direction={sd2} onSort={hs2}>Keyword</SortableTableHead>
                  <SortableTableHead field="competitor_asin" currentField={sf2} direction={sd2} onSort={hs2}>Competitor ASIN</SortableTableHead>
                  <SortableTableHead field="competitor_organic_rank" currentField={sf2} direction={sd2} onSort={hs2} className="text-right">Competitor Rank</SortableTableHead>
                  <SortableTableHead field="client_organic_rank" currentField={sf2} direction={sd2} onSort={hs2} className="text-right">Your Rank</SortableTableHead>
                  <SortableTableHead field="monthly_search_volume_exact" currentField={sf2} direction={sd2} onSort={hs2} className="text-right">Search Volume</SortableTableHead>
                  <SortableTableHead field="gap_type" currentField={sf2} direction={sd2} onSort={hs2}>Gap Type</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStoredGaps.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-sm">{row.keyword}</TableCell>
                    <TableCell className="font-mono text-xs">{row.competitor_asin}</TableCell>
                    <TableCell className="text-right">{row.competitor_organic_rank ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {row.client_organic_rank != null ? row.client_organic_rank : <Badge className="bg-red-100 text-red-800 text-xs">Not ranking</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{row.monthly_search_volume_exact?.toLocaleString() ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{row.gap_type ?? '—'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Enter your ASIN and a competitor ASIN to find keyword gaps. Requires keyword data fetched via Keyword Rank Tracker.</p>
      )}
    </div>
  );
};
