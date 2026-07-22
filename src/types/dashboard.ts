
export interface AccountData {
  id: string;
  name: string;
  sales: number;
  ppcSpend: number;
  ppcSales: number;
  acos: number;
  tacos: number;
  unitsOrdered: number;
  pageViews: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  buyBoxPercentage: number;
  conversionRate: number;
  sellerCentralLink: string;
  merchantToken: string;
  ppcAccountName?: string; // New field for PPC account mapping
  ppc_sellername?: string | null; // Maps to sellername in NK_SP Search Term Report
  profileId?: number; // Amazon Ads API profile_id
  type: 'seller' | 'vendor'; // Account type
  status: 'active' | 'inactive';
  statusColor?: 'green' | 'yellow' | 'red'; // Traffic light status color
  isStarred: boolean;
  targets?: {
    sales?: number;
    ppcSpend?: number;
    ppcSales?: number;
    acos?: number;
    tacos?: number;
  };
  previousPeriod?: {
    sales: number;
    ppcSpend: number;
    ppcSales: number;
    acos: number;
    tacos: number;
    unitsOrdered: number;
    pageViews: number;
    impressions: number;
    clicks: number;
    cpc: number;
    ctr: number;
    buyBoxPercentage: number;
    conversionRate: number;
  };
  emailConfig?: {
    clientEmail: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    enabled: boolean;
    lastSent?: string;
  };
  alert_config?: {
    enabled: boolean;
    client_email: string | null;
    delivery_time: string;
    thresholds: {
      buy_box: number;
      conversion_rate_drop: number;
    };
    enabled_alert_types: string[];
  };
  clientAccessToken?: string; // For secure client-only URLs
  shareCode?: string; // For shareable URLs
}

export type DateFilter = 'last-7-days' | 'last-14-days' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'past-30-days' | 'this-year' | 'custom';

export interface CampaignData {
  id: string;
  accountName: string;
  campaignName: string;
  spend: number;
  sales: number;
  acos: number;
  alertType: 'excellent' | 'good' | 'warning' | 'danger' | 'neutral';
  alertMessage: string;
}

export interface ASINData {
  childAsin: string;
  sales: number;
  unitsSold: number;
  pageViews: number;
  buyBoxPercentage: number;
  conversionRate: number;
  date: string;
  accountName: string;
  productTitle?: string;
  shippedCogs?: number;
  shippedRevenue?: number;
  previousPeriod?: {
    sales: number;
    unitsSold: number;
    pageViews: number;
    buyBoxPercentage: number;
    conversionRate: number;
    shippedCogs?: number;
    shippedRevenue?: number;
  };
}

export interface ASINDataFallbackInfo {
  isFallback: boolean;
  latestAvailableDate: string;
  requestedRange: {
    from: string;
    to: string;
  };
  displayedRange: {
    from: string;
    to: string;
  };
}

export interface ASINDataProcessingResult {
  data: ASINData[];
  staleInfo: ASINDataFallbackInfo | null;
}

export interface InventoryData {
  sku: string;
  asin: string;
  productName: string;
  quantity: number;
  price: number;
  fulfillmentType: string;
  accountName: string;
}

export interface GoogleSheetsConfig {
  API_KEY: string;
  SHEET_ID: string;
  RANGE: string;
  PPC_RANGE: string;
  CAMPAIGNS_RANGE: string;
  ASIN_RANGE: string;
  INVENTORY_RANGE: string;
}
