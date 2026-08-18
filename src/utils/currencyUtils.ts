// Currency mappings and utilities for multi-currency support

export interface CurrencyInfo {
  code: string;
  symbol: string;
  locale: string;
  name: string;
}

// Country to currency mappings based on Amazon marketplaces
const COUNTRY_CURRENCY_MAP: Record<string, CurrencyInfo> = {
  GB: { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound' },
  UK: { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound' },
  US: { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar' },
  USA: { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar' },
  DE: { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro' },
  FR: { code: 'EUR', symbol: '€', locale: 'fr-FR', name: 'Euro' },
  IT: { code: 'EUR', symbol: '€', locale: 'it-IT', name: 'Euro' },
  ES: { code: 'EUR', symbol: '€', locale: 'es-ES', name: 'Euro' },
  NL: { code: 'EUR', symbol: '€', locale: 'nl-NL', name: 'Euro' },
  // BE and IE were absent until 2026-08-18. Both are euro marketplaces, so both
  // fell through to DEFAULT_CURRENCY and printed Portwest's Belgian and Irish
  // sales as £4,922.45 / £6,599.09 — pounds, on a client-facing table, for
  // marketplaces that trade in euros. Same class of bug as the 'DE#Vendor' one
  // noted on getCurrencyInfo below.
  BE: { code: 'EUR', symbol: '€', locale: 'nl-BE', name: 'Euro' },
  IE: { code: 'EUR', symbol: '€', locale: 'en-IE', name: 'Euro' },
  AU: { code: 'AUD', symbol: 'A$', locale: 'en-AU', name: 'Australian Dollar' },
  CA: { code: 'CAD', symbol: 'C$', locale: 'en-CA', name: 'Canadian Dollar' },
  JP: { code: 'JPY', symbol: '¥', locale: 'ja-JP', name: 'Japanese Yen' },
  IN: { code: 'INR', symbol: '₹', locale: 'en-IN', name: 'Indian Rupee' },
  BR: { code: 'BRL', symbol: 'R$', locale: 'pt-BR', name: 'Brazilian Real' },
  MX: { code: 'MXN', symbol: '$', locale: 'es-MX', name: 'Mexican Peso' },
  SE: { code: 'SEK', symbol: 'kr', locale: 'sv-SE', name: 'Swedish Krona' },
  PL: { code: 'PLN', symbol: 'zł', locale: 'pl-PL', name: 'Polish Złoty' },
  TR: { code: 'TRY', symbol: '₺', locale: 'tr-TR', name: 'Turkish Lira' },
  AE: { code: 'AED', symbol: 'د.إ', locale: 'ar-AE', name: 'UAE Dirham' },
  SG: { code: 'SGD', symbol: 'S$', locale: 'en-SG', name: 'Singapore Dollar' },
  EG: { code: 'EGP', symbol: 'E£', locale: 'ar-EG', name: 'Egyptian Pound' },
  SA: { code: 'SAR', symbol: '﷼', locale: 'ar-SA', name: 'Saudi Riyal' },
  ZA: { code: 'ZAR', symbol: 'R', locale: 'en-ZA', name: 'South African Rand' },
};

// Default currency (fallback)
const DEFAULT_CURRENCY: CurrencyInfo = { 
  code: 'GBP', 
  symbol: '£', 
  locale: 'en-GB', 
  name: 'British Pound' 
};

/**
 * Extract country code from merchant token
 * Example: A2CHC7BKOPTYNC-GB returns "GB"
 */
export function getCountryFromMerchantToken(merchantToken: string): string | null {
  if (!merchantToken) return null;
  
  const parts = merchantToken.split('-');
  if (parts.length < 2) return null;
  
  return parts[parts.length - 1].toUpperCase();
}

/**
 * Get currency info for a given country code.
 *
 * Also accepts a scope token, which may carry an arm suffix ('DE#Vendor' for
 * the German vendor arm of a client who is both a vendor and a seller). The
 * currency belongs to the marketplace, never to the arm, so the suffix is
 * dropped — without this 'DE#Vendor' missed the map and printed euros as £.
 */
export function getCurrencyInfo(countryCode: string | null): CurrencyInfo {
  if (!countryCode) return DEFAULT_CURRENCY;
  const area = countryCode.split('#')[0];
  const hit = COUNTRY_CURRENCY_MAP[area.toUpperCase()];
  if (hit) return hit;

  // Falling through to GBP is the dangerous path: an unmapped marketplace does
  // not look broken, it looks like pounds. That is how BE and IE shipped euro
  // revenue to a client under a £ sign. The fallback stays (blanking a figure
  // mid-render would be worse) but it must never again do so silently.
  if (import.meta.env.DEV) {
    console.warn(
      `[currencyUtils] No currency mapped for "${area}" — falling back to GBP. ` +
        `Add it to COUNTRY_CURRENCY_MAP before this reaches a client dashboard.`,
    );
  }
  return DEFAULT_CURRENCY;
}

/**
 * Currency identity keyed by ISO 4217 code.
 *
 * Derived from COUNTRY_CURRENCY_MAP rather than typed out a second time, so a
 * currency can never be described one way here and another way there. The first
 * country listed for a currency supplies its canonical locale, which governs
 * digit grouping only — the symbol is the same whichever market it came from.
 */
const CURRENCY_BY_CODE: Record<string, CurrencyInfo> = Object.values(COUNTRY_CURRENCY_MAP).reduce(
  (acc, info) => {
    if (!acc[info.code]) acc[info.code] = info;
    return acc;
  },
  {} as Record<string, CurrencyInfo>,
);

/**
 * Get currency info from the ISO 4217 code the feed itself reports.
 *
 * Formatting off a country code is the bug class that put Portwest's Belgian
 * and Irish euros in front of a client under a £ sign: an unmapped marketplace
 * did not look broken, it silently became sterling. A currency code cannot do
 * that, because it names the currency outright — so every call site that has a
 * real `currency` column should come through here instead of getCurrencyInfo.
 *
 * `countryCode` is an optional tie-break on LOCALE only: where the market's own
 * entry agrees with the reported currency we keep its grouping (fr-FR for
 * France's euros), so existing per-market styling is unchanged. It can never
 * override the currency. An unrecognised code prints as the code rather than
 * borrowing some other currency's symbol.
 */
export function getCurrencyInfoByCode(
  currencyCode: string | null | undefined,
  countryCode?: string | null,
): CurrencyInfo {
  // No currency on the row at all — fall back to the country map, which at
  // least warns in dev when it is guessing.
  if (!currencyCode) return getCurrencyInfo(countryCode ?? null);

  const code = currencyCode.toUpperCase();

  if (countryCode) {
    const local = COUNTRY_CURRENCY_MAP[countryCode.split('#')[0].toUpperCase()];
    if (local && local.code === code) return local;
  }

  const hit = CURRENCY_BY_CODE[code];
  if (hit) return hit;

  if (import.meta.env.DEV) {
    console.warn(
      `[currencyUtils] No symbol mapped for currency "${code}" — printing the code itself. ` +
        `Add it to COUNTRY_CURRENCY_MAP before this reaches a client dashboard.`,
    );
  }
  return { code, symbol: `${code} `, locale: 'en-GB', name: code };
}

/**
 * Get currency info from merchant token
 */
export function getCurrencyFromMerchantToken(merchantToken: string): CurrencyInfo {
  const countryCode = getCountryFromMerchantToken(merchantToken);
  return getCurrencyInfo(countryCode);
}

/**
 * Get all unique currencies from a list of merchant tokens
 */
export function getUniqueCurrencies(merchantTokens: string[]): CurrencyInfo[] {
  const currencies = new Map<string, CurrencyInfo>();
  
  merchantTokens.forEach(token => {
    const currency = getCurrencyFromMerchantToken(token);
    currencies.set(currency.code, currency);
  });
  
  return Array.from(currencies.values());
}

/**
 * Check if multiple currencies are present in the given merchant tokens
 */
export function hasMultipleCurrencies(merchantTokens: string[]): boolean {
  return getUniqueCurrencies(merchantTokens).length > 1;
}

/**
 * Get a display string for mixed currencies
 */
export function getMixedCurrencyDisplay(merchantTokens: string[]): string {
  const currencies = getUniqueCurrencies(merchantTokens);
  if (currencies.length <= 1) return '';
  
  return `Mixed currencies: ${currencies.map(c => c.code).join(', ')}`;
}