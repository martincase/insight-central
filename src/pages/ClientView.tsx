import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useApiPpcData, type AdType } from '@/hooks/useApiPpcData';
import { calculatePeriodData, getCurrentDateRange, getPreviousDateRange } from '@/utils/dataProcessor';
import { detectMissingDates, getASINFallbackInfo, getVendorCurrentDateRange } from '@/utils/asinProcessor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { getDateDisplayText, formatDateRangeText } from '@/utils/dateUtils';
import { updateAccountsWithFilteredData } from '@/utils/dataProcessor';
import { fetchAccountsFromSheet } from '@/utils/accountsProcessor';
import { fetchVendorData } from '@/utils/vendorProcessor';
import { fetchASINDataFromSupabase, fetchVendorDataFromSupabase } from '@/utils/supabaseDataFetchers';
import { fetchInventoryData, processInventoryData } from '@/utils/inventoryProcessor';
import { getCountryInfo } from '@/utils/countryUtils';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { DateFilterSelector } from '@/components/dashboard/DateFilterSelector';
import { SalesHeatmap } from '@/components/dashboard/SalesHeatmap';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { MonthlyPerformanceView } from '@/components/dashboard/MonthlyPerformanceView';
import { MonthlyPerformanceTable } from '@/components/dashboard/MonthlyPerformanceTable';
import { InventoryTable } from '@/components/dashboard/InventoryTable';
import { ASINDataTable } from '@/components/dashboard/ASINDataTable';
import { ScreenshotEmailButton } from '@/components/dashboard/ScreenshotEmailButton';
import { ShareableLink } from '@/components/dashboard/ShareableLink';
import { TopSearchTermsDashboard } from '@/components/ppc-analytics/TopSearchTermsDashboard';
import { KeywordThemesDashboard } from '@/components/ppc-analytics/KeywordThemesDashboard';
import { SearchTermKeywordMapDashboard } from '@/components/ppc-analytics/SearchTermKeywordMapDashboard';
import { BrandAnalyticsDashboard } from '@/components/ppc-analytics/BrandAnalyticsDashboard';
import { ProductFinancialDashboard } from '@/components/dashboard/ProductFinancialDashboard';
import { ApiSearchTermsDashboard } from '@/components/ppc-analytics/ApiSearchTermsDashboard';
import { DisabledFeatureOverlay } from '@/components/dashboard/DisabledFeatureOverlay';
import { BuyBoxAlertsCard } from '@/components/dashboard/BuyBoxAlertsCard';
import { CollapsibleAlerts } from '@/components/dashboard/CollapsibleAlerts';
import { PerformanceExportButton } from '@/components/dashboard/PerformanceExportButton';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';
import { Calendar, Download, Map, BarChart3, Search, TrendingUp, DollarSign, Package } from 'lucide-react';
import { ApiAdvertisedProductsDashboard } from '@/components/ppc-analytics/ApiAdvertisedProductsDashboard';
import { InventoryPlannerDashboard } from '@/components/dashboard/InventoryPlannerDashboard';
import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import type { AccountData, DateFilter, InventoryData, ASINData } from '@/types/dashboard';
import { Link } from 'react-router-dom';
import { 
  SalesHeatmapSkeleton, 
  MetricsGridSkeleton, 
  MonthlyPerformanceSkeleton, 
  TableSkeleton,
  PPCDashboardSkeleton 
} from '@/components/dashboard/DashboardSkeletons';
import { AIAnalystChat } from '@/components/dashboard/AIAnalystChat';

type ClientTab = 'performance' | 'search-terms' | 'advertised-products' | 'brand-analytics' | 'profit-loss' | 'inventory-planner';

