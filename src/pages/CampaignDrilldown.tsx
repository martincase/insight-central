import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Eye, EyeOff, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { GOOGLE_SHEETS_CONFIG } from '@/constants/dashboard';
import { getDateDisplayText } from '@/utils/dateUtils';
import { processCampaignData } from '@/utils/campaignProcessor';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DateFilterSelector } from '@/components/dashboard/DateFilterSelector';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import type { CampaignData, DateFilter } from '@/types/dashboard';
import { getBlurredDisplayName } from '@/utils/blurUtils';

const CampaignDrilldown = () => {
  const {
    accounts,
    setAccounts,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    isLoadingData,
    setIsLoadingData,
    isAccountNamesBlurred,
    setIsAccountNamesBlurred
  } = useDashboardData();

  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'excellent' | 'good' | 'warning' | 'danger'>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'brand' | 'spend' | 'acos'>('brand');
  const { toast } = useToast();

  // Load accounts from storage on mount
  useEffect(() => {
    const loadAccountsFromStorage = () => {
      try {
        const storedAccounts = localStorage.getItem('dashboard_accounts');
        if (storedAccounts) {
          const parsedAccounts = JSON.parse(storedAccounts);
          console.log('Loaded accounts from storage:', parsedAccounts);
          setAccounts(parsedAccounts);
        } else {
          console.log('No accounts found in storage');
        }
      } catch (error) {
        console.error('Error loading accounts from storage:', error);
      }
    };

    if (accounts.length === 0) {
      loadAccountsFromStorage();
    }
  }, [accounts.length, setAccounts]);

  useEffect(() => {
    console.log('CampaignDrilldown useEffect triggered');
    console.log('campaignData length:', campaignData.length);
    console.log('accounts length:', accounts.length);
    console.log('dateFilter:', dateFilter);
    console.log('customDateRange:', customDateRange);
    
    if (campaignData.length > 0 && accounts.length > 0) {
      console.log('Processing campaigns...');
      const processedCampaigns = processCampaignData(campaignData, accounts, dateFilter, customDateRange);
      console.log('Processed campaigns result:', processedCampaigns);
      console.log('Number of processed campaigns:', processedCampaigns.length);
      setCampaigns(processedCampaigns);
    } else {
      console.log('Skipping processing - missing data or accounts');
    }
  }, [campaignData, accounts, dateFilter, customDateRange]);

  const fetchCampaignData = async () => {
    setIsLoadingData(true);
    try {
      console.log('Fetching campaign data from Google Sheets...');
      
      const campaignUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.CAMPAIGNS_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
      console.log('Campaign API URL:', campaignUrl);
      
      const response = await fetch(campaignUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch campaign data: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
      }
      
      const data = await response.json();
      console.log('Campaign API Response:', data);
      
      if (!data.values || data.values.length === 0) {
        throw new Error('No campaign data found in the Google Sheet');
      }
      
      console.log('Parsed campaign data:', data.values.length, 'rows');
      console.log('Campaign Headers:', data.values[0]);
      console.log('Sample campaign rows:', data.values.slice(1, 4));
      console.log('Current accounts for matching:', accounts.map(acc => ({ 
        name: acc.name, 
        ppcAccountName: acc.ppcAccountName 
      })));
      
      setCampaignData(data.values);
      
      toast({
        title: "Campaign Data Loaded",
        description: `Successfully fetched ${data.values.length} campaign rows from Google Sheets.`,
      });
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      toast({
        title: "Sync Failed",
        description: `Failed to fetch campaign data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleDateFilterChange = (value: DateFilter) => {
    setDateFilter(value);
    if (value !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  // Filter campaigns by both alert type and account
  const filteredCampaigns = campaigns.filter(campaign => {
    const alertMatch = filterType === 'all' || campaign.alertType === filterType;
    const accountMatch = selectedAccount === 'all' || campaign.accountName === selectedAccount;
    return alertMatch && accountMatch;
  });

  // Sort campaigns based on selected sort option
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case 'brand':
        return a.accountName.localeCompare(b.accountName);
      case 'spend':
        return b.spend - a.spend; // Highest spend first
      case 'acos':
        return b.acos - a.acos; // Highest ACOS first
      default:
        return 0;
    }
  });

  const alertCounts = campaigns.reduce((acc, campaign) => {
    acc[campaign.alertType] = (acc[campaign.alertType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSpend = filteredCampaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalSales = filteredCampaigns.reduce((sum, campaign) => sum + campaign.sales, 0);
  const avgAcos = filteredCampaigns.length > 0 ? filteredCampaigns.reduce((sum, campaign) => sum + campaign.acos, 0) / filteredCampaigns.length : 0;

  // Get unique account names from campaigns for the filter dropdown
  const availableAccounts = [...new Set(campaigns.map(campaign => campaign.accountName))].sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Campaign Drilldown</h1>
              <p className="text-gray-600">Monitor campaign performance across all accounts</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant={isAccountNamesBlurred ? "default" : "outline"}
              onClick={() => setIsAccountNamesBlurred(!isAccountNamesBlurred)}
              className={cn(
                "border-gray-200 hover:bg-gray-50",
                isAccountNamesBlurred && "bg-gray-600 text-white hover:bg-gray-700"
              )}
              title={isAccountNamesBlurred ? "Show account names" : "Hide account names for client presentation"}
            >
              <Eye className={cn("mr-2 h-4 w-4", isAccountNamesBlurred && "hidden")} />
              <EyeOff className={cn("mr-2 h-4 w-4", !isAccountNamesBlurred && "hidden")} />
              {isAccountNamesBlurred ? "Show Names" : "Blur Names"}
            </Button>

            <Button
              variant="outline"
              onClick={fetchCampaignData}
              disabled={isLoadingData}
              className="border-green-200 hover:bg-green-50"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              {isLoadingData ? 'Loading...' : 'Load Campaign Data'}
            </Button>

            <DateFilterSelector
              dateFilter={dateFilter}
              customDateRange={customDateRange}
              onDateFilterChange={handleDateFilterChange}
              onCustomDateRangeChange={setCustomDateRange}
              getDateDisplayText={() => getDateDisplayText(dateFilter, customDateRange)}
            />
          </div>
        </div>

        {campaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold text-blue-600">{filteredCampaigns.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Spend</p>
                  <p className="text-2xl font-bold text-orange-600">
                    £{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-green-600">
                    £{totalSales.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg ACOS</p>
                  <p className="text-2xl font-bold text-purple-600">{avgAcos.toFixed(1)}%</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {campaigns.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center space-x-4">
                <span className="font-medium text-gray-700">Filter by Account:</span>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {availableAccounts.map((accountName) => (
                      <SelectItem key={accountName} value={accountName}>
                        {getBlurredDisplayName(accountName, isAccountNamesBlurred)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center space-x-4">
                <span className="font-medium text-gray-700">Filter by Status:</span>
                
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  All ({campaigns.length})
                </Button>
                
                {alertCounts.danger > 0 && (
                  <Button
                    variant={filterType === 'danger' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('danger')}
                    className="border-red-200 hover:bg-red-50"
                  >
                    Critical ({alertCounts.danger})
                  </Button>
                )}
                
                {alertCounts.warning > 0 && (
                  <Button
                    variant={filterType === 'warning' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('warning')}
                    className="border-yellow-200 hover:bg-yellow-50"
                  >
                    Warning ({alertCounts.warning})
                  </Button>
                )}
                
                {alertCounts.good > 0 && (
                  <Button
                    variant={filterType === 'good' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('good')}
                    className="border-blue-200 hover:bg-blue-50"
                  >
                    Good ({alertCounts.good})
                  </Button>
                )}
                
                {alertCounts.excellent > 0 && (
                  <Button
                    variant={filterType === 'excellent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('excellent')}
                    className="border-green-200 hover:bg-green-50"
                  >
                    Excellent ({alertCounts.excellent})
                  </Button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">Sort by:</span>
                <Select value={sortBy} onValueChange={(value: 'brand' | 'spend' | 'acos') => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand">Brand Name</SelectItem>
                    <SelectItem value="spend">Highest Spend</SelectItem>
                    <SelectItem value="acos">Highest ACOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Cards */}
        {sortedCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedCampaigns.map((campaign) => (
              <CampaignCard 
                key={campaign.id} 
                campaign={campaign} 
                isBlurred={isAccountNamesBlurred}
              />
            ))}
          </div>
        ) : campaigns.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No campaigns match the selected filters.</p>
            <p className="text-sm text-gray-400 mt-2">
              Try adjusting your account or status filters to see more results.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              No campaign data loaded. Click "Load Campaign Data" to fetch data from Google Sheets.
            </p>
            <Button
              onClick={fetchCampaignData}
              disabled={isLoadingData}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              {isLoadingData ? 'Loading...' : 'Load Campaign Data'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDrilldown;
