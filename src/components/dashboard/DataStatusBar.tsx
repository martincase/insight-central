
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Database, Trash2 } from 'lucide-react';
import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import { getDateDisplayText } from '@/utils/dateUtils';
import type { DateFilter } from '@/types/dashboard';
import type { HybridDataStatus } from '@/types/hybridData';
import { DataSourceIndicator } from './DataSourceIndicator';

interface DataStatusBarProps {
  accountsCount: number;
  dateFilter: DateFilter;
  customDateRange: { from: Date; to: Date } | undefined;
  sheetDataLength: number;
  onClearAllData: () => void;
  hybridDataStatus?: HybridDataStatus;
  isHybridMode?: boolean;
}

export const DataStatusBar = ({
  accountsCount,
  dateFilter,
  customDateRange,
  sheetDataLength,
  onClearAllData,
  hybridDataStatus,
  isHybridMode = false,
}: DataStatusBarProps) => {
  return (
    <div className="mb-6 p-4 bg-card border rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <Database className="h-3 w-3" />
              {accountsCount} Accounts
            </Badge>
            
            {sheetDataLength > 0 && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Data loaded
              </Badge>
            )}
            
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {getDateDisplayText(dateFilter, customDateRange)}
            </Badge>
            
            {isHybridMode && (
              <Badge variant="secondary" className="gap-1">
                Hybrid Mode
              </Badge>
            )}
            
            <a 
              href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary underline"
            >
              Google Sheet ↗
            </a>
          </div>
          
          {hybridDataStatus && isHybridMode && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Sources:</span>
                <DataSourceIndicator source={hybridDataStatus.sales} dataType="Sales" />
                <DataSourceIndicator source={hybridDataStatus.ppc} dataType="PPC" />
                <DataSourceIndicator source={hybridDataStatus.asin} dataType="ASIN" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">Supabase Tables:</span>
                <Badge variant="outline" className="text-xs font-mono">perplexity_sales_data</Badge>
                <Badge variant="outline" className="text-xs font-mono">perplexity_ppc_campaigns</Badge>
                <Badge variant="outline" className="text-xs font-mono">daily_asin_data</Badge>
                <Badge variant="outline" className="text-xs font-mono">daily_campaign_data</Badge>
                <Badge variant="outline" className="text-xs font-mono">daily_inventory_data</Badge>
                <Badge variant="outline" className="text-xs font-mono">accounts_master</Badge>
              </div>
            </>
          )}
          {!isHybridMode && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium">Data Source:</span>
              <Badge variant="outline" className="text-xs">Google Sheets</Badge>
            </div>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onClearAllData}
          className="gap-1 whitespace-nowrap"
        >
          <Trash2 className="h-4 w-4" />
          Clear All Data
        </Button>
      </div>
    </div>
  );
};
