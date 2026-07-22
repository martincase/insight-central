import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BuyBoxAlert {
  account_name: string;
  child_asin: string;
  record_date: string;
  buy_box_percentage: number;
  previous_day_bb: number | null;
  day_over_day_change: number | null;
  consecutive_days_at_zero: number;
  alert_level: 'CRITICAL' | 'WARNING';
  alert_message: string;
}

interface UseBuyBoxAlertsResult {
  alerts: BuyBoxAlert[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBuyBoxAlerts(merchantToken: string): UseBuyBoxAlertsResult {
  const [alerts, setAlerts] = useState<BuyBoxAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlerts = async () => {
    if (!merchantToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch only CRITICAL and WARNING alerts for this account
      // Get the latest record_date first, then filter alerts for that date
      const { data, error: fetchError } = await supabase
        .from('vw_buy_box_monitoring')
        .select('*')
        .eq('account_name', merchantToken)
        .in('alert_level', ['CRITICAL', 'WARNING'])
        .order('record_date', { ascending: false })
        .order('consecutive_days_at_zero', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (!data || data.length === 0) {
        setAlerts([]);
        return;
      }

      // Get the latest record date from results
      const latestDate = data[0].record_date;
      
      // Filter to only show alerts from the latest date
      const latestAlerts = data.filter(alert => alert.record_date === latestDate);

      // Sort: CRITICAL first, then by consecutive_days_at_zero desc
      const sortedAlerts = latestAlerts.sort((a, b) => {
        if (a.alert_level === 'CRITICAL' && b.alert_level !== 'CRITICAL') return -1;
        if (a.alert_level !== 'CRITICAL' && b.alert_level === 'CRITICAL') return 1;
        return (b.consecutive_days_at_zero || 0) - (a.consecutive_days_at_zero || 0);
      });

      setAlerts(sortedAlerts as BuyBoxAlert[]);
    } catch (err) {
      console.error('Error fetching buy box alerts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch buy box alerts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [merchantToken]);

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts
  };
}
