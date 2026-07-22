import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { SearchTermData } from '@/types/ppcAnalytics';

interface ExportButtonProps {
  data: SearchTermData[];
  filename?: string;
  isLoading?: boolean;
}

export function ExportButton({ data, filename = 'search-terms-export', isLoading }: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;

    // Define CSV headers
    const headers = [
      'Search Term',
      'Seller',
      'Campaign Count',
      'Impressions',
      'Clicks',
      'Spend (GBP)',
      'Sales (GBP)',
      'Orders',
      'CTR (%)',
      'ACOS (%)',
      'ROAS'
    ];

    // Convert data to CSV rows
    const rows = data.map(row => [
      `"${row.customer_search_term.replace(/"/g, '""')}"`,
      `"${row.sellername.replace(/"/g, '""')}"`,
      row.campaign_count,
      row.total_impressions,
      row.total_clicks,
      row.total_spend.toFixed(2),
      row.total_sales.toFixed(2),
      row.total_orders,
      row.ctr.toFixed(2),
      row.acos.toFixed(2),
      row.roas.toFixed(2)
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
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
      disabled={isLoading || data.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
