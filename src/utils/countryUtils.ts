// Country flag image mappings
const COUNTRY_FLAG_IMAGES: Record<string, string> = {
  GB: '/uploads/1464b4de-f101-421e-b04a-f439a12f6da3.png', // UK flag
  UK: '/uploads/1464b4de-f101-421e-b04a-f439a12f6da3.png', // UK flag
  US: '/uploads/1317703c-dc02-43b1-b4d9-33bab1a991fb.png', // USA flag
  USA: '/uploads/1317703c-dc02-43b1-b4d9-33bab1a991fb.png', // USA flag
  DE: '/uploads/9555ea69-66fd-40d9-90d5-7ee7dcad2b6b.png', // German flag
  FR: '/uploads/22bf21f9-71d4-4dec-9ddc-44ac6b5c0734.png', // French flag
  AU: '/uploads/6c44cdb7-21c9-49ff-9c78-7b1ea3eb39c3.png', // Australian flag
  IT: '/flags/it.svg', // Italian flag
  ES: '/flags/es.svg', // Spanish flag
};

const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  US: 'United States',
  USA: 'United States',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  IN: 'India',
  BR: 'Brazil',
  MX: 'Mexico',
  NL: 'Netherlands',
  SE: 'Sweden',
  PL: 'Poland',
  TR: 'Turkey',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  EG: 'Egypt',
  SA: 'Saudi Arabia',
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
 * Get flag image URL for country code
 */
export function getCountryFlagImage(countryCode: string | null): string | null {
  if (!countryCode) return null;
  return COUNTRY_FLAG_IMAGES[countryCode.toUpperCase()] || null;
}

/**
 * Get country name for country code
 */
export function getCountryName(countryCode: string | null): string {
  if (!countryCode) return 'Unknown';
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
}

/**
 * Get country info from merchant token
 */
export function getCountryInfo(merchantToken: string) {
  const countryCode = getCountryFromMerchantToken(merchantToken);
  return {
    code: countryCode,
    flagImage: getCountryFlagImage(countryCode),
    name: getCountryName(countryCode),
  };
}