const ClientView = () => {
  const { accountId, token } = useParams<{ accountId: string; token: string }>();
  const { isEnabled, getMessageType, getFeatureName, isLoading: featuresLoading } = useFeatureVisibility();
  
  console.log('ClientView loaded with params:', { accountId, token });
  
  const [account, setAccount] = useState<AccountData | null>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [ppcData, setPpcData] = useState<any[]>([]);
  const [vendorData, setVendorData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryData[]>([]);
  const [asinData, setAsinData] = useState<ASINData[]>([]);
  const [rawAsinData, setRawAsinData] = useState<any[]>([]);
  const [rawVendorData, setRawVendorData] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('last-14-days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedChartMetrics, setSelectedChartMetrics] = useState<string[]>(['sales', 'ppcSales']);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>('performance');
  const [adType, setAdType] = useState<AdType>('all');
  // API PPC data hook - fetches from Amazon Advertising API tables
  const { metrics: apiPpcMetrics, previousMetrics: apiPpcPreviousMetrics, isLoading: apiPpcLoading } = useApiPpcData({
    accountName: account?.name || '',
    dateFilter,
    customDateRange,
    adType,
  });

  // Compute direct organic metrics from raw sheetData
  const directOrganicMetrics = useMemo(() => {
    if (sheetData.length === 0 || !account) return null;
    const currentRange = getCurrentDateRange(dateFilter, customDateRange);
    const data = calculatePeriodData(sheetData, ppcData, account.merchantToken, account.ppcAccountName, currentRange);
    return {
      sales: data.sales || 0,
      ppcSpend: data.ppcSpend || 0,
      ppcSales: data.ppcSales || 0,
      unitsOrdered: data.unitsOrdered || 0,
      pageViews: data.pageViews || 0,
      buyBoxPercentage: data.buyBoxPercentage || 0,
      conversionRate: data.conversionRate || 0,
      impressions: data.impressions || 0,
      clicks: data.clicks || 0,
      cpc: data.cpc || 0,
      ctr: data.ctr || 0,
      acos: data.acos || 0,
      tacos: data.sales > 0 ? (data.ppcSpend / data.sales) * 100 : 0,
    };
  }, [sheetData, ppcData, account, dateFilter, customDateRange]);

  const directOrganicPreviousMetrics = useMemo(() => {
    if (sheetData.length === 0 || !account) return null;
    const previousRange = getPreviousDateRange(dateFilter, customDateRange);
    const data = calculatePeriodData(sheetData, ppcData, account.merchantToken, account.ppcAccountName, previousRange);
    return {
      sales: data.sales || 0,
      ppcSpend: data.ppcSpend || 0,
      ppcSales: data.ppcSales || 0,
      unitsOrdered: data.unitsOrdered || 0,
      pageViews: data.pageViews || 0,
      buyBoxPercentage: data.buyBoxPercentage || 0,
      conversionRate: data.conversionRate || 0,
      impressions: data.impressions || 0,
      clicks: data.clicks || 0,
      cpc: data.cpc || 0,
      ctr: data.ctr || 0,
      acos: data.acos || 0,
      tacos: data.sales > 0 ? (data.ppcSpend / data.sales) * 100 : 0,
    };
  }, [sheetData, ppcData, account, dateFilter, customDateRange]);

  useEffect(() => {
    loadClientData();
  }, [accountId, token]);

  useEffect(() => {
    if (account && sheetData.length > 0) {
      const updatedAccounts = updateAccountsWithFilteredData([account], sheetData, ppcData, dateFilter, customDateRange, vendorData);
      setAccount(updatedAccounts[0]);
    }
  }, [dateFilter, customDateRange]);

  const loadClientData = async () => {
    console.log('loadClientData called with:', { accountId, token });
    
    if (!accountId || !token) {
      console.error('Missing accountId or token:', { accountId, token });
      setError('Invalid client link');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('ClientView: Loading data for accountId:', accountId, 'token:', token);
      
      // Fetch all accounts to find the matching one
      const accounts = await fetchAccountsFromSheet();
      console.log('ClientView: Fetched accounts from sheet:', accounts.length);
      
      // Since localStorage is isolated in client view, we need to validate tokens differently
      // We'll check if the account exists and if the token format is valid
      const potentialAccount = accounts.find(acc => 
        acc.id === accountId || acc.merchantToken === accountId
      );

      console.log('ClientView: Looking for account with ID:', accountId);
      console.log('ClientView: Potential account found:', !!potentialAccount);

      if (!potentialAccount) {
        console.error('ClientView: No account found with ID:', accountId);
        setError('Access denied. Account not found.');
        setIsLoading(false);
        return;
      }

      // For now, we'll accept any valid token format (32 characters alphanumeric)
      // In production, you'd want to validate this against a server-side database
      const isValidTokenFormat = token && token.length === 32 && /^[a-zA-Z0-9]+$/.test(token);
      
      if (!isValidTokenFormat) {
        console.error('ClientView: Invalid token format:', token);
        setError('Access denied. Invalid token format.');
        setIsLoading(false);
        return;
      }

      console.log('ClientView: Token format is valid, proceeding with account:', potentialAccount.name);
      console.log('ClientView: Setting single account:', potentialAccount);
      console.log('ClientView: Account type:', potentialAccount.type);
      setAccount(potentialAccount);
      setIsLoading(false); // Show layout immediately with skeletons

      // Fetch all data in parallel
      const [
        fetchedVendorData,
        fetchedInventoryData,
        salesResponse,
        ppcResponse,
        asinDataValues,
        supabaseVendorValues
      ] = await Promise.all([
        fetchVendorData(),
        fetchInventoryData(),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.PPC_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`),
        fetchASINDataFromSupabase().catch(err => { console.error('ASIN fetch error:', err); return []; }),
        fetchVendorDataFromSupabase().catch(err => { console.error('Vendor Supabase fetch error:', err); return []; })
      ]);

      // Process vendor data
      console.log('ClientView: Fetched vendor data rows:', fetchedVendorData.length);
      if (potentialAccount.type === 'vendor') {
        console.log('ClientView: Processing vendor account:', {
          accountName: potentialAccount.name,
          merchantToken: potentialAccount.merchantToken,
        });
      }
      setVendorData(fetchedVendorData);

      // Process inventory data
      console.log('ClientView: Fetched inventory data rows:', fetchedInventoryData.length);
      const processedInventoryData = processInventoryData(fetchedInventoryData, potentialAccount.merchantToken);
      setInventoryData(processedInventoryData);

      // Process sales data
      let salesValues: any[] = [];
      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        salesValues = salesData.values || [];
      }
      setSheetData(salesValues);

      // Process PPC data
      let ppcDataValues: any[] = [];
      if (ppcResponse.ok) {
        const ppcDataResponse = await ppcResponse.json();
        ppcDataValues = ppcDataResponse.values || [];
      }
      setPpcData(ppcDataValues);

      // Process ASIN data from Supabase
      const { processASINData } = await import('@/utils/asinProcessor');
      const processedAsinData = processASINData(asinDataValues, potentialAccount.merchantToken, dateFilter, customDateRange, supabaseVendorValues);
      setAsinData(processedAsinData);
      setRawAsinData(asinDataValues);
      setRawVendorData(supabaseVendorValues);

      // Update account with current data
      const updatedAccounts = updateAccountsWithFilteredData([potentialAccount], salesValues, ppcDataValues, dateFilter, customDateRange, fetchedVendorData);
      setAccount(updatedAccounts[0]);
      setIsDataLoading(false);

    } catch (error) {
      console.error('Error loading client data:', error);
      setError('Failed to load account data. Please try again later.');
      setIsLoading(false);
      setIsDataLoading(false);
    }
  };

  // Detect missing dates for this account
  const clientASINStaleInfo = useMemo(() => {
    if (!account) return null;
    const dataSource = account.merchantToken.startsWith('amzn1.vg') ? rawVendorData : rawAsinData;
    return getASINFallbackInfo(dataSource, account.merchantToken, dateFilter, customDateRange, rawVendorData);
  }, [rawAsinData, rawVendorData, account, dateFilter, customDateRange]);

  const clientMissingDates = useMemo(() => {
    if (!account || clientASINStaleInfo?.isFallback) return [];
    const isVendor = account.merchantToken.startsWith('amzn1.vg');
    const dataSource = isVendor ? rawVendorData : rawAsinData;
    if (!dataSource || dataSource.length === 0) return [];
    if (typeof dataSource[0] !== 'object' || !('merchant_token' in dataSource[0])) return [];
    const dateRange = isVendor
      ? getVendorCurrentDateRange(dateFilter, customDateRange)
      : getCurrentDateRange(dateFilter, customDateRange);
    return detectMissingDates(dataSource, account.merchantToken, dateRange);
  }, [rawAsinData, rawVendorData, account, dateFilter, customDateRange, clientASINStaleInfo]);

  const toggleChartMetric = (metricKey: string) => {
    setSelectedChartMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  const handleDateFilterChange = (value: DateFilter) => {
    setDateFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  // Helper function to render feature with visibility check
  const renderFeature = (featureKey: string, content: React.ReactNode) => {
    if (isEnabled(featureKey)) {
      return content;
    }
    return (
      <DisabledFeatureOverlay
        featureName={getFeatureName(featureKey)}
        messageType={getMessageType(featureKey)}
      >
        {content}
      </DisabledFeatureOverlay>
    );
  };

  if ((isLoading && !account) || featuresLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact your account manager for a valid dashboard link.
          </p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Account not found</p>
        </div>
      </div>
    );
  }

  const countryInfo = getCountryInfo(account.merchantToken);

  return (
    <div id="client-dashboard" className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-3 py-4 md:px-6 md:py-8 pb-24">
        {/* Client Header - Matching main dashboard design */}
        <div className="rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          {/* Top Row - Gradient section */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-3 md:px-6 md:py-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3 md:gap-6">
                <img 
                  src="/uploads/MC-Logo-WHITE.png" 
                  alt="Martin Case Logo" 
                  className="h-8 md:h-14 w-auto"
                />
                <div className="hidden md:block border-l-2 border-white/30 pl-6">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Amazon Performance Dashboard
                  </h1>
                </div>
                <h1 className="md:hidden text-base font-bold text-white">
                  Amazon Dashboard
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                <DateFilterSelector
                  dateFilter={dateFilter}
                  customDateRange={customDateRange}
                  onDateFilterChange={handleDateFilterChange}
                  onCustomDateRangeChange={setCustomDateRange}
                  getDateDisplayText={() => getDateDisplayText(dateFilter, customDateRange)}
                />
              </div>
            </div>
          </div>
          
          {/* Focused Account Section */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 md:px-6 md:py-4 border-t border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {countryInfo.flagImage && (
                  <img 
                    src={countryInfo.flagImage} 
                    alt={countryInfo.name} 
                    className="w-8 h-5 md:w-10 md:h-7 object-cover rounded-sm shadow-sm" 
                  />
                )}
                <div className="flex flex-col">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">
                    {account.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      account.type === 'vendor' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {account.type === 'vendor' ? 'Vendor' : 'Seller'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {countryInfo?.name || 'Unknown Country'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/roadmap">
                    <Map className="h-4 w-4 mr-2" />
                    View Roadmap
                  </Link>
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts are now inside Performance tab as collapsible */}

        {/* Sticky Tab Bar */}
        <div className="sticky top-0 z-30 bg-gradient-to-br from-blue-50 to-cyan-50 pt-2 pb-4 -mx-3 px-3 md:-mx-6 md:px-6">
          <div className="flex items-center gap-1 md:gap-2 p-1 md:p-1.5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto scrollbar-hide">
            {([
              { key: 'performance' as ClientTab, label: 'Performance', icon: <BarChart3 className="h-4 w-4" /> },
              { key: 'search-terms' as ClientTab, label: 'Search Terms', icon: <Search className="h-4 w-4" /> },
              { key: 'advertised-products' as ClientTab, label: 'Ad Products', icon: <Package className="h-4 w-4" /> },
              { key: 'brand-analytics' as ClientTab, label: 'Brand Analytics', icon: <TrendingUp className="h-4 w-4" /> },
              { key: 'profit-loss' as ClientTab, label: 'Profit & Loss', icon: <DollarSign className="h-4 w-4" /> },
              { key: 'inventory-planner' as ClientTab, label: '📦 Inventory Planner', icon: <Package className="h-4 w-4" /> },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap min-w-0 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <div className="space-y-8">
            {/* Collapsible Alerts */}
            <CollapsibleAlerts
              merchantToken={account.merchantToken}
              accountName={account.name}
              hideConfigButton={true}
            />

            {/* Daily Performance Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Daily Performance</h2>
                  <p className="text-sm text-muted-foreground">Sales and advertising activity by day</p>
                </div>
                <PerformanceExportButton accounts={[account]} dateFilter={dateFilter} />
              </div>
              {isDataLoading ? (
                <SalesHeatmapSkeleton />
              ) : sheetData.length > 0 ? (
                renderFeature('sales_heatmap', 
                  <SalesHeatmap 
                    accounts={[account]} 
                    sheetData={sheetData} 
                    ppcData={ppcData}
                    vendorData={vendorData}
                    isBlurred={false}
                    onFocusAccount={() => {}}
                    dateFilter={dateFilter}
                    customDateRange={customDateRange}
                  />
                )
              ) : null}
            </section>

            {/* Key Metrics Section */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Key Metrics</h2>
                <p className="text-sm text-muted-foreground">Overview of sales, PPC, and performance indicators</p>
              </div>
              {isDataLoading ? (
                <MetricsGridSkeleton />
              ) : (
                renderFeature('metrics_grid',
                  <MetricsGrid 
                    displayedAccounts={[account]} 
                    focusedAccount={account} 
                    selectedChartMetrics={selectedChartMetrics}
                    onToggleChartMetric={toggleChartMetric}
                    apiPpcMetrics={apiPpcMetrics}
                    apiPpcPreviousMetrics={apiPpcPreviousMetrics}
                    apiPpcLoading={apiPpcLoading}
                    adType={adType}
                    onAdTypeChange={setAdType}
                    directOrganicMetrics={directOrganicMetrics}
                    directOrganicPreviousMetrics={directOrganicPreviousMetrics}
                    dateFilter={dateFilter}
                  />
                )
              )}
            </section>

            {/* Monthly Trends Section */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Performance Trends</h2>
                <p className="text-sm text-muted-foreground">
                  {['last-7-days', 'last-14-days', 'yesterday', 'this-week', 'last-week'].includes(dateFilter) ? 'Daily performance over selected period' : 'Historical performance over time'}
                </p>
              </div>
              {isDataLoading ? (
                <MonthlyPerformanceSkeleton />
              ) : (
                renderFeature('monthly_performance_view',
                  <MonthlyPerformanceView 
                    accountName={account.name} 
                    merchantToken={account.merchantToken}
                    selectedMetrics={selectedChartMetrics}
                    onToggleMetric={toggleChartMetric}
                    dateFilter={dateFilter}
                    customDateRange={customDateRange}
                  />
                )
              )}
            </section>

            {/* Monthly Performance Table */}
            <section>
              {isDataLoading ? (
                <TableSkeleton rows={6} />
              ) : (
                renderFeature('monthly_performance_table',
                  <MonthlyPerformanceTable 
                    merchantToken={account.merchantToken}
                    accountName={account.name}
                  />
                )
              )}
            </section>

            {/* Product Performance Section */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Product Performance</h2>
                <p className="text-sm text-muted-foreground">Individual ASIN sales and metrics</p>
              </div>
              {isDataLoading ? (
                <TableSkeleton rows={8} />
              ) : (
                renderFeature('asin_performance',
                  <ASINDataTable 
                    asinData={asinData}
                    isBlurred={false}
                    dateFilter={dateFilter}
                    customDateRange={customDateRange}
                    accountMerchantToken={account.merchantToken}
                    hideBuyBoxAndConversion={true}
                    missingDates={clientMissingDates}
                    staleInfo={clientASINStaleInfo}
                  />
                )
              )}
            </section>

            {/* Stock Levels Section */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Stock Levels</h2>
                <p className="text-sm text-muted-foreground">Current inventory and pricing</p>
              </div>
              {renderFeature('inventory_table',
                <InventoryTable 
                  inventoryData={inventoryData} 
                  merchantToken={account.merchantToken}
                  comingSoon={false}
                />
              )}
            </section>
          </div>
        )}

        {/* SEARCH TERMS TAB */}
        {activeTab === 'search-terms' && (
          <div className="space-y-8">
            <ApiSearchTermsDashboard accountName={account.name} dateFilter={dateFilter} customDateRange={customDateRange} />
            {renderFeature('keyword_themes',
              <KeywordThemesDashboard sellerFilter={account.ppc_sellername || account.name} />
            )}
            {renderFeature('search_term_keyword_map',
              <SearchTermKeywordMapDashboard sellerFilter={account.ppc_sellername || account.name} />
            )}
          </div>
        )}

        {/* ADVERTISED PRODUCTS TAB */}
        {activeTab === 'advertised-products' && (
          <div className="space-y-8">
            <ApiAdvertisedProductsDashboard accountName={account.name} />
          </div>
        )}

        {/* BRAND ANALYTICS TAB */}
        {activeTab === 'brand-analytics' && (
          <div className="space-y-8">
            <BrandAnalyticsDashboard accountName={account.name} />
          </div>
        )}

        {/* PROFIT & LOSS TAB */}
        {activeTab === 'profit-loss' && (
          <div className="space-y-8">
            <ProductFinancialDashboard accountName={account.name} />
          </div>
        )}

        {/* INVENTORY PLANNER TAB */}
        {activeTab === 'inventory-planner' && (
          <div className="space-y-8">
            <InventoryPlannerDashboard 
              merchantToken={account.merchantToken}
              accountName={account.name}
              accountType={account.type}
              asinData={asinData}
              asinStaleInfo={clientASINStaleInfo}
            />
          </div>
        )}

        {/* Branded Footer */}
        <div className="text-center py-8 border-t border-gray-200 mt-12">
          <p className="text-sm text-gray-500">
            © 2026 Martin Case Limited
          </p>
        </div>
      </div>
      <AIAnalystChat 
        accountName={account?.name}
        merchantToken={account?.merchantToken}
      />
    </div>
  );
};

export default ClientView;
