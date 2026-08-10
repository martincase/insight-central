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
  /**
   * A data-supply problem with the account itself, e.g. "only 2 of 31 days of
   * sales have arrived". Lockabox's SP-API credential died on 2 July and this
   * bar still read "All clear — no active alerts" over two days of a month.
   * There being no threshold breach is not the same as there being nothing
   * wrong; an account with no usable data cannot be all clear.
   */
  dataIssue?: { title: string; detail?: string | null } | null;
}

const COLLAPSE_KEY = 'dashboard_alerts_collapsed';

export const CollapsibleAlerts = ({ merchantToken, accountName, hideConfigButton, dataIssue }: CollapsibleAlertsProps) => {
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

  const dataIssueBar = dataIssue ? (
    <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-amber-400 bg-amber-50 text-sm text-amber-900">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-medium">{dataIssue.title}</div>
        {dataIssue.detail && <div className="text-xs mt-0.5">{dataIssue.detail}</div>}
      </div>
    </div>
  ) : null;

  if (!isLoading && totalAlerts === 0) {
    return (
      dataIssueBar ?? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>All clear — no active alerts</span>
        </div>
      )
    );
  }

  return (
    <div className="mb-2">
      {dataIssueBar && <div className="mb-2">{dataIssueBar}</div>}
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
