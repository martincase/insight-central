import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { ExcelExportButton } from './ExcelExportButton';

interface CompetitorTrackingProps {
  accountName: string;
}

export const CompetitorTracking = ({ accountName }: CompetitorTrackingProps) => {
  const [selectedSovId, setSelectedSovId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: sovKeywords, isLoading: loadingKw } = useQuery({
    queryKey: ['js-sov-keywords-ct', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_share_of_voice')
        .select('id, keyword, marketplace')
        .eq('account_name', accountName)
        .order('last_pulled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeSovId = selectedSovId || (sovKeywords?.[0]?.id?.toString() ?? '');

  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: ['js-sov-brands-ct', activeSovId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_sov_brands')
        .select('*')
        .eq('sov_id', Number(activeSovId))
        .order('combined_weighted_sov', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeSovId,
  });

  const { data: tracked } = useQuery({
    queryKey: ['js-tracked-competitors', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_competitors')
        .select('*')
        .eq('account_name', accountName)
        .eq('active', true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const trackedBrands = new Set(tracked?.map((t) => t.competitor_asin) ?? []);

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
    data: brands ?? [],
    defaultSortField: 'combined_weighted_sov' as any,
  });

  const toggleTracked = async (brandName: string, currentlyTracked: boolean) => {
    try {
      if (currentlyTracked) {
        await supabase
          .from('jungle_scout_competitors')
          .update({ active: false })
          .eq('account_name', accountName)
          .eq('competitor_asin', brandName);
      } else {
        await supabase
          .from('jungle_scout_competitors')
          .upsert({
            account_name: accountName,
            client_asin: accountName,
            competitor_asin: brandName,
            active: true,
            type: 'brand',
          }, { onConflict: 'client_asin,competitor_asin' });
      }
      queryClient.invalidateQueries({ queryKey: ['js-tracked-competitors', accountName] });
      toast({ title: currentlyTracked ? 'Competitor untracked' : 'Competitor tracked' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loadingKw) {
    return <div className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;
  }

  if (!sovKeywords?.length) {
    return <p className="text-sm text-muted-foreground py-4">No Share of Voice data. Use Research Launcher to fetch SOV first.</p>;
  }

  return (
    <div className="space-y-4 py-2">
      <div className="max-w-xs">
        <Select value={activeSovId} onValueChange={setSelectedSovId}>
          <SelectTrigger>
            <SelectValue placeholder="Select keyword" />
          </SelectTrigger>
          <SelectContent>
            {sovKeywords.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.keyword} ({s.marketplace?.toUpperCase()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sortedData?.length > 0 && (
        <div className="flex justify-end">
          <ExcelExportButton data={sortedData} filename={`competitor-tracking-${accountName}`} sheetName="Competitors" />
        </div>
      )}

      {loadingBrands ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : sortedData?.length ? (
        <div className="border rounded-lg overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead field="brand" currentField={sortField} direction={sortDirection} onSort={handleSort}>Brand</SortableTableHead>
                <SortableTableHead field="combined_weighted_sov" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Weighted SOV</SortableTableHead>
                <SortableTableHead field="combined_products" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Products</SortableTableHead>
                <SortableTableHead field="combined_average_price" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Avg Price</SortableTableHead>
                <SortableTableHead field="combined_average_position" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Avg Position</SortableTableHead>
                <SortableTableHead field="brand" currentField="" direction={sortDirection} onSort={() => {}} className="text-center">Track</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((b) => {
                const isTracked = trackedBrands.has(b.brand ?? '');
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-sm">
                      {b.brand ?? '—'}
                      {isTracked && <Badge variant="secondary" className="ml-2 text-[10px]">Tracked</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{((b.combined_weighted_sov ?? 0) * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{b.combined_products ?? 0}</TableCell>
                    <TableCell className="text-right">{b.combined_average_price != null ? `£${b.combined_average_price.toFixed(2)}` : '—'}</TableCell>
                    <TableCell className="text-right">{b.combined_average_position?.toFixed(1) ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={isTracked}
                        onCheckedChange={() => toggleTracked(b.brand ?? '', isTracked)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No brand data for this keyword.</p>
      )}
    </div>
  );
};
