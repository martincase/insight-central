import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-header';
import { useTableSort } from '@/hooks/useTableSort';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Users, PoundSterling, AlertTriangle, Loader2, Check, X, Unlink, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface AccountMaster {
  id: string;
  account_name: string;
  merchant_token: string;
  api_account_name: string | null;
  status: string | null;
}

interface XeroMapping {
  id: string;
  account_name: string;
  xero_contact_id: string | null;
  xero_contact_name: string | null;
  is_mapped: boolean | null;
  is_active: boolean | null;
}

interface PaymentGrade {
  xero_contact_id: string;
  client_name: string;
  grade: string;
  grade_reason: string | null;
  total_owed: number;
  overdue_amount: number;
  max_days_overdue: number;
  invoice_count: number;
  overdue_invoice_count: number;
  last_synced_at: string | null;
}

interface JoinedRow {
  id: string;
  account_name: string;
  api_account_name: string | null;
  source: 'accounts_master' | 'xero_only';
  is_mapped: boolean;
  xero_mapping_id: string | null;
  xero_contact_id: string | null;
  xero_contact_name: string | null;
  grade: string | null;
  grade_reason: string | null;
  total_owed: number | null;
  overdue_amount: number | null;
  max_days_overdue: number | null;
  invoice_count: number | null;
  overdue_invoice_count: number | null;
  last_synced_at: string | null;
}

// removed ClientFilter type

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  D: 'bg-orange-100 text-orange-800 border-orange-300',
  F: 'bg-red-100 text-red-800 border-red-300',
};

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

