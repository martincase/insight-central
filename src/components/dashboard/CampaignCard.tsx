import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getBlurredDisplayName } from '@/utils/blurUtils';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle, Minus, Copy } from 'lucide-react';
import type { CampaignData } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CampaignCardProps {
  campaign: CampaignData;
  isBlurred?: boolean;
}

const getAlertIcon = (alertType: CampaignData['alertType']) => {
  switch (alertType) {
    case 'excellent':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'good':
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'danger':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
};

const getAlertColor = (alertType: CampaignData['alertType']) => {
  switch (alertType) {
    case 'excellent':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'good':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'danger':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const CampaignCard = ({ campaign, isBlurred = false }: CampaignCardProps) => {
  const { toast } = useToast();

  const handleCopyCampaignName = async () => {
    try {
      await navigator.clipboard.writeText(campaign.campaignName);
      toast({
        title: "Copied!",
        description: "Campaign name copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy campaign name",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={cn(
      "shadow-lg hover:shadow-xl transition-shadow",
      campaign.alertType === 'danger' && "border-red-200",
      campaign.alertType === 'warning' && "border-yellow-200",
      campaign.alertType === 'excellent' && "border-green-200",
      campaign.alertType === 'good' && "border-blue-200"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {campaign.campaignName}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCampaignName}
                className="h-6 w-6 p-0 hover:bg-gray-100"
                title="Copy campaign name"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className={cn(
              "text-sm text-gray-600",
              isBlurred && "select-none"
            )}>
              {getBlurredDisplayName(campaign.accountName, isBlurred)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getAlertIcon(campaign.alertType)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Spend</p>
            <p className="text-lg font-semibold text-orange-600">
              {formatCurrency(campaign.spend)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sales</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(campaign.sales)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ACOS</p>
            <p className="text-lg font-semibold text-purple-600">
              {formatPercentage(campaign.acos)}
            </p>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-200">
          <Badge className={cn("text-xs", getAlertColor(campaign.alertType))}>
            {campaign.alertMessage}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
