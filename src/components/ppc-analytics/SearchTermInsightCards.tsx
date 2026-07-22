import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, ShoppingCart, Target } from 'lucide-react';
import type { SearchTermData } from '@/types/ppcAnalytics';

interface SearchTermInsightCardsProps {
  data: SearchTermData[];
  isLoading?: boolean;
}

export function SearchTermInsightCards({ data, isLoading }: SearchTermInsightCardsProps) {
  if (isLoading || data.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-card border-0 shadow-md">
            <CardContent className="p-5">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate insights
  const bestConverting = [...data]
    .filter(d => d.total_clicks > 0)
    .sort((a, b) => (b.total_orders / b.total_clicks) - (a.total_orders / a.total_clicks))[0];

  const highestRoas = [...data]
    .filter(d => d.roas > 0)
    .sort((a, b) => b.roas - a.roas)[0];

  const highestSales = [...data]
    .filter(d => d.total_sales > 0)
    .sort((a, b) => b.total_sales - a.total_sales)[0];
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const insights = [
    {
      title: 'Best Converting',
      icon: Target,
      gradient: 'from-emerald-500 to-green-600',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-600',
      searchTerm: bestConverting?.customer_search_term || 'N/A',
      metric: bestConverting 
        ? `${((bestConverting.total_orders / bestConverting.total_clicks) * 100).toFixed(1)}%` 
        : '-',
      metricLabel: 'conversion rate',
      subtext: bestConverting 
        ? `${bestConverting.total_orders} orders from ${bestConverting.total_clicks} clicks` 
        : ''
    },
    {
      title: 'Highest ROAS',
      icon: TrendingUp,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-600',
      searchTerm: highestRoas?.customer_search_term || 'N/A',
      metric: highestRoas ? `${highestRoas.roas.toFixed(2)}x` : '-',
      metricLabel: 'return on ad spend',
      subtext: highestRoas 
        ? `${formatCurrency(highestRoas.total_sales)} sales / ${formatCurrency(highestRoas.total_spend)} spend` 
        : ''
    },
    {
      title: 'Highest Sales',
      icon: ShoppingCart,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-600',
      searchTerm: highestSales?.customer_search_term || 'N/A',
      metric: highestSales ? formatCurrency(highestSales.total_sales) : '-',
      metricLabel: 'total sales',
      subtext: highestSales 
        ? `Spend: ${formatCurrency(highestSales.total_spend)}` 
        : ''
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {insights.map((insight, index) => (
        <Card 
          key={index} 
          className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          {/* Gradient top bar */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${insight.gradient}`} />
          
          <CardContent className="p-5 pt-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${insight.iconBg} shrink-0`}>
                <insight.icon className={`h-6 w-6 ${insight.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {insight.title}
                </p>
                <p className="text-sm font-bold text-foreground truncate mb-2" title={insight.searchTerm}>
                  {insight.searchTerm.length > 25 
                    ? `${insight.searchTerm.substring(0, 25)}...` 
                    : insight.searchTerm}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold bg-gradient-to-r ${insight.gradient} bg-clip-text text-transparent`}>
                    {insight.metric}
                  </span>
                  <span className="text-xs text-muted-foreground">{insight.metricLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {insight.subtext}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
