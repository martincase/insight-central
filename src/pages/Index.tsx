import React, { useState, useEffect, useMemo, useCallback, useRef, startTransition } from "react";
import { useApiPpcData, type AdType } from "@/hooks/useApiPpcData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  BarChart3,
  Search,
  TrendingUp,
  DollarSign,
  Package,
  Bot,
  Leaf,
  Home,
  PoundSterling,
  Database,
  Crosshair,
  Radar,
  Settings,
  Target,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CollapsibleSection } from "@/components/dashboard/CollapsibleSection";
import { AccountHealthTile } from "@/components/dashboard/AccountHealthTile";
import { CollapsibleAlerts } from "@/components/dashboard/CollapsibleAlerts";
import { PerformanceExportButton } from "@/components/dashboard/PerformanceExportButton";
import { useBrandCountries } from "@/hooks/useBrandCountries";
import { CountrySwitcher, type CountryScope } from "@/components/dashboard/CountrySwitcher";
import { MultiCountryPanel } from "@/components/dashboard/MultiCountryPanel";
import { SalesTrendCard } from "@/components/dashboard/SalesTrendCard";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";

import { sampleAccounts, STORAGE_KEYS, GOOGLE_SHEETS_CONFIG } from "@/constants/dashboard";
import {
  updateAccountsWithFilteredData,
  updateAccountsWithHybridData,
  getCurrentDateRange,
  getPreviousDateRange,
  calculatePeriodData,
} from "@/utils/dataProcessor";
import { checkTargets } from "@/utils/targetNotifications";
import { useEmailScheduler } from "@/hooks/useEmailScheduler";
import { fetchAccountsFromSheet } from "@/utils/accountsProcessor";
import { fetchVendorData } from "@/utils/vendorProcessor";
import { fetchASINDataFromSupabase, fetchVendorDataFromSupabase } from "@/utils/supabaseDataFetchers";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";
import { isVendorAccount } from "@/utils/vendorUtils";
import { fetchInventoryData, processInventoryData } from "@/utils/inventoryProcessor";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { AccountForm } from "@/components/dashboard/AccountForm";
import { TargetNotifications } from "@/components/dashboard/TargetNotifications";
import { SalesHeatmap } from "@/components/dashboard/SalesHeatmap";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { DashboardActions, DashboardTopActions, DashboardBottomActions } from "@/components/dashboard/DashboardActions";
import { DataStatusBar } from "@/components/dashboard/DataStatusBar";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { ASINDataTable } from "@/components/dashboard/ASINDataTable";
import { InventoryTable } from "@/components/dashboard/InventoryTable";
import {
  processASINData,
  detectMissingDates,
  getASINFallbackInfo,
  getVendorCurrentDateRange,
  getVendorPreviousDateRange,
} from "@/utils/asinProcessor";
import type { AccountData, DateFilter, ASINData, InventoryData } from "@/types/dashboard";
import { AISuggestions } from "@/components/dashboard/AISuggestions";
import { ApiSearchTermsDashboard } from "@/components/ppc-analytics/ApiSearchTermsDashboard";
import { KeywordThemesDashboard } from "@/components/ppc-analytics/KeywordThemesDashboard";
import { SearchTermKeywordMapDashboard } from "@/components/ppc-analytics/SearchTermKeywordMapDashboard";
import { BidHistoryDashboard } from "@/components/bid-history/BidHistoryDashboard";
import { BrandAnalyticsDashboard } from "@/components/ppc-analytics/BrandAnalyticsDashboard";
import { BrandAnalyticsCountry } from "@/components/dashboard/BrandAnalyticsCountry";
import { ProductFinancialDashboard } from "@/components/dashboard/ProductFinancialDashboard";
import { PnlDashboard } from "@/components/dashboard/PnlDashboard";
import { ApiAdvertisedProductsDashboard } from "@/components/ppc-analytics/ApiAdvertisedProductsDashboard";
import { InventoryPlannerDashboard } from "@/components/dashboard/InventoryPlannerDashboard";
import { MonthlyPerformanceView } from "@/components/dashboard/MonthlyPerformanceView";
import { useAccountTags } from "@/hooks/useAccountTags";
import { AccountTagBadges } from "@/components/dashboard/AccountTagBadges";
import { MonthlyPerformanceTable } from "@/components/dashboard/MonthlyPerformanceTable";
import { StockListingsSection } from "@/components/dashboard/StockListingsSection";
import { StockInventoryTable } from "@/components/dashboard/StockInventoryTable";
import { StockoutImpactSection } from "@/components/dashboard/StockoutImpactSection";
import { ScreenshotEmailButton } from "@/components/dashboard/ScreenshotEmailButton";
import { AddChangeMarkerDialog } from "@/components/dashboard/AddChangeMarkerDialog";
import { ChangeMarkerComparison } from "@/components/dashboard/ChangeMarkerComparison";
import { useChangeMarkers } from "@/hooks/useChangeMarkers";
import { ShareableLink } from "@/components/dashboard/ShareableLink";
import { mergeClientDataWithAccounts } from "@/utils/clientTokenManager";
import { HybridDataControls } from "@/components/dashboard/HybridDataControls";
import { DataSourceIndicator } from "@/components/dashboard/DataSourceIndicator";
import { StatusFilter } from "@/components/dashboard/StatusFilter";
import { RoadmapFloatingButton } from "@/components/dashboard/RoadmapFloatingButton";
import { AIAnalystChat } from "@/components/dashboard/AIAnalystChat";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { BuyBoxAlertsCard } from "@/components/dashboard/BuyBoxAlertsCard";
import { ClientAlertsCard } from "@/components/dashboard/ClientAlertsCard";
import { ComingSoonOverlay } from "@/components/dashboard/ComingSoonOverlay";
import { NegativeKeywordSimulator } from "@/components/dashboard/NegativeKeywordSimulator";
import { NegativeKeywordConfig } from "@/components/dashboard/NegativeKeywordConfig";
import { NegativesSummaryCard } from "@/components/dashboard/NegativesSummaryCard";
import { JungleScoutDashboard } from "@/components/jungle-scout/JungleScoutDashboard";
import { SearchAPIDashboard } from "@/components/searchapi/SearchAPIDashboard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ClientPaymentsDashboard } from "@/components/client-payments/ClientPaymentsDashboard";

import { PaymentStatusIndicator } from "@/components/dashboard/PaymentStatusIndicator";
import { useDashboardAddons } from "@/hooks/useDashboardAddons";
import { getAddonDefinition } from "@/addons/registry";

import { TopProductsMiniTable } from "@/components/dashboard/TopProductsMiniTable";
import { KeywordPriorityPanel } from "@/components/dashboard/KeywordPriorityPanel";
import type { HybridDataStatus } from "@/types/hybridData";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioOverviewBar, type OverviewSortConfig } from "@/components/dashboard/PortfolioOverviewBar";
import { buildAttentionMap } from "@/utils/accountAttention";

type FocusTab =
  | "performance"
  | "search-terms"
  | "advertised-products"
  | "brand-analytics"
  | "keyword-priority"
  | "profit-loss"
  | "inventory-planner"
  | "jungle-scout"
  | "market-intel"
  | "automation"
  | "client-payments"
  | "asin-hub"
  | "budgets";

const FOCUS_TAB_KEY = "dashboard_focus_tab";

