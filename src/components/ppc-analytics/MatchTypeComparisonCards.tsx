import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, MousePointerClick, TrendingUp, PoundSterling } from 'lucide-react';
import type { MatchTypeSummary } from '@/types/ppcAnalytics';
import { getMatchTypeLabel } from '@/utils/matchTypeUtils';
import { getCurrencyInfo } from '@/utils/currencyUtils';
import { formatAcos, formatMoney, isAcosDefined } from '@/utils/formatters';
import type { CountryScope } from '@/components/dashboard/CountrySwitcher';

interface MatchTypeComparisonCardsProps {
  summaries: MatchTypeSummary[];
  onMatchTypeClick: (matchType: string) => void;
  scope?: CountryScope;
}

// No fixed order needed - we use friendly labels now

export const MatchTypeComparisonCards: React.FC<MatchTypeComparisonCardsProps> = ({
  summaries,
  onMatchTypeClick,
  scope,
}) => {
  // The symbol was hard-coded to £, so an AUD or SEK account read as sterling.
  const cur = getCurrencyInfo(scope);
  const sortedSummaries = [...summaries].sort((a, b) => a.match_type.localeCompare(b.match_type));

  // Calculate totals for percentage calculations
  const totalSpend = summaries.reduce((sum, s) => sum + s.total_spend, 0);
  const totalMappings = summaries.reduce((sum, s) => sum + s.total_mappings, 0);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {sortedSummaries.map((summary) => {
        const spendPct = totalSpend > 0 ? (summary.total_spend / totalSpend) * 100 : 0;
        const mappingsPct = totalMappings > 0 ? (summary.total_mappings / totalMappings) * 100 : 0;
        const mt = getMatchTypeLabel(summary.match_type);
        const acosDefined = isAcosDefined(summary.total_spend, summary.total_sales);

        return (
          <Card
            key={summary.match_type}
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/30"
            onClick={() => onMatchTypeClick(summary.match_type)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-block whitespace-nowrap text-xs px-2.5 py-1 rounded-full font-semibold border ${mt.color}`}>
                  {mt.label}
                </span>
                <Badge variant="secondary">
                  {mappingsPct.toFixed(0)}% of keywords
                </Badge>
              </div>

              <div className="space-y-2">
                {/* ACOS */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Avg ACOS
                  </span>
                  {/* No sales means ACOS is undefined; "0.0%" would read as
                      perfect efficiency on spend that returned nothing. */}
                  <span className={`font-semibold ${
                    !acosDefined ? 'text-muted-foreground'
                      : summary.avg_acos > 50 ? 'text-destructive'
                      : summary.avg_acos > 30 ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}>
                    {acosDefined
                      ? `${summary.avg_acos.toFixed(1)}%`
                      : formatAcos(summary.total_spend, summary.total_sales)}
                  </span>
                </div>

                {/* CPC */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <PoundSterling className="h-3 w-3" />
                    Avg CPC
                  </span>
                  <span className="font-medium">
                    {formatMoney(summary.avg_cpc, cur)}
                  </span>
                </div>

                {/* CTR */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MousePointerClick className="h-3 w-3" />
                    Avg CTR
                  </span>
                  <span className={`font-medium ${summary.avg_ctr > 0.5 ? 'text-emerald-500' : summary.avg_ctr > 0.2 ? 'text-foreground' : 'text-amber-500'}`}>
                    {summary.avg_ctr.toFixed(2)}%
                  </span>
                </div>

                {/* Conversion Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Conv. Rate
                  </span>
                  <span className={`font-medium ${summary.conversion_rate > 10 ? 'text-emerald-500' : summary.conversion_rate > 5 ? 'text-foreground' : 'text-amber-500'}`}>
                    {summary.conversion_rate.toFixed(1)}%
                  </span>
                </div>

                {/* Spend & Sales */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Spend</span>
                  <span className="font-medium">
                    {formatMoney(summary.total_spend, cur, 0)} ({spendPct.toFixed(0)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sales</span>
                  <span className="font-medium">{formatMoney(summary.total_sales, cur, 0)}</span>
                </div>
              </div>

              <div className="mt-3 text-xs text-center text-muted-foreground">
                Click to filter by {mt.label}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
