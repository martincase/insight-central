import { AccountData, ASINData, InventoryData } from '@/types/dashboard';

// Demo Account with realistic, healthy metrics
export const DEMO_ACCOUNT: AccountData = {
  id: 'demo',
  name: 'Demo Account',
  sales: 45000,
  ppcSpend: 3600,
  ppcSales: 16200,
  acos: 14.0,
  tacos: 8.0,
  unitsOrdered: 1250,
  pageViews: 85000,
  impressions: 450000,
  clicks: 18000,
  cpc: 0.20,
  ctr: 4.0,
  buyBoxPercentage: 94.5,
  conversionRate: 12.0,
  sellerCentralLink: 'https://sellercentral.amazon.co.uk',
  merchantToken: 'DEMO_TOKEN',
  ppcAccountName: 'Demo Account', // Match PPC data account_name
  type: 'seller',
  status: 'active',
  isStarred: false,
  previousPeriod: {
    sales: 42000,
    ppcSpend: 3400,
    ppcSales: 15000,
    acos: 15.2,
    tacos: 8.1,
    unitsOrdered: 1150,
    pageViews: 80000,
    impressions: 420000,
    clicks: 16800,
    cpc: 0.20,
    ctr: 4.0,
    buyBoxPercentage: 93.2,
    conversionRate: 11.5,
  },
};

// Demo product names for realistic ASIN data
const DEMO_PRODUCT_NAMES = [
  'Premium Wireless Bluetooth Earbuds with Charging Case',
  'Organic Green Tea Matcha Powder 100g',
  'Stainless Steel Water Bottle 750ml Insulated',
  'LED Desk Lamp with USB Charging Port',
  'Memory Foam Neck Pillow for Travel',
  'Bamboo Cutting Board Set - 3 Pack',
  'Yoga Mat Non-Slip Exercise Mat 6mm',
  'Electric Coffee Grinder Stainless Steel',
  'Portable Phone Charger 10000mAh Power Bank',
  'Silicone Kitchen Utensil Set 8 Piece',
  'Aromatherapy Essential Oil Diffuser',
  'Adjustable Laptop Stand Aluminium',
  'Reusable Food Storage Bags 12 Pack',
  'Wireless Mouse Ergonomic Design',
  'Glass Meal Prep Containers Set of 5',
];

// Generate realistic daily sales data for the past 30 days
// Format matches production data structure from dataProcessor.ts
export const generateDemoSheetData = (): any[][] => {
  const headers = [
    'id',                    // 0
    'date',                  // 1 - used by dataProcessor
    'account_name',          // 2
    'account_id',            // 3 - merchant token
    'marketplace',           // 4
    'ordered_product_sales', // 5 - sales
    'sessions',              // 6
    'units_ordered',         // 7
    'total_order_items',     // 8
    'page_views',            // 9
    'buy_box_percentage',    // 10
    'unit_session_percentage_b2b', // 11
    'unit_session_percentage',     // 12 - conversion
    'product_title',         // 13 - product name
  ];
  
  const rows: any[][] = [headers];
  const today = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // Use dd/MM/yyyy format to match production data
    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    
    // Weekend adjustment (lower sales on weekends)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendMultiplier = isWeekend ? 0.7 : 1.0;
    
    // Add some natural variance (±15%)
    const variance = 0.85 + Math.random() * 0.3;
    
    const baseSales = 1500 * weekendMultiplier * variance;
    const baseUnits = 42 * weekendMultiplier * variance;
    const basePageViews = 2800 * weekendMultiplier * variance;
    const buyBox = 92 + Math.random() * 6;
    const convRate = 10 + Math.random() * 4;
    
    // Pick a random product name
    const productName = DEMO_PRODUCT_NAMES[i % DEMO_PRODUCT_NAMES.length];
    
    rows.push([
      `demo-${i}`,                    // 0 - id
      dateStr,                        // 1 - date
      'Demo Account',                 // 2 - account_name
      'DEMO_TOKEN',                   // 3 - account_id (merchant token)
      'UK',                           // 4 - marketplace
      baseSales.toFixed(2),           // 5 - sales
      Math.round(baseUnits * 2.5),    // 6 - sessions
      Math.round(baseUnits),          // 7 - units_ordered
      Math.round(baseUnits),          // 8 - total_order_items
      Math.round(basePageViews),      // 9 - page_views
      buyBox.toFixed(1),              // 10 - buy_box_percentage
      '0',                            // 11 - unit_session_percentage_b2b
      convRate.toFixed(1),            // 12 - conversion rate
      productName,                    // 13 - product_title
    ]);
  }
  
  return rows;
};

