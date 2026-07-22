import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, RefreshCw, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface EventRow {
  id: string;
  name: string;
  event_type: string;
  start_date: string;
  end_date: string;
  country_code: string | null;
  color: string;
  notes: string | null;
}

interface Marketplace {
  country_code: string;
  country_name: string;
}

const EVENT_TYPES: { value: string; label: string }[] = [
  { value: 'prime_day', label: 'Prime Day' },
  { value: 'big_deal_days', label: 'Big Deal Days' },
  { value: 'black_friday', label: 'Black Friday' },
  { value: 'cyber_monday', label: 'Cyber Monday' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'spring_sale', label: 'Spring Sale' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT_COLOR = '#6366F1';

const ALL_MARKETS = '__ALL__';

interface FormState {
  id: string | null;
  name: string;
  event_type: string;
  start_date: string;
  end_date: string;
  country_code: string; // ALL_MARKETS sentinel or code
  color: string;
  notes: string;
}

const emptyForm: FormState = {
  id: null,
  name: '',
  event_type: 'custom',
  start_date: '',
  end_date: '',
  country_code: ALL_MARKETS,
  color: DEFAULT_COLOR,
  notes: '',
};

export function EventsAdminTab() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [markets, setMarkets] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: ev, error: evErr }, { data: mk, error: mkErr }] = await Promise.all([
        supabase
          .from('dashboard_events')
          .select('id, name, event_type, start_date, end_date, country_code, color, notes')
          .order('start_date', { ascending: false }),
        supabase
          .from('amazon_marketplaces')
          .select('country_code, country_name, sort_order')
          .order('sort_order', { ascending: true }),
      ]);
      if (evErr) throw evErr;
      if (mkErr) throw mkErr;
      setRows((ev || []) as EventRow[]);
      // Dedupe by country_code
      const seen = new Set<string>();
      const list: Marketplace[] = [];
      (mk || []).forEach((m: any) => {
        if (!m.country_code || seen.has(m.country_code)) return;
        seen.add(m.country_code);
        list.push({ country_code: m.country_code, country_name: m.country_name || m.country_code });
      });
      setMarkets(list);
    } catch (e: any) {
      toast.error('Failed to load events: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: EventRow) => {
    setForm({
      id: r.id,
      name: r.name,
      event_type: r.event_type || 'custom',
      start_date: r.start_date,
      end_date: r.end_date,
      country_code: r.country_code ?? ALL_MARKETS,
      color: r.color || DEFAULT_COLOR,
      notes: r.notes ?? '',
    });
    setDialogOpen(true);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.start_date) return 'Start date is required';
    if (!form.end_date) return 'End date is required';
    if (form.end_date < form.start_date) return 'End date must be on or after start date';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        event_type: form.event_type,
        start_date: form.start_date,
        end_date: form.end_date,
        country_code: form.country_code === ALL_MARKETS ? null : form.country_code,
        color: form.color || DEFAULT_COLOR,
        notes: form.notes.trim() ? form.notes.trim() : null,
      };
      if (form.id) {
        const { error } = await supabase.from('dashboard_events').update(payload).eq('id', form.id);
        if (error) throw error;
        toast.success('Event updated');
      } else {
        const { error } = await supabase.from('dashboard_events').insert(payload);
        if (error) throw error;
        toast.success('Event created');
      }
      setDialogOpen(false);
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      toast.error('Save failed: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: EventRow) => {
    if (!confirm(`Delete event "${r.name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('dashboard_events').delete().eq('id', r.id);
      if (error) throw error;
      toast.success('Event deleted');
      await load();
    } catch (e: any) {
      toast.error('Delete failed: ' + (e.message || e));
    }
  };

  const typeLabel = (t: string) =>
    EVENT_TYPES.find((x) => x.value === t)?.label || t;

  const fmtDate = (d: string) => {
    try {
      return format(parseISO(d), 'dd MMM yyyy');
    } catch {
      return d;
    }
  };

  const countryLabel = (code: string | null) => {
    if (!code) return 'All marketplaces';
    return markets.find((m) => m.country_code === code)?.country_name || code;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Dashboard Events
            </CardTitle>
            <CardDescription>
              Manage the timeline events overlaid on sales charts (Prime Day, Black Friday, holidays, custom promos).
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add event
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading events…</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No events yet. Click "Add event" to create one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: r.color || DEFAULT_COLOR }}
                        aria-hidden
                      />
                      <div>
                        <div className="font-medium">{r.name}</div>
                        {r.notes && (
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-[320px]">
                            {r.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {typeLabel(r.event_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {fmtDate(r.start_date)}
                    {r.start_date !== r.end_date && <> – {fmtDate(r.end_date)}</>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.country_code ? (
                      <Badge variant="outline">{countryLabel(r.country_code)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">All marketplaces</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(r)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit event' : 'Add event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="event-name">Name</Label>
              <Input
                id="event-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Prime Big Deal Days"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.event_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, event_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={form.country_code}
                  onValueChange={(v) => setForm((f) => ({ ...f, country_code: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MARKETS}>All marketplaces</SelectItem>
                    {markets.map((m) => (
                      <SelectItem key={m.country_code} value={m.country_code}>
                        {m.country_name} ({m.country_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start date</Label>
                <Input
                  id="event-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End date</Label>
                <Input
                  id="event-end"
                  type="date"
                  value={form.end_date}
                  min={form.start_date || undefined}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-color">Colour</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="event-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 w-16 p-1 cursor-pointer"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  placeholder="#6366F1"
                  className="font-mono max-w-[140px]"
                />
                <span
                  className="inline-block h-6 w-6 rounded-full border border-border"
                  style={{ backgroundColor: form.color || DEFAULT_COLOR }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-notes">Notes (optional)</Label>
              <Textarea
                id="event-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Any context to show on hover"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
