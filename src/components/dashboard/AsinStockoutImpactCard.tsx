import React, { useEffect, useState } from 'react';
import { getCurrencyFromMerchantToken } from '@/utils/currencyUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';

interface Props { asin: string; merchantToken: string; }


export const AsinStockoutImpactCard: React.FC<Props> = ({ asin, merchantToken }) => {
  const [loading, setLoading] = useState(true);
  const [agg, setAgg] = useState<any>(null);

  const cur = getCurrencyFromMerchantToken(merchantToken);
  const fmtMoney = (v: number | null) =>
    v == null ? '—' : `${cur.symbol}${new Intl.NumberFormat(cur.locale, { maximumFractionDigits: 0 }).format(v)}`;

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from('stockout_events')
        .select('*')
        .eq('account_name', merchantToken)
        .eq('asin', asin)
        .is('stockout_end', null);
      if (!active) return;
      if (!rows || rows.length === 0) { setAgg(null); setLoading(false); return; }
      const dailyUnits = rows.reduce((s: number, r: any) => s + (r.pre_stockout_daily_units ?? 0), 0);
      const earliest = rows.reduce((m: string, r: any) => r.stockout_start < m ? r.stockout_start : m, rows[0].stockout_start);
      const days = differenceInDays(new Date(), parseISO(earliest)) + 1;
      const avgPrice = rows.find((r: any) => r.pre_stockout_avg_price)?.pre_stockout_avg_price ?? null;
      const stockoutLostRev = dailyUnits && avgPrice ? dailyUnits * days * avgPrice
        : rows.reduce((s: number, r: any) => s + (r.estimated_stockout_lost_revenue ?? 0), 0);
      const recoveryLostRev = rows.reduce((s: number, r: any) => s + (r.estimated_recovery_lost_revenue ?? 0), 0);
      const totalMissed = (stockoutLostRev ?? 0) + (recoveryLostRev ?? 0);
      const statuses = rows.map((r: any) => (r.status || '').toLowerCase());
      const status = statuses.includes('active') ? 'active' : statuses.includes('recovering') ? 'recovering' : 'recovered';
      setAgg({ days, dailyUnits: dailyUnits || null, stockoutLostRev, recoveryLostRev, totalMissed, status, earliest, hasSales: dailyUnits > 0 });
      setLoading(false);
    };
    if (asin && merchantToken) run(); else { setLoading(false); setAgg(null); }
    return () => { active = false; };
  }, [asin, merchantToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" />
          Stockout &amp; Missed Opportunity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking stockout impact…</p>
        ) : !agg ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            No active stockout — this ASIN is in stock (no missed revenue).
          </div>
        ) : !agg.hasSales ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Currently out of stock, but no recent sales history — no revenue impact estimated.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className={agg.status === 'active' ? 'bg-red-500/15 text-red-700 border-red-200' : agg.status === 'recovering' ? 'bg-amber-500/15 text-amber-700 border-amber-200' : 'bg-emerald-500/15 text-emerald-700 border-emerald-200'}>
                {agg.status === 'active' ? 'Out of Stock' : agg.status === 'recovering' ? 'Recovering' : 'Recovered'}
              </Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Days Out of Stock</p>
                <p className="font-medium">{agg.days}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Run Rate</p>
                <p className="font-medium">{agg.dailyUnits != null ? `${agg.dailyUnits.toFixed(1)}/day` : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lost Revenue (Stockout)</p>
                <p className="font-medium text-red-600">{fmtMoney(agg.stockoutLostRev)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recovery Impact</p>
                <p className="font-medium text-amber-600">{fmtMoney(agg.recoveryLostRev)}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1"><DollarSign className="h-4 w-4 text-red-600" /> Total Missed Revenue</span>
              <span className="text-xl font-bold text-red-700">{fmtMoney(agg.totalMissed)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Since {format(parseISO(agg.earliest), 'd MMM yyyy')} • includes recovery ramp (Amazon: 1 wk OOS ≈ 1 mo recovery)</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
