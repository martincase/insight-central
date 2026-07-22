import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { AccountData } from '@/types/dashboard';

interface PerformanceExportButtonProps {
  accounts: AccountData[];
  dateFilter: string;
}

export const PerformanceExportButton = ({ accounts, dateFilter }: PerformanceExportButtonProps) => {
  const handleExport = () => {
    if (accounts.length === 0) return;

    const headers = [
      'Account', 'Sales', 'PPC Spend', 'PPC Sales', 'ACoS (%)', 'TACoS (%)',
      'Units Ordered', 'Impressions', 'Clicks', 'CPC', 'CTR (%)', 'Conversion Rate (%)'
    ];

    const rows = accounts.map(acc => [
      `"${acc.name.replace(/"/g, '""')}"`,
      (acc.sales || 0).toFixed(2),
      (acc.ppcSpend || 0).toFixed(2),
      (acc.ppcSales || 0).toFixed(2),
      (acc.acos || 0).toFixed(2),
      (acc.tacos || 0).toFixed(2),
      acc.unitsOrdered || 0,
      acc.impressions || 0,
      acc.clicks || 0,
      (acc.cpc || 0).toFixed(2),
      (acc.ctr || 0).toFixed(2),
      (acc.conversionRate || 0).toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `performance-${dateFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={accounts.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
};
