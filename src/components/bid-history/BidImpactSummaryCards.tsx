import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BidImpactSummary } from '@/types/bidImpact';

interface BidImpactSummaryCardsProps {
  summary: BidImpactSummary;
  loading?: boolean;
}

export const BidImpactSummaryCards = ({ summary, loading }: BidImpactSummaryCardsProps) => {
  const cards = [
    {
      title: 'Win Rate',
      value: `${summary.winRate.toFixed(1)}%`,
      subtitle: `${summary.positiveImpacts} of ${summary.withAnalysisData} positive`,
      icon: Target,
      color: summary.winRate >= 50 ? 'text-green-500' : 'text-amber-500',
      bgColor: summary.winRate >= 50 ? 'bg-green-500/10' : 'bg-amber-500/10',
    },
    {
      title: 'Avg Sales Lift',
      value: `${summary.avgSalesLiftOnIncrease >= 0 ? '+' : ''}${summary.avgSalesLiftOnIncrease.toFixed(1)}%`,
      subtitle: 'After bid increases',
      icon: TrendingUp,
      color: summary.avgSalesLiftOnIncrease >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Avg ACOS Change',
      value: `${summary.avgAcosChangeOnDecrease >= 0 ? '+' : ''}${summary.avgAcosChangeOnDecrease.toFixed(1)}pp`,
      subtitle: 'After bid decreases',
      icon: TrendingDown,
      color: summary.avgAcosChangeOnDecrease <= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Data Maturity',
      value: `${summary.avgDataMaturity.toFixed(0)}%`,
      subtitle: `${summary.totalBidChanges} total changes`,
      icon: BarChart3,
      color: summary.avgDataMaturity >= 70 ? 'text-green-500' : summary.avgDataMaturity >= 30 ? 'text-amber-500' : 'text-red-500',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {card.title}
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {loading ? '—' : card.value}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
