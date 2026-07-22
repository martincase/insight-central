
import { useState } from 'react';
import type { AccountData, DateFilter } from '@/types/dashboard';

export const useDashboardData = () => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('last-7-days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [ppcData, setPpcData] = useState<any[]>([]);
  const [asinData, setAsinData] = useState<any[]>([]);
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(null);
  const [isAccountNamesBlurred, setIsAccountNamesBlurred] = useState(false);
  const [vendorData, setVendorData] = useState<any[]>([]);
  const [supabaseVendorData, setSupabaseVendorData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);

  return {
    accounts,
    setAccounts,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    selectedDate,
    setSelectedDate,
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
    setInventoryData
  };
};
