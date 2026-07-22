import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { ExcelExportButton } from './ExcelExportButton';

interface ShareOfVoiceDashboardProps {
  accountName: string;
}

export const ShareOfVoiceDashboard = ({ accountName }: ShareOfVoiceDashboardProps) => {
  const [selectedSovId, setSelectedSovId] = useState<string>('');

  const { data: sovKeywords, isLoading: loadingKeywords } = useQuery({
    queryKey: ['jungle-scout-sov', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_share_of_voice')
        .select('id, keyword, marketplace, estimated_30_day_search_volume, last_pulled_at')
        .eq('account_name', accountName)
        .order('last_pulled_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeSovId = selectedSovId || (sovKeywords?.[0]?.id?.toString() ?? '');

  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: ['jungle-scout-sov-brands', activeSovId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_sov_brands')
        .select('*')
        .eq('sov_id', Number(activeSovId))
        .gt('combined_weighted_sov', 0)
        .order('combined_weighted_sov', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeSovId,
  });

  const { data: topAsins, isLoading: loadingAsins } = useQuery({
    queryKey: ['jungle-scout-sov-asins', activeSovId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_sov_top_asins')
        .select('*')
        .eq('sov_id', Number(activeSovId))
        .order('clicks', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeSovId,
  });

  const { sortedData: sortedBrands, sortField: bsf, sortDirection: bsd, handleSort: bhs } = useTableSort({
    data: brands ?? [],
    defaultSortField: 'combined_weighted_sov' as any,
  });

  const { sortedData: sortedAsins, sortField: asf, sortDirection: asd, handleSort: ahs } = useTableSort({
    data: topAsins ?? [],
    defaultSortField: 'clicks' as any,
  });

  if (loadingKeywords) {
    return <div className="flex items-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;
  }

  if (!sovKeywords?.length) {
    return <p className="text-sm text-muted-foreground py-4">No Share of Voice data found for this account. Use Research Launcher to fetch data.</p>;
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

      {activeSovId && sovKeywords && (() => {
        const kw = sovKeywords.find((s) => s.id.toString() === activeSovId);
        return kw ? (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Search Vol: <strong>{kw.estimated_30_day_search_volume?.toLocaleString() ?? '—'}</strong></span>
            <span>Last Pulled: <strong>{kw.last_pulled_at ? new Date(kw.last_pulled_at).toLocaleDateString() : '—'}</strong></span>
          </div>
        ) : null;
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Brand Share of Voice</CardTitle>
              <ExcelExportButton data={sortedBrands ?? []} filename={`sov-brands-${accountName}`} sheetName="SOV Brands" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingBrands ? (
              <div className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead field="brand" currentField={bsf} direction={bsd} onSort={bhs}>Brand</SortableTableHead>
                    <SortableTableHead field="combined_weighted_sov" currentField={bsf} direction={bsd} onSort={bhs} className="text-right">Weighted SOV</SortableTableHead>
                    <SortableTableHead field="combined_products" currentField={bsf} direction={bsd} onSort={bhs} className="text-right">Products</SortableTableHead>
                    <SortableTableHead field="combined_average_position" currentField={bsf} direction={bsd} onSort={bhs} className="text-right">Avg Position</SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBrands?.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        {i === 0 && <Badge variant="default" className="mr-1 text-[10px]">1st</Badge>}
                        {b.brand ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">{((b.combined_weighted_sov ?? 0) * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{b.combined_products ?? 0}</TableCell>
                      <TableCell className="text-right">{b.combined_average_position?.toFixed(1) ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!sortedBrands?.length && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No brand data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Top ASINs</CardTitle>
              <ExcelExportButton data={sortedAsins ?? []} filename={`sov-asins-${accountName}`} sheetName="SOV ASINs" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingAsins ? (
              <div className="flex items-center gap-2 p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead field="asin" currentField={asf} direction={asd} onSort={ahs}>ASIN</SortableTableHead>
                    <SortableTableHead field="brand" currentField={asf} direction={asd} onSort={ahs}>Brand</SortableTableHead>
                    <SortableTableHead field="clicks" currentField={asf} direction={asd} onSort={ahs} className="text-right">Clicks</SortableTableHead>
                    <SortableTableHead field="conversion_rate" currentField={asf} direction={asd} onSort={ahs} className="text-right">Conv Rate</SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAsins?.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.asin}</TableCell>
                      <TableCell className="text-sm">{a.brand ?? '—'}</TableCell>
                      <TableCell className="text-right">{a.clicks?.toLocaleString() ?? '—'}</TableCell>
                      <TableCell className="text-right">{a.conversion_rate != null ? `${(a.conversion_rate * 100).toFixed(1)}%` : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!sortedAsins?.length && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No ASIN data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
