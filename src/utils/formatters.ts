
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
  //
  // Round the MAGNITUDE, then re-apply the sign. JS Math.round breaks ties
  // towards +∞, so Math.round(-5374.5) is -5374 while Intl — which every other
  // money string in the app used to go through — breaks ties away from zero and
  // prints -5,375. Rounding the absolute value keeps the two in step, so moving
  // a call site onto this helper changes where the minus sits and nothing else.
  const factor = 10 ** decimals;
  const magnitude = Math.round(Math.abs(n) * factor) / factor;
  const rounded = n < 0 ? -magnitude : magnitude;

  const digits = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(magnitude);

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

/**
 * Advertising conversion rate — orders ÷ clicks.
 *
 * Amazon attributes an order to a click for up to 7 (or 14) days, and one click
 * can carry more than one order, so this ratio genuinely resolves above 1. The
 * DATA is right; calling it a "conversion rate" is what is wrong, because a
 * rate is a share of a population and cannot exceed 100%. NI Candle's ASIN
 * B0GZ4X2HQY (1 click, 2 orders) printed "Conv % 200.0%", which a client reads
 * as a broken dashboard rather than as a real attribution quirk.
 *
 * So above the ceiling the figure is shown in the unit that is actually true —
 * orders per click, e.g. "2.00 per click" — rather than clamped to 100% or
 * withheld. The real number stays on the screen; only the unit changes, and
 * `exceedsCeiling` lets the call site mark it and explain itself. No clicks
 * means no denominator, which is a dash, never "0.0%".
 */
export const CONVERSION_CEILING_PCT = 100;

export interface ConversionDisplay {
  /** What to print. */
  text: string;
  /** The true ratio as a percentage; null where there is no denominator. */
  value: number | null;
  /** Orders exceeded clicks, so the figure is not a conversion rate. */
  exceedsCeiling: boolean;
  /** Long-form explanation, for a title/tooltip. */
  note: string;
}

export const conversionDisplay = (
  orders: number | null | undefined,
  clicks: number | null | undefined,
  decimals: number = 1,
): ConversionDisplay => {
  const o = Number(orders);
  const c = Number(clicks);

  if (!Number.isFinite(c) || c <= 0) {
    return {
      text: '—',
      value: null,
      exceedsCeiling: false,
      note: 'No clicks, so there is no conversion rate to report.',
    };
  }

  const safeOrders = Number.isFinite(o) ? o : 0;
  const pct = (safeOrders / c) * 100;

  if (pct > CONVERSION_CEILING_PCT) {
    const perClick = safeOrders / c;
    return {
      text: `${perClick.toFixed(2)} per click`,
      value: pct,
      exceedsCeiling: true,
      note:
        `${safeOrders.toLocaleString()} orders attributed to ${c.toLocaleString()} click` +
        `${c === 1 ? '' : 's'} — ${perClick.toFixed(2)} orders per click. Amazon attributes an ` +
        'order to a click for days afterwards, and one click can carry more than one order, ' +
        'so this cannot be expressed as a conversion rate.',
    };
  }

  return {
    text: `${pct.toFixed(decimals)}%`,
    value: pct,
    exceedsCeiling: false,
    note: `${safeOrders.toLocaleString()} orders from ${c.toLocaleString()} clicks.`,
  };
};

/** Convenience wrapper for call sites that only need the string (e.g. CSV). */
export const formatConversionRate = (
  orders: number | null | undefined,
  clicks: number | null | undefined,
  decimals: number = 1,
): string => conversionDisplay(orders, clicks, decimals).text;

export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
};
