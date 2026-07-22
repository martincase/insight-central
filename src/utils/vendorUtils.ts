/**
 * Check if a merchant token belongs to a vendor account.
 * This is the definitive way to identify vendor accounts — 
 * do NOT rely on account.type which may not be populated.
 */
export const isVendorAccount = (merchantToken?: string | null): boolean => {
  return !!merchantToken && merchantToken.startsWith('amzn1.vg.');
};
