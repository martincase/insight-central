import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { makeScope } from '@/utils/scope';

export interface BrandCountry {
  country_code: string;
  country_name: string;
  marketplace_id: string;
  currency: string;
  region: string;
  is_primary: boolean;
  sales_account_key: string;
  /**
   * 'Vendor' / 'Seller' for a client that trades through more than one Amazon
   * account, null for everyone else. Comes from month_end_client_map, the same
   * table the monthly client emails use.
   */
  arm: string | null;
  /** Scope token for this row — 'GB' or 'GB#Vendor'. See utils/scope. */
  scope: string;
  /** What the switcher prints: 'United Kingdom' or 'United Kingdom · Vendor'. */
  label: string;
}

export interface UseBrandCountriesResult {
  spid: string | null;
  countries: BrandCountry[];
  primary: BrandCountry | null;
  isMultiCountry: boolean;
  loading: boolean;
  error: string | null;
  /** Resolved client, e.g. 'S Green & Sons' for both the vendor and Ooble Home. */
  clientName: string | null;
  /** Distinct arms present, vendor first. Empty for a single-account client. */
  arms: string[];
  /** True when this client trades through more than one Amazon account. */
  hasMultipleArms: boolean;
  /** Scope the dashboard should open on. */
  defaultScope: string | null;
}

/** Options for useBrandCountries. */
export interface UseBrandCountriesOptions {
  /**
   * accounts_master.account_name of the account the share link resolved to.
   * Decides whether this link is the client's primary account (see
   * `defaultScope` below). Omit and every grouped link opens on its own arm.
   */
  accountName?: string | null;
}

/** Case/punctuation-insensitive name match — 'S Green & Sons' vs 's green and sons'. */
const sameName = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  return norm(a) === norm(b);
};

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

/** Vendor before Seller, then anything else alphabetically. */
const ARM_ORDER = ['Vendor', 'Seller'];
const armRank = (arm: string) => {
  const i = ARM_ORDER.indexOf(arm);
  return i < 0 ? ARM_ORDER.length : i;
};

const EMPTY: UseBrandCountriesResult = {
  spid: null,
  countries: [],
  primary: null,
  isMultiCountry: false,
  loading: false,
  error: null,
  clientName: null,
  arms: [],
  hasMultipleArms: false,
  defaultScope: null,
};

interface ScopeRow {
  client_name: string | null;
  arm: string | null;
  brand_name: string | null;
  selling_partner_id: string | null;
  sales_account_key: string | null;
  marketplace_id: string | null;
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  currency: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
}

