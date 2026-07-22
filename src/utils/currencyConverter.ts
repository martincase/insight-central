// Currency conversion utilities for normalizing multi-currency data to GBP

import { getCurrencyFromMerchantToken } from './currencyUtils';

// Static exchange rates - in production, these should come from an API
const EXCHANGE_RATES_TO_GBP: Record<string, number> = {
  GBP: 1.0,
  USD: 0.79,
  EUR: 0.85,
  AUD: 0.52,
  CAD: 0.58,
  JPY: 0.0053,
  INR: 0.0095,
  BRL: 0.16,
  MXN: 0.047,
  SEK: 0.074,
  PLN: 0.20,
  TRY: 0.027,
  AED: 0.21,
  SGD: 0.58,
  EGP: 0.016,
  SAR: 0.21,
};

/**
 * Convert amount from one currency to GBP
 */
export function convertToGBP(amount: number, fromCurrency: string): number {
  const rate = EXCHANGE_RATES_TO_GBP[fromCurrency.toUpperCase()];
  if (!rate) {
    console.warn(`Exchange rate not found for ${fromCurrency}, using 1:1 conversion`);
    return amount;
  }
  return amount * rate;
}

/**
 * Convert amount from merchant token's currency to GBP
 */
export function convertToGBPFromMerchantToken(amount: number, merchantToken: string): number {
  const currencyInfo = getCurrencyFromMerchantToken(merchantToken);
  return convertToGBP(amount, currencyInfo.code);
}

/**
 * Convert an account's financial metrics to GBP
 */
export function convertAccountMetricsToGBP(account: any): any {
  const convertedMetrics = {
    ...account,
    sales: convertToGBPFromMerchantToken(account.sales || 0, account.merchantToken),
    ppcSpend: convertToGBPFromMerchantToken(account.ppcSpend || 0, account.merchantToken),
    ppcSales: convertToGBPFromMerchantToken(account.ppcSales || 0, account.merchantToken),
    cpc: convertToGBPFromMerchantToken(account.cpc || 0, account.merchantToken),
  };

  // Convert previous period metrics if they exist
  if (account.previousPeriod) {
    convertedMetrics.previousPeriod = {
      ...account.previousPeriod,
      sales: convertToGBPFromMerchantToken(account.previousPeriod.sales || 0, account.merchantToken),
      ppcSpend: convertToGBPFromMerchantToken(account.previousPeriod.ppcSpend || 0, account.merchantToken),
      ppcSales: convertToGBPFromMerchantToken(account.previousPeriod.ppcSales || 0, account.merchantToken),
      cpc: convertToGBPFromMerchantToken(account.previousPeriod.cpc || 0, account.merchantToken),
    };
  }

  return convertedMetrics;
}