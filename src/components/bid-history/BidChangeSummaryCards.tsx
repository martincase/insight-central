import { TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BidHistorySummary } from '@/types/bidHistory';
import { format, parseISO } from 'date-fns';

interface BidChangeSummaryCardsProps {
  summary: BidHistorySummary;
  loading?: boolean;
}

const formatDateLabel = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'd MMM yyyy');
  } catch {
    return dateStr;
  }
};

export const BidChangeSummaryCards = ({ summary, loading }: BidChangeSummaryCardsProps) => {
  const cards = [
    {
      title: 'CPC Increases',
      value: summary.increases,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'CPC Decreases',
      value: summary.decreases,
      icon: TrendingDown,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Avg Change',
      value: `£${Math.abs(summary.avgChangeAmount).toFixed(2)}`,
      subtitle: `(${summary.avgChangePct >= 0 ? '+' : ''}${summary.avgChangePct.toFixed(1)}%)`,
      icon: DollarSign,
      color: summary.avgChangeAmount >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Changes',
      value: summary.totalChanges,
      icon: RefreshCw,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="space-y-3">
      {!loading && summary.dateFrom && summary.dateTo && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Showing {formatDateLabel(summary.dateFrom)} to {formatDateLabel(summary.dateTo)}</p>
          <p>Each row = one keyword per ad group per day. Based on actual CPC paid.</p>
        </div>
      )}
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
                  {card.subtitle && (
                    <span className="text-sm text-muted-foreground">
                      {card.subtitle}
                    </span>
                  )}
                </div>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    </div>
  );
};
