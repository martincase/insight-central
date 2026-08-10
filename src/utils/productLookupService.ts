// Product titles now come from spapi_listings_stockprice_staging (native SP-API feed).
import { supabase } from '@/integrations/supabase/client';

export interface MasterProduct {
  asin: string;
  title: string;
  price: number;
  fbmStock: number;
  accountName: string;
}

// Per-merchantToken cache; each inner map is keyed by `${merchantToken}|${asin}`.
const perTokenCache = new Map<string, Map<string, MasterProduct>>();
const perTokenPromise = new Map<string, Promise<Map<string, MasterProduct>>>();

// Account mapping cache - merchantToken → accountName
let accountCache: Map<string, string> | null = null;
let accountFetchPromise: Promise<Map<string, string>> | null = null;

export async function fetchAccountMapping(): Promise<Map<string, string>> {
  if (accountCache) return accountCache;
  if (accountFetchPromise) return accountFetchPromise;

  accountFetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('accounts_master')
        .select('merchant_token, account_name');

      if (error) {
        console.error('Failed to fetch account mapping:', error);
        return new Map<string, string>();
      }

      const map = new Map<string, string>();
      data?.forEach(row => {
        if (row.merchant_token && row.account_name) {
          map.set(row.merchant_token, row.account_name);
        }
      });
      accountCache = map;
      return map;
    } catch (error) {
      console.error('Error fetching account mapping:', error);
      return new Map<string, string>();
    } finally {
      accountFetchPromise = null;
    }
  })();

  return accountFetchPromise;
}

export function getAccountNameByToken(merchantToken: string): string | undefined {
  return accountCache?.get(merchantToken);
}

// Fetches product titles from spapi_listings_stockprice_staging for a single
// account (`account_name = merchantToken`), paginated and cached per token.
export async function fetchMasterListings(merchantToken: string): Promise<Map<string, MasterProduct>> {
  if (!merchantToken) return new Map();
  if (perTokenCache.has(merchantToken)) return perTokenCache.get(merchantToken)!;
  if (perTokenPromise.has(merchantToken)) return perTokenPromise.get(merchantToken)!;

  // Vendor (1P) accounts have no seller listings feed at all, so their titles
  // live in vendor_inventory_data instead. Reading only the seller table left
  // every vendor product nameless in the ASIN table.
  const isVendor = merchantToken.startsWith('amzn1.vg');

  const p = (async () => {
    const map = new Map<string, MasterProduct>();
    const pageSize = 1000;
    const add = (rawAsin: unknown, rawTitle: unknown) => {
      const asin = String(rawAsin || '').trim();
      const title = String(rawTitle || '').trim();
      if (!asin || !title) return;
      const key = `${merchantToken}|${asin}`;
      if (!map.has(key)) {
        map.set(key, { asin, title, price: 0, fbmStock: 0, accountName: merchantToken });
      }
    };

    // Only the last fortnight of the listings snapshot is needed — it is a
    // daily feed, so an unbounded read returns the same title hundreds of times
    // and blows the 1,000-row response cap before it reaches every ASIN.
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const sinceStr = since.toISOString().split('T')[0];

    const page = async (source: 'vendor' | 'staging' | 'listings', from: number) => {
      if (source === 'vendor') {
        return supabase
          .from('vendor_inventory_data')
          .select('asin, product_title')
          .eq('account_name', merchantToken)
          .not('product_title', 'is', null)
          .range(from, from + pageSize - 1);
      }
      if (source === 'staging') {
        return supabase
          .from('spapi_listings_stockprice_staging')
          .select('asin, item_name')
          .eq('account_name', merchantToken)
          .not('item_name', 'is', null)
          .range(from, from + pageSize - 1);
      }
      return supabase
        .from('perplexity_all_listings_stockprice_data')
        .select('asin, item_name')
        .eq('account_name', merchantToken)
        .gte('record_date', sinceStr)
        .not('item_name', 'is', null)
        .range(from, from + pageSize - 1);
    };

    const drain = async (source: 'vendor' | 'staging' | 'listings') => {
      const titleKey = source === 'vendor' ? 'product_title' : 'item_name';
      for (let i = 0; i < 60; i++) {
        const { data, error } = await page(source, i * pageSize);
        if (error) {
          console.error(`Failed to fetch product titles from ${source}:`, error);
          return;
        }
        if (!data || data.length === 0) return;
        for (const row of data as Array<Record<string, unknown>>) {
          add(row.asin, row[titleKey]);
        }
        if (data.length < pageSize) return;
      }
    };

    try {
      if (isVendor) {
        await drain('vendor');
      } else {
        // spapi_listings_stockprice_staging is the intended source, but it has
        // RLS on with no SELECT policy, so from the browser it silently returns
        // nothing — which is why seller ASIN tables showed bare ASINs instead
        // of names. Fall back to the listings snapshot when it comes back empty.
        await drain('staging');
        if (map.size === 0) await drain('listings');
      }
    } catch (error) {
      console.error('Error fetching product listings:', error);
    }
    perTokenCache.set(merchantToken, map);
    perTokenPromise.delete(merchantToken);
    return map;
  })();

  perTokenPromise.set(merchantToken, p);
  return p;
}

export function getProductByASIN(asin: string, merchantToken: string): MasterProduct | undefined {
  const cacheKey = `${merchantToken}|${asin}`;
  return perTokenCache.get(merchantToken)?.get(cacheKey);
}

export function getProductName(asin: string, merchantToken: string): string {
  const product = getProductByASIN(asin, merchantToken);
  return product?.title || asin;
}

export function clearProductCache(): void {
  perTokenCache.clear();
  perTokenPromise.clear();
}

export function clearAccountCache(): void {
  accountCache = null;
  accountFetchPromise = null;
}
