import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isVendorAccount } from '@/utils/vendorUtils';
import {
  isFeedErrorRow,
  numOrNull,
  ageInDays,
  STOCK_SNAPSHOT_STALE_DAYS,
} from '@/utils/stockDataQuality';

/**
 * THE single source of truth for "what is in stock right now".
 *
 * Every stock panel that wants to state a current stock position must read it
 * from here, so the numbers on one page cannot disagree with each other.
 *
 * What it counts, exactly:
 *  - Seller accounts: one row per seller SKU present in the most recent
 *    merchant-listings snapshot (`perplexity_all_listings_stockprice_data`,
 *    Inactive/Incomplete excluded) and/or the most recent FBA inventory
 *    snapshot (`fba_inventory_data`). Stock = FBA fulfillable + FBM on hand.
 *  - Vendor accounts: one row per ASIN in the most recent
 *    `vendor_inventory_data` snapshot. Stock = sellable on-hand units.
 *
 * Two rules it never breaks:
 *  1. Supplier feed error rows (the lapsed Windsor.ai licence string) are
 *     dropped before anything is listed or counted.
 *  2. An absent stock figure stays `null`. It is NOT coerced to 0, because a
 *     0 renders as "out of stock" and a missing feed is not a stockout.
 *     This matters most for AFN/FBA listings: the merchant-listings report
 *     always reports a NULL quantity for them, so their real stock can only
 *     come from the FBA feed. No FBA row means "unknown", never "zero".
 */

export interface CurrentStockRow {
  sku: string;
  asin: string;
  productName: string;
  /** FBA fulfillable units. null = not reported by the FBA feed. */
  fbaStock: number | null;
  /** Merchant-fulfilled units on hand. null = not a merchant listing, or not reported. */
  fbmStock: number | null;
  /** FBA + FBM. null = neither feed reported a figure for this SKU. */
  totalStock: number | null;
  price: number | null;
  source: 'seller' | 'vendor';
  /** True for AFN/FBA listings whose stock must come from the FBA feed. */
  isFbaListing: boolean;
  // Vendor-only fields
  openPoUnits?: number | null;
  unfilledUnits?: number | null;
  oosRate?: number | null;
  sellThroughRate?: number | null;
}

export interface CurrentStockSnapshot {
  loading: boolean;
  rows: CurrentStockRow[];
  /** Most recent record_date backing these rows (yyyy-mm-dd). */
  snapshotDate: string | null;
  snapshotAgeDays: number | null;
  isStale: boolean;
  /** The source tables returned nothing at all for this account. */
  feedMissing: boolean;
  /** Supplier error rows removed before counting. */
  feedErrorRows: number;
  /** Every usable row was a supplier error row — the feed is broken, not empty. */
  feedErrorOnly: boolean;
  /** When the feed is broken: the last date it delivered real stock data. */
  lastGoodDate: string | null;
  isVendor: boolean;
  /** Rows whose stock figure is known. */
  knownCount: number;
  /** Rows with a known stock figure of exactly zero. */
  outOfStockCount: number;
  /** Rows where no feed reported a stock figure — unknown, not zero. */
  unknownStockCount: number;
}

const EMPTY: Omit<CurrentStockSnapshot, 'loading' | 'isVendor'> = {
  rows: [],
  snapshotDate: null,
  snapshotAgeDays: null,
  isStale: false,
  feedMissing: true,
  feedErrorRows: 0,
  feedErrorOnly: false,
  lastGoodDate: null,
  knownCount: 0,
  outOfStockCount: 0,
  unknownStockCount: 0,
};

function isAfnChannel(channel: string | null | undefined): boolean {
  const c = (channel || '').toUpperCase();
  return c.includes('AMAZON') || c === 'AFN';
}

export function useCurrentStockSnapshot(
  merchantToken: string | undefined,
  accountType?: string | null,
): CurrentStockSnapshot {
  const isVendor = accountType ? accountType === 'vendor' : isVendorAccount(merchantToken);
  const [state, setState] = useState<CurrentStockSnapshot>({
    ...EMPTY,
    loading: true,
    isVendor,
  });

  useEffect(() => {
    if (!merchantToken) {
      setState({ ...EMPTY, loading: false, isVendor });
      return;
    }

    let cancelled = false;
    const finish = (partial: Partial<CurrentStockSnapshot>, rows: CurrentStockRow[]) => {
      if (cancelled) return;
      const known = rows.filter(r => r.totalStock !== null);
      setState({
        ...EMPTY,
        loading: false,
        isVendor,
        rows,
        knownCount: known.length,
        outOfStockCount: known.filter(r => r.totalStock === 0).length,
        unknownStockCount: rows.length - known.length,
        ...partial,
      });
    };

    const loadVendor = async () => {
      const { data: latestRow } = await supabase
        .from('vendor_inventory_data')
        .select('record_date')
        .eq('account_name', merchantToken)
        .order('record_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const latest = latestRow?.record_date as string | undefined;
      if (!latest) {
        finish({ feedMissing: true }, []);
        return;
      }

      const { data } = await supabase
        .from('vendor_inventory_data')
        .select('asin, product_title, sellable_on_hand_units, open_purchase_order_units, unfilled_customer_ordered_units, procurable_product_out_of_stock_rate, sell_through_rate')
        .eq('account_name', merchantToken)
        .eq('record_date', latest);

      const raw = data || [];
      const clean = raw.filter(r => !isFeedErrorRow(r.asin, (r as any).product_title));
      const removed = raw.length - clean.length;

      const rows: CurrentStockRow[] = clean.map(r => ({
        sku: '',
        asin: r.asin || '',
        productName: (r as any).product_title || '',
        fbaStock: null,
        fbmStock: null,
        totalStock: numOrNull(r.sellable_on_hand_units),
        price: null,
        source: 'vendor',
        isFbaListing: false,
        openPoUnits: numOrNull(r.open_purchase_order_units),
        unfilledUnits: numOrNull(r.unfilled_customer_ordered_units),
        oosRate: numOrNull(r.procurable_product_out_of_stock_rate),
        sellThroughRate: numOrNull(r.sell_through_rate),
      }));

      const age = ageInDays(latest);
      const broken = raw.length > 0 && rows.length === 0;
      // If today's feed is nothing but the supplier error, find when it last
      // delivered real data — that date is the actionable fact.
      let lastGoodDate: string | null = null;
      if (broken) {
        const { data: good } = await supabase
          .from('vendor_inventory_data')
          .select('record_date')
          .eq('account_name', merchantToken)
          .not('asin', 'ilike', '%windsor.ai%')
          .order('record_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        lastGoodDate = (good?.record_date as string) ?? null;
      }
      finish({
        snapshotDate: latest,
        snapshotAgeDays: age,
        isStale: age !== null && age > STOCK_SNAPSHOT_STALE_DAYS,
        feedMissing: raw.length === 0,
        feedErrorRows: removed,
        feedErrorOnly: broken,
        lastGoodDate,
      }, rows);
    };

    const loadSeller = async () => {
      // Resolve the latest snapshot date per source first (cheap), then fetch only
      // that date — pulling full history times out on large catalogues.
      const [{ data: fbmDateRow }, { data: fbaDateRow }] = await Promise.all([
        supabase
          .from('perplexity_all_listings_stockprice_data')
          .select('record_date')
          .eq('account_name', merchantToken)
          .order('record_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('fba_inventory_data')
          .select('record_date')
          .eq('account_name', merchantToken)
          .order('record_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const fbmLatest = fbmDateRow?.record_date as string | undefined;
      const fbaLatest = fbaDateRow?.record_date as string | undefined;

      const [{ data: fbmData }, { data: fbaData }, { data: rpcSnapshot }] = await Promise.all([
        fbmLatest
          ? supabase
              .from('perplexity_all_listings_stockprice_data')
              .select('seller_sku, asin, item_name, quantity, price, status, fulfillment_channel')
              .eq('account_name', merchantToken)
              .eq('record_date', fbmLatest)
          : Promise.resolve({ data: [] as any[] }),
        fbaLatest
          ? supabase
              .from('fba_inventory_data')
              .select('sku, asin, product_name, fulfillable_quantity, price')
              .eq('account_name', merchantToken)
              .eq('record_date', fbaLatest)
          : Promise.resolve({ data: [] as any[] }),
        supabase.rpc('rpc_inventory_fba_snapshot', { p_merchant_token: merchantToken, p_velocity_days: 30 }),
      ]);

      const rawFbm = fbmData || [];
      const rawFba = fbaData || [];

      // Drop supplier feed error rows before anything is counted or listed.
      const cleanFbm = rawFbm.filter(r => !isFeedErrorRow(r.seller_sku, r.asin, r.item_name));
      const cleanFba = rawFba.filter(r => !isFeedErrorRow(r.sku, r.asin, r.product_name));
      const removed = (rawFbm.length - cleanFbm.length) + (rawFba.length - cleanFba.length);

      const fbmActive = cleanFbm.filter(r => {
        const s = (r.status || '').toLowerCase();
        return s !== 'inactive' && s !== 'incomplete';
      });

      const skuMap = new Map<string, CurrentStockRow>();

      for (const r of fbmActive) {
        const sku = r.seller_sku || '';
        const afn = isAfnChannel(r.fulfillment_channel);
        // The merchant-listings report never carries a quantity for AFN listings —
        // their stock lives in the FBA feed. Treat it as unknown, not zero.
        const fbmStock = afn ? null : numOrNull(r.quantity);
        skuMap.set(sku, {
          sku,
          asin: r.asin || '',
          productName: r.item_name || '',
          fbaStock: null,
          fbmStock,
          totalStock: fbmStock,
          price: numOrNull(r.price),
          source: 'seller',
          isFbaListing: afn,
        });
      }

      for (const r of cleanFba) {
        const sku = r.sku || '';
        const fbaQty = numOrNull(r.fulfillable_quantity);
        const existing = skuMap.get(sku);
        if (existing) {
          existing.fbaStock = fbaQty;
          existing.totalStock =
            fbaQty === null && existing.fbmStock === null
              ? null
              : (existing.fbmStock ?? 0) + (fbaQty ?? 0);
          if (!existing.productName && r.product_name) existing.productName = r.product_name;
          if (!existing.asin && r.asin) existing.asin = r.asin;
          if (existing.price === null && r.price != null) existing.price = numOrNull(r.price);
          existing.isFbaListing = true;
        } else {
          skuMap.set(sku, {
            sku,
            asin: r.asin || '',
            productName: r.product_name || '',
            fbaStock: fbaQty,
            fbmStock: null,
            totalStock: fbaQty,
            price: numOrNull(r.price),
            source: 'seller',
            isFbaListing: true,
          });
        }
      }

      // Drop zero-stock never-sold orphans using the authoritative FBA/sales
      // snapshot. Rows whose stock is *unknown* are always kept — hiding them
      // would silently understate the catalogue.
      const validAsins = new Set(
        ((rpcSnapshot as any[]) || []).map(r => r.asin).filter(Boolean),
      );
      let rows = Array.from(skuMap.values());
      if (validAsins.size > 0) {
        rows = rows.filter(
          row => validAsins.has(row.asin) || row.totalStock === null || (row.totalStock ?? 0) > 0,
        );
      }

      const dates = [fbmLatest, fbaLatest].filter(Boolean) as string[];
      const snapshotDate = dates.length ? dates.sort().slice(-1)[0] : null;
      const age = ageInDays(snapshotDate);

      finish({
        snapshotDate,
        snapshotAgeDays: age,
        isStale: age !== null && age > STOCK_SNAPSHOT_STALE_DAYS,
        feedMissing: rawFbm.length === 0 && rawFba.length === 0,
        feedErrorRows: removed,
        feedErrorOnly: rawFbm.length + rawFba.length > 0 && skuMap.size === 0,
      }, rows);
    };

    setState(s => ({ ...s, loading: true, isVendor }));
    (isVendor ? loadVendor() : loadSeller()).catch(err => {
      console.error('Current stock snapshot fetch error:', err);
      if (!cancelled) setState({ ...EMPTY, loading: false, isVendor });
    });

    return () => { cancelled = true; };
  }, [merchantToken, isVendor]);

  return state;
}
