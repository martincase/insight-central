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
 * Get currency info for a given country code
 */
export function getCurrencyInfo(countryCode: string | null): CurrencyInfo {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || DEFAULT_CURRENCY;
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