import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import { RefreshCw, ExternalLink, Copy, Share, Database, Upload, Download, RotateCw } from 'lucide-react';
import { generateShareCode, generateShareUrl } from '@/utils/shareUtils';
import { toast } from 'sonner';
import type { AccountData } from '@/types/dashboard';
import DataGapWarnings from '@/components/dashboard/DataGapWarnings';
import { TestEmailButton } from '@/components/dashboard/TestEmailButton';
import { AdminRoadmap } from '@/components/dashboard/AdminRoadmap';
import { FeatureVisibilityTab } from '@/components/admin/FeatureVisibilityTab';
import { AccountMappingTab } from '@/components/admin/AccountMappingTab';
import { MarketplacesTab } from '@/components/admin/MarketplacesTab';
import { EventsAdminTab } from '@/components/admin/EventsAdminTab';
import { supabase } from '@/integrations/supabase/client';

interface DataSourceInfo {
  name: string;
  range: string;
  description: string;
  sheetId?: string;
  sheetName?: string;
  metrics: Array<{
    metric: string;
    column: string;
    columnIndex: number;
    description: string;
  }>;
}

const AdminView = () => {
  const { isStaff, loading: authLoading } = useAuth();
  if (!authLoading && !isStaff) return <Navigate to="/" replace />;
  const [sampleData, setSampleData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [dataQualityRefreshTrigger, setDataQualityRefreshTrigger] = useState(0);

  const dataSources: DataSourceInfo[] = [
    {
      name: 'Sales Data (Daily Sales)',
      range: GOOGLE_SHEETS_CONFIG.RANGE,
      description: 'Main sales and traffic data from Seller Central',
      sheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
      sheetName: 'Main Dashboard Sheet',
      metrics: [
        { metric: 'Sales', column: 'sales_and_traffic_report_by_date__salesbydate_orderedproductsales_amount', columnIndex: 5, description: 'Total sales amount' },
        { metric: 'Units Ordered', column: 'sales_and_traffic_report_by_date__salesbydate_unitsordered', columnIndex: 7, description: 'Total units sold' },
        { metric: 'Page Views', column: 'sales_and_traffic_report_by_date__trafficbydate_browserpageviews', columnIndex: 9, description: 'Total page views' },
        { metric: 'Buy Box %', column: 'sales_and_traffic_report_by_date__trafficbydate_buyboxpercentage', columnIndex: 10, description: 'Buy box percentage' },
        { metric: 'Conversion Rate', column: 'sales_and_traffic_report_by_date__trafficbydate_unitsessionpercentage', columnIndex: 12, description: 'Unit session percentage' },
      ]
    },
    {
      name: 'PPC Data (Daily PPC V2)',
      range: GOOGLE_SHEETS_CONFIG.PPC_RANGE,
      description: 'PPC advertising data',
      sheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
      sheetName: 'Main Dashboard Sheet',
      metrics: [
        { metric: 'PPC Sales', column: 'sponsored_products_campaign__attributedsales14d', columnIndex: 5, description: 'PPC attributed sales (14-day)' },
        { metric: 'PPC Spend', column: 'sponsored_products_campaign__cost', columnIndex: 6, description: 'Total PPC spend/cost' },
      ]
    },
    {
      name: 'Campaign Data (PPC Campaigns)',
      range: GOOGLE_SHEETS_CONFIG.CAMPAIGNS_RANGE,
      description: 'Detailed campaign performance data',
      sheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
      sheetName: 'Main Dashboard Sheet',
      metrics: [
        { metric: 'Campaign Name', column: 'sponsored_products_campaign__campaign', columnIndex: 4, description: 'Campaign name' },
        { metric: 'Cost', column: 'sponsored_products_campaign__cost', columnIndex: 5, description: 'Campaign cost' },
        { metric: 'Clicks', column: 'sponsored_products_campaign__clicks', columnIndex: 6, description: 'Total clicks' },
        { metric: 'CPC', column: 'sponsored_products_campaign__cpc', columnIndex: 7, description: 'Cost per click' },
        { metric: 'CTR', column: 'sponsored_products_campaign__ctr', columnIndex: 8, description: 'Click-through rate' },
        { metric: 'Impressions', column: 'sponsored_products_campaign__impressions', columnIndex: 9, description: 'Total impressions' },
        { metric: 'Sales', column: 'sponsored_products_campaign__attributedsales14d', columnIndex: 12, description: 'Attributed sales' },
      ]
    },
    {
      name: 'ASIN Data (New Sheet)',
      range: GOOGLE_SHEETS_CONFIG.ASIN_SHEET_RANGE,
      description: 'Product-level (ASIN) sales data from new sheet',
      sheetId: GOOGLE_SHEETS_CONFIG.ASIN_SHEET_ID,
      sheetName: 'ASIN Sales Sheet',
      metrics: [
        { metric: 'Child ASIN', column: 'sales_and_traffic_report_by_date__childasin', columnIndex: 4, description: 'Child ASIN' },
        { metric: 'Parent ASIN', column: 'sales_and_traffic_report_by_date__parentasin', columnIndex: 5, description: 'Parent ASIN' },
        { metric: 'Sales Amount', column: 'sales_and_traffic_report_by_date__salesbyasin_orderedproductsales_amount', columnIndex: 6, description: 'ASIN sales amount' },
        { metric: 'Units Ordered', column: 'sales_and_traffic_report_by_date__salesbyasin_unitsordered', columnIndex: 8, description: 'ASIN units ordered' },
        { metric: 'Page Views', column: 'sales_and_traffic_report_by_date__trafficbyasin_browserpageviews', columnIndex: 9, description: 'ASIN page views' },
      ]
    },
    {
      name: 'Vendor Data (Vendor)',
      range: GOOGLE_SHEETS_CONFIG.VENDOR_SHEET_RANGE,
      description: 'Vendor sales data from new sheet',
      sheetId: GOOGLE_SHEETS_CONFIG.VENDOR_SHEET_ID,
      sheetName: 'Vendor Sales Sheet',
      metrics: [
        { metric: 'Shipped COGS', column: 'vendor_sales_report__shippedcogs_amount', columnIndex: 4, description: 'Shipped cost of goods sold' },
        { metric: 'Shipped Units', column: 'vendor_sales_report__shippedunits', columnIndex: 6, description: 'Shipped units count' },
      ]
    },
    {
      name: 'FBM Inventory Data (New Sheet)',
      range: GOOGLE_SHEETS_CONFIG.FBM_INVENTORY_RANGE,
      description: 'FBM inventory levels and status from new sheet',
      sheetId: GOOGLE_SHEETS_CONFIG.FBM_INVENTORY_SHEET_ID,
      sheetName: 'FBM Inventory Sheet',
      metrics: [
        { metric: 'Date', column: 'date', columnIndex: 0, description: 'Record date' },
        { metric: 'Data Source', column: 'datasource', columnIndex: 1, description: 'Data source' },
        { metric: 'Source', column: 'source', columnIndex: 2, description: 'Source identifier' },
        { metric: 'Account Name', column: 'account_name', columnIndex: 3, description: 'Account/merchant token' },
        { metric: 'Quantity', column: 'merchant_listings_all_data__quantity', columnIndex: 4, description: 'Available inventory quantity' },
        { metric: 'ASIN', column: 'merchant_listings_all_data__asin1', columnIndex: 5, description: 'Amazon ASIN' },
        { metric: 'Product Name', column: 'merchant_listings_all_data__item_name', columnIndex: 6, description: 'Product title' },
        { metric: 'SKU', column: 'merchant_listings_all_data__seller_sku', columnIndex: 7, description: 'Seller SKU' },
        { metric: 'Price', column: 'merchant_listings_all_data__price', columnIndex: 8, description: 'Product price' },
      ]
    },
    {
      name: 'FBA Inventory Data (FBA Inventory)',
      range: GOOGLE_SHEETS_CONFIG.FBA_INVENTORY_RANGE,
      description: 'FBA inventory levels and status',
      sheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
      sheetName: 'Main Dashboard Sheet',
      metrics: [
        { metric: 'Date', column: 'date', columnIndex: 0, description: 'Record date' },
        { metric: 'Data Source', column: 'datasource', columnIndex: 1, description: 'Data source' },
        { metric: 'Source', column: 'source', columnIndex: 2, description: 'Source identifier' },
        { metric: 'Account Name', column: 'account_name', columnIndex: 3, description: 'Account/merchant token' },
        { metric: 'Quantity', column: 'restock_inventory_recommendations_report__available', columnIndex: 4, description: 'Available inventory for restocking' },
        { metric: 'ASIN', column: 'restock_inventory_recommendations_report__asin', columnIndex: 5, description: 'Amazon ASIN from FBA inventory' },
        { metric: 'Product Name', column: 'product-name', columnIndex: 6, description: 'Product title' },
        { metric: 'SKU', column: 'sku', columnIndex: 7, description: 'Seller SKU' },
        { metric: 'Price', column: 'your-price', columnIndex: 8, description: 'Product price' },
        { metric: 'Fulfillment Channel', column: 'All items in this report = FBA', columnIndex: 9, description: 'Items appearing in FBA report are FBA fulfilled' },
      ]
    },
    {
      name: 'Accounts (Accounts)',
      range: GOOGLE_SHEETS_CONFIG.ACCOUNTS_RANGE,
      description: 'Account master data and configuration',
      sheetId: GOOGLE_SHEETS_CONFIG.SHEET_ID,
      sheetName: 'Main Dashboard Sheet',
      metrics: [
        { metric: 'Account Name', column: 'Account Name', columnIndex: 0, description: 'Account display name' },
        { metric: 'Merchant Token', column: 'Merchant Token', columnIndex: 1, description: 'Unique merchant identifier' },
        { metric: 'PPC Account Name', column: 'PPC Account Name', columnIndex: 2, description: 'PPC account identifier' },
        { metric: 'Type', column: 'Type', columnIndex: 3, description: 'Account type (Seller/Vendor)' },
      ]
    }
  ];

  const fetchSampleData = async () => {
    setLoading(true);
    try {
      const promises = dataSources.map(async (source) => {
        // Use different sheet ID for ASIN data, Vendor data, and FBM Inventory data
        let sheetId = GOOGLE_SHEETS_CONFIG.SHEET_ID;
        let range = source.range;
        
        if (source.name.includes('ASIN Data')) {
          sheetId = GOOGLE_SHEETS_CONFIG.ASIN_SHEET_ID;
          range = GOOGLE_SHEETS_CONFIG.ASIN_SHEET_RANGE;
        } else if (source.name.includes('Vendor Data')) {
          sheetId = GOOGLE_SHEETS_CONFIG.VENDOR_SHEET_ID;
          range = GOOGLE_SHEETS_CONFIG.VENDOR_SHEET_RANGE;
        } else if (source.name.includes('FBM Inventory Data (New Sheet)')) {
          sheetId = GOOGLE_SHEETS_CONFIG.FBM_INVENTORY_SHEET_ID;
          range = GOOGLE_SHEETS_CONFIG.FBM_INVENTORY_RANGE;
        }
        
        console.log(`Fetching ${source.name} from sheet ${sheetId}, range ${range}`);
        
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`
        );
        const data = await response.json();
        
        if (!response.ok) {
          console.error(`Error fetching ${source.name}:`, data);
          return { name: source.name, data: [] };
        }
        
        console.log(`${source.name} fetched: ${data.values?.length || 0} rows`);
        return { name: source.name, data: data.values || [] };
      });

      const results = await Promise.all(promises);
      const sampleDataMap: Record<string, any[]> = {};
      results.forEach(result => {
        sampleDataMap[result.name] = result.data.slice(0, 5); // First 5 rows including header
      });
      setSampleData(sampleDataMap);
    } catch (error) {
      console.error('Error fetching sample data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSampleData();
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    const storedAccounts = JSON.parse(localStorage.getItem('dashboard_accounts') || '[]');
    
    // Auto-generate share codes for accounts that don't have one
    let hasChanges = false;
    const updatedAccounts = storedAccounts.map((account: AccountData) => {
      if (!account.shareCode) {
        hasChanges = true;
        return { ...account, shareCode: generateShareCode() };
      }
      return account;
    });
    
    // Save back to localStorage if we generated new codes
    if (hasChanges) {
      localStorage.setItem('dashboard_accounts', JSON.stringify(updatedAccounts));
      setAccounts(updatedAccounts);
    } else {
      setAccounts(storedAccounts);
    }
  };

  // Manual inventory sync trigger for testing
  const triggerInventorySync = async () => {
    try {
      console.log('🚀 Triggering inventory sync...');
      toast.loading('Syncing inventory data...');
      
      const { data, error } = await supabase.functions.invoke('daily-inventory-sync');
      
      if (error) {
        console.error('❌ Sync error:', error);
        toast.error('Sync failed: ' + error.message);
        return;
      }
      
      console.log('✅ Sync completed:', data);
      toast.success('Inventory sync completed! FBA data should now be available.');
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      toast.error('Sync failed: ' + error.message);
    }
  };

  const regenerateShareCodeForAccount = (accountId: string) => {
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === accountId) {
        return { ...acc, shareCode: generateShareCode() };
      }
      return acc;
    });
    
    setAccounts(updatedAccounts);
    localStorage.setItem('dashboard_accounts', JSON.stringify(updatedAccounts));
    toast.success('New share code generated!');
  };

  const copyShareUrl = async (account: AccountData) => {
    if (!account.shareCode) {
      return;
    }

    const shareUrl = `${window.location.origin}/${account.name.toLowerCase().trim().replace(/\s+/g, '')}/${account.shareCode}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(`Share link copied for ${account.name}!`);
    } catch (error) {
      toast.error('Failed to copy share link');
    }
  };

  const copyAllShareUrls = async () => {
    const accountsWithCodes = accounts.filter(acc => acc.shareCode);
    if (accountsWithCodes.length === 0) {
      toast.error('No share codes available to copy');
      return;
    }

    const urls = accountsWithCodes.map(account => 
      `${window.location.origin}/${account.name.toLowerCase().trim().replace(/\s+/g, '')}/${account.shareCode}`
    );
    
    try {
      await navigator.clipboard.writeText(urls.join('\n'));
      toast.success(`Copied ${urls.length} share links!`);
    } catch (error) {
      toast.error('Failed to copy share links');
    }
  };

  const downloadShareLinks = () => {
    const accountsWithCodes = accounts.filter(acc => acc.shareCode);
    
    if (accountsWithCodes.length === 0) {
      toast.error('No share codes available to download');
      return;
    }

    const csvHeader = 'Account Name,Share Code,Share URL\n';
    const csvRows = accountsWithCodes.map(account => {
      const shareUrl = `${window.location.origin}/${account.name.toLowerCase().trim().replace(/\s+/g, '')}/${account.shareCode}`;
      return `"${account.name}","${account.shareCode}","${shareUrl}"`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `account-share-links-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${accountsWithCodes.length} share links!`);
  };

  const openGoogleSheet = (range: string, sheetId?: string) => {
    if (sheetId) {
      // Open the specific sheet directly
      window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, '_blank');
      return;
    }

    // Fallback to old method for main sheet tabs
    const sheetName = range.split('!')[0];
    let gid = '';
    
    // Map sheet names to GIDs for main sheet
    const gidMap: Record<string, string> = {
      'Daily Sales': '2018034977',
      'Daily PPC V2': '855504408',
      'PPC Campaigns': '1234567890',
      'Vendor': '1234567892',
      'Inventory': '1234567893', 
      'Accounts': '1234567894',
      'FBA Inventory': '1234567895',
    };
    
    gid = gidMap[sheetName] || '0';
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/edit#gid=${gid}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Data source mapping and column configuration
            </p>
          </div>
          <div className="flex gap-2">
            <TestEmailButton />
            <Button 
              onClick={() => window.open('/manual-data-upload.html', '_blank')} 
              variant="outline"
              className="bg-green-50 hover:bg-green-100 border-green-200"
            >
              <Upload className="h-4 w-4 mr-2" />
              Manual Data Upload
            </Button>
            <Button 
              onClick={triggerInventorySync} 
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <Database className="h-4 w-4 mr-2" />
              Sync Inventory
            </Button>
            <Button onClick={fetchSampleData} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Sample Data
            </Button>
            <Button 
              onClick={() => setDataQualityRefreshTrigger(prev => prev + 1)} 
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data Quality
            </Button>
          </div>
        </div>

        <Tabs defaultValue="mapping" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="mapping">Data Mapping</TabsTrigger>
            <TabsTrigger value="ppc-mapping">PPC Mapping</TabsTrigger>
            <TabsTrigger value="marketplaces">Marketplaces</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="sample">Sample Data</TabsTrigger>
            <TabsTrigger value="quality">Data Quality</TabsTrigger>
            <TabsTrigger value="visibility">Feature Visibility</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="sharelinks">Shareable Links</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplaces">
            <MarketplacesTab />
          </TabsContent>

          <TabsContent value="events">
            <EventsAdminTab />
          </TabsContent>


          <TabsContent value="ppc-mapping">
            <AccountMappingTab />
          </TabsContent>

          <TabsContent value="visibility">
            <FeatureVisibilityTab />
          </TabsContent>

          <TabsContent value="mapping" className="space-y-6">
            {dataSources.map((source, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {source.name}
                        <Badge variant="secondary">{source.range}</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {source.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {source.sheetName}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {source.sheetId}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openGoogleSheet(source.range, source.sheetId)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Sheet
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Column Name</TableHead>
                        <TableHead>Column Index</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {source.metrics.map((metric, metricIndex) => (
                        <TableRow key={metricIndex}>
                          <TableCell className="font-medium">{metric.metric}</TableCell>
                          <TableCell className="font-mono text-sm">{metric.column}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Column {String.fromCharCode(65 + metric.columnIndex)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{metric.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="sample" className="space-y-6">
            {Object.entries(sampleData).map(([sourceName, data]) => (
              <Card key={sourceName}>
                <CardHeader>
                  <CardTitle>{sourceName} - Sample Data</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    First 5 rows from the sheet (including header)
                  </p>
                </CardHeader>
                <CardContent>
                  {data.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {data[0]?.map((header: string, index: number) => (
                              <TableHead key={index} className="whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs">{String.fromCharCode(65 + index)}</span>
                                  <span className="font-medium">{header}</span>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.slice(1).map((row: any[], rowIndex: number) => (
                            <TableRow key={rowIndex}>
                              {row.map((cell: any, cellIndex: number) => (
                                <TableCell key={cellIndex} className="whitespace-nowrap font-mono text-sm">
                                  {cell || '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <DataGapWarnings refreshTrigger={dataQualityRefreshTrigger} />
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-6">
            <AdminRoadmap />
          </TabsContent>

          <TabsContent value="sharelinks" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Shareable Links Management</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      All shareable links for account dashboards
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={copyAllShareUrls}
                      variant="outline"
                      size="sm"
                      disabled={accounts.filter(a => a.shareCode).length === 0}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All URLs
                    </Button>
                    <Button
                      onClick={downloadShareLinks}
                      variant="outline"
                      size="sm"
                      disabled={accounts.filter(a => a.shareCode).length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {accounts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Share Code</TableHead>
                        <TableHead>Share URL</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Demo Account Row */}
                      <TableRow className="bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            Demo Account
                            <Badge variant="outline" className="text-xs">Demo</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">demo</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 max-w-md">
                            <Input
                              value={`${window.location.origin}/demo`}
                              readOnly
                              className="font-mono text-xs"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/demo`);
                              toast.success('Demo URL copied!');
                            }}
                            variant="outline"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                        </TableCell>
                      </TableRow>
                      {/* Regular Accounts */}
                      {accounts.map((account) => {
                        const shareUrl = account.shareCode 
                          ? `${window.location.origin}/${account.name.toLowerCase().trim().replace(/\s+/g, '')}/${account.shareCode}`
                          : '';
                        
                        return (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell>
                              {account.shareCode ? (
                                <Badge variant="secondary" className="font-mono">
                                  {account.shareCode}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {shareUrl ? (
                                <div className="flex items-center space-x-2 max-w-md">
                                  <Input
                                    value={shareUrl}
                                    readOnly
                                    className="font-mono text-xs"
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => copyShareUrl(account)}
                                  variant="outline"
                                  disabled={!account.shareCode}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => regenerateShareCodeForAccount(account.id)}
                                  variant="outline"
                                  disabled={!account.shareCode}
                                >
                                  <RotateCw className="h-4 w-4 mr-2" />
                                  Regenerate
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No accounts found. Add accounts from the main dashboard first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminView;