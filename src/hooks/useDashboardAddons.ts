import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardAddon {
  addon_key: string;
  enabled: boolean;
  config: Record<string, any> | null;
  sort_order: number;
}

export function useDashboardAddons(spid: string | null | undefined) {
  const [addons, setAddons] = useState<DashboardAddon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spid) {
      setAddons([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('rpc_dashboard_addons', { p_spid: spid });
        if (cancelled) return;
        if (error) throw error;
        const rows = (data as DashboardAddon[]) || [];
        setAddons(
          [...rows]
            .filter((r) => r.enabled)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        );
      } catch (e) {
        console.error('useDashboardAddons error', e);
        if (!cancelled) setAddons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spid]);

  const isEnabled = (key: string) => addons.some((a) => a.addon_key === key);
  const configFor = (key: string) => addons.find((a) => a.addon_key === key)?.config ?? null;

  return { addons, loading, isEnabled, configFor };
}
