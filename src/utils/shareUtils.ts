// Utility functions for managing shareable URLs

export const generateShareCode = (): string => {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
};

export const base64UrlEncode = (str: string): string => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const base64UrlDecode = (str: string): string => {
  // Add padding if needed
  const padded = str + '==='.slice((str.length + 3) % 4);
  // Replace URL-safe characters
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
};

export const generateShareUrl = (
  brandName: string, 
  shareCode: string, 
  payload: any
): { shortUrl: string; fullUrl: string } => {
  const brandSlug = normalizedBrandName(brandName);
  const shortUrl = `${window.location.origin}/${brandSlug}/${shareCode}`;
  const fullUrl = `${shortUrl}?p=${base64UrlEncode(JSON.stringify(payload))}`;
  
  return { shortUrl, fullUrl };
};

export const normalizedBrandName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
};