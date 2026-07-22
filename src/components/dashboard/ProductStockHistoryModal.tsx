import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, ReferenceArea,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrencyByMerchantToken } from '@/utils/formatters';
import { openAmazonProduct } from '@/utils/amazonUtils';

interface ProductStockHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerSku: string;
  asin: string;
  itemName: string;
  merchantToken: string;
}

interface HistoryRow {
  record_date: string;
  quantity: number;
  price: number;
  status: string;
}

export const ProductStockHistoryModal: React.FC<ProductStockHistoryModalProps> = ({
  open, onOpenChange, sellerSku, asin, itemName, merchantToken,
}) => {
  const [data, setData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !sellerSku) return;
    setLoading(true);
    supabase
      .rpc('get_product_stock_history', {
        p_merchant_token: merchantToken,
        p_seller_sku: sellerSku,
      })
      .then(({ data: rows, error }) => {
        if (!error && rows) setData(rows as HistoryRow[]);
        setLoading(false);
      });
  }, [open, sellerSku, merchantToken]);

  const hasQuantity = data.some(d => d.quantity > 0);
  const fmtPrice = (v: number) => formatCurrencyByMerchantToken(v, merchantToken);

  const chartData = data.map(d => ({
    date: format(parseISO(d.record_date), 'dd MMM'),
    fullDate: format(parseISO(d.record_date), 'dd MMM yyyy'),
    quantity: d.quantity,
    price: d.price,
    status: d.status,
  }));

  // Build status zones for background coloring
  const statusZones: { x1: string; x2: string; color: string }[] = [];
  if (chartData.length > 1) {
    let zoneStart = chartData[0].date;
    let currentStatus = chartData[0].status;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].status !== currentStatus || i === chartData.length - 1) {
        const endDate = i === chartData.length - 1 && chartData[i].status === currentStatus
          ? chartData[i].date
          : chartData[i - 1].date;
        if (i === chartData.length - 1 && chartData[i].status !== currentStatus) {
          statusZones.push({
            x1: zoneStart,
            x2: endDate,
            color: currentStatus === 'Active' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          });
          statusZones.push({
            x1: chartData[i].date,
            x2: chartData[i].date,
            color: chartData[i].status === 'Active' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          });
        } else {
          statusZones.push({
            x1: zoneStart,
            x2: endDate,
            color: currentStatus === 'Active' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          });
        }
        zoneStart = chartData[i].date;
        currentStatus = chartData[i].status;
      }
    }
    // Close final zone if not already closed
    if (statusZones.length === 0 || statusZones[statusZones.length - 1].x2 !== chartData[chartData.length - 1].date) {
      statusZones.push({
        x1: zoneStart,
        x2: chartData[chartData.length - 1].date,
        color: currentStatus === 'Active' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{sellerSku}</span>
            {asin && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">{asin}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => openAmazonProduct(asin, merchantToken)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate" title={itemName}>{itemName}</p>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-52 w-full" />
          </div>
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No history found for this product</p>
        ) : (
          <div className="space-y-3">
            {/* Summary badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {data.length} days tracked
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Latest: {fmtPrice(data[data.length - 1].price)}
              </Badge>
              {hasQuantity && (
                <Badge variant="secondary" className="text-xs">
                  Current qty: {data[data.length - 1].quantity.toLocaleString()}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={`text-xs ${data[data.length - 1].status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {data[data.length - 1].status}
              </Badge>
            </div>

            {/* Chart */}
            <div className="rounded-lg border bg-card p-3">
              {!hasQuantity && (
                <p className="text-xs text-muted-foreground mb-2 italic">FBA — quantity not tracked</p>
              )}
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  {statusZones.map((z, i) => (
                    <ReferenceArea key={i} x1={z.x1} x2={z.x2} fill={z.color} />
                  ))}
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  {hasQuantity && (
                    <YAxis
                      yAxisId="qty"
                      fontSize={11}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'Qty', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
                    />
                  )}
                  <YAxis
                    yAxisId="price"
                    orientation={hasQuantity ? 'right' : 'left'}
                    fontSize={11}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Price', angle: hasQuantity ? 90 : -90, position: hasQuantity ? 'insideRight' : 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    formatter={(value: number, name: string) => {
                      if (name === 'Price') return [fmtPrice(value), name];
                      return [value.toLocaleString(), name];
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  {hasQuantity && (
                    <Line
                      yAxisId="qty"
                      type="monotone"
                      dataKey="quantity"
                      name="Quantity"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="price"
                    name="Price"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
