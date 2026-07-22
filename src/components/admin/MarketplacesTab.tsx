import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getCountryFlagImage, getCountryName } from '@/utils/countryUtils';
import { Lock, Search } from 'lucide-react';

interface Row {
  id: string;
  brand_name: string | null;
  selling_partner_id: string;
  marketplace_id: string;
  country_code: string;
  currency: string;
  region: string;
  is_primary: boolean;
  enabled: boolean;
  sort_order: number;
  country_name: string;
}

export function MarketplacesTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: bm, error: bmErr }, { data: mk, error: mkErr }] = await Promise.all([
        supabase
          .from('brand_marketplaces')
          .select('id, brand_name, selling_partner_id, marketplace_id, country_code, currency, region, is_primary, enabled')
          .order('brand_name', { ascending: true }),
        supabase.from('amazon_marketplaces').select('marketplace_id, country_name, sort_order'),
      ]);
      if (bmErr) throw bmErr;
      if (mkErr) throw mkErr;

      const mkMap = new Map<string, { country_name: string; sort_order: number }>();
      (mk || []).forEach((m: any) =>
        mkMap.set(m.marketplace_id, { country_name: m.country_name, sort_order: m.sort_order ?? 999 })
      );

      const enriched: Row[] = (bm || []).map((r: any) => ({
        ...r,
        country_name: mkMap.get(r.marketplace_id)?.country_name || r.country_code,
        sort_order: mkMap.get(r.marketplace_id)?.sort_order ?? 999,
      }));
      setRows(enriched);
    } catch (e: any) {
      toast.error('Failed to load marketplaces: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const key = `${r.brand_name || r.selling_partner_id}||${r.selling_partner_id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    const groups = Array.from(map.entries())
      .map(([key, list]) => {
        const [brand_name, spid] = key.split('||');
        return {
          brand_name,
          spid,
          list: list.slice().sort((a, b) => a.sort_order - b.sort_order),
        };
      })
      .sort((a, b) => (a.brand_name || '').localeCompare(b.brand_name || ''));
    if (!q) return groups;
    return groups.filter(
      (g) =>
        (g.brand_name || '').toLowerCase().includes(q) ||
        g.spid.toLowerCase().includes(q) ||
        g.list.some((r) => r.country_code.toLowerCase().includes(q) || r.country_name.toLowerCase().includes(q))
    );
  }, [rows, filter]);

  const toggle = async (row: Row, next: boolean) => {
    if (row.is_primary && !next) {
      toast.error("Can't disable a brand's primary marketplace");
      return;
    }
    setSavingId(row.id);
    // optimistic
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: next } : r)));
    const { error } = await supabase.from('brand_marketplaces').update({ enabled: next }).eq('id', row.id);
    setSavingId(null);
    if (error) {
      // revert
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: !next } : r)));
      toast.error('Update failed: ' + error.message);
    } else {
      toast.success(`${row.country_name} ${next ? 'enabled' : 'disabled'} for ${row.brand_name || row.selling_partner_id}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Brand Marketplaces</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enable or disable countries per brand. The country switcher on brand dashboards only shows enabled
            marketplaces. The primary marketplace is locked and cannot be disabled.
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by brand, SPID, or country…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No brands found.</div>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => (
                <div key={g.spid} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm md:text-base truncate">{g.brand_name || g.spid}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground font-mono">{g.spid}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {g.list.filter((r) => r.enabled).length} / {g.list.length} enabled
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {g.list.map((r) => {
                      const flag = getCountryFlagImage(r.country_code);
                      const locked = r.is_primary;
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-sm cursor-pointer transition-colors ${
                            r.enabled ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50'
                          } ${locked ? 'cursor-not-allowed opacity-90' : 'hover:border-blue-300'}`}
                        >
                          <Checkbox
                            checked={r.enabled}
                            disabled={locked || savingId === r.id}
                            onCheckedChange={(v) => toggle(r, !!v)}
                          />
                          {flag && <img src={flag} alt="" className="h-3.5 w-5 object-cover rounded-sm" />}
                          <span className="flex-1 truncate">{getCountryName(r.country_code)}</span>
                          {locked && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-1">
                              <Lock className="h-2.5 w-2.5" />
                              Primary
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
