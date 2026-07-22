import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BuyBoxAlertsCard } from './BuyBoxAlertsCard';
import { ClientAlertsCard } from './ClientAlertsCard';
import { useBuyBoxAlerts } from '@/hooks/useBuyBoxAlerts';
import { supabase } from '@/integrations/supabase/client';

interface CollapsibleAlertsProps {
  merchantToken: string;
  accountName: string;
  hideConfigButton?: boolean;
}

const COLLAPSE_KEY = 'dashboard_alerts_collapsed';

export const CollapsibleAlerts = ({ merchantToken, accountName, hideConfigButton }: CollapsibleAlertsProps) => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  });
  const [clientAlertCount, setClientAlertCount] = useState(0);

  const { alerts: buyBoxAlerts, loading: buyBoxLoading } = useBuyBoxAlerts(merchantToken);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed.toString());
  }, [collapsed]);

  // Fetch client alert count
  useEffect(() => {
    const fetchCount = async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count } = await supabase
        .from('client_threshold_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_token', merchantToken)
        .gte('detection_date', sevenDaysAgo.toISOString().split('T')[0]);
      setClientAlertCount(count || 0);
    };
    fetchCount();
  }, [merchantToken]);

  const totalAlerts = (buyBoxAlerts?.length || 0) + clientAlertCount;
  const isLoading = buyBoxLoading;

  if (!isLoading && totalAlerts === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span>All clear — no active alerts</span>
      </div>
    );
  }

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>{isLoading ? 'Loading alerts...' : `${totalAlerts} Active Alert${totalAlerts !== 1 ? 's' : ''}`}</span>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <BuyBoxAlertsCard merchantToken={merchantToken} accountName={accountName} />
          <ClientAlertsCard merchantToken={merchantToken} accountName={accountName} hideConfigButton={hideConfigButton} />
        </div>
      )}
    </div>
  );
};
