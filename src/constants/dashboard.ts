
export const sampleAccounts = [
  {
    id: '1',
    name: 'Account 1',
    sales: 12500,
    ppcSpend: 1250,
    ppcSales: 3750,
    acos: 33.3,
    tacos: 10.0,
    unitsOrdered: 450,
    pageViews: 28000,
    impressions: 45000,
    clicks: 1800,
    cpc: 0.69, // 1250 / 1800
    ctr: 4.0, // (1800 / 45000) * 100
    buyBoxPercentage: 85.2,
    conversionRate: 12.5,
    sellerCentralLink: 'https://sellercentral.amazon.co.uk',
    merchantToken: 'MERCHANT001',
    type: 'seller' as const,
    status: 'active' as const,
    isStarred: true,
    previousPeriod: {
      sales: 11000,
      ppcSpend: 1100,
      ppcSales: 3300,
      acos: 36.4,
      tacos: 11.0,
      unitsOrdered: 400,
      pageViews: 25000,
      impressions: 42000,
      clicks: 1650,
      cpc: 0.67, // 1100 / 1650
      ctr: 3.9, // (1650 / 42000) * 100
      buyBoxPercentage: 82.1,
      conversionRate: 11.8,
    },
  },
  {
    id: '2',
    name: 'Account 2',
    sales: 8750,
    ppcSpend: 875,
    ppcSales: 2625,
    acos: 25.0,
    tacos: 8.5,
    unitsOrdered: 320,
    pageViews: 18500,
    impressions: 32000,
    clicks: 1280,
    cpc: 0.68, // 875 / 1280
    ctr: 4.0, // (1280 / 32000) * 100
    buyBoxPercentage: 91.3,
    conversionRate: 14.2,
    sellerCentralLink: 'https://sellercentral.amazon.co.uk',
    merchantToken: 'MERCHANT002',
    type: 'seller' as const,
    status: 'active' as const,
    isStarred: false,
    previousPeriod: {
      sales: 9200,
      ppcSpend: 920,
      ppcSales: 2760,
      acos: 23.9,
      tacos: 8.2,
      unitsOrdered: 335,
      pageViews: 19200,
      impressions: 28500,
      clicks: 1140,
      cpc: 0.81, // 920 / 1140
      ctr: 4.0, // (1140 / 28500) * 100
      buyBoxPercentage: 89.7,
      conversionRate: 13.9,
    },
  },
];

export const STORAGE_KEYS = {
  ACCOUNTS: 'dashboard_accounts',
  SALES_DATA: 'dashboard_sales_data',
  LAST_SYNC: 'dashboard_last_sync',
  ASIN_DATA: 'dashboard_asin_data',
  PPC_DATA: 'dashboard_ppc_data',
  INVENTORY_DATA: 'dashboard_inventory_data',
};

export const GOOGLE_SHEETS_CONFIG = {
  API_KEY: 'AIzaSyCf2NPXyVeLvps381T8pLRLtCIWeS9pqXc',
  SHEET_ID: '13-pewA0YYvZpJkVfXiJcUVAXOx-6LCBHdXV3Wb2wGrw',
  RANGE: 'Daily Sales!A:Z', // Sales data - migrated to new sheet
  PPC_RANGE: 'Daily PPC V2!A:Z', // PPC data - migrated to new sheet
  CAMPAIGNS_RANGE: 'PPC Campaigns!A:Z', // Campaign data
  ASIN_RANGE: 'ASIN Sales!A:Z', // ASIN level sales data
  ACCOUNTS_RANGE: 'Accounts!A:Z', // Account master data
  VENDOR_RANGE: 'Daily Vendor V2!A:Z', // Vendor data
  INVENTORY_RANGE: 'Inventory V2!A:Z', // FBM Inventory data
  FBA_INVENTORY_RANGE: 'FBA Inventory!A:Z', // FBA Inventory data
  // Updated ASIN sheet - new seller ASIN data
  ASIN_SHEET_ID: '148fhdWwIdodj4NIDhwairqr2q7f5gy38RmeEhX5NBfk',
  ASIN_SHEET_RANGE: 'Sheet1!A:Z', // ASIN data in new sheet
  // Vendor data now uses the same new sheet
  VENDOR_SHEET_ID: '1il1doajzBPxg5uO8BOPJNxtCt9w2JRGajL5XhWAIYC0',
  VENDOR_SHEET_RANGE: 'Sheet1!A:Z', // Vendor sales data in new sheet
  // New FBM Inventory sheet
  FBM_INVENTORY_SHEET_ID: '1euLB020nTjg8xdDgB9oAEaRPed7kIpSUHjxuybpGVbw',
  FBM_INVENTORY_RANGE: 'Sheet1!A:Z', // FBM Inventory data in new sheet
  // Master Listings sheet - single source of truth for product names, prices, and FBM stock
  MASTER_LISTINGS_SHEET_ID: '150caAn2bpkTry-R9pZAdhyM1LMGaxw6hQ4vW5OeBq_g',
  MASTER_LISTINGS_RANGE: 'Sheet1!A:Z',
};
