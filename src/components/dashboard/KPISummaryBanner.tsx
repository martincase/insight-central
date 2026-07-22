import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrencyByMerchantToken, formatPercentage } from '@/utils/formatters';

interface KPIItem {
  label: string;
  value: string;
  change: number; // percentage change
}

interface KPISummaryBannerProps {
  sales: number;
  prevSales: number;
  ppcSpend: number;
  prevPpcSpend: number;
  acos: number;
  prevAcos: number;
  tacos: number;
  prevTacos: number;
  units: number;
  prevUnits: number;
  merchantToken: string;
}

const getChangeColor = (change: number, invertPositive = false) => {
  if (Math.abs(change) < 0.5) return 'bg-muted text-muted-foreground';
  const isGood = invertPositive ? change < 0 : change > 0;
  return isGood ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200';
};

const getIcon = (change: number) => {
  if (Math.abs(change) < 0.5) return <Minus className="h-3 w-3" />;
  return change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
};

const calcChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const KPISummaryBanner = ({
  sales, prevSales, ppcSpend, prevPpcSpend, acos, prevAcos, tacos, prevTacos, units, prevUnits, merchantToken
}: KPISummaryBannerProps) => {
  const kpis: (KPIItem & { invertPositive?: boolean })[] = [
    { label: 'Overall Sales', value: formatCurrencyByMerchantToken(sales, merchantToken), change: calcChange(sales, prevSales) },
    { label: 'PPC Spend', value: formatCurrencyByMerchantToken(ppcSpend, merchantToken), change: calcChange(ppcSpend, prevPpcSpend), invertPositive: true },
    { label: 'ACOS', value: formatPercentage(acos), change: calcChange(acos, prevAcos), invertPositive: true },
    { label: 'TACOS', value: formatPercentage(tacos), change: calcChange(tacos, prevTacos), invertPositive: true },
    { label: 'Units', value: units.toLocaleString(), change: calcChange(units, prevUnits) },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-card border border-border shadow-sm">
      {kpis.map((kpi) => {
        const colorClass = getChangeColor(kpi.change, kpi.invertPositive);
        return (
          <div key={kpi.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${colorClass}`}>
            <span className="font-medium opacity-70">{kpi.label}</span>
            <span className="font-bold">{kpi.value}</span>
            <span className="flex items-center gap-0.5 text-xs">
              {getIcon(kpi.invertPositive ? -kpi.change : kpi.change)}
              {Math.abs(kpi.change).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};
