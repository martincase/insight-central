import { useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateFilterSelector } from '@/components/dashboard/DateFilterSelector';
import { getCurrentDateRange } from '@/utils/dataProcessor';
import { getDateDisplayText } from '@/utils/dateUtils';
import { DateFilter } from '@/types/dashboard';
import { ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Globe, Info, Building2, ShoppingCart, TrendingUp, Layers } from 'lucide-react';

interface AgencyRow {
  spid: string;
  brand_name: string;
  countries: number;
  units: number;
  sales_gbp: number;
}

type SortField = 'brand_name' | 'countries' | 'units' | 'sales_gbp';

const fmtGbp = (v: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(v || 0);
const fmtInt = (v: number) => new Intl.NumberFormat('en-GB').format(Math.round(v || 0));

const AgencyView = () => {
  const { isStaff, loading: authLoading } = useAuth();

  const [dateFilter, setDateFilter] = useState<DateFilter>('past-30-days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [rows, setRows] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('sales_gbp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const range = useMemo(() => getCurrentDateRange(dateFilter, customDateRange), [dateFilter, customDateRange]);
  const pStart = useMemo(() => format(range.from, 'yyyy-MM-dd'), [range.from]);
  const pEnd = useMemo(() => format(range.to, 'yyyy-MM-dd'), [range.to]);

  if (!authLoading && !isStaff) return <Navigate to="/" replace />;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error } = await supabase.rpc('rpc_agency_summary', { p_start: pStart, p_end: pEnd });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows(((data as any[]) || []) as AgencyRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pStart, pEnd]);

  const totalGbp = rows.reduce((s, r) => s + Number(r.sales_gbp || 0), 0);
  const totalUnits = rows.reduce((s, r) => s + Number(r.units || 0), 0);
  const brandCount = rows.length;
  const multiCountryCount = rows.filter((r) => Number(r.countries || 0) > 1).length;

  const sortedRows = useMemo(() => {
    const arr = rows.slice();
    arr.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? Number(av || 0) - Number(bv || 0) : Number(bv || 0) - Number(av || 0);
    });
    return arr;
  }, [rows, sortField, sortDir]);

  const handleSort = (f: SortField) => {
    if (f === sortField) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(f);
      setSortDir(f === 'brand_name' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ f }: { f: SortField }) =>
    sortField !== f ? (
      <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />
    ) : sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 inline" />
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="h-6 w-6 text-blue-600" />
                Agency Overview
              </h1>
              <p className="text-sm text-muted-foreground">All brands × all countries, converted to GBP.</p>
            </div>
          </div>
          <DateFilterSelector
            dateFilter={dateFilter}
            customDateRange={customDateRange}
            onDateFilterChange={setDateFilter}
            onCustomDateRangeChange={setCustomDateRange}
            getDateDisplayText={() => getDateDisplayText(dateFilter, customDateRange)}
          />
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 mb-4">
            <CardContent className="p-4 text-sm text-red-700">Error: {error}</CardContent>
          </Card>
        )}

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Total Sales</div>
              {loading ? <Skeleton className="h-7 w-24 mt-1" /> : <div className="text-lg md:text-2xl font-bold mt-1">{fmtGbp(totalGbp)}</div>}
              <div className="text-[10px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <Info className="h-3 w-3" /> Converted to GBP @ latest FX
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5" />Total Units</div>
              {loading ? <Skeleton className="h-7 w-20 mt-1" /> : <div className="text-lg md:text-2xl font-bold mt-1">{fmtInt(totalUnits)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Brands</div>
              {loading ? <Skeleton className="h-7 w-16 mt-1" /> : <div className="text-lg md:text-2xl font-bold mt-1">{fmtInt(brandCount)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />Multi-country brands</div>
              {loading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <div className="text-lg md:text-2xl font-bold mt-1">
                  {fmtInt(multiCountryCount)}
                  <span className="text-xs text-muted-foreground font-normal ml-1">/ {fmtInt(brandCount)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Brand table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base">Brands · {pStart} → {pEnd}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No sales in the selected range.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('brand_name')}>
                      Brand<SortIcon f="brand_name" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('countries')}>
                      Countries<SortIcon f="countries" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('units')}>
                      Units<SortIcon f="units" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('sales_gbp')}>
                      Sales (GBP)<SortIcon f="sales_gbp" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((r) => {
                    const isMulti = Number(r.countries || 0) > 1;
                    return (
                      <TableRow key={r.spid}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.brand_name || r.spid}</span>
                            {isMulti && (
                              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 h-4">
                                <Globe className="h-2.5 w-2.5" /> Multi-country
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{r.spid}</div>
                        </TableCell>
                        <TableCell className="text-right">{fmtInt(Number(r.countries || 0))}</TableCell>
                        <TableCell className="text-right">{fmtInt(Number(r.units || 0))}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtGbp(Number(r.sales_gbp || 0))}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell>Total ({rows.length} brands)</TableCell>
                    <TableCell className="text-right text-muted-foreground">—</TableCell>
                    <TableCell className="text-right">{fmtInt(totalUnits)}</TableCell>
                    <TableCell className="text-right">{fmtGbp(totalGbp)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgencyView;