// Generate realistic PPC data for the past 30 days
// Format must satisfy BOTH:
// 1. SalesHeatmap DEFAULT_MAPPING: ppcSales = index 5, ppcSpend = index 6
// 2. MonthlyPerformanceView header lookup: uses header names for column indices
export const generateDemoPPCData = (): any[][] => {
  const headers = [
    'date',                          // 0 - date (used by SalesHeatmap row[0])
    'id',                            // 1
    'marketplace',                   // 2
    'campaign_type',                 // 3
    'account_name',                  // 4 - ppc account name (used by SalesHeatmap row[4])
    'sponsored_products_campaign__attributedsales14d', // 5 - ppc sales (SalesHeatmap index 5)
    'sponsored_products_campaign__cost',               // 6 - ppc spend (SalesHeatmap index 6)
    'sponsored_products_campaign__impressions',        // 7 - impressions
    'sponsored_products_campaign__clicks',             // 8 - clicks
  ];
  
  const rows: any[][] = [headers];
  const today = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // Use dd/MM/yyyy format to match production data
    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    
    // Weekend adjustment
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendMultiplier = isWeekend ? 0.65 : 1.0;
    
    // Independent variance for spend and sales so ACOS varies naturally (18-28% range)
    const spendVariance = 0.85 + Math.random() * 0.3;
    const salesVariance = 0.85 + Math.random() * 0.3;
    
    // PPC Spend should be LOWER than PPC Sales (healthy ROAS ~4-5x)
    const baseSpend = 120 * weekendMultiplier * spendVariance;  // ~£120/day spend
    const baseSales = 540 * weekendMultiplier * salesVariance;  // ~£540/day PPC sales
    const baseImpressions = 15000 * weekendMultiplier * (0.85 + Math.random() * 0.3);
    const baseClicks = 600 * weekendMultiplier * (0.85 + Math.random() * 0.3);
    
    rows.push([
      dateStr,                        // 0 - date
      `demo-ppc-${i}`,                // 1 - id
      'UK',                           // 2 - marketplace
      'SP',                           // 3 - campaign_type
      'Demo Account',                 // 4 - account_name (ppcAccountName)
      baseSales.toFixed(2),           // 5 - ppc sales (HIGHER value ~540)
      baseSpend.toFixed(2),           // 6 - ppc spend (LOWER value ~120)
      Math.round(baseImpressions),    // 7 - impressions
      Math.round(baseClicks),         // 8 - clicks
    ]);
  }
  
  return rows;
};

// Demo ASIN data with varied performance
export const generateDemoASINData = (): ASINData[] => {
  const products = [
    { asin: 'B0DEMO001', name: 'Premium Wireless Bluetooth Earbuds with Charging Case', sales: 12500, units: 350, buyBox: 98, conversion: 18 },
    { asin: 'B0DEMO002', name: 'Organic Green Tea Matcha Powder 100g', sales: 8200, units: 245, buyBox: 95, conversion: 16 },
    { asin: 'B0DEMO003', name: 'Stainless Steel Water Bottle 750ml Insulated', sales: 6800, units: 180, buyBox: 92, conversion: 14 },
    { asin: 'B0DEMO004', name: 'LED Desk Lamp with USB Charging Port', sales: 5100, units: 150, buyBox: 100, conversion: 12 },
    { asin: 'B0DEMO005', name: 'Memory Foam Neck Pillow for Travel', sales: 3400, units: 95, buyBox: 88, conversion: 10 },
    { asin: 'B0DEMO006', name: 'Bamboo Cutting Board Set - 3 Pack', sales: 4200, units: 120, buyBox: 96, conversion: 15 },
    { asin: 'B0DEMO007', name: 'Yoga Mat Non-Slip Exercise Mat 6mm', sales: 2800, units: 78, buyBox: 94, conversion: 11 },
    { asin: 'B0DEMO008', name: 'Electric Coffee Grinder Stainless Steel', sales: 2000, units: 55, buyBox: 91, conversion: 9 },
  ];
  
  const today = new Date().toISOString().split('T')[0];
  
  return products.map((product) => ({
    childAsin: product.asin,
    productTitle: product.name,
    sales: product.sales,
    unitsSold: product.units,
    pageViews: Math.round(product.units / (product.conversion / 100)),
    buyBoxPercentage: product.buyBox,
    conversionRate: product.conversion,
    date: today,
    accountName: 'Demo Account',
    previousPeriod: {
      sales: product.sales * 0.92, // ~8% growth
      unitsSold: Math.round(product.units * 0.92),
      pageViews: Math.round((product.units * 0.92) / (product.conversion / 100)),
      buyBoxPercentage: product.buyBox - 1,
      conversionRate: product.conversion - 0.5,
    },
  }));
};

// Demo inventory data
export const generateDemoInventoryData = (): InventoryData[] => {
  return [
    { sku: 'DEMO-SKU-001', asin: 'B0DEMO001', productName: 'Premium Wireless Earbuds', quantity: 245, price: 35.99, fulfillmentType: 'FBA', accountName: 'Demo Account' },
    { sku: 'DEMO-SKU-002', asin: 'B0DEMO002', productName: 'Bluetooth Speaker Pro', quantity: 180, price: 33.49, fulfillmentType: 'FBA', accountName: 'Demo Account' },
    { sku: 'DEMO-SKU-003', asin: 'B0DEMO003', productName: 'Smart Watch Band Set', quantity: 320, price: 37.77, fulfillmentType: 'FBA', accountName: 'Demo Account' },
    { sku: 'DEMO-SKU-004', asin: 'B0DEMO004', productName: 'USB-C Fast Charger', quantity: 450, price: 34.00, fulfillmentType: 'FBA', accountName: 'Demo Account' },
    { sku: 'DEMO-SKU-005', asin: 'B0DEMO005', productName: 'Phone Case Bundle', quantity: 85, price: 35.79, fulfillmentType: 'FBM', accountName: 'Demo Account' },
    { sku: 'DEMO-SKU-006', asin: 'B0DEMO006', productName: 'Wireless Charging Pad', quantity: 200, price: 35.00, fulfillmentType: 'FBA', accountName: 'Demo Account' },
    { sku: 'DEMO-SKU-007', asin: 'B0DEMO007', productName: 'Laptop Stand Adjustable', quantity: 65, price: 35.90, fulfillmentType: 'FBA', accountName: 'Demo Account' },
    { sku: 'DEMO-SKU-008', asin: 'B0DEMO008', productName: 'Cable Organizer Kit', quantity: 150, price: 36.36, fulfillmentType: 'FBM', accountName: 'Demo Account' },
  ];
};
