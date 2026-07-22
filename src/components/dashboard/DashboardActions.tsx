
import { Link } from 'react-router-dom';
import { RefreshCw, BarChart3, Share, Eye, EyeOff, Shield, Map, MessageSquare } from 'lucide-react';
import { APP_VERSION } from '@/constants/version';
import { Button } from '@/components/ui/button';
import { DateFilterSelector } from '@/components/dashboard/DateFilterSelector';
import { getDateDisplayText } from '@/utils/dateUtils';
import type { AccountData, DateFilter } from '@/types/dashboard';

interface DashboardActionsProps {
  focusedAccount: AccountData | null;
  isAccountNamesBlurred: boolean;
  setIsAccountNamesBlurred: (value: boolean) => void;
  isLoadingData: boolean;
  fetchSalesDataFromSheet: () => void;
  dateFilter: DateFilter;
  customDateRange: { from: Date; to: Date } | undefined;
  onDateFilterChange: (value: DateFilter) => void;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | undefined) => void;
  isBulkUploadOpen: boolean;
  setIsBulkUploadOpen: (value: boolean) => void;
  onBulkUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isAddingAccount: boolean;
  setIsAddingAccount: (value: boolean) => void;
  onAddAccount: (accountData: Partial<AccountData>) => void;
  onShareAccount: () => void;
}

export const DashboardActions = ({
  focusedAccount,
  isAccountNamesBlurred,
  setIsAccountNamesBlurred,
  isLoadingData,
  fetchSalesDataFromSheet,
  dateFilter,
  customDateRange,
  onDateFilterChange,
  onCustomDateRangeChange,
  onShareAccount
}: DashboardActionsProps) => {
  return null; // No longer renders directly - split into TopActions and BottomActions
};

// Top-right actions for the gradient section
export const DashboardTopActions = ({
  isLoadingData,
  fetchSalesDataFromSheet,
  dateFilter,
  customDateRange,
  onDateFilterChange,
  onCustomDateRangeChange,
  focusedAccountMerchantToken,
}: {
  isLoadingData: boolean;
  fetchSalesDataFromSheet: () => void;
  dateFilter: DateFilter;
  customDateRange: { from: Date; to: Date } | undefined;
  onDateFilterChange: (value: DateFilter) => void;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | undefined) => void;
  focusedAccountMerchantToken?: string;
}) => {
  const isVendorFocused = focusedAccountMerchantToken?.startsWith('amzn1.vg') || false;

  return (
    <div className="flex items-start gap-2 md:gap-3 flex-wrap">
      <Button
        onClick={fetchSalesDataFromSheet}
        disabled={isLoadingData}
        className="bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold"
        size="sm"
      >
        <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline ml-1">{isLoadingData ? 'Syncing...' : 'Sync Data'}</span>
      </Button>

      <DateFilterSelector
        dateFilter={dateFilter}
        customDateRange={customDateRange}
        onDateFilterChange={onDateFilterChange}
        onCustomDateRangeChange={onCustomDateRangeChange}
        getDateDisplayText={() => getDateDisplayText(dateFilter, customDateRange)}
        vendorOffset={isVendorFocused}
      />
    </div>
  );
};

// Bottom action bar for the white section
export const DashboardBottomActions = ({
  focusedAccount,
  isAccountNamesBlurred,
  setIsAccountNamesBlurred,
  onShareAccount,
}: {
  focusedAccount: AccountData | null;
  isAccountNamesBlurred: boolean;
  setIsAccountNamesBlurred: (value: boolean) => void;
  onShareAccount: () => void;
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Link to="/campaigns">
          <Button 
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Campaigns</span>
          </Button>
        </Link>

        <Link to="/admin">
          <Button 
            size="sm"
            className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold"
            title="Admin Dashboard"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Admin</span>
          </Button>
        </Link>

        <Link to="/feedback">
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold"
            title="Feedback submissions"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Feedback</span>
          </Button>
        </Link>


        <Link to="/roadmap">
          <Button 
            size="sm"
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold"
            title="Roadmap"
          >
            <Map className="h-4 w-4" />
            <span className="hidden md:inline ml-1">Roadmap</span>
          </Button>
        </Link>


        <Button
          size="sm"
          onClick={onShareAccount}
          disabled={!focusedAccount}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          title={focusedAccount ? `Share ${focusedAccount.name}'s dashboard` : "Select an account to share"}
        >
          <Share className="h-4 w-4" />
          <span className="hidden md:inline ml-1">Share</span>
        </Button>

        <Button
          size="sm"
          onClick={() => setIsAccountNamesBlurred(!isAccountNamesBlurred)}
          className={`transition-all duration-300 shadow-md hover:shadow-lg rounded-xl font-semibold ${
            isAccountNamesBlurred 
              ? "bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white" 
              : "bg-gradient-to-r from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 text-white"
          }`}
          title={isAccountNamesBlurred ? "Show account names" : "Hide account names"}
        >
          {isAccountNamesBlurred ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span className="hidden md:inline ml-1">{isAccountNamesBlurred ? "Show" : "Hide"}</span>
        </Button>
      </div>

      <div className="text-xs text-muted-foreground font-mono opacity-60">
        {APP_VERSION}
      </div>
    </div>
  );
};
