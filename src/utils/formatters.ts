
import { getCurrencyInfo, getCurrencyFromMerchantToken } from './currencyUtils';

export const formatCurrency = (amount: number, includeSymbol: boolean = true): string => {
  const absAmount = Math.abs(amount);
  
  if (!includeSymbol) {
    if (absAmount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  }
  
  // Default to GBP for backward compatibility
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format currency based on country code
 */
export const formatCurrencyByCountry = (amount: number, countryCode: string | null, includeSymbol: boolean = true): string => {
  const absAmount = Math.abs(amount);
  
  if (!includeSymbol) {
    if (absAmount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  }
  
  const currencyInfo = getCurrencyInfo(countryCode);
  
  return new Intl.NumberFormat(currencyInfo.locale, {
    style: 'currency',
    currency: currencyInfo.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format currency based on merchant token
 */
export const formatCurrencyByMerchantToken = (amount: number, merchantToken: string, includeSymbol: boolean = true): string => {
  const absAmount = Math.abs(amount);
  
  if (!includeSymbol) {
    if (absAmount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  }
  
  const currencyInfo = getCurrencyFromMerchantToken(merchantToken);
  
  return new Intl.NumberFormat(currencyInfo.locale, {
    style: 'currency',
    currency: currencyInfo.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
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