const TabSkeleton = () => (
  <div className="space-y-4 py-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-48 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const Index = () => {
  const { isStaff } = useAuth();
  const {
    accounts,
    setAccounts,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    isLoadingData,
    setIsLoadingData,
    lastSyncTime,
    setLastSyncTime,
    sheetData,
    setSheetData,
    ppcData,
    setPpcData,
    asinData,
    setAsinData,
    focusedAccountId,
    setFocusedAccountId,
    isAccountNamesBlurred,
    setIsAccountNamesBlurred,
    vendorData,
    setVendorData,
    supabaseVendorData,
    setSupabaseVendorData,
    campaignData,
    setCampaignData,
    inventoryData,
    setInventoryData,
  } = useDashboardData();

  const { tagsMap: accountTagsMap, addTag: addAccountTag, removeTag: removeAccountTag } = useAccountTags();
  const _focusedAcct = accounts.find((acc) => acc.id === focusedAccountId);
  const { markers: changeMarkers, refetch: refetchMarkers } = useChangeMarkers(_focusedAcct?.merchantToken || '');

  // Debug: Log to ensure campaignData is properly destructured

  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountData | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedStatusColors, setSelectedStatusColors] = useState<("green" | "yellow" | "red")[]>([
    "green",
    "yellow",
    "red",
  ]);
  const [selectedChartMetrics, setSelectedChartMetrics] = useState<string[]>(["unitsSold"]);
  const [useHybridData, setUseHybridData] = useState(() => {
    const saved = localStorage.getItem("dashboard_use_hybrid_data");
    return saved === "true";
  });
  const [hybridDataStatus, setHybridDataStatus] = useState<HybridDataStatus | undefined>();
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewSort, setOverviewSort] = useState<OverviewSortConfig>({ key: 'sales', direction: 'desc' });
  const [overviewAttentionOnly, setOverviewAttentionOnly] = useState(false);
  const [focusTab, setFocusTab] = useState<FocusTab>(() => {
    const saved = localStorage.getItem(FOCUS_TAB_KEY);
    return (saved as FocusTab) || "performance";
  });
  const [adType, setAdType] = useState<AdType>("all");
  const [isMarkerDialogOpen, setIsMarkerDialogOpen] = useState(false);
  const [activatedTabs, setActivatedTabs] = useState<Set<FocusTab>>(() => new Set(["performance"]));
  const { toast } = useToast();

  // Track activated tabs - add tab to set when first clicked
  const handleTabSwitch = (tab: FocusTab) => {
    setFocusTab(tab);
    setActivatedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  // Reset activated tabs when switching accounts
  useEffect(() => {
    setActivatedTabs(new Set(["performance"]));
  }, [focusedAccountId]);

  // Fetch ASIN/vendor data on-demand when a specific account is focused
  useEffect(() => {
    if (!focusedAccountId) {
      // Leaving focus view — clear stale data
      setAsinData([]);
      setSupabaseVendorData([]);
      return;
    }

    const focusedAcct = accounts.find((acc) => acc.id === focusedAccountId);
    if (!focusedAcct?.merchantToken) return;

    const isVendor = isVendorAccount(focusedAcct.merchantToken);

    // Clear previous account's data immediately to prevent stale renders
    setAsinData([]);
    setSupabaseVendorData([]);

    // Fetch ASIN data for this account (seller or vendor both have daily_asin_data potential)
    if (!isVendor) {
      fetchASINDataFromSupabase(focusedAcct.merchantToken)
        .then((rows) => {
          console.info("Focused ASIN fetch result", {
            merchantToken: focusedAcct.merchantToken,
            rowCount: rows.length,
            latestRecordDate: rows[0]?.record_date ?? null,
          });
          setAsinData(rows);
        })
        .catch((err) => console.error("Failed to fetch focused ASIN data:", err));
    }

    // Fetch vendor data only for vendor accounts
    if (isVendor) {
      fetchVendorDataFromSupabase(focusedAcct.merchantToken)
        .then((rows) => {
          setSupabaseVendorData(rows);
        })
        .catch((err) => console.error("Failed to fetch focused vendor data:", err));
    }
  }, [focusedAccountId, accounts]);

  // Persist focus tab
  useEffect(() => {
    localStorage.setItem(FOCUS_TAB_KEY, focusTab);
  }, [focusTab]);

  // Memoize external data to prevent unnecessary re-renders
  const externalDataMemo = useMemo(
    () => ({
      sheetData,
      ppcData,
    }),
    [sheetData, ppcData],
  );

  useEffect(() => {
    const portwestRows = supabaseVendorData.filter((row) => row?.merchant_token === "amzn1.vg.2072811-GB");
    const sGreenRows = supabaseVendorData.filter((row) => row?.merchant_token === "amzn1.vg.6672602-GB");

  }, [supabaseVendorData]);

  // Process ASIN data for the focused account
  const focusedASINData = useMemo(() => {
    const focusedAccount = accounts.find((acc) => acc.id === focusedAccountId);
    if (!focusedAccount) return [];
    const isVendor = focusedAccount.merchantToken.startsWith("amzn1.vg");
    // For vendor accounts, use supabaseVendorData; for seller accounts, use asinData
    const primaryData = isVendor ? (supabaseVendorData.length > 0 ? supabaseVendorData : []) : asinData;
    if (primaryData.length === 0 && !isVendor) return [];
    const processedData = processASINData(primaryData, focusedAccount.merchantToken, dateFilter, customDateRange, supabaseVendorData);
    console.info("Focused ASIN processed result", {
      merchantToken: focusedAccount.merchantToken,
      rawRows: primaryData.length,
      processedRows: processedData.length,
      dateFilter,
    });
    return processedData;
  }, [asinData, accounts, focusedAccountId, dateFilter, customDateRange, supabaseVendorData]);

  const focusedASINStaleInfo = useMemo(() => {
    const focusedAccount = accounts.find((acc) => acc.id === focusedAccountId);
    if (!focusedAccount) return null;
    const isVendor = focusedAccount.merchantToken.startsWith("amzn1.vg");
    const primaryData = isVendor ? supabaseVendorData : asinData;
    if (!primaryData?.length) return null;
    return getASINFallbackInfo(primaryData, focusedAccount.merchantToken, dateFilter, customDateRange, supabaseVendorData);
  }, [asinData, accounts, focusedAccountId, dateFilter, customDateRange, supabaseVendorData]);

  const resolvedFocusedASINStaleInfo = useMemo(() => {
    if (focusedASINStaleInfo?.isFallback) return focusedASINStaleInfo;

    const focusedAccount = accounts.find((acc) => acc.id === focusedAccountId);
    if (!focusedAccount || focusedASINData.length === 0) return focusedASINStaleInfo;

    const isVendor = focusedAccount.merchantToken.startsWith("amzn1.vg");
    const requestedRange = isVendor
      ? getVendorCurrentDateRange(dateFilter, customDateRange)
      : getCurrentDateRange(dateFilter, customDateRange);

    const displayedDates = focusedASINData
      .map((row) => parseISO(row.date))
      .filter((date) => !isNaN(date.getTime()));

    if (displayedDates.length === 0) return focusedASINStaleInfo;

    const latestDisplayedDate = displayedDates.reduce((latest, current) =>
      current > latest ? current : latest,
    displayedDates[0]);
    const earliestDisplayedDate = displayedDates.reduce((earliest, current) =>
      current < earliest ? current : earliest,
    displayedDates[0]);

    if (latestDisplayedDate >= requestedRange.from) return focusedASINStaleInfo;

    return {
      isFallback: true,
      latestAvailableDate: format(latestDisplayedDate, "yyyy-MM-dd"),
      requestedRange: {
        from: format(requestedRange.from, "yyyy-MM-dd"),
        to: format(requestedRange.to, "yyyy-MM-dd"),
      },
      displayedRange: {
        from: format(earliestDisplayedDate, "yyyy-MM-dd"),
        to: format(latestDisplayedDate, "yyyy-MM-dd"),
      },
    };
  }, [focusedASINStaleInfo, accounts, focusedAccountId, focusedASINData, dateFilter, customDateRange]);

  // Detect missing dates for focused account
  const focusedMissingDates = useMemo(() => {
    const focusedAccount = accounts.find((acc) => acc.id === focusedAccountId);
    if (!focusedAccount || resolvedFocusedASINStaleInfo?.isFallback) return [];
    const isVendor = focusedAccount.merchantToken.startsWith("amzn1.vg");
    const dataSource = isVendor ? supabaseVendorData : asinData;
    if (!dataSource || dataSource.length === 0) return [];
    // Only works with Supabase data (has merchant_token)
    if (typeof dataSource[0] !== "object" || !("merchant_token" in dataSource[0])) return [];
    const dateRange = isVendor
      ? getVendorCurrentDateRange(dateFilter, customDateRange)
      : getCurrentDateRange(dateFilter, customDateRange);
    return detectMissingDates(dataSource, focusedAccount.merchantToken, dateRange);
  }, [asinData, supabaseVendorData, accounts, focusedAccountId, dateFilter, customDateRange, resolvedFocusedASINStaleInfo]);

  const shouldRenderFocusedASINSection = useMemo(() => {
    const focusedAccount = accounts.find((acc) => acc.id === focusedAccountId);
    if (!focusedAccount) return false;

    const rawSource = focusedAccount.merchantToken.startsWith("amzn1.vg") ? supabaseVendorData : asinData;
    return focusedASINData.length > 0 || !!focusedASINStaleInfo || rawSource.length > 0;
  }, [accounts, focusedAccountId, asinData, supabaseVendorData, focusedASINData, focusedASINStaleInfo]);

  // Auto-email scheduler (extracted to custom hook)
  useEmailScheduler(accounts, setAccounts);

  useEffect(() => {
    loadAccountsFromStorage();
    loadLastSyncTime();
    loadCachedDataFromStorage();
  }, []);

  // Date filter useEffect — recompute account KPIs when data or filter changes
  // NOTE: focusedAccountId is deliberately excluded — focus change doesn't need reprocessing
  useEffect(() => {
    if (accounts.length > 0 && (sheetData.length > 0 || ppcData.length > 0 || supabaseVendorData.length > 0)) {

      const updatedAccounts = updateAccountsWithFilteredData(
        accounts,
        sheetData,
        ppcData,
        dateFilter,
        customDateRange,
        vendorData,
        supabaseVendorData,
      );
      setAccounts(updatedAccounts);

      if (useHybridData && sheetData.length === 0) {
        updateAccountsWithHybridData(accounts, dateFilter, customDateRange, vendorData)
          .then(({ updatedAccounts, dataStatus }) => {
            setAccounts(updatedAccounts);
            setHybridDataStatus({
              sales: dataStatus.sales,
              ppc: dataStatus.ppc,
              asin: dataStatus.asin,
              campaign: { type: "live", hasGaps: false },
              inventory: { type: "live", hasGaps: false },
              vendor: { type: "live", hasGaps: false },
            });
          })
          .catch((error) => {
            console.error("Error updating accounts with hybrid data:", error);
          });
      }
    }
  }, [
    dateFilter,
    customDateRange,
    useHybridData,
    accounts.length,
    sheetData.length,
    ppcData.length,
    supabaseVendorData.length,
    vendorData.length,
  ]);

  useEffect(() => {
    if (accounts.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      } catch (error) {
        if (error.name === "QuotaExceededError") {
          try {
            localStorage.removeItem(STORAGE_KEYS.SALES_DATA);
            localStorage.removeItem(STORAGE_KEYS.PPC_DATA);
            localStorage.removeItem(STORAGE_KEYS.ASIN_DATA);
            localStorage.removeItem(STORAGE_KEYS.INVENTORY_DATA);
            localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
          } catch (secondError) {
            const essentialAccounts = accounts.map((acc) => ({
              id: acc.id,
              name: acc.name,
              sales: acc.sales,
              ppcSpend: acc.ppcSpend,
              ppcSales: acc.ppcSales,
              acos: acc.acos,
              tacos: acc.tacos,
              merchantToken: acc.merchantToken,
              type: acc.type,
              status: acc.status,
              isStarred: acc.isStarred,
            }));
            try {
              localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(essentialAccounts));
            } catch (thirdError) {
              console.error("Failed to store even essential account data:", thirdError);
            }
          }
        }
      }
    }
  }, [accounts]);

  useEffect(() => {
    if (sheetData.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.SALES_DATA, JSON.stringify(sheetData));
      } catch (error) {
      }
    }
  }, [sheetData]);

  useEffect(() => {
    if (ppcData.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.PPC_DATA, JSON.stringify(ppcData));
      } catch (error) {
      }
    }
  }, [ppcData]);

  useEffect(() => {
    localStorage.removeItem(STORAGE_KEYS.ASIN_DATA);
  }, []);

  useEffect(() => {
    if (inventoryData.length > 0) {
      try {
        const limitedInventoryData = inventoryData.slice(0, 1000);
        localStorage.setItem(STORAGE_KEYS.INVENTORY_DATA, JSON.stringify(limitedInventoryData));
      } catch (error) {
        try {
          const veryLimitedInventoryData = inventoryData.slice(0, 100);
          localStorage.setItem(STORAGE_KEYS.INVENTORY_DATA, JSON.stringify(veryLimitedInventoryData));
        } catch (secondError) {
        }
      }
    }
  }, [inventoryData]);

  useEffect(() => {
    if (accounts.length > 0) {
      const notifications = checkTargets(accounts);
      const missedTargets = notifications.filter((n) => !n.isGood);
      const metTargets = notifications.filter((n) => n.isGood);

      if (missedTargets.length > 0) {
        toast({
          title: "Target Alerts",
          description: `${missedTargets.length} targets missed, ${metTargets.length} targets met`,
          variant: missedTargets.length > metTargets.length ? "destructive" : "default",
        });
      }
    }
  }, [accounts, toast]);

  // Load accounts from localStorage
  const loadAccountsFromStorage = () => {
    try {
      const storedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      const savedStatusColors = JSON.parse(localStorage.getItem("account_status_colors") || "{}");

      if (storedAccounts) {
        const accounts = JSON.parse(storedAccounts);
        const accountsWithColors = accounts.map((account: AccountData) => ({
          ...account,
          statusColor: savedStatusColors[account.id] || account.statusColor || "green",
        }));
        accountsWithColors.sort((a: AccountData, b: AccountData) => a.name.localeCompare(b.name));
        setAccounts(accountsWithColors);
      } else {
        const sortedSampleAccounts = [...sampleAccounts].sort((a, b) => a.name.localeCompare(b.name));
        setAccounts(sortedSampleAccounts);
      }
    } catch (error) {
      console.error("Error loading accounts from storage:", error);
      const sortedSampleAccounts = [...sampleAccounts].sort((a, b) => a.name.localeCompare(b.name));
      setAccounts(sortedSampleAccounts);
    }
  };

  // Load last sync time from localStorage
  const loadLastSyncTime = () => {
    try {
      const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (lastSync) {
        setLastSyncTime(new Date(lastSync));
      }
    } catch (error) {
      console.error("Error loading last sync time:", error);
    }
  };

  // Load cached sales and PPC data from localStorage
  const loadCachedDataFromStorage = () => {
    try {
      const storedSalesData = localStorage.getItem(STORAGE_KEYS.SALES_DATA);
      if (storedSalesData) {
        const parsedSalesData = JSON.parse(storedSalesData);
        if (Array.isArray(parsedSalesData) && parsedSalesData.length > 0) {
          setSheetData(parsedSalesData);
        }
      }

      const storedPpcData = localStorage.getItem(STORAGE_KEYS.PPC_DATA);
      if (storedPpcData) {
        const parsedPpcData = JSON.parse(storedPpcData);
        if (Array.isArray(parsedPpcData) && parsedPpcData.length > 0) {
          setPpcData(parsedPpcData);
        }
      }
    } catch (error) {
      console.error("Error loading cached data from storage:", error);
    }
  };

  // Save last sync time to localStorage
  const saveLastSyncTime = () => {
    const now = new Date();
    setLastSyncTime(now);
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
  };

  // Fetch sales data from Google Sheets API
  const fetchSalesDataFromSheet = async () => {
    setIsLoadingData(true);
    try {

      const fetchedAccounts = await fetchAccountsFromSheet();
      let currentAccounts = accounts;
      if (fetchedAccounts.length > 0) {
        const accountsWithClientData = mergeClientDataWithAccounts(fetchedAccounts);
        setAccounts(accountsWithClientData);
        currentAccounts = accountsWithClientData;
      }

      // Only fetch vendor data from Sheets if there are vendor accounts
      const vendorAccounts = currentAccounts.filter(a => 
        a.type === 'vendor' || isVendorAccount(a.merchantToken)
      );
      let fetchedVendorData: any[] = [];
      if (vendorAccounts.length > 0) {
        fetchedVendorData = await fetchVendorData();
        setVendorData(fetchedVendorData);
      } else {
        setVendorData([]);
      }

      // PHASE 1: Fetch sales from Supabase (fast — ~1-2 seconds for all accounts)
      let salesSheetValues: any[] = [];
      let usedSupabase = false;
      try {
        const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
        const endDate = format(new Date(), 'yyyy-MM-dd');

        const allSupabaseSales: any[] = [];
        let offset = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from('perplexity_sales_data')
            .select('record_date, account_name, ordered_product_sales_amount, ordered_product_sales_currency, units_ordered, browser_sessions, browser_pageviews, buybox_percentage, unit_session_percentage, negative_feedback_received')
            .gte('record_date', startDate)
            .lte('record_date', endDate)
            .order('record_date', { ascending: true })
            .range(offset, offset + pageSize - 1);

          if (error) {
            break;
          }
          if (!data || data.length === 0) break;
          allSupabaseSales.push(...data);
          if (data.length < pageSize) break;
          offset += pageSize;
        }

        if (allSupabaseSales.length > 0) {
          usedSupabase = true;
          // Map to 2D array format expected by setSheetData / calculatePeriodData
          const header = ['datasource', 'date', 'source', 'account_id', 'account_name', 'sales_amount', 'currency', 'units_ordered', 'sessions', 'pageviews', 'buybox_percentage', 'negative_feedback', 'conversion_rate'];
          const rows = allSupabaseSales.map((row: any) => {
            const [y, m, d] = (row.record_date as string).split('-');
            const dateStr = `${d}/${m}/${y}`;
            return [
              'perplexity', dateStr, 'supabase', row.account_name, row.account_name,
              String(row.ordered_product_sales_amount || 0), row.ordered_product_sales_currency || 'GBP',
              String(row.units_ordered || 0), String(row.browser_sessions || 0),
              String(row.browser_pageviews || 0), String(row.buybox_percentage || 0),
              String(row.negative_feedback_received || 0), String(row.unit_session_percentage || 0),
            ];
          });
          salesSheetValues = [header, ...rows];
          setSheetData(salesSheetValues);
        } else {
        }
      } catch (err) {
        console.error('Supabase sales fetch failed, falling back to Google Sheets:', err);
      }

      // PHASE 2: If Supabase returned 0 rows, fall back to Google Sheets
      if (!usedSupabase) {
        const salesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
        const salesResponse = await fetch(salesUrl);
        if (!salesResponse.ok) {
          const errorData = await salesResponse.json().catch(() => ({}));
          throw new Error(`Failed to fetch sales data: ${salesResponse.status} ${salesResponse.statusText}. ${errorData.error?.message || ""}`);
        }
        const salesData = await salesResponse.json();
        if (!salesData.values || salesData.values.length === 0) {
          throw new Error("No sales data found in the Google Sheet");
        }
        salesSheetValues = salesData.values;
        setSheetData(salesSheetValues);
      }

      // Sales/traffic data comes exclusively from Supabase (perplexity_sales_data).
      // Removed the raw Google Sheets background refresh: the sheet omits newly-onboarded
      // accounts and its larger row count was overwriting the correct Supabase sheetData.
      const ppcUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.PPC_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;

      const ppcResponse = await fetch(ppcUrl);
      let ppcDataValues: any[] = [];

      if (ppcResponse.ok) {
        const ppcDataResponse = await ppcResponse.json();

        if (ppcDataResponse.values && ppcDataResponse.values.length > 0) {
          ppcDataValues = ppcDataResponse.values;

          if (ppcDataValues[0] && ppcDataValues[0].length > 7) {
          }
        } else {
        }
      } else {
      }

      setPpcData(ppcDataValues);

      // ASIN and vendor data are now fetched on-demand when a specific account is focused
      // (see useEffect watching focusedAccountId below)
      const asinDataValues: any[] = [];
      const supabaseVendorValues: any[] = [];

      const campaignUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.CAMPAIGNS_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;

      const campaignResponse = await fetch(campaignUrl);
      let campaignDataValues: any[] = [];

      if (campaignResponse.ok) {
        const campaignDataResponse = await campaignResponse.json();

        if (campaignDataResponse.values && campaignDataResponse.values.length > 0) {
          campaignDataValues = campaignDataResponse.values;
        } else {
        }
      } else {
      }

      setCampaignData(campaignDataValues);

      const inventoryUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.INVENTORY_RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;

      const inventoryResponse = await fetch(inventoryUrl);
      let inventoryDataValues: any[] = [];

      if (inventoryResponse.ok) {
        const inventoryDataResponse = await inventoryResponse.json();

        if (inventoryDataResponse.values && inventoryDataResponse.values.length > 0) {
          inventoryDataValues = inventoryDataResponse.values;
        } else {
        }
      } else {
      }

      setInventoryData(inventoryDataValues);

      const latestAccounts = fetchedAccounts.length > 0 ? mergeClientDataWithAccounts(fetchedAccounts) : accounts;
      const updatedAccounts = updateAccountsWithFilteredData(
        latestAccounts,
        salesSheetValues,
        ppcDataValues,
        dateFilter,
        customDateRange,
        fetchedVendorData,
        supabaseVendorValues,
      );
      setAccounts(updatedAccounts);

      saveLastSyncTime();

      toast({
        title: "Data Synchronized",
        description: `Successfully fetched ${fetchedAccounts.length > 0 ? `${fetchedAccounts.length} accounts, ` : ""}${salesSheetValues.length} sales rows${usedSupabase ? ' (from Supabase)' : ''}${ppcDataValues.length > 0 ? `, ${ppcDataValues.length} PPC rows` : ""}${campaignDataValues.length > 0 ? `, ${campaignDataValues.length} campaign rows` : ""}${inventoryDataValues.length > 0 ? `, ${inventoryDataValues.length} inventory rows` : ""}. ASIN/vendor data loads on account focus.`,
      });
    } catch (error) {
      console.error("Error fetching data from Google Sheets:", error);
      toast({
        title: "Sync Failed",
        description: `Failed to fetch data from Google Sheets: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Clear all local data
  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
    localStorage.removeItem(STORAGE_KEYS.SALES_DATA);
    localStorage.removeItem(STORAGE_KEYS.PPC_DATA);
    localStorage.removeItem(STORAGE_KEYS.ASIN_DATA);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY_DATA);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    setAccounts([]);
    setSheetData([]);
    setPpcData([]);
    setAsinData([]);
    setInventoryData([]);
    setLastSyncTime(null);
    toast({
      title: "Data Cleared",
      description: "All local data has been cleared.",
    });
  };

  // Handle date filter change
  const handleDateFilterChange = (value: DateFilter) => {
    setDateFilter(value);
    if (value !== "custom") {
      setCustomDateRange(undefined);
    }
  };

  // Handle bulk upload of accounts CSV
  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      const newAccounts: AccountData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const [name, merchantToken, ppcAccountName] = line.split(",");
          if (name && merchantToken) {
            const trimmedName = name.trim();

            const existingAccount = accounts.find((acc) => acc.name.toLowerCase() === trimmedName.toLowerCase());

            if (!existingAccount) {
              newAccounts.push({
                id: Date.now().toString() + i,
                name: trimmedName,
                sales: 0,
                ppcSpend: 0,
                ppcSales: 0,
                acos: 0,
                tacos: 0,
                unitsOrdered: 0,
                pageViews: 0,
                impressions: 0,
                clicks: 0,
                cpc: 0,
                ctr: 0,
                buyBoxPercentage: 0,
                conversionRate: 0,
                sellerCentralLink: "",
                merchantToken: merchantToken.trim(),
                ppcAccountName: ppcAccountName?.trim(),
                type: "seller",
                status: "active",
                isStarred: false,
              });
            }
          }
        }
      }

      if (newAccounts.length > 0) {
        const updatedAccounts = [...accounts, ...newAccounts];
        updatedAccounts.sort((a, b) => a.name.localeCompare(b.name));
        setAccounts(updatedAccounts);

        const duplicatesSkipped = lines.length - 1 - newAccounts.length;
        toast({
          title: "Bulk Upload Successful",
          description: `Added ${newAccounts.length} accounts successfully.${duplicatesSkipped > 0 ? ` Skipped ${duplicatesSkipped} duplicate accounts.` : ""}`,
        });
      } else {
        toast({
          title: "Upload Failed",
          description: "No new accounts found in the file. All accounts may already exist or the format is incorrect.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    setIsBulkUploadOpen(false);
    event.target.value = "";
  };

  // Debug logging for focus mode

  // Filter accounts based on focus and status colors
  const displayedAccounts = focusedAccountId
    ? accounts.filter((acc) => acc.id === focusedAccountId)
    : accounts.filter((acc) => {
        const statusColor = acc.statusColor || "green";
        return selectedStatusColors.length === 0 || selectedStatusColors.includes(statusColor);
      });

  const sortedAccounts = [...displayedAccounts].sort((a, b) => {
    if (a.isStarred && !b.isStarred) return -1;
    if (!a.isStarred && b.isStarred) return 1;
    return a.name.localeCompare(b.name);
  });

  // Overview attention map + filtered/sorted list for the all-accounts view
  const attentionMap = useMemo(() => buildAttentionMap(displayedAccounts), [displayedAccounts]);
  const attentionCount = useMemo(
    () => Object.values(attentionMap).filter((a) => a.needsAttention).length,
    [attentionMap],
  );
  const overviewAccounts = useMemo(() => {
    const q = overviewSearch.trim().toLowerCase();
    let list = displayedAccounts.filter((a) => !q || a.name.toLowerCase().includes(q));
    if (overviewAttentionOnly) list = list.filter((a) => attentionMap[a.id]?.needsAttention);
    const dir = overviewSort.direction === 'asc' ? 1 : -1;
    const getVal = (a: AccountData): number | string => {
      switch (overviewSort.key) {
        case 'name': return a.name.toLowerCase();
        case 'sales': return a.sales || 0;
        case 'ppcSpend': return a.ppcSpend || 0;
        case 'acos': return a.acos || 0;
        case 'tacos': return a.tacos || 0;
        case 'salesChange': {
          const p = a.previousPeriod?.sales || 0;
          return p > 0 ? ((a.sales - p) / p) * 100 : -Infinity;
        }
        case 'attention': return attentionMap[a.id]?.needsAttention ? 1 : 0;
        default: return 0;
      }
    };
    return [...list].sort((a, b) => {
      // Starred first (only when not name-sorting alphabetically)
      if (overviewSort.key !== 'name') {
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
      }
      const va = getVal(a); const vb = getVal(b);
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }, [displayedAccounts, overviewSearch, overviewSort, overviewAttentionOnly, attentionMap]);



  // Handle add account
  const handleAddAccount = (accountData: Partial<AccountData>) => {
    const newAccount: AccountData = {
      id: Date.now().toString(),
      name: accountData.name || "",
      sales: 0,
      ppcSpend: 0,
      ppcSales: 0,
      acos: 0,
      tacos: 0,
      unitsOrdered: 0,
      pageViews: 0,
      impressions: 0,
      clicks: 0,
      cpc: 0,
      ctr: 0,
      buyBoxPercentage: 0,
      conversionRate: 0,
      sellerCentralLink: accountData.sellerCentralLink || "",
      merchantToken: accountData.merchantToken || "",
      ppcAccountName: accountData.ppcAccountName,
      type: "seller",
      status: "active",
      isStarred: false,
      targets: accountData.targets,
    };

    const updatedAccounts = [...accounts, newAccount];
    updatedAccounts.sort((a, b) => a.name.localeCompare(b.name));
    setAccounts(updatedAccounts);
    setIsAddingAccount(false);
  };

  // Handle edit account
  const handleEditAccount = (accountData: AccountData) => {
    const updatedAccounts = accounts.map((acc) => (acc.id === accountData.id ? accountData : acc));
    updatedAccounts.sort((a, b) => a.name.localeCompare(b.name));
    setAccounts(updatedAccounts);
    setEditingAccount(null);
  };

  // Toggle chart metric selection
  const toggleChartMetric = (metricKey: string) => {
    setSelectedChartMetrics((prev) =>
      prev.includes(metricKey) ? prev.filter((m) => m !== metricKey) : [...prev, metricKey],
    );
  };

  // Update account data
  const handleUpdateAccount = (accountData: AccountData) => {
    const updatedAccounts = accounts.map((acc) => (acc.id === accountData.id ? accountData : acc));
    setAccounts(updatedAccounts);
  };

  // Toggle star on account
  const toggleStar = (accountId: string) => {
    setAccounts(accounts.map((acc) => (acc.id === accountId ? { ...acc, isStarred: !acc.isStarred } : acc)));
  };

  // Delete account
  const deleteAccount = (accountId: string) => {
    setAccounts(accounts.filter((acc) => acc.id !== accountId));
    if (focusedAccountId === accountId) {
      setFocusedAccountId(null);
    }
    toast({
      title: "Account Deleted",
      description: "Account has been successfully deleted.",
    });
  };

  // Handle focus on account
  const handleFocusAccount = useCallback((accountId: string | null) => {
    startTransition(() => {
      setFocusedAccountId(accountId);
    });
    if (accountId) {
      const account = accounts.find((acc) => acc.id === accountId);
      toast({
        title: "Account Focused",
        description: `Now showing data for ${account?.name} only. Click the focus button again to show all accounts.`,
      });
    } else {
      toast({
        title: "Focus Cleared",
        description: "Now showing data for all accounts.",
      });
    }
  }, [accounts, toast]);

  // Handle share account
  const handleShareAccount = () => {
    const focusedAccount = focusedAccountId ? accounts.find((acc) => acc.id === focusedAccountId) : null;
    if (!focusedAccount) return;

    setIsShareDialogOpen(true);
  };

  // Handle status color change
  const handleStatusColorChange = (accountId: string, color: "green" | "yellow" | "red") => {
    setAccounts(accounts.map((acc) => (acc.id === accountId ? { ...acc, statusColor: color } : acc)));

    const statusColors = JSON.parse(localStorage.getItem("account_status_colors") || "{}");
    statusColors[accountId] = color;
    localStorage.setItem("account_status_colors", JSON.stringify(statusColors));

    toast({
      title: "Status Color Updated",
      description: `Account status color changed to ${color}.`,
    });
  };

  const targetNotifications = checkTargets(displayedAccounts);
  const focusedAccount = focusedAccountId ? accounts.find((acc) => acc.id === focusedAccountId) : null;

  // Multi-country switcher state for focused view (additive; hidden when brand has ≤1 country)
  const focusedBrandCountries = useBrandCountries(focusedAccount?.merchantToken);
  const [focusedCountryScope, setFocusedCountryScope] = useState<CountryScope | null>(null);
  useEffect(() => {
    setFocusedCountryScope(null);
  }, [focusedAccountId]);
  useEffect(() => {
    if (!focusedCountryScope && focusedBrandCountries.primary) {
      setFocusedCountryScope(focusedBrandCountries.primary.country_code);
    }
  }, [focusedCountryScope, focusedBrandCountries.primary]);
  const effectiveFocusedScope: CountryScope =
    focusedCountryScope || focusedBrandCountries.primary?.country_code || "GB";
  const focusedScopeAccountKeys = (() => {
    const cs = focusedBrandCountries.countries;
    if (!cs.length) return undefined;
    if (effectiveFocusedScope === 'ALL') return cs.map(c => c.sales_account_key).filter(Boolean);
    if (effectiveFocusedScope === 'ALL_EU') return cs.filter(c => c.region === 'EU').map(c => c.sales_account_key).filter(Boolean);
    const m = cs.find(c => c.country_code === effectiveFocusedScope);
    return m ? [m.sales_account_key].filter(Boolean) : undefined;
  })();

  // Optional add-ons for the focused brand (Budgets, etc.)
  const focusedAddons = useDashboardAddons(focusedBrandCountries.spid);

  // API PPC data hook - fetches from Amazon Advertising API tables
  const {
    metrics: apiPpcMetrics,
    previousMetrics: apiPpcPreviousMetrics,
    allDailyData: apiPpcAllDaily,
    dailyData: apiPpcDailyData,
    isLoading: apiPpcLoading,
  } = useApiPpcData({
    accountName: focusedAccount?.name || "",
    dateFilter,
    customDateRange,
    adType,
    merchantToken: focusedAccount?.merchantToken,
  });

  // Compute direct organic metrics from raw sheetData to bypass stale account state
  const directOrganicMetrics = useMemo(() => {
    if (displayedAccounts.length === 0) return null;
    // Need at least sheetData for seller accounts OR supabaseVendorData for vendor accounts
    if (sheetData.length === 0 && supabaseVendorData.length === 0) return null;
    const currentRange = getCurrentDateRange(dateFilter, customDateRange);

    let totalSales = 0,
      totalPpcSpend = 0,
      totalPpcSales = 0,
      totalUnitsOrdered = 0;
    let totalPageViews = 0,
      buyBoxSum = 0,
      conversionSum = 0,
      totalImpressions = 0;
    let totalClicks = 0,
      accountCount = 0;

    for (const account of displayedAccounts) {
      if (isVendorAccount(account.merchantToken)) {
        // For vendor accounts, compute from supabaseVendorData
        if (supabaseVendorData.length > 0) {
          const vendorRange = getVendorCurrentDateRange(dateFilter, customDateRange);

          let vendorSales = 0,
            vendorUnits = 0;
          for (const row of supabaseVendorData) {
            if (row.merchant_token !== account.merchantToken) continue;
            const rowDate = parseISO(row.record_date);
            if (isNaN(rowDate.getTime())) continue;
            if (rowDate >= vendorRange.from && rowDate <= vendorRange.to) {
              vendorSales += Number(row.sales) || 0;
              vendorUnits += Number(row.units_ordered) || 0;
            }
          }
          totalSales += vendorSales;
          totalUnitsOrdered += vendorUnits;
          accountCount++;
        }
        continue;
      }
      if (sheetData.length === 0) continue;
      const data = calculatePeriodData(sheetData, ppcData, account.merchantToken, account.ppcAccountName, currentRange);
      totalSales += data.sales;
      totalPpcSpend += data.ppcSpend;
      totalPpcSales += data.ppcSales;
      totalUnitsOrdered += data.unitsOrdered;
      totalPageViews += data.pageViews;
      buyBoxSum += data.buyBoxPercentage;
      conversionSum += data.conversionRate;
      totalImpressions += data.impressions;
      totalClicks += data.clicks;
      accountCount++;
    }

    return {
      sales: totalSales,
      ppcSpend: totalPpcSpend,
      ppcSales: totalPpcSales,
      unitsOrdered: totalUnitsOrdered,
      pageViews: totalPageViews,
      buyBoxPercentage: accountCount > 0 ? buyBoxSum / accountCount : 0,
      conversionRate: accountCount > 0 ? conversionSum / accountCount : 0,
      impressions: totalImpressions,
      clicks: totalClicks,
      cpc: totalClicks > 0 ? totalPpcSpend / totalClicks : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      acos: totalPpcSales > 0 ? (totalPpcSpend / totalPpcSales) * 100 : 0,
      tacos: totalSales > 0 ? (totalPpcSpend / totalSales) * 100 : 0,
    };
  }, [sheetData, ppcData, displayedAccounts, dateFilter, customDateRange, supabaseVendorData]);

  const directOrganicPreviousMetrics = useMemo(() => {
    if (displayedAccounts.length === 0) return null;
    if (sheetData.length === 0 && supabaseVendorData.length === 0) return null;
    const prevRange = getPreviousDateRange(dateFilter, customDateRange);

    let totalSales = 0,
      totalPpcSpend = 0,
      totalPpcSales = 0,
      totalUnitsOrdered = 0;
    let totalPageViews = 0,
      buyBoxSum = 0,
      conversionSum = 0,
      totalImpressions = 0;
    let totalClicks = 0,
      accountCount = 0;

    for (const account of displayedAccounts) {
      if (isVendorAccount(account.merchantToken)) {
        if (supabaseVendorData.length > 0) {
          const vendorPrevRange = getVendorPreviousDateRange(dateFilter, customDateRange);
          let vendorSales = 0,
            vendorUnits = 0;
          for (const row of supabaseVendorData) {
            if (row.merchant_token !== account.merchantToken) continue;
            const rowDate = parseISO(row.record_date);
            if (isNaN(rowDate.getTime())) continue;
            if (rowDate >= vendorPrevRange.from && rowDate <= vendorPrevRange.to) {
              vendorSales += Number(row.sales) || 0;
              vendorUnits += Number(row.units_ordered) || 0;
            }
          }
          totalSales += vendorSales;
          totalUnitsOrdered += vendorUnits;
          accountCount++;
        }
        continue;
      }
      if (sheetData.length === 0) continue;
      const data = calculatePeriodData(sheetData, ppcData, account.merchantToken, account.ppcAccountName, prevRange);
      totalSales += data.sales;
      totalPpcSpend += data.ppcSpend;
      totalPpcSales += data.ppcSales;
      totalUnitsOrdered += data.unitsOrdered;
      totalPageViews += data.pageViews;
      buyBoxSum += data.buyBoxPercentage;
      conversionSum += data.conversionRate;
      totalImpressions += data.impressions;
      totalClicks += data.clicks;
      accountCount++;
    }

    return {
      sales: totalSales,
      ppcSpend: totalPpcSpend,
      ppcSales: totalPpcSales,
      unitsOrdered: totalUnitsOrdered,
      pageViews: totalPageViews,
      buyBoxPercentage: accountCount > 0 ? buyBoxSum / accountCount : 0,
      conversionRate: accountCount > 0 ? conversionSum / accountCount : 0,
      impressions: totalImpressions,
      clicks: totalClicks,
      cpc: totalClicks > 0 ? totalPpcSpend / totalClicks : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      acos: totalPpcSales > 0 ? (totalPpcSpend / totalPpcSales) * 100 : 0,
      tacos: totalSales > 0 ? (totalPpcSpend / totalSales) * 100 : 0,
    };
  }, [sheetData, ppcData, displayedAccounts, dateFilter, customDateRange]);

  const focusTabs: { key: FocusTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: "performance", label: "Performance", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "search-terms", label: "Search Terms", icon: <Search className="h-4 w-4" /> },
    { key: "advertised-products", label: "Ad Products", icon: <Package className="h-4 w-4" /> },
    { key: "brand-analytics", label: "Brand Analytics", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "keyword-priority", label: "Keyword Priority", icon: <Target className="h-4 w-4" />, adminOnly: true },
    { key: "profit-loss", label: "Profit & Loss", icon: <DollarSign className="h-4 w-4" /> },
    { key: "inventory-planner", label: "📦 Inventory Planner", icon: <Package className="h-4 w-4" /> },
    { key: "jungle-scout", label: "Jungle Scout", icon: <Leaf className="h-4 w-4" />, adminOnly: true },
    { key: "market-intel", label: "Market Intel", icon: <Radar className="h-4 w-4" />, adminOnly: true },
    { key: "asin-hub", label: "ASIN Hub", icon: <Crosshair className="h-4 w-4" />, adminOnly: true },
    { key: "automation", label: "Automation", icon: <Bot className="h-4 w-4" />, adminOnly: true },
    { key: "client-payments", label: "Client Payments", icon: <PoundSterling className="h-4 w-4" />, adminOnly: true },
  ];

  // Append enabled optional add-ons (Budgets, etc.) as extra focus tabs
  const addonFocusTabs: typeof focusTabs = focusedAddons.addons
    .map((a) => {
      const def = getAddonDefinition(a.addon_key);
      if (!def) return null;
      const Icon = def.icon;
      const label = (a.config as any)?.label || def.label;
      return { key: def.key as FocusTab, label, icon: <Icon className="h-4 w-4" /> };
    })
    .filter(Boolean) as typeof focusTabs;

  const visibleFocusTabs = [...focusTabs, ...addonFocusTabs].filter((t) => !t.adminOnly || isStaff);


  return (
    <AuthGate>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <div id="dashboard-main" className="container mx-auto px-3 py-4 md:px-6 md:py-8 pb-24">
          <AppHeader
            logoSrc="/uploads/MC-Logo-WHITE.png"
            title="Amazon Performance Dashboard"
            subtitle={focusedAccount ? focusedAccount.name : "Monitor all your Amazon accounts in one place"}
            features={`${accounts.length} Accounts • Real-time Sync • Performance Analytics`}
            focusedAccount={focusedAccount}
            onUnfocus={() => handleFocusAccount(null)}
            topActions={
              <DashboardTopActions
                isLoadingData={isLoadingData}
                fetchSalesDataFromSheet={fetchSalesDataFromSheet}
                dateFilter={dateFilter}
                customDateRange={customDateRange}
                onDateFilterChange={handleDateFilterChange}
                onCustomDateRangeChange={setCustomDateRange}
                focusedAccountMerchantToken={focusedAccount?.merchantToken}
              />
            }
            bottomActions={
              <DashboardBottomActions
                focusedAccount={focusedAccount}
                isAccountNamesBlurred={isAccountNamesBlurred}
                setIsAccountNamesBlurred={setIsAccountNamesBlurred}
                onShareAccount={handleShareAccount}
              />
            }
          />

          {targetNotifications.length > 0 && (
            <div className="mb-6">
              <TargetNotifications notifications={targetNotifications} />
            </div>
          )}

          {!focusedAccountId && (
            <div className="mb-6 space-y-3">
              {isStaff && (
                <div className="flex justify-end">
                  <Link
                    to="/agency"
                    className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-3 py-1.5 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Agency overview
                  </Link>
                </div>
              )}
              <AccountHealthTile />
            </div>
          )}

          {/* Alerts are now inside the Performance tab as collapsible */}

          {/* ===== FOCUS VIEW: Tabbed Navigation ===== */}
          {focusedAccountId && focusedAccount && (
            <>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                <button
                  onClick={() => handleFocusAccount(null)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </button>
                <ChevronRight className="h-3 w-3" />
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors outline-none">
                    {focusedAccount.name}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                    {accounts.map((acc) => (
                      <DropdownMenuItem
                        key={acc.id}
                        onClick={() => handleFocusAccount(acc.id)}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{acc.name}</span>
                        {acc.id === focusedAccount.id && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <AccountTagBadges
                  merchantToken={focusedAccount.merchantToken}
                  size="lg"
                  editable
                  tags={accountTagsMap[focusedAccount.merchantToken] || []}
                  onAddTag={addAccountTag}
                  onRemoveTag={removeAccountTag}
                />
                <button
                  onClick={() => setIsMarkerDialogOpen(true)}
                  className="ml-1 p-1 rounded-md hover:bg-muted/60 transition-colors"
                  title="Add Change Marker"
                >
                  <Flag className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                </button>
              </div>

              {/* Payment Status Indicator */}
              <PaymentStatusIndicator
                merchantToken={focusedAccount.merchantToken}
                displayName={focusedAccount.name}
                onNavigateToPayments={() => handleTabSwitch("client-payments")}
              />

              {/* Sticky Tab Bar */}
              <div className="sticky top-0 z-30 bg-gradient-to-br from-blue-50 to-cyan-50 pt-2 pb-4 -mx-3 px-3 md:-mx-6 md:px-6">
                <div className="flex items-center gap-1 md:gap-2 p-1 md:p-1.5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto scrollbar-hide">
                  {visibleFocusTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => handleTabSwitch(tab.key)}
                      className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap min-w-0 ${
                        focusTab === tab.key
                          ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PERFORMANCE TAB */}
              {focusTab === "performance" && (
                <div className="space-y-6">
                  {/* Collapsible Alerts */}
                  <CollapsibleAlerts merchantToken={focusedAccount.merchantToken} accountName={focusedAccount.name} />

                  {focusedBrandCountries.spid && (
                    <SalesTrendCard
                      spid={focusedBrandCountries.spid}
                      scope={effectiveFocusedScope}
                      dateFilter={dateFilter}
                      customDateRange={customDateRange}
                      primaryCountry={focusedBrandCountries.primary?.country_code}
                      onDrilldown={(from, to) => {
                        setDateFilter('custom');
                        setCustomDateRange({ from, to });
                      }}
                    />
                  )}

                  {focusedBrandCountries.isMultiCountry && focusedBrandCountries.spid && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] md:text-xs uppercase tracking-wide text-gray-500 font-semibold">Country scope</span>
                        <CountrySwitcher
                          countries={focusedBrandCountries.countries}
                          scope={effectiveFocusedScope}
                          onChange={setFocusedCountryScope}
                        />
                      </div>
                      {(effectiveFocusedScope === 'ALL_EU' || effectiveFocusedScope === 'ALL') && (
                        <MultiCountryPanel
                          spid={focusedBrandCountries.spid}
                          scope={effectiveFocusedScope}
                          dateFilter={dateFilter}
                          customDateRange={customDateRange}
                        />
                      )}
                    </div>
                  )}




                  {/* Daily Performance - Collapsible */}
                  <CollapsibleSection title="Daily Performance" storageKey="daily_perf">
                    <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        Data through {format(subDays(new Date(), 1), 'd MMM yyyy')}
                        <span className="ml-1 text-muted-foreground/70">· Amazon reporting lag may delay the most recent day</span>
                      </p>
                      <PerformanceExportButton accounts={displayedAccounts} dateFilter={dateFilter} />
                    </div>
                    {(sheetData.length > 0 || supabaseVendorData.length > 0) && (
                      <SalesHeatmap
                        accounts={displayedAccounts}
                        sheetData={sheetData}
                        ppcData={ppcData}
                        vendorData={vendorData}
                        supabaseVendorData={supabaseVendorData}
                        isBlurred={isAccountNamesBlurred}
                        onFocusAccount={handleFocusAccount}
                        apiPpcDailyData={focusedAccount ? apiPpcAllDaily : undefined}
                        accountTagsMap={accountTagsMap}
                        dateFilter={dateFilter}
                        customDateRange={customDateRange}
                      />
                    )}
                  </CollapsibleSection>

                  {/* KPI Cards - Collapsible */}
                  <CollapsibleSection title="KPI Metrics" storageKey="kpi_metrics">
                    <MetricsGrid
                      displayedAccounts={displayedAccounts}
                      focusedAccount={focusedAccount}
                      selectedChartMetrics={selectedChartMetrics}
                      onToggleChartMetric={toggleChartMetric}
                      apiPpcMetrics={focusedAccount ? apiPpcMetrics : null}
                      apiPpcPreviousMetrics={focusedAccount ? apiPpcPreviousMetrics : null}
                      apiPpcLoading={apiPpcLoading}
                      adType={adType}
                      onAdTypeChange={setAdType}
                      directOrganicMetrics={directOrganicMetrics}
                      directOrganicPreviousMetrics={directOrganicPreviousMetrics}
                      apiPpcDailyData={focusedAccount ? apiPpcDailyData : undefined}
                      dateFilter={dateFilter}
                    />
                  </CollapsibleSection>

                  {/* Top 5 Products - Collapsible */}
                  <CollapsibleSection title="Top Products" storageKey="top_products">
                    {resolvedFocusedASINStaleInfo?.isFallback && (
                      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                        <span className="text-base leading-none">⚠️</span>
                        <div>
                          <div className="font-medium">
                            ASIN data last updated: {new Date(resolvedFocusedASINStaleInfo.latestAvailableDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <div>
                            Showing most recent available data
                            {resolvedFocusedASINStaleInfo.displayedRange && (
                              <span>
                                {' '}({new Date(resolvedFocusedASINStaleInfo.displayedRange.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(resolvedFocusedASINStaleInfo.displayedRange.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <TopProductsMiniTable
                      accountName={focusedAccount.name}
                      merchantToken={focusedAccount.merchantToken}
                    />
                  </CollapsibleSection>

                  {/* ASIN Performance - Collapsible */}
                  {shouldRenderFocusedASINSection && (
                    <CollapsibleSection title="ASIN Performance" storageKey="asin_performance">
                      <ASINDataTable
                        asinData={focusedASINData}
                        dateFilter={dateFilter}
                        customDateRange={customDateRange}
                        accountMerchantToken={focusedAccount.merchantToken}
                        hideBuyBoxAndConversion={true}
                        missingDates={focusedMissingDates}
                        staleInfo={resolvedFocusedASINStaleInfo}
                      />
                    </CollapsibleSection>
                  )}

                  {/* Screenshot Email Button */}
                  <div className="flex justify-end">
                    <ScreenshotEmailButton
                      account={focusedAccount}
                      onUpdateAccount={handleEditAccount}
                      targetElementId="dashboard-main"
                    />
                  </div>

                  {/* Monthly Performance - Collapsible */}
                  <CollapsibleSection title="Monthly Performance" storageKey="monthly_perf">
                    <MonthlyPerformanceView
                      accountName={focusedAccount.name}
                      merchantToken={focusedAccount.merchantToken}
                      ppcAccountName={focusedAccount.ppcAccountName}
                      selectedMetrics={selectedChartMetrics}
                      onToggleMetric={toggleChartMetric}
                      useHybridData={useHybridData}
                      dateFilter={dateFilter}
                      customDateRange={customDateRange}
                      externalData={externalDataMemo}
                    />
                    <MonthlyPerformanceTable
                      merchantToken={focusedAccount.merchantToken}
                      accountName={focusedAccount.name}
                      changeMarkers={changeMarkers}
                    />
                    {changeMarkers.length > 0 && (
                      <div className="mt-4">
                        <ChangeMarkerComparison markers={changeMarkers} accountName={focusedAccount.name} merchantToken={focusedAccount.merchantToken} />
                      </div>
                    )}
                  </CollapsibleSection>

                  {/* Add Change Marker Dialog */}
                  <AddChangeMarkerDialog
                    merchantToken={focusedAccount.merchantToken}
                    accountName={focusedAccount.name}
                    open={isMarkerDialogOpen}
                    onOpenChange={setIsMarkerDialogOpen}
                    onMarkerAdded={refetchMarkers}
                  />

                  {/* Stock & Listings / Vendor Inventory */}
                  {focusedAccount.type === 'vendor' ? (
                    <StockInventoryTable merchantToken={focusedAccount.merchantToken} accountType="vendor" />
                  ) : (
                    <CollapsibleSection title="Stock & Listings" storageKey="stock_listings" defaultOpen={true}>
                      <StockListingsSection merchantToken={focusedAccount.merchantToken} />
                    </CollapsibleSection>
                  )}

                  {/* Stockout Impact */}
                  <CollapsibleSection title="Stockout Impact" storageKey="stockout_impact" defaultOpen={true}>
                    <StockoutImpactSection merchantToken={focusedAccount.merchantToken} accountKeys={focusedScopeAccountKeys} scope={effectiveFocusedScope} />
                  </CollapsibleSection>

                  {/* AI Suggestions - Collapsible */}
                  {accounts.length > 0 && (
                    <CollapsibleSection title="AI Suggestions" storageKey="ai_suggestions" defaultOpen={false}>
                      <AISuggestions
                        accounts={accounts}
                        isBlurred={isAccountNamesBlurred}
                        onFocusAccount={handleFocusAccount}
                      />
                    </CollapsibleSection>
                  )}
                </div>
              )}

              {/* SEARCH TERMS TAB */}
              {focusTab === "search-terms" && (
                activatedTabs.has("search-terms") ? (
                  <div className="space-y-8">
                    <ApiSearchTermsDashboard accountName={focusedAccount.name} dateFilter={dateFilter} customDateRange={customDateRange} />
                    <KeywordThemesDashboard sellerFilter={focusedAccount.ppc_sellername || focusedAccount.name} />
                    <SearchTermKeywordMapDashboard sellerFilter={focusedAccount.ppc_sellername || focusedAccount.name} />
                    <BidHistoryDashboard sellerFilter={focusedAccount.name} />
                  </div>
                ) : <TabSkeleton />
              )}

              {/* ADVERTISED PRODUCTS TAB */}
              {focusTab === "advertised-products" && (
                activatedTabs.has("advertised-products") ? (
                  <div className="space-y-8">
                    <ApiAdvertisedProductsDashboard accountName={focusedAccount.name} />
                  </div>
                ) : <TabSkeleton />
              )}

              {/* BRAND ANALYTICS TAB */}
              {focusTab === "brand-analytics" && (
                activatedTabs.has("brand-analytics") ? (
                  <div className="space-y-8">
                    {focusedBrandCountries.spid && (
                      <BrandAnalyticsCountry spid={focusedBrandCountries.spid} scope={effectiveFocusedScope} />
                    )}
                    <div className="border-t pt-6">
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold">Keyword & PPC analysis</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Brand-level view (keyword search-share + PPC). Not split by country — per-keyword PPC data isn't available per marketplace.
                        </p>
                      </div>
                      <BrandAnalyticsDashboard accountName={focusedAccount.name} />
                    </div>
                  </div>
                ) : <TabSkeleton />
              )}

              {/* KEYWORD PRIORITY TAB - Admin only */}
              {focusTab === "keyword-priority" && isStaff && (
                activatedTabs.has("keyword-priority") ? (
                  <div className="space-y-8">
                    <KeywordPriorityPanel accountName={focusedAccount.name} />
                  </div>
                ) : <TabSkeleton />
              )}

              {/* PROFIT & LOSS TAB */}
              {focusTab === "profit-loss" && (
                activatedTabs.has("profit-loss") ? (
                  <div className="space-y-8">
                    {focusedBrandCountries.spid && (
                      <>
                        <SalesTrendCard
                          spid={focusedBrandCountries.spid}
                          scope={effectiveFocusedScope}
                          dateFilter={dateFilter}
                          customDateRange={customDateRange}
                          primaryCountry={focusedBrandCountries.primary?.country_code}
                          onDrilldown={(from, to) => {
                            setDateFilter('custom');
                            setCustomDateRange({ from, to });
                          }}
                        />
                        <PnlDashboard
                          spid={focusedBrandCountries.spid}
                          scope={effectiveFocusedScope}
                          dateFilter={dateFilter}
                          customDateRange={customDateRange}
                        />
                      </>
                    )}
                    <ProductFinancialDashboard accountName={focusedAccount.name} />
                  </div>
                ) : <TabSkeleton />
              )}

              {/* INVENTORY PLANNER TAB */}
              {focusTab === "inventory-planner" && (
                activatedTabs.has("inventory-planner") ? (
                  <div className="space-y-8">
                    <InventoryPlannerDashboard 
                      merchantToken={focusedAccount.merchantToken}
                      accountName={focusedAccount.name}
                      accountType={focusedAccount.type}
                      asinData={focusedASINData}
                      asinStaleInfo={focusedASINStaleInfo}
                    />
                  </div>
                ) : <TabSkeleton />
              )}

              {/* JUNGLE SCOUT TAB - Admin only */}
              {focusTab === "jungle-scout" && isStaff && (
                activatedTabs.has("jungle-scout") ? (
                  <div className="space-y-6">
                    <ErrorBoundary
                      fallback={
                        <div className="p-4 text-destructive">
                          Jungle Scout failed to load. Check console for details.
                        </div>
                      }
                    >
                      <JungleScoutDashboard accountName={focusedAccount.name} />
                    </ErrorBoundary>
                  </div>
                ) : <TabSkeleton />
              )}

              {/* AUTOMATION TAB - Admin only */}
              {focusTab === "automation" && isStaff && (
                activatedTabs.has("automation") ? (
                  <div className="space-y-6">
                    <NegativesSummaryCard accountName={focusedAccount.name} merchantToken={focusedAccount.merchantToken} />
                    <NegativeKeywordConfig focusedAccountName={focusedAccount.name} />
                    <NegativeKeywordSimulator focusedAccountName={focusedAccount.name} />
                  </div>
                ) : <TabSkeleton />
              )}

              {/* MARKET INTEL TAB - Admin only */}
              {focusTab === "market-intel" && isStaff && (
                activatedTabs.has("market-intel") ? (
                  <div className="space-y-6">
                    <ErrorBoundary fallback={<div className="p-4 text-destructive">Market Intel failed to load.</div>}>
                      <SearchAPIDashboard focusedAccountName={focusedAccount.name} />
                    </ErrorBoundary>
                  </div>
                ) : <TabSkeleton />
              )}

              {/* ASIN HUB TAB - Admin only */}
              {focusTab === "asin-hub" && isStaff && (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-md">
                    <Crosshair className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">ASIN Hub</h3>
                    <p className="text-muted-foreground mb-4">
                      Click any ASIN in the dashboard to open its full intelligence view, or search directly.
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="text"
                        placeholder="Enter ASIN (e.g. B09B96TG33)"
                        className="px-3 py-2 rounded-lg border border-border bg-background text-sm w-48"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                            if (val.length >= 10) window.location.href = `/asin/${val}`;
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CLIENT PAYMENTS TAB - Admin only */}
              {focusTab === "client-payments" && isStaff && (
                activatedTabs.has("client-payments") ? (
                  <div className="space-y-6">
                    <ClientPaymentsDashboard />
                  </div>
                ) : <TabSkeleton />
              )}

              {/* OPTIONAL ADD-ON TABS (Budgets, etc.) */}
              {focusedAddons.addons.map((a) => {
                const def = getAddonDefinition(a.addon_key);
                if (!def || focusTab !== def.key) return null;
                if (!activatedTabs.has(def.key as FocusTab)) return <TabSkeleton key={def.key} />;
                if (!focusedBrandCountries.spid) return null;
                const AddonSection = def.Section;
                return (
                  <div key={def.key} className="space-y-6">
                    <React.Suspense fallback={<TabSkeleton />}>
                      <AddonSection
                        spid={focusedBrandCountries.spid}
                        scope={effectiveFocusedScope}
                        dateFilter={dateFilter}
                        customDateRange={customDateRange}
                        brandName={focusedAccount.name}
                        merchantToken={focusedAccount.merchantToken}
                        config={a.config}
                      />
                    </React.Suspense>
                  </div>
                );
              })}
            </>
          )}

          {/* ===== OVERVIEW VIEW (non-focused) ===== */}
          {!focusedAccountId && (
            <>
              {/* Sticky Tab Bar - Overview */}
              <div className="sticky top-0 z-30 bg-gradient-to-br from-blue-50 to-cyan-50 pt-2 pb-4 -mx-6 px-6">
                <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl shadow-sm border border-gray-200">
                  {visibleFocusTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => handleTabSwitch(tab.key)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                        focusTab === tab.key
                          ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PERFORMANCE TAB - Overview */}
              {focusTab === "performance" && (
                <div className="space-y-8">
                  {/* Settings / Data Source Configuration — collapsed into popover */}
                  <div className="flex justify-end">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Data Settings
                          {useHybridData && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-700">Hybrid On</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-[420px] max-h-[70vh] overflow-y-auto space-y-4">
                        <HybridDataControls
                          dataStatus={hybridDataStatus}
                          onConfigChange={() => {
                            if (accounts.length > 0 && useHybridData) {
                              updateAccountsWithHybridData(accounts, dateFilter, customDateRange, vendorData)
                                .then(({ updatedAccounts, dataStatus }) => {
                                  setAccounts(updatedAccounts);
                                  setHybridDataStatus({
                                    sales: dataStatus.sales,
                                    ppc: dataStatus.ppc,
                                    asin: dataStatus.asin,
                                    campaign: { type: "live", hasGaps: false },
                                    inventory: { type: "live", hasGaps: false },
                                    vendor: { type: "live", hasGaps: false },
                                  });
                                })
                                .catch(console.error);
                            }
                          }}
                        />

                        <div className="flex items-center space-x-2 p-3 bg-card rounded-lg border">
                          <Switch
                            id="hybrid-data-mode"
                            checked={useHybridData}
                            onCheckedChange={(checked) => {
                              setUseHybridData(checked);
                              localStorage.setItem("dashboard_use_hybrid_data", checked.toString());

                              toast({
                                title: checked ? "Hybrid Data Mode Enabled" : "Hybrid Data Mode Disabled",
                                description: checked
                                  ? "Now using intelligent data source selection based on date ranges"
                                  : "Switched back to traditional Google Sheets data only",
                              });

                              if (accounts.length > 0) {
                                if (checked) {
                                  updateAccountsWithHybridData(accounts, dateFilter, customDateRange, vendorData)
                                    .then(({ updatedAccounts, dataStatus }) => {
                                      setAccounts(updatedAccounts);
                                      setHybridDataStatus({
                                        sales: dataStatus.sales,
                                        ppc: dataStatus.ppc,
                                        asin: dataStatus.asin,
                                        campaign: { type: "live", hasGaps: false },
                                        inventory: { type: "live", hasGaps: false },
                                        vendor: { type: "live", hasGaps: false },
                                      });
                                    })
                                    .catch(console.error);
                                } else {
                                  const updatedAccounts = updateAccountsWithFilteredData(
                                    accounts,
                                    sheetData,
                                    ppcData,
                                    dateFilter,
                                    customDateRange,
                                    vendorData,
                                    supabaseVendorData,
                                  );
                                  setAccounts(updatedAccounts);
                                  setHybridDataStatus(undefined);
                                }
                              }
                            }}
                          />
                          <Label htmlFor="hybrid-data-mode" className="text-sm font-medium">
                            Hybrid Data Mode (Beta)
                          </Label>
                          {hybridDataStatus && (
                            <div className="flex gap-1 ml-auto">
                              <DataSourceIndicator source={hybridDataStatus.sales} dataType="Sales" />
                              <DataSourceIndicator source={hybridDataStatus.ppc} dataType="PPC" />
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Portfolio summary + search/sort + attention filter */}
                  <PortfolioOverviewBar
                    accounts={displayedAccounts}
                    search={overviewSearch}
                    onSearchChange={setOverviewSearch}
                    sort={overviewSort}
                    onSortChange={setOverviewSort}
                    attentionOnly={overviewAttentionOnly}
                    onAttentionOnlyChange={setOverviewAttentionOnly}
                    attentionCount={attentionCount}
                  />

                  {(sheetData.length > 0 || supabaseVendorData.length > 0) && (
                    <SalesHeatmap
                      accounts={overviewAccounts}
                      sheetData={sheetData}
                      ppcData={ppcData}
                      vendorData={vendorData}
                      supabaseVendorData={supabaseVendorData}
                      isBlurred={isAccountNamesBlurred}
                      onFocusAccount={handleFocusAccount}
                      accountTagsMap={accountTagsMap}
                      dateFilter={dateFilter}
                      customDateRange={customDateRange}
                    />
                  )}

                  <MetricsGrid
                    displayedAccounts={displayedAccounts}
                    focusedAccount={focusedAccount}
                    selectedChartMetrics={selectedChartMetrics}
                    onToggleChartMetric={toggleChartMetric}
                    directOrganicMetrics={directOrganicMetrics}
                    directOrganicPreviousMetrics={directOrganicPreviousMetrics}
                    dateFilter={dateFilter}
                  />

                  {/* Status Filter - positioned above account cards */}
                  <div className="flex justify-start">
                    <StatusFilter selectedColors={selectedStatusColors} onColorsChange={setSelectedStatusColors} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {overviewAccounts.map((account) => {
                      const att = attentionMap[account.id];
                      return (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onToggleStar={toggleStar}
                          onEdit={setEditingAccount}
                          onDelete={deleteAccount}
                          onFocus={handleFocusAccount}
                          onStatusColorChange={handleStatusColorChange}
                          isFocused={account.id === focusedAccountId}
                          sheetData={sheetData}
                          isBlurred={isAccountNamesBlurred}
                          accountTags={accountTagsMap[account.merchantToken] || []}
                          needsAttention={att?.needsAttention}
                          attentionReasons={att?.reasons}
                        />
                      );
                    })}
                  </div>
                </div>
              )}


              {/* SEARCH TERMS TAB - Overview placeholder */}
              {focusTab === "search-terms" && (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-md">
                    <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Search Term Data</h3>
                    <p className="text-muted-foreground">
                      Select an account to view Search Term data. Click{" "}
                      <span className="font-medium text-foreground">"Focus on this account only"</span> on any account
                      card.
                    </p>
                  </div>
                </div>
              )}

              {/* BRAND ANALYTICS TAB - Overview placeholder */}
              {focusTab === "brand-analytics" && (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-md">
                    <TrendingUp className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Brand Analytics</h3>
                    <p className="text-muted-foreground">
                      Select an account to view Brand Analytics data. Click{" "}
                      <span className="font-medium text-foreground">"Focus on this account only"</span> on any account
                      card.
                    </p>
                  </div>
                </div>
              )}

              {/* PROFIT & LOSS TAB - Overview placeholder */}
              {focusTab === "profit-loss" && (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-md">
                    <DollarSign className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Profit & Loss</h3>
                    <p className="text-muted-foreground">
                      Select an account to view Profit & Loss data. Click{" "}
                      <span className="font-medium text-foreground">"Focus on this account only"</span> on any account
                      card.
                    </p>
                  </div>
                </div>
              )}

              {/* INVENTORY PLANNER TAB - Overview placeholder */}
              {focusTab === "inventory-planner" && (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-md">
                    <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Inventory Planner</h3>
                    <p className="text-muted-foreground">
                      Select an account to view inventory reorder recommendations. Click{" "}
                      <span className="font-medium text-foreground">"Focus on this account only"</span> on any account card.
                    </p>
                  </div>
                </div>
              )}

              {/* JUNGLE SCOUT TAB - Overview placeholder */}
              {focusTab === "jungle-scout" && isStaff && (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-md">
                    <Leaf className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Jungle Scout</h3>
                    <p className="text-muted-foreground">
                      Select an account to view Jungle Scout data. Click on any account card to focus.
                    </p>
                  </div>
                </div>
              )}

              {/* AUTOMATION TAB - Overview placeholder */}
              {focusTab === "automation" && isStaff && (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-md">
                    <Bot className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Automation</h3>
                    <p className="text-muted-foreground">
                      Select an account to manage automation settings. Click on any account card to focus.
                    </p>
                  </div>
                </div>
              )}

              {/* MARKET INTEL TAB - Overview (no account focus needed) */}
              {focusTab === "market-intel" && isStaff && (
                <div className="space-y-6">
                  <ErrorBoundary fallback={<div className="p-4 text-destructive">Market Intel failed to load.</div>}>
                    <SearchAPIDashboard />
                  </ErrorBoundary>
                </div>
              )}

              {/* ASIN HUB TAB - Overview */}
              {focusTab === "asin-hub" && isStaff && (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center max-w-md">
                    <Crosshair className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">ASIN Hub</h3>
                    <p className="text-muted-foreground mb-4">
                      Click any ASIN in the dashboard to open its full intelligence view, or search directly.
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      <input
                        type="text"
                        placeholder="Enter ASIN (e.g. B09B96TG33)"
                        className="px-3 py-2 rounded-lg border border-border bg-background text-sm w-48"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                            if (val.length >= 10) window.location.href = `/asin/${val}`;
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CLIENT PAYMENTS TAB - Overview (no account focus needed) */}
              {focusTab === "client-payments" && isStaff && (
                <div className="space-y-6">
                  <ClientPaymentsDashboard />
                </div>
              )}
            </>
          )}

          <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Account: {editingAccount?.name}</DialogTitle>
              </DialogHeader>
              {editingAccount && <AccountForm account={editingAccount} onSubmit={handleEditAccount} />}
            </DialogContent>
          </Dialog>

          {/* ShareableLink Dialog */}
          {focusedAccount && (
            <ShareableLink
              isOpen={isShareDialogOpen}
              onClose={() => setIsShareDialogOpen(false)}
              account={focusedAccount}
              sheetData={sheetData}
              ppcData={ppcData}
              asinData={asinData}
              onUpdateAccount={handleUpdateAccount}
            />
          )}
        </div>

        {/* Floating Roadmap Button */}
        <RoadmapFloatingButton />
        <AIAnalystChat accountName={focusedAccount?.name} merchantToken={focusedAccount?.merchantToken} />
      </div>
    </AuthGate>
  );
};

export default Index;
