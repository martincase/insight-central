
import { getCurrencyInfo, getCurrencyFromMerchantToken, type CurrencyInfo } from './currencyUtils';

/** Money is shown to two decimals or to none — never to one. */
export type MoneyDecimals = 0 | 2;

/**
 * The one money formatter for the whole app. Every currency string a client
 * sees should come through here, because three separate things kept going
 * wrong when call sites rolled their own:
 *
 *  1. Decimals. `Intl` with `min: 0, max: 2` prints £949.6 — a figure that
 *     reads as broken. Money gets two decimals or none, never one.
 *  2. The symbol. `Intl` in its own locale renders AUD as a bare "$", which a
 *     reader takes for US dollars. The symbol therefore comes from our own
 *     currency map (A$, kr, zł), not from the locale.
 *  3. The sign. `${symbol}${value}` puts the minus in the wrong place —
 *     "£-283". The sign belongs in front of the whole amount: "-£283".
 *
 * Only the digit grouping is left to the currency's locale, so existing
 * per-market number styling is unchanged.
 */
export const formatMoney = (
  value: number | null | undefined,
  currency: CurrencyInfo,
  decimals: MoneyDecimals = 2,
): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  // Decide the sign from the *rounded* figure, so -0.001 at 0dp is not "-£0".
  const factor = 10 ** decimals;
  const rounded = Math.round(n * factor) / factor;

  const digits = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(rounded));

  return `${rounded < 0 ? '-' : ''}${currency.symbol}${digits}`;
};

/** Compact "1.2k" form used when a caller explicitly asks for no symbol. */
const compact = (amount: number): string => {
  const absAmount = Math.abs(amount);
  if (absAmount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return amount.toFixed(0);
};

const GBP = getCurrencyInfo('GB');

export const formatCurrency = (amount: number, includeSymbol: boolean = true): string => {
  if (!includeSymbol) return compact(amount);
  // Default to GBP for backward compatibility
  return formatMoney(amount, GBP);
};

/**
 * Format currency based on country code
 */
export const formatCurrencyByCountry = (amount: number, countryCode: string | null, includeSymbol: boolean = true): string => {
  if (!includeSymbol) return compact(amount);
  return formatMoney(amount, getCurrencyInfo(countryCode));
};

/**
 * Format currency based on merchant token
 */
export const formatCurrencyByMerchantToken = (amount: number, merchantToken: string, includeSymbol: boolean = true): string => {
  if (!includeSymbol) return compact(amount);
  return formatMoney(amount, getCurrencyFromMerchantToken(merchantToken));
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * ACOS is spend ÷ sales. With no sales the ratio is undefined, not zero —
 * and "0.00%" reads as perfect efficiency when it means the exact opposite.
 * Returns 'N/A' for spend against no sales, '—' where there is no activity
 * at all. Mirrors what the PPC Search Term table already does.
 */
export const isAcosDefined = (spend: number | null | undefined, sales: number | null | undefined): boolean => {
  const s = Number(spend);
  const v = Number(sales);
  return Number.isFinite(s) && Number.isFinite(v) && v > 0;
};

export const formatAcos = (
  spend: number | null | undefined,
  sales: number | null | undefined,
  decimals: number = 1,
): string => {
  if (!isAcosDefined(spend, sales)) {
    return Number(spend) > 0 ? 'N/A' : '—';
  }
  return `${((Number(spend) / Number(sales)) * 100).toFixed(decimals)}%`;
};

export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
};
