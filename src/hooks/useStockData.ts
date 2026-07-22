import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StockDailySummary {
  record_date: string;
  total_listings: number;
  active_listings: number;
  inactive_listings: number;
  total_quantity: number;
  avg_price: number | null;
  total_value: number | null;
}

export interface StockCurrentListing {
  asin: string;
  seller_sku: string;
  item_name: string;
  fulfillment_channel: string;
  quantity: number;
  price: number;
  status: string;
  open_date: string | null;
}

export function useStockData(merchantToken: string | undefined) {
  const [dailySummary, setDailySummary] = useState<StockDailySummary[]>([]);
  const [currentListings, setCurrentListings] = useState<StockCurrentListing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!merchantToken) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, listingsRes] = await Promise.all([
          supabase.rpc('get_stock_daily_summary', { p_merchant_token: merchantToken }),
          supabase.rpc('get_stock_current_listings', { p_merchant_token: merchantToken }),
        ]);

        if (summaryRes.data) {
          setDailySummary(summaryRes.data.map((r: any) => ({
            record_date: r.record_date,
            total_listings: Number(r.total_listings),
            active_listings: Number(r.active_listings),
            inactive_listings: Number(r.inactive_listings),
            total_quantity: Number(r.total_quantity),
            avg_price: r.avg_price != null ? Number(r.avg_price) : null,
            total_value: r.total_value != null ? Number(r.total_value) : null,
          })));
        }

        if (listingsRes.data) {
          setCurrentListings(listingsRes.data.map((r: any) => ({
            asin: r.asin || '',
            seller_sku: r.seller_sku || '',
            item_name: r.item_name || '',
            fulfillment_channel: r.fulfillment_channel || '',
            quantity: Number(r.quantity) || 0,
            price: Number(r.price) || 0,
            status: r.status || 'Unknown',
            open_date: r.open_date || null,
          })));
        }
      } catch (err) {
        console.error('Stock data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [merchantToken]);

  return { dailySummary, currentListings, loading };
}