export const ClientPaymentsDashboard = () => {
  const [search, setSearch] = useState('');
  const [mappedFilter, setMappedFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const queryClient = useQueryClient();

  // Fetch accounts_master - all active accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts-master-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_master')
        .select('id, account_name, merchant_token, api_account_name, status')
        .eq('status', 'active')
        .order('account_name');
      if (error) throw error;
      return (data ?? []) as AccountMaster[];
    },
  });

  // Fetch xero_account_mapping
  const { data: xeroMappings = [], isLoading: loadingMappings } = useQuery({
    queryKey: ['xero-account-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xero_account_mapping')
        .select('id, account_name, xero_contact_id, xero_contact_name, is_mapped, is_active')
        .eq('is_active', true)
        .order('account_name');
      if (error) throw error;
      return (data ?? []) as XeroMapping[];
    },
  });

  // Fetch payment grades
  const { data: grades = [], isLoading: loadingGrades } = useQuery({
    queryKey: ['xero-payment-grades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('xero_client_payment_grades')
        .select('xero_contact_id, client_name, grade, grade_reason, total_owed, overdue_amount, max_days_overdue, invoice_count, overdue_invoice_count, last_synced_at');
      if (error) throw error;
      return (data ?? []) as PaymentGrade[];
    },
  });

  const gradesByContactId = useMemo(() => {
    const map = new Map<string, PaymentGrade>();
    grades.forEach(g => map.set(g.xero_contact_id, g));
    return map;
  }, [grades]);

  // Compute "Other / Ad Hoc" row: grades whose xero_contact_id is NOT in any xero_account_mapping
  const mappedContactIds = useMemo(() => {
    const set = new Set<string>();
    xeroMappings.forEach(m => { if (m.xero_contact_id) set.add(m.xero_contact_id); });
    return set;
  }, [xeroMappings]);

  const otherStats = useMemo(() => {
    const unmapped = grades.filter(g => !mappedContactIds.has(g.xero_contact_id));
    return {
      count: unmapped.length,
      totalOwed: unmapped.reduce((s, g) => s + Number(g.total_owed), 0),
      overdueAmount: unmapped.reduce((s, g) => s + Number(g.overdue_amount), 0),
    };
  }, [grades, mappedContactIds]);

  // Build xero mapping lookup by account_name (lowercase)
  const xeroByAccountName = useMemo(() => {
    const map = new Map<string, XeroMapping>();
    xeroMappings.forEach(m => map.set(m.account_name.toLowerCase(), m));
    return map;
  }, [xeroMappings]);

  // Build joined data - all accounts_master (active), join to xero on api_account_name OR account_name
  const joinedData = useMemo<JoinedRow[]>(() => {
    return accounts.map(a => {
      // Try matching on api_account_name first, then account_name
      const xero = (a.api_account_name ? xeroByAccountName.get(a.api_account_name.toLowerCase()) : undefined)
        ?? xeroByAccountName.get(a.account_name.toLowerCase());
      const g = xero?.xero_contact_id ? gradesByContactId.get(xero.xero_contact_id) : undefined;

      return {
        id: a.id,
        account_name: a.account_name,
        api_account_name: a.api_account_name,
        source: 'accounts_master' as const,
        is_mapped: !!xero?.is_mapped,
        xero_mapping_id: xero?.id ?? null,
        xero_contact_id: xero?.xero_contact_id ?? null,
        xero_contact_name: xero?.xero_contact_name ?? null,
        grade: g?.grade ?? null,
        grade_reason: g?.grade_reason ?? null,
        total_owed: g ? Number(g.total_owed) : null,
        overdue_amount: g ? Number(g.overdue_amount) : null,
        max_days_overdue: g?.max_days_overdue ?? null,
        invoice_count: g?.invoice_count ?? null,
        overdue_invoice_count: g?.overdue_invoice_count ?? null,
        last_synced_at: g?.last_synced_at ?? null,
      };
    });
  }, [accounts, xeroByAccountName, gradesByContactId]);

  const filtered = useMemo(() => {
    let d = joinedData;
    if (mappedFilter === 'mapped') d = d.filter(r => r.is_mapped);
    if (mappedFilter === 'unmapped') d = d.filter(r => !r.is_mapped);
    if (gradeFilter !== 'all') d = d.filter(r => r.grade === gradeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(r => r.account_name.toLowerCase().includes(q));
    }
    return d;
  }, [joinedData, mappedFilter, gradeFilter, search]);

  const { sortedData, sortField, sortDirection, handleSort } = useTableSort<JoinedRow>({
    data: filtered,
    defaultSortField: 'account_name',
    defaultSortDirection: 'asc',
  });

  // Summary stats — from current filtered view, mapped only
  const mapped = joinedData.filter(r => r.is_mapped);
  const totalMapped = mapped.length;
  const totalOwed = mapped.reduce((s, r) => s + (r.total_owed ?? 0), 0) + otherStats.totalOwed;
  const totalOverdue = mapped.reduce((s, r) => s + (r.overdue_amount ?? 0), 0) + otherStats.overdueAmount;
  const attention = mapped.filter(r => r.grade && ['C', 'D', 'F'].includes(r.grade)).length;

  const handleMap = useCallback(async (row: JoinedRow, contact: PaymentGrade) => {
    const lookupName = row.api_account_name || row.account_name;
    // Check if xero_account_mapping row exists for this name
    const existing = xeroByAccountName.get(lookupName.toLowerCase());
    if (existing) {
      const { error } = await supabase
        .from('xero_account_mapping')
        .update({
          xero_contact_id: contact.xero_contact_id,
          xero_contact_name: contact.client_name,
          is_mapped: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) { toast.error('Failed to map contact'); return; }
    } else {
      const { error } = await supabase
        .from('xero_account_mapping')
        .insert({
          account_name: lookupName,
          xero_contact_id: contact.xero_contact_id,
          xero_contact_name: contact.client_name,
          is_mapped: true,
          is_active: true,
        });
      if (error) { toast.error('Failed to create mapping'); return; }
    }
    toast.success(`Mapped to ${contact.client_name}`);
    queryClient.invalidateQueries({ queryKey: ['xero-account-mappings'] });
  }, [queryClient, xeroByAccountName]);

  const handleUnmap = useCallback(async (row: JoinedRow) => {
    const mappingId = row.xero_mapping_id;
    if (!mappingId) return;
    const { error } = await supabase
      .from('xero_account_mapping')
      .update({
        xero_contact_id: null,
        xero_contact_name: null,
        is_mapped: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mappingId);
    if (error) { toast.error('Failed to unmap contact'); return; }
    toast.success('Contact unmapped');
    queryClient.invalidateQueries({ queryKey: ['xero-account-mappings'] });
  }, [queryClient]);

  const isLoading = loadingAccounts || loadingMappings || loadingGrades;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Mapped Clients
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalMapped}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <PoundSterling className="h-3.5 w-3.5" /> Total Owed
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatGBP(totalOwed)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <PoundSterling className="h-3.5 w-3.5 text-red-500" /> Total Overdue
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatGBP(totalOverdue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" /> Attention Needed
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-orange-600">{attention}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search account name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={mappedFilter} onValueChange={setMappedFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="mapped">Mapped</SelectItem>
            <SelectItem value="unmapped">Unmapped</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {['A', 'B', 'C', 'D', 'F'].map(g => (
              <SelectItem key={g} value={g}>Grade {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="account_name" currentField={sortField} direction={sortDirection} onSort={handleSort}>Account Name</SortableTableHead>
              <SortableTableHead field="is_mapped" currentField={sortField} direction={sortDirection} onSort={handleSort}>Mapped</SortableTableHead>
              <TableHead>Xero Contact</TableHead>
              <SortableTableHead field="grade" currentField={sortField} direction={sortDirection} onSort={handleSort}>Grade</SortableTableHead>
              <SortableTableHead field="total_owed" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Total Owed</SortableTableHead>
              <SortableTableHead field="overdue_amount" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Overdue</SortableTableHead>
              <SortableTableHead field="max_days_overdue" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Days Overdue</SortableTableHead>
              <SortableTableHead field="invoice_count" currentField={sortField} direction={sortDirection} onSort={handleSort} className="text-right">Invoices</SortableTableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No accounts found</TableCell>
              </TableRow>
            ) : (
              sortedData.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.account_name}
                  </TableCell>
                  <TableCell>
                    {row.is_mapped ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                  </TableCell>
                  <TableCell>
                    {row.is_mapped ? (
                      <span className="text-sm">{row.xero_contact_name}</span>
                    ) : (
                      <XeroContactCombobox
                        contacts={grades}
                        onSelect={contact => handleMap(row, contact)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {row.grade ? (
                      <Badge variant="outline" className={GRADE_COLORS[row.grade] || ''}>{row.grade}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{row.total_owed != null ? formatGBP(row.total_owed) : '—'}</TableCell>
                  <TableCell className="text-right">{row.overdue_amount != null ? formatGBP(row.overdue_amount) : '—'}</TableCell>
                  <TableCell className="text-right">{row.max_days_overdue ?? '—'}</TableCell>
                  <TableCell className="text-right">{row.invoice_count ?? '—'}</TableCell>
                  <TableCell>
                    {row.is_mapped && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Unmap contact"
                        onClick={() => handleUnmap(row)}
                      >
                        <Unlink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
            {/* Other / Ad Hoc summary row */}
            {otherStats.count > 0 && (
              <TableRow className="bg-muted/50 border-t-2">
                <TableCell className="font-medium italic text-muted-foreground">Other / Ad Hoc</TableCell>
                <TableCell><span className="text-muted-foreground text-xs">—</span></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{otherStats.count} contacts</span></TableCell>
                <TableCell><span className="text-muted-foreground text-xs">—</span></TableCell>
                <TableCell className="text-right font-medium">{formatGBP(otherStats.totalOwed)}</TableCell>
                <TableCell className="text-right font-medium">{otherStats.overdueAmount > 0 ? <span className="text-red-600">{formatGBP(otherStats.overdueAmount)}</span> : '—'}</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell className="text-right">—</TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

function XeroContactCombobox({
  contacts,
  onSelect,
}: {
  contacts: PaymentGrade[];
  onSelect: (contact: PaymentGrade) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-[200px] justify-between text-xs font-normal text-muted-foreground">
          Select contact…
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search Xero contacts..." className="h-9" />
          <CommandList>
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup>
              {contacts.map(c => (
                <CommandItem
                  key={c.xero_contact_id}
                  value={c.client_name}
                  onSelect={() => {
                    onSelect(c);
                    setOpen(false);
                  }}
                >
                  {c.client_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
