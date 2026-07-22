export interface ASINDetailData {
  asin: string;
  productName: string;
  accountName: string;
  merchantToken: string;
  
  // Performance metrics
  performance: {
    sales: number;
    unitsSold: number;
    pageViews: number;
    buyBoxPercentage: number;
    conversionRate: number;
    previousPeriod?: {
      sales: number;
      unitsSold: number;
      pageViews: number;
      buyBoxPercentage: number;
      conversionRate: number;
    };
  };

  // Inventory data
  inventory: {
    sku: string;
    quantity: number;
    price: number;
    fulfillmentType: string;
    inventoryValue: number;
    stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  };

  // Historical data for charts (last 30 days)
  historicalData: Array<{
    date: string;
    sales: number;
    unitsSold: number;
    pageViews: number;
    buyBoxPercentage: number;
    conversionRate: number;
  }>;

  // Campaign data targeting this ASIN
  campaigns: Array<{
    campaignName: string;
    spend: number;
    sales: number;
    acos: number;
    clicks: number;
    impressions: number;
    ctr: number;
    cpc: number;
  }>;

  // Summary statistics
  summary: {
    totalSales30Days: number;
    averageDailySales: number;
    totalUnits30Days: number;
    averageDailyUnits: number;
    averageBuyBox30Days: number;
    averageConversion30Days: number;
    totalPageViews30Days: number;
  };
}

export interface ASINDetailState {
  isOpen: boolean;
  asin: string | null;
  data: ASINDetailData | null;
  loading: boolean;
  error: string | null;
}