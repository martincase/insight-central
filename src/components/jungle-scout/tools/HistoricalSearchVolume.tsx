import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { CalendarIcon, Loader2, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { ExcelExportButton } from './ExcelExportButton';

interface HistoricalSearchVolumeProps {
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

export const HistoricalSearchVolume = ({ accountName }: HistoricalSearchVolumeProps) => {
  const [keyword, setKeyword] = useState('');
  const [marketplace, setMarketplace] = useState('uk');
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 12));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isFetching, setIsFetching] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['js-historical-volume', accountName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jungle_scout_historical_search_volume')
        .select('*')
        .eq('account_name', accountName)
        .order('estimate_start_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort({
    data: data ?? [],
    defaultSortField: 'estimated_exact_search_volume' as any,
  });

  const handleFetch = async () => {
    if (!keyword.trim()) {
      toast({ title: 'Enter a keyword', variant: 'destructive' });
      return;
    }
    setIsFetching(true);
    try {
      const { error } = await supabase.functions.invoke('jungle-scout-historical-search-volume', {
        body: {
          keyword: keyword.trim(),
          marketplace,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          account_name: accountName,
        },
      });
      if (error) throw error;
      toast({ title: 'Historical data fetch queued' });
      setTimeout(() => refetch(), 3000);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  const chartData = data?.map((d) => ({
    date: d.estimate_start_date,
    volume: d.estimated_exact_search_volume ?? 0,
  })) ?? [];

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[180px]">
          <Label>Keyword</Label>
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
        <div className="space-y-1">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal text-xs")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {format(startDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal text-xs")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {format(endDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={handleFetch} disabled={isFetching} className="gap-2">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
          Get History
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
      ) : chartData.length > 0 ? (
        <>
          <div className="flex justify-end">
            <ExcelExportButton data={sortedData ?? []} filename={`historical-volume-${accountName}`} sheetName="Historical Volume" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => format(new Date(v), 'MMM yy')} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} labelFormatter={(l) => format(new Date(l), 'dd MMM yyyy')} />
                <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="border rounded-lg overflow-auto max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="keyword" currentField={sortField} direction={sortDirection} onSort={handleSort}>Keyword</SortableTableHead>
                  <SortableTableHead field="estimate_start_date" currentField={sortField} direction={sortDirection} onSort={handleSort}>Start Date</SortableTableHead>
                  <SortableTableHead field="estimate_end_date" currentField={sortField} direction={sortDirection} onSort={handleSort}>End Date</SortableTableHead>
                  <SortableTableHead field="estimated_exact_search_volume" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Exact Search Vol</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData?.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-sm">{row.keyword}</TableCell>
                    <TableCell className="text-sm">{row.estimate_start_date}</TableCell>
                    <TableCell className="text-sm">{row.estimate_end_date}</TableCell>
                    <TableCell className="text-right">{row.estimated_exact_search_volume?.toLocaleString() ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No historical data yet. Enter a keyword and date range to fetch.</p>
      )}
    </div>
  );
};
