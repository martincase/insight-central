/**
 * Scope tokens.
 *
 * A scope used to be just a country code, 'ALL_EU' or 'ALL'. Once a client can
 * be two Amazon accounts (S Green & Sons is a vendor account plus the Ooble
 * Home seller account; Portwest is twelve vendor accounts plus Workwear Depot),
 * two rows can share a country — Portwest has UK·Vendor AND UK·Seller.
 *
 * Silently summing those into one "United Kingdom" would erase a split the
 * client reads every month: their email lists "United Kingdom · Vendor" and
 * "United Kingdom · Seller" as separate lines. So a scope gained an optional
 * arm, separated by '#':
 *
 *   'GB'           every arm in GB          (unchanged for single-arm clients)
 *   'GB#Vendor'    the vendor arm in GB
 *   'ALL#Vendor'   the vendor arm everywhere — Portwest's 12 vendor markets
 *   'ALL'          the whole client, every arm, every country
 *   'ALL_EU'       every arm in EU marketplaces
 *
 * The same grammar is parsed server-side by public.scope_area/scope_arm, so a
 * token means exactly one thing whichever end reads it.
 */

export const SCOPE_ARM_SEPARATOR = '#';

/** Country code, 'ALL' or 'ALL_EU' — the part before the arm. */
export const scopeArea = (scope?: string | null): string =>
  (scope ?? '').split(SCOPE_ARM_SEPARATOR)[0] ?? '';

/** 'Vendor' / 'Seller', or null when the scope covers every arm. */
export const scopeArm = (scope?: string | null): string | null => {
  const parts = (scope ?? '').split(SCOPE_ARM_SEPARATOR);
  return parts.length > 1 && parts[1] ? parts[1] : null;
};

/** Build a scope token. An absent arm keeps the plain country form. */
export const makeScope = (area: string, arm?: string | null): string =>
  arm ? `${area}${SCOPE_ARM_SEPARATOR}${arm}` : area;

/**
 * True when the scope spans several marketplaces, so figures are GBP
 * conversions rather than one marketplace's own currency. 'ALL#Vendor' is a
 * rollup; 'GB#Vendor' is not.
 */
export const isRollupScope = (scope?: string | null): boolean => {
  const area = scopeArea(scope);
  return area === 'ALL' || area === 'ALL_EU';
};

/** The two-letter country of a scope, or null for a rollup. */
export const scopeCountryCode = (scope?: string | null): string | null => {
  const area = scopeArea(scope);
  return area.length === 2 ? area : null;
};
