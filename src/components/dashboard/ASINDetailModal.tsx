import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ExternalLink, 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  Eye, 
  Target,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Percent
} from 'lucide-react';
import { useASINDetail } from '@/hooks/useASINDetail';
import { ASINPerformanceChart } from '@/components/charts/ASINPerformanceChart';
import { TrendIndicator } from '@/components/dashboard/TrendIndicator';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { openAmazonProduct } from '@/utils/amazonUtils';
import { AsinStockoutImpactCard } from '@/components/dashboard/AsinStockoutImpactCard';

export const ASINDetailModal: React.FC = () => {
  const { isOpen, data, loading, error, closeASINDetail } = useASINDetail();

  if (!isOpen) return null;

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-500';
      case 'low-stock': return 'bg-yellow-500';
      case 'out-of-stock': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'in-stock': return <CheckCircle className="h-4 w-4" />;
      case 'low-stock': return <Clock className="h-4 w-4" />;
      case 'out-of-stock': return <AlertTriangle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeASINDetail}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Package className="h-5 w-5" />
                ASIN Analytics: {data?.asin || 'Loading...'}
              </DialogTitle>
              {data && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">{data.productName}</p>
                  <p className="text-xs text-muted-foreground">Account: {data.accountName}</p>
                </div>
              )}
            </div>
            {data && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAmazonProduct(data.asin, data.merchantToken)}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View on Amazon
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {error && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
                <p className="text-red-600">Failed to load ASIN details</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {data && !loading && !error && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sales */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sales (30d)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.performance.sales)}</div>
                  {data.performance.previousPeriod && (
                    <div className="flex items-center mt-1">
                      <TrendIndicator
                        currentValue={data.performance.sales}
                        previousValue={data.performance.previousPeriod.sales}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg: {formatCurrency(data.summary.averageDailySales)}/day
                  </p>
                </CardContent>
              </Card>

              {/* Units Sold */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.performance.unitsSold.toLocaleString()}</div>
                  {data.performance.previousPeriod && (
                    <div className="flex items-center mt-1">
                      <TrendIndicator
                        currentValue={data.performance.unitsSold}
                        previousValue={data.performance.previousPeriod.unitsSold}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg: {data.summary.averageDailyUnits.toFixed(1)}/day
                  </p>
                </CardContent>
              </Card>

              {/* Page Views */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.performance.pageViews.toLocaleString()}</div>
                  {data.performance.previousPeriod && (
                    <div className="flex items-center mt-1">
                      <TrendIndicator
                        currentValue={data.performance.pageViews}
                        previousValue={data.performance.previousPeriod.pageViews}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {data.summary.totalPageViews30Days.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              {/* Buy Box */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Buy Box</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPercentage(data.performance.buyBoxPercentage)}</div>
                  {data.performance.previousPeriod && (
                    <div className="flex items-center mt-1">
                      <TrendIndicator
                        currentValue={data.performance.buyBoxPercentage}
                        previousValue={data.performance.previousPeriod.buyBoxPercentage}
                        isPercentage={true}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    30d Avg: {formatPercentage(data.summary.averageBuyBox30Days)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Inventory & Product Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AsinStockoutImpactCard asin={data.asin} merchantToken={data.merchantToken} />

              {/* Performance Summary */}
              <Card className="bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    Performance Summary
                  </CardTitle>
                  <CardDescription>Last 30 days overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Conversion Rate */}
                    <div className="group bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-violet-100 dark:border-violet-900/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-default">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/50 transition-colors">
                          <Percent className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-xs font-medium text-violet-600/80 dark:text-violet-400/80 uppercase tracking-wide">Conversion</span>
                      </div>
                      <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{formatPercentage(data.performance.conversionRate)}</p>
                      <p className="text-xs text-violet-500/70 dark:text-violet-400/60 mt-1">
                        30d avg: {formatPercentage(data.summary.averageConversion30Days)}
                      </p>
                    </div>

                    {/* Daily Sales Avg */}
                    <div className="group bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-default">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                          <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wide">Daily Sales</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(data.summary.averageDailySales)}</p>
                      <p className="text-xs text-emerald-500/70 dark:text-emerald-400/60 mt-1">
                        Average per day
                      </p>
                    </div>

                    {/* Daily Units Avg */}
                    <div className="group bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30 rounded-xl p-4 border border-sky-100 dark:border-sky-900/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-default">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/50 group-hover:bg-sky-200 dark:group-hover:bg-sky-800/50 transition-colors">
                          <Package className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <span className="text-xs font-medium text-sky-600/80 dark:text-sky-400/80 uppercase tracking-wide">Daily Units</span>
                      </div>
                      <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{data.summary.averageDailyUnits.toFixed(1)}</p>
                      <p className="text-xs text-sky-500/70 dark:text-sky-400/60 mt-1">
                        Units per day
                      </p>
                    </div>

                    {/* Total Page Views */}
                    <div className="group bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-default">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-colors">
                          <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wide">Page Views</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{data.summary.totalPageViews30Days.toLocaleString()}</p>
                      <p className="text-xs text-amber-500/70 dark:text-amber-400/60 mt-1">
                        Total in 30 days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <ASINPerformanceChart 
              data={data.historicalData} 
              productName={data.productName}
            />

            {/* Campaigns (if any) */}
            {data.campaigns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Related Campaigns</CardTitle>
                  <CardDescription>PPC campaigns targeting this ASIN</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.campaigns.map((campaign, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{campaign.campaignName}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Spend: {formatCurrency(campaign.spend)}</span>
                            <span>Sales: {formatCurrency(campaign.sales)}</span>
                            <span>ACoS: {formatPercentage(campaign.acos)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};