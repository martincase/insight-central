import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Layers } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { ExcelExportButton } from './ExcelExportButton';

interface KeywordExpansionToolProps {
  accountName: string;
}

const MARKETPLACES = [
  { value: 'uk', label: '🇬🇧 UK' },
  { value: 'us', label: '🇺🇸 US' },
  { value: 'de', label: '🇩🇪 DE' },
  { value: 'fr', label: '🇫🇷 FR' },
  { value: 'it', label: '🇮🇹 IT' },
  { value: 'es', label: '🇪🇸 ES' },
];

export const KeywordExpansionTool = ({ accountName }: KeywordExpansionToolProps) => {
  const [keyword, setKeyword] = useState('');
  const [marketplace, setMarketplace] = useState('uk');
  const [isFetching, setIsFetching] = useState(false);

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['jungle-scout-keywords-by-keyword', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_keywords_by_keyword')
        .select('*')
        .eq('account_name', accountName)
        .order('monthly_search_volume_exact', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
    data: results ?? [],
    defaultSortField: 'monthly_search_volume_exact' as any,
  });

  const handleFetch = async () => {
    if (!keyword.trim()) {
      toast({ title: 'Enter a keyword', variant: 'destructive' });
      return;
    }

    setIsFetching(true);
    try {
      const { error } = await supabase.functions.invoke('jungle-scout-keywords-by-keyword', {
        body: { keyword: keyword.trim(), marketplace, account_name: accountName },
      });
      if (error) throw error;
      toast({ title: 'Keyword expansion queued', description: `Expanding "${keyword}".` });
      setTimeout(() => refetch(), 3000);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label>Seed Keyword</Label>
          <Input placeholder="e.g. dog bed" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="space-y-1 w-32">
          <Label>Marketplace</Label>
          <Select value={marketplace} onValueChange={setMarketplace}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MARKETPLACES.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleFetch} disabled={isFetching} className="gap-2">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
          Expand Keywords
        </Button>
      </div>

      {sortedData?.length > 0 && (
        <div className="flex justify-end">
          <ExcelExportButton data={sortedData} filename={`keyword-expansion-${accountName}`} sheetName="Keyword Expansion" />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : sortedData?.length ? (
        <div className="border rounded-lg overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead field="keyword" currentField={sortField} direction={sortDirection} onSort={handleSort}>Keyword</SortableTableHead>
                <SortableTableHead field="seed_keyword" currentField={sortField} direction={sortDirection} onSort={handleSort}>Seed</SortableTableHead>
                <SortableTableHead field="monthly_search_volume_exact" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Exact Vol</SortableTableHead>
                <SortableTableHead field="monthly_search_volume_broad" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Broad Vol</SortableTableHead>
                <SortableTableHead field="ppc_bid_exact" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">PPC Bid (Exact)</SortableTableHead>
                <SortableTableHead field="ease_of_ranking_score" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Ease Score</SortableTableHead>
                <SortableTableHead field="dominant_category" currentField={sortField} direction={sortDirection} onSort={handleSort}>Category</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-sm">{row.keyword}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.seed_keyword}</TableCell>
                  <TableCell className="text-right">{row.monthly_search_volume_exact?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell className="text-right">{row.monthly_search_volume_broad?.toLocaleString() ?? '—'}</TableCell>
                  <TableCell className="text-right">{row.ppc_bid_exact != null ? `£${row.ppc_bid_exact.toFixed(2)}` : '—'}</TableCell>
                  <TableCell className="text-right">{row.ease_of_ranking_score ?? '—'}</TableCell>
                  <TableCell className="text-xs">{row.dominant_category ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No expansion data yet. Enter a keyword above to fetch.</p>
      )}
    </div>
  );
};
