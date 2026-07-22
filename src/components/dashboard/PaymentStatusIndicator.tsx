import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PoundSterling, AlertTriangle, CheckCircle, Clock, Link2 } from 'lucide-react';

interface PaymentStatusProps {
  merchantToken: string;
  displayName: string;
  onNavigateToPayments?: () => void;
}

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

export const PaymentStatusIndicator = ({ merchantToken, onNavigateToPayments }: PaymentStatusProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['payment-status', merchantToken],
    queryFn: async () => {
      const { data: master } = await supabase
        .from('accounts_master')
        .select('api_account_name, account_name')
        .eq('merchant_token', merchantToken)
        .maybeSingle();

      const lookupName = master?.api_account_name || master?.account_name;
      if (!lookupName) return null;

      const { data: mapping } = await supabase
        .from('xero_account_mapping')
        .select('xero_contact_id, is_mapped')
        .eq('account_name', lookupName)
        .eq('is_active', true)
        .maybeSingle();
      if (!mapping) return null;
      if (!mapping.is_mapped || !mapping.xero_contact_id) return { mapped: false } as const;

      const { data: grade } = await supabase
        .from('xero_client_payment_grades')
        .select('grade, total_owed, overdue_amount, max_days_overdue')
        .eq('xero_contact_id', mapping.xero_contact_id)
        .maybeSingle();
      if (!grade) return { mapped: true } as const;

      return {
        mapped: true,
        grade: grade.grade,
        totalOwed: Number(grade.total_owed ?? 0),
        overdueAmount: Number(grade.overdue_amount ?? 0),
        maxDaysOverdue: grade.max_days_overdue ?? 0,
      } as const;
    },
    staleTime: 60_000,
  });

  if (isLoading || !data) return null;

  if (!data.mapped) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-1.5 mb-3">
        <Link2 className="h-3 w-3" />
        <span>Xero not linked</span>
        {onNavigateToPayments && (
          <button onClick={onNavigateToPayments} className="underline hover:text-foreground transition-colors ml-1">
            Map in Client Payments
          </button>
        )}
      </div>
    );
  }

  if (!('grade' in data) || !data.grade) return null;

  const isUpToDate = data.grade === 'A' || data.grade === 'B';
  const isDue = data.grade === 'C';

  const statusColor = isUpToDate
    ? 'text-green-700 bg-green-50 border-green-200'
    : isDue
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-red-700 bg-red-50 border-red-200';

  const StatusIcon = isUpToDate ? CheckCircle : isDue ? Clock : AlertTriangle;
  const statusLabel = isUpToDate ? 'Up to Date' : isDue ? 'Payment Due' : 'Overdue';

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs rounded-lg border px-3 py-1.5 mb-3 ${statusColor}`}>
      <span className="flex items-center gap-1 font-medium">
        <StatusIcon className="h-3.5 w-3.5" />
        {statusLabel}
      </span>
      <span className="flex items-center gap-1">
        <PoundSterling className="h-3 w-3" />
        Owed: {formatGBP(data.totalOwed)}
      </span>
      {data.overdueAmount > 0 && (
        <span className="text-red-600 font-medium">Overdue: {formatGBP(data.overdueAmount)}</span>
      )}
      {data.maxDaysOverdue > 0 && (
        <span>{data.maxDaysOverdue}d overdue</span>
      )}
    </div>
  );
};
