import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/common/InfoTooltip';
import type { AccountData } from '@/types/dashboard';

export type OverviewSortKey =
  | 'name'
  | 'sales'
  | 'ppcSpend'
  | 'acos'
  | 'tacos'
  | 'salesChange'
  | 'attention';

export interface OverviewSortConfig {
  key: OverviewSortKey;
  direction: 'asc' | 'desc';
}

interface Props {
  accounts: AccountData[]; // unfiltered displayed accounts for KPI totals
  search: string;
  onSearchChange: (v: string) => void;
  sort: OverviewSortConfig;
  onSortChange: (s: OverviewSortConfig) => void;
  attentionOnly: boolean;
  onAttentionOnlyChange: (v: boolean) => void;
  attentionCount: number;
}

const SORT_OPTIONS: { value: OverviewSortKey; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'sales', label: 'Sales' },
  { value: 'ppcSpend', label: 'PPC Spend' },
  { value: 'acos', label: 'ACOS' },
  { value: 'tacos', label: 'TACOS' },
  { value: 'salesChange', label: 'Sales WoW %' },
  { value: 'attention', label: 'Needs attention' },
];

const Delta = ({ value, invert = false, suffix = '%' }: { value: number; invert?: boolean; suffix?: string }) => {
  if (!isFinite(value)) return <span className="text-xs text-muted-foreground">—</span>;
  const good = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.01;
  const color = neutral ? 'text-muted-foreground' : good ? 'text-green-600' : 'text-red-600';
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', color)}>
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  );
};

export const PortfolioOverviewBar = ({
  accounts,
  search,
  onSearchChange,
  sort,
  onSortChange,
  attentionOnly,
  onAttentionOnlyChange,
  attentionCount,
}: Props) => {
  const totals = useMemo(() => {
    let sales = 0, prevSales = 0, spend = 0, prevSpend = 0, ppcSales = 0, prevPpcSales = 0;
    let up = 0, down = 0;
    for (const a of accounts) {
      sales += a.sales || 0;
      spend += a.ppcSpend || 0;
      ppcSales += a.ppcSales || 0;
      const pSales = a.previousPeriod?.sales || 0;
      const pSpend = a.previousPeriod?.ppcSpend || 0;
      const pPpc = a.previousPeriod?.ppcSales || 0;
      prevSales += pSales;
      prevSpend += pSpend;
      prevPpcSales += pPpc;
      if (pSales > 0) {
        if ((a.sales || 0) >= pSales) up++; else down++;
      }
    }
    const blendedAcos = ppcSales > 0 ? (spend / ppcSales) * 100 : 0;
    const prevBlendedAcos = prevPpcSales > 0 ? (prevSpend / prevPpcSales) * 100 : 0;
    const blendedTacos = sales > 0 ? (spend / sales) * 100 : 0;
    const prevBlendedTacos = prevSales > 0 ? (prevSpend / prevSales) * 100 : 0;
    const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : NaN);
    return {
      sales, spend, blendedAcos, blendedTacos, up, down,
      salesDelta: pct(sales, prevSales),
      spendDelta: pct(spend, prevSpend),
      acosDelta: blendedAcos - prevBlendedAcos,
      tacosDelta: blendedTacos - prevBlendedTacos,
    };
  }, [accounts]);

  const Tile = ({ label, value, delta, invert = false, suffix = '%', info }: { label: string; value: string; delta?: number; invert?: boolean; suffix?: string; info?: string }) => (
    <Card className="bg-white/70 backdrop-blur-sm border border-gray-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
          {info && <InfoTooltip content={info} />}
        </div>
        <div className="text-xl font-bold text-foreground mt-1">{value}</div>
        {delta !== undefined && <div className="mt-1"><Delta value={delta} invert={invert} suffix={suffix} /></div>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tile label="Total Sales" value={formatCurrency(totals.sales)} delta={totals.salesDelta} info="Sum of all displayed accounts' sales in the selected period. Delta vs the previous equivalent period." />
        <Tile label="Total Ad Spend" value={formatCurrency(totals.spend)} delta={totals.spendDelta} invert info="Sum of PPC spend across all displayed accounts. Lower is better — a rising delta turns red." />
        <Tile label="Blended ACOS" value={formatPercentage(totals.blendedAcos)} delta={totals.acosDelta} invert suffix="pp" info="Ad spend ÷ PPC sales across the portfolio. Cost metric: lower is better. Delta is in percentage points." />
        <Tile label="Blended TACOS" value={formatPercentage(totals.blendedTacos)} delta={totals.tacosDelta} invert suffix="pp" info="Ad spend ÷ TOTAL sales across the portfolio. Cost metric: lower is better. Delta is in percentage points." />
        <Card className="bg-white/70 backdrop-blur-sm border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Accounts WoW</div>
              <InfoTooltip content="Number of accounts whose sales are up vs the previous period, vs those that are down. Accounts with no previous-period data are excluded." />
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-xl font-bold text-green-600 inline-flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />{totals.up}
              </span>
              <span className="text-xl font-bold text-red-600 inline-flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />{totals.down}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">up vs down</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search accounts by name..."
            className="pl-8 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <Select value={sort.key} onValueChange={(v) => onSortChange({ ...sort, key: v as OverviewSortKey })}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort.direction} onValueChange={(v) => onSortChange({ ...sort, direction: v as 'asc' | 'desc' })}>
            <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Desc</SelectItem>
              <SelectItem value="asc">Asc</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={() => onAttentionOnlyChange(!attentionOnly)}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-xs font-medium transition-colors',
            attentionOnly
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
          )}
          title="Show only accounts needing attention"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Needs attention
          <span className={cn('ml-1 px-1.5 py-0.5 rounded-full text-[10px]', attentionOnly ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-700')}>
            {attentionCount}
          </span>
        </button>
      </div>
    </div>
  );
};
