import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChangeMarker {
  id: string;
  merchant_token: string;
  account_name: string;
  event_date: string;
  event_label: string;
  change_notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const useChangeMarkers = (merchantToken: string) => {
  const [markers, setMarkers] = useState<ChangeMarker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkers = useCallback(async () => {
    if (!merchantToken) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('account_change_marker')
      .select('*')
      .eq('merchant_token', merchantToken)
      .order('event_date', { ascending: false });
    if (!error && data) {
      setMarkers(data as ChangeMarker[]);
    }
    setLoading(false);
  }, [merchantToken]);

  useEffect(() => { fetchMarkers(); }, [fetchMarkers]);

  return { markers, loading, refetch: fetchMarkers };
};
