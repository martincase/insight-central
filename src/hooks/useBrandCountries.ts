import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BrandCountry {
  country_code: string;
  country_name: string;
  marketplace_id: string;
  currency: string;
  region: string;
  is_primary: boolean;
  sales_account_key: string;
}

export interface UseBrandCountriesResult {
  spid: string | null;
  countries: BrandCountry[];
  primary: BrandCountry | null;
  isMultiCountry: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Strip trailing -XX country suffix from a merchantToken to get the seller_partner_id.
 * Example: A3K5KN6RHD3NG3-GB -> A3K5KN6RHD3NG3
 */
export function spidFromMerchantToken(merchantToken?: string | null): string | null {
  if (!merchantToken) return null;
  const idx = merchantToken.lastIndexOf('-');
  if (idx < 0) return merchantToken;
  const suffix = merchantToken.slice(idx + 1);
  if (/^[A-Za-z]{2,3}$/.test(suffix)) return merchantToken.slice(0, idx);
  return merchantToken;
}

export function useBrandCountries(merchantToken?: string | null): UseBrandCountriesResult {
  const [state, setState] = useState<UseBrandCountriesResult>({
    spid: null,
    countries: [],
    primary: null,
    isMultiCountry: false,
    loading: !!merchantToken,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const spid = spidFromMerchantToken(merchantToken);
    if (!spid) {
      setState({ spid: null, countries: [], primary: null, isMultiCountry: false, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, spid, loading: true, error: null }));

    (async () => {
      try {
        const { data: bmRows, error: bmErr } = await supabase
          .from('brand_marketplaces')
          .select('country_code, marketplace_id, currency, region, is_primary, sales_account_key, enabled')
          .eq('selling_partner_id', spid)
          .eq('enabled', true);
        if (bmErr) throw bmErr;

        const rows = (bmRows || []) as any[];
        const mktIds = Array.from(new Set(rows.map((r) => r.marketplace_id).filter(Boolean)));
        let namesById = new Map<string, { country_name: string; sort_order: number }>();
        if (mktIds.length) {
          const { data: mktRows } = await supabase
            .from('amazon_marketplaces')
            .select('marketplace_id, country_name, sort_order')
            .in('marketplace_id', mktIds);
          (mktRows || []).forEach((m: any) => {
            namesById.set(m.marketplace_id, { country_name: m.country_name, sort_order: m.sort_order ?? 999 });
          });
        }

        const countries: BrandCountry[] = rows
          .map((r) => ({
            country_code: r.country_code,
            country_name: namesById.get(r.marketplace_id)?.country_name || r.country_code,
            marketplace_id: r.marketplace_id,
            currency: r.currency,
            region: r.region,
            is_primary: !!r.is_primary,
            sales_account_key: r.sales_account_key,
            _sort: namesById.get(r.marketplace_id)?.sort_order ?? 999,
          }))
          .sort((a: any, b: any) => a._sort - b._sort)
          .map(({ _sort, ...c }: any) => c);

        const primary = countries.find((c) => c.is_primary) || countries[0] || null;
        if (cancelled) return;
        setState({
          spid,
          countries,
          primary,
          isMultiCountry: countries.length >= 2,
          loading: false,
          error: null,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState({ spid, countries: [], primary: null, isMultiCountry: false, loading: false, error: e.message || 'Failed to load brand countries' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [merchantToken]);

  return state;
}
