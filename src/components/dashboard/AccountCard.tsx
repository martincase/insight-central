import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, ExternalLink, Star, Bell, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyByMerchantToken, formatPercentage } from '@/utils/formatters';
import { getBlurredDisplayName } from '@/utils/blurUtils';
import { TrendIndicator } from './TrendIndicator';
import { getCountryInfo } from '@/utils/countryUtils';
import { SalesSparkline } from './SalesSparkline';
import { StatusIndicator } from './StatusIndicator';
import { ClientAlertConfigDialog } from './ClientAlertConfigDialog';
import { AccountTagBadges } from './AccountTagBadges';
import type { AccountData } from '@/types/dashboard';
import type { TagInfo } from '@/hooks/useAccountTags';

interface AccountCardProps {
  account: AccountData;
  onToggleStar: (accountId: string) => void;
  onEdit: (account: AccountData) => void;
  onDelete: (accountId: string) => void;
  onFocus: (accountId: string | null) => void;
  onStatusColorChange: (accountId: string, color: 'green' | 'yellow' | 'red') => void;
  isFocused: boolean;
  sheetData?: any[];
  isBlurred?: boolean;
  accountTags?: TagInfo[];
  needsAttention?: boolean;
  attentionReasons?: string[];
}

export const AccountCard = ({ 
  account, 
  onToggleStar, 
  onEdit, 
  onDelete, 
  onFocus, 
  onStatusColorChange,
  isFocused, 
  sheetData = [],
  isBlurred = false,
  accountTags = [],
  needsAttention = false,
  attentionReasons = [],
}: AccountCardProps) => {
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const countryInfo = getCountryInfo(account.merchantToken);
  const displayName = getBlurredDisplayName(account.name, isBlurred);

  const handleAlertUpdate = () => {
    window.location.reload();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger focus if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    onFocus(isFocused ? null : account.id);
  };

  return (
    <Card 
      className={cn(
        "border-border shadow-lg hover:shadow-xl transition-all cursor-pointer group relative",
        isFocused && "ring-2 ring-primary border-primary",
        needsAttention && "ring-1 ring-red-300"
      )}
      onClick={handleCardClick}
    >
      {needsAttention && (
        <span
          className="absolute -top-1 -right-1 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-semibold shadow-md"
          title={attentionReasons.join(' • ')}
        >
          <AlertCircle className="h-3 w-3" />
          Attention
        </span>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {countryInfo.flagImage ? (
              <img src={countryInfo.flagImage} alt={countryInfo.name} className="w-6 h-4 object-cover rounded-sm" />
            ) : (
              <span className="text-lg">🌍</span>
            )}
            <CardTitle className={cn(
              "text-lg font-semibold text-foreground group-hover:text-primary transition-colors",
              isBlurred && "select-none"
            )}>
              {displayName}
            </CardTitle>
            <AccountTagBadges merchantToken={account.merchantToken} size="sm" tags={accountTags} />
          </div>
          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStar(account.id)}
              className={cn(
                "h-8 w-8 p-0",
                account.isStarred ? "text-yellow-500" : "text-muted-foreground"
              )}
            >
              <Star className={cn("h-4 w-4", account.isStarred && "fill-current")} />
            </Button>
            <StatusIndicator
              status={account.status}
              currentColor={account.statusColor || 'green'}
              onColorChange={(color) => onStatusColorChange(account.id, color)}
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setAlertDialogOpen(true)}
              className="h-8 w-8 p-0"
              title="Configure client alerts"
            >
              <Bell className={cn(
                "h-4 w-4",
                account.alert_config?.enabled ? "text-orange-500" : "text-muted-foreground"
              )} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit(account)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Sales</p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-blue-600">{formatCurrencyByMerchantToken(account.sales, account.merchantToken)}</p>
              <div className="flex items-center space-x-2">
                <SalesSparkline merchantToken={account.merchantToken} sheetData={sheetData} />
                <TrendIndicator 
                  currentValue={account.sales}
                  previousValue={account.previousPeriod?.sales || 0}
                />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">PPC Spend</p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-orange-600">{formatCurrencyByMerchantToken(account.ppcSpend, account.merchantToken)}</p>
              <TrendIndicator 
                currentValue={account.ppcSpend}
                previousValue={account.previousPeriod?.ppcSpend || 0}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">PPC Sales</p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-green-600">{formatCurrencyByMerchantToken(account.ppcSales, account.merchantToken)}</p>
              <TrendIndicator 
                currentValue={account.ppcSales}
                previousValue={account.previousPeriod?.ppcSales || 0}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ACOS</p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-purple-600">{formatPercentage(account.acos)}</p>
              <TrendIndicator 
                currentValue={account.acos}
                previousValue={account.previousPeriod?.acos || 0}
                isPercentage={true}
              />
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">TACOS</span>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-cyan-600">{formatPercentage(account.tacos)}</span>
              <TrendIndicator 
                currentValue={account.tacos}
                previousValue={account.previousPeriod?.tacos || 0}
                isPercentage={true}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 border-border hover:bg-muted"
              onClick={() => window.open(account.sellerCentralLink, '_blank')}
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              {account.type === 'seller' ? 'Seller Central' : 'Vendor Central'}
            </Button>
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {account.merchantToken}
            </div>
          </div>
        </div>
      </CardContent>

      <ClientAlertConfigDialog
        open={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        merchantToken={account.merchantToken}
        accountName={account.name}
        onUpdate={handleAlertUpdate}
      />
    </Card>
  );
};
