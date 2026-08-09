import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isFeedErrorRow, numOrNull } from '@/utils/stockDataQuality';

export interface StockDailySummary {
  record_date: string;
  total_listings: number;
  active_listings: number;
  inactive_listings: number;
  total_quantity: number | null;
  avg_price: number | null;
  total_value: number | null;
}

export interface StockCurrentListing {
  asin: string;
  seller_sku: string;
  item_name: string;
  fulfillment_channel: string;
  /** null = the feed reported no quantity for this listing (unknown, NOT zero). */
  quantity: number | null;
  price: number | null;
  status: string;
  open_date: string | null;
}

export function useStockData(merchantToken: string | undefined) {
  const [dailySummary, setDailySummary] = useState<StockDailySummary[]>([]);
  const [currentListings, setCurrentListings] = useState<StockCurrentListing[]>([]);
  const [feedErrorRows, setFeedErrorRows] = useState(0);
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
            total_quantity: numOrNull(r.total_quantity),
            avg_price: numOrNull(r.avg_price),
            total_value: numOrNull(r.total_value),
          })));
        }

        if (listingsRes.data) {
          const raw = listingsRes.data as any[];
          // Drop supplier feed error rows (lapsed Windsor.ai licence string) before
          // anything is listed or counted.
          const clean = raw.filter((r) => !isFeedErrorRow(r.asin, r.seller_sku, r.item_name));
          setFeedErrorRows(raw.length - clean.length);
          setCurrentListings(clean.map((r: any) => ({
            asin: r.asin || '',
            seller_sku: r.seller_sku || '',
            item_name: r.item_name || '',
            fulfillment_channel: r.fulfillment_channel || '',
            quantity: numOrNull(r.quantity),
            price: numOrNull(r.price),
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

  return { dailySummary, currentListings, feedErrorRows, loading };
}
