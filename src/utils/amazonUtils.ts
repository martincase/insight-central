import { getCountryFromMerchantToken } from '@/utils/countryUtils';

/**
 * Get Amazon domain based on country code
 */
export function getAmazonDomain(countryCode: string | null): string {
  const countryDomains: Record<string, string> = {
    'GB': 'amazon.co.uk',
    'UK': 'amazon.co.uk',
    'US': 'amazon.com',
    'USA': 'amazon.com',
    'DE': 'amazon.de',
    'FR': 'amazon.fr',
    'IT': 'amazon.it',
    'ES': 'amazon.es',
    'CA': 'amazon.ca',
    'AU': 'amazon.com.au',
    'JP': 'amazon.co.jp',
    'IN': 'amazon.in',
    'BR': 'amazon.com.br',
    'MX': 'amazon.com.mx',
    'NL': 'amazon.nl',
    'SE': 'amazon.se',
    'PL': 'amazon.pl',
    'TR': 'amazon.com.tr',
    'AE': 'amazon.ae',
    'SG': 'amazon.sg'
  };
  
  return countryDomains[countryCode?.toUpperCase() || ''] || 'amazon.com';
}

/**
 * Get country-specific Amazon product URL
 */
export function getAmazonProductUrl(asin: string, merchantToken?: string): string {
  const countryCode = getCountryFromMerchantToken(merchantToken || '');
  const domain = getAmazonDomain(countryCode);
  return `https://www.${domain}/dp/${asin}`;
}

/**
 * Get country-specific Amazon Seller Central URL
 */
export function getAmazonSellerCentralUrl(merchantToken?: string): string {
  const countryCode = getCountryFromMerchantToken(merchantToken || '');
  const domain = getAmazonDomain(countryCode);
  return `https://sellercentral.${domain}`;
}

/**
 * Get country-specific Amazon Vendor Central URL
 */
export function getAmazonVendorCentralUrl(merchantToken?: string): string {
  // Vendor Central uses .com for most countries except a few exceptions
  const countryCode = getCountryFromMerchantToken(merchantToken || '');
  
  // Special cases for Vendor Central
  const vendorCentralDomains: Record<string, string> = {
    'GB': 'vendorcentral.amazon.co.uk',
    'UK': 'vendorcentral.amazon.co.uk',
    'DE': 'vendorcentral.amazon.de',
    'FR': 'vendorcentral.amazon.fr',
    'IT': 'vendorcentral.amazon.it',
    'ES': 'vendorcentral.amazon.es',
    'JP': 'vendorcentral.amazon.co.jp',
    'IN': 'vendorcentral.amazon.in'
  };
  
  const vendorDomain = vendorCentralDomains[countryCode?.toUpperCase() || ''];
  if (vendorDomain) {
    return `https://${vendorDomain}`;
  }
  
  // Default to .com for most other countries
  return 'https://vendorcentral.amazon.com';
}

/**
 * Open Amazon product in new tab with country-specific URL
 */
export function openAmazonProduct(asin: string, merchantToken?: string): void {
  const url = getAmazonProductUrl(asin, merchantToken);
  window.open(url, '_blank');
}