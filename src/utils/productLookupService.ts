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

  const p = (async () => {
    const map = new Map<string, MasterProduct>();
    const pageSize = 1000;
    try {
      for (let page = 0; page < 60; page++) {
        const from = page * pageSize;
        const { data, error } = await supabase
          .from('spapi_listings_stockprice_staging')
          .select('asin, item_name')
          .eq('account_name', merchantToken)
          .not('item_name', 'is', null)
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Failed to fetch spapi_listings_stockprice_staging:', error);
          break;
        }
        if (!data || data.length === 0) break;

        for (const row of data) {
          const asin = (row.asin || '').trim();
          const title = (row.item_name || '').trim();
          if (!asin || !title) continue;
          const key = `${merchantToken}|${asin}`;
          if (!map.has(key)) {
            map.set(key, { asin, title, price: 0, fbmStock: 0, accountName: merchantToken });
          }
        }

        if (data.length < pageSize) break;
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