export function useBrandCountries(
  merchantToken?: string | null,
  options: UseBrandCountriesOptions = {},
): UseBrandCountriesResult {
  const accountName = options.accountName ?? null;
  const [state, setState] = useState<UseBrandCountriesResult>({
    ...EMPTY,
    loading: !!merchantToken,
  });

  useEffect(() => {
    let cancelled = false;
    const spid = spidFromMerchantToken(merchantToken);
    if (!spid) {
      setState({ ...EMPTY });
      return;
    }
    setState((s) => ({ ...s, spid, loading: true, error: null }));

    (async () => {
      try {
        const rows = await loadScopeRows(spid);
        if (cancelled) return;

        const arms = Array.from(
          new Set(rows.map((r) => r.arm).filter((a): a is string => !!a)),
        ).sort((a, b) => armRank(a) - armRank(b) || a.localeCompare(b));
        // One arm named on its own is not a split — Portwest's US seller and UK
        // seller are the same arm. It takes two to need the '· Vendor' suffix.
        const hasMultipleArms = arms.length >= 2;

        const countries: BrandCountry[] = rows
          .map((r) => {
            const code = r.country_code || '';
            const name = r.country_name || code;
            const arm = hasMultipleArms ? r.arm : null;
            return {
              country_code: code,
              country_name: name,
              marketplace_id: r.marketplace_id || '',
              currency: r.currency || '',
              region: r.region || '',
              is_primary: !!r.is_primary,
              sales_account_key: r.sales_account_key || '',
              arm,
              scope: makeScope(code, arm),
              label: arm ? `${name} · ${arm}` : name,
              _sort: r.sort_order ?? 999,
              _spid: r.selling_partner_id || '',
            };
          })
          .sort((a: any, b: any) =>
            a._sort - b._sort ||
            a.country_code.localeCompare(b.country_code) ||
            armRank(a.arm || '') - armRank(b.arm || ''))
          .map(({ _sort, _spid, ...c }: any) => c as BrandCountry);

        // "Primary" stays the marketplace the share link itself points at, so a
        // single-account client is unaffected and a grouped client still knows
        // which arm the visitor arrived through.
        const own = rows.filter((r) => r.selling_partner_id === spid);
        const ownPrimaryKey = (own.find((r) => r.is_primary) || own[0])?.sales_account_key;
        const primary =
          countries.find((c) => c.sales_account_key && c.sales_account_key === ownPrimaryKey) ||
          countries.find((c) => c.is_primary) ||
          countries[0] ||
          null;

        const clientName = rows.find((r) => r.client_name)?.client_name ?? null;

        // Is this share link the client's PRIMARY account — the one the client
        // is named after? 'S Green & Sons' the vendor account is; Ooble Home,
        // Workwear Depot and Workwear Depot UK are not.
        const isClientPrimaryAccount =
          sameName(accountName, clientName) ||
          own.some((r) => sameName(r.brand_name, clientName));

        // Where a link should open.
        //
        //   primary account of a grouped client → 'ALL', the whole business
        //   any other arm of a grouped client   → that arm's own scope
        //   single-account client               → its primary marketplace
        //
        // Opening EVERY grouped link on 'ALL' was the regression: a Workwear
        // Depot customer clicked their own link and got Portwest's £1,204,964
        // across 12 countries. Opening every grouped link on its own arm would
        // undo the fix that took S Green's headline from £79,758 back to the
        // £293,014 they actually trade — their main link is the client. So the
        // rule turns on which of the two a link is, and the other view is
        // always one click away in the switcher.
        const defaultScope = hasMultipleArms
          ? (isClientPrimaryAccount ? 'ALL' : (primary?.scope ?? 'ALL'))
          : (primary?.scope ?? null);

        if (countries.length === 0) {
          // Loud for us, plain for the client. An unresolvable scope used to
          // fall through to the 'GB' default in every caller, which renders the
          // UK numbers under whatever country the switcher happens to show — so
          // it must still shout. It shouted at the CLIENT, though, naming the
          // merchant token and the brand_marketplaces table on the page.
          console.error(
            `[useBrandCountries] No enabled marketplaces are registered for ${merchantToken} ` +
            `in brand_marketplaces — country scope cannot be resolved.`,
          );
        }

        setState({
          spid,
          countries,
          primary,
          isMultiCountry: countries.length >= 2,
          loading: false,
          error: countries.length === 0
            ? 'This dashboard is not available. Please contact hello@martincase.co.uk.'
            : null,
          clientName,
          arms,
          hasMultipleArms,
          defaultScope,
        });
      } catch (e: any) {
        if (cancelled) return;
        // Same split as above: the real message goes to the console, the client
        // gets a sentence rather than transport or Postgres text.
        console.error('[useBrandCountries] Failed to load brand countries', e);
        setState({
          ...EMPTY,
          spid,
          error: 'This dashboard is not available. Please contact hello@martincase.co.uk.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [merchantToken, accountName]);

  return state;
}

/**
 * rpc_client_scope resolves the client server-side, sharing the exact
 * coalesce(client_name, account_name, brand_name) expression the month-end
 * emails use — the dashboard cannot do that itself because month_end_client_map
 * is not exposed to share-link visitors, and a second copy of the rule in
 * TypeScript is how the two drifted apart in the first place.
 *
 * The brand_marketplaces path below is the pre-grouping behaviour, kept only as
 * a fallback so a missing RPC degrades to today's single-account view rather
 * than to a blank page.
 */
async function loadScopeRows(spid: string): Promise<ScopeRow[]> {
  const { data, error } = await (supabase.rpc as any)('rpc_client_scope', { p_spid: spid });
  if (!error && Array.isArray(data) && data.length) return data as ScopeRow[];
  if (error) console.warn('rpc_client_scope unavailable, falling back to brand widening', error);
  return loadScopeRowsFromRegistry(spid);
}

async function loadScopeRowsFromRegistry(spid: string): Promise<ScopeRow[]> {
  const COLS =
    'country_code, marketplace_id, currency, region, is_primary, sales_account_key, enabled, brand_name, selling_partner_id';

  const { data: bmRows, error: bmErr } = await supabase
    .from('brand_marketplaces')
    .select(COLS)
    .eq('selling_partner_id', spid)
    .eq('enabled', true);
  if (bmErr) throw bmErr;

  let rows = (bmRows || []) as any[];

  // Vendors get a DIFFERENT selling_partner_id in every marketplace (Portwest GB is
  // amzn1.vg.2072811, DE is amzn1.vg.5674352, and so on), so the spid lookup above
  // finds one country and misses the rest. Sellers keep one id across all countries,
  // where it works fine. Widen to the brand once we know which brand this is.
  const brand = rows.find((r) => r.brand_name)?.brand_name;
  if (brand) {
    const { data: brandRows, error: brandErr } = await supabase
      .from('brand_marketplaces')
      .select(COLS)
      .eq('brand_name', brand)
      .eq('enabled', true);
    if (brandErr) throw brandErr;

    // Union on sales_account_key — that is the unique account×marketplace key.
    const byKey = new Map<string, any>();
    [...rows, ...((brandRows || []) as any[])].forEach((r) => {
      if (r.sales_account_key) byKey.set(r.sales_account_key, r);
    });
    rows = Array.from(byKey.values());
  }

  const mktIds = Array.from(new Set(rows.map((r) => r.marketplace_id).filter(Boolean)));
  const namesById = new Map<string, { country_name: string; sort_order: number }>();
  if (mktIds.length) {
    const { data: mktRows } = await supabase
      .from('amazon_marketplaces')
      .select('marketplace_id, country_name, sort_order')
      .in('marketplace_id', mktIds);
    (mktRows || []).forEach((m: any) => {
      namesById.set(m.marketplace_id, { country_name: m.country_name, sort_order: m.sort_order ?? 999 });
    });
  }

  return rows.map((r) => ({
    client_name: r.brand_name ?? null,
    arm: null,
    brand_name: r.brand_name ?? null,
    selling_partner_id: r.selling_partner_id ?? null,
    sales_account_key: r.sales_account_key ?? null,
    marketplace_id: r.marketplace_id ?? null,
    country_code: r.country_code ?? null,
    country_name: namesById.get(r.marketplace_id)?.country_name ?? r.country_code ?? null,
    region: r.region ?? null,
    currency: r.currency ?? null,
    is_primary: !!r.is_primary,
    sort_order: namesById.get(r.marketplace_id)?.sort_order ?? 999,
  }));
}
