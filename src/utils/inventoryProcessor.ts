import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import type { InventoryData } from '@/types/dashboard';

// Fetch inventory data from Master Listings sheet (single source of truth)
export const fetchInventoryData = async (): Promise<any[]> => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.MASTER_LISTINGS_SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.MASTER_LISTINGS_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (data.values && data.values.length > 0) {
    }
    
    return data.values || [];
  } catch (error) {
    console.error('Error fetching Master Listings data:', error);
    return [];
  }
};

// Process inventory data from Master Listings sheet
export const processInventoryData = (inventoryData: any[], merchantToken: string): InventoryData[] => {
  if (!inventoryData || inventoryData.length === 0) {
    return [];
  }

  const headers = inventoryData[0];

  // Find column indices for Master Listings columns
  const skuIndex = headers.findIndex((h: string) => h === 'merchant_listings_all_data__seller_sku');
  const asinIndex = headers.findIndex((h: string) => h === 'merchant_listings_all_data__asin1');
  const productNameIndex = headers.findIndex((h: string) => h === 'merchant_listings_all_data__item_name');
  const quantityIndex = headers.findIndex((h: string) => h === 'merchant_listings_all_data__quantity');
  const priceIndex = headers.findIndex((h: string) => h === 'merchant_listings_all_data__price');
  const accountNameIndex = headers.findIndex((h: string) => h === 'account_name');

  if (asinIndex === -1 || accountNameIndex === -1) {
    return [];
  }

  // Process data rows (skip header)
  const processedData: InventoryData[] = [];
  
  // Debug: Log unique merchant tokens in inventory data
  const uniqueMerchantTokens = new Set();
  for (let i = 1; i < inventoryData.length; i++) {
    const row = inventoryData[i];
    const rowMerchantToken = row[accountNameIndex];
    if (rowMerchantToken) {
      uniqueMerchantTokens.add(rowMerchantToken);
    }
  }
  
  for (let i = 1; i < inventoryData.length; i++) {
    const row = inventoryData[i];
    const rowMerchantToken = row[accountNameIndex];
    
    // Match by merchant token
    if (rowMerchantToken === merchantToken) {
      const inventoryItem: InventoryData = {
        sku: skuIndex !== -1 ? (row[skuIndex] || '') : '',
        asin: row[asinIndex] || '',
        productName: productNameIndex !== -1 ? (row[productNameIndex] || '') : '',
        quantity: quantityIndex !== -1 ? (parseInt(row[quantityIndex]) || 0) : 0,
        price: priceIndex !== -1 ? (parseFloat(row[priceIndex]) || 0) : 0,
        fulfillmentType: 'FBM', // Master Listings is FBM data
        accountName: rowMerchantToken
      };
      
      processedData.push(inventoryItem);
    }
  }

  return processedData;
};

// Legacy functions kept for backward compatibility with sync jobs
export const fetchFBMInventoryData = async (): Promise<any[]> => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.FBM_INVENTORY_SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.FBM_INVENTORY_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Error fetching FBM inventory data:', error);
    return [];
  }
};

export const fetchFBAInventoryData = async (): Promise<any[]> => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.FBA_INVENTORY_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Error fetching FBA inventory data:', error);
    return [];
  }
};
