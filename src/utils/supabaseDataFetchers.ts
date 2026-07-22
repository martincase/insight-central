import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

export interface SupabaseASINRow {
  record_date: string;
  merchant_token: string;
  account_name: string;
  parent_asin: string | null;
  child_asin: string;
  product_title: string | null;
  sales: number;
  units_sold: number;
  page_views: number;
  buy_box_percentage: number;
  conversion_rate: number;
}

export interface SupabaseVendorRow {
  record_date: string;
  merchant_token: string;
  account_name: string;
  asin: string | null;
  sales: number;
  units_ordered: number;
  page_views: number;
  buy_box_percentage: number;
  conversion_rate: number;
  shipped_cogs_amount: number;
  shipped_revenue_amount: number;
}

/**
 * Fetch ASIN data from Supabase daily_asin_data table.
 * Fetches last 90 days by default to cover most date filter scenarios
 * while staying within reasonable query sizes.
 */
export async function fetchASINDataFromSupabase(merchantToken?: string, daysBack: number = 90): Promise<SupabaseASINRow[]> {

  const fromDate = format(subDays(new Date(), daysBack), "yyyy-MM-dd");
  const allData: SupabaseASINRow[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("daily_asin_data")
      .select(
        "record_date, merchant_token, account_name, parent_asin, child_asin, product_title, sales, units_sold, page_views, buy_box_percentage, conversion_rate",
      )
      .gte("record_date", fromDate)
      .order("record_date", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (merchantToken) {
      query = query.eq("merchant_token", merchantToken);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) break;
    allData.push(...(data as SupabaseASINRow[]));

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return allData;
}

/**
 * Fetch vendor data from Supabase daily_vendor_data table.
 * Fetches last 90 days by default.
 */
export async function fetchVendorDataFromSupabase(
  merchantToken?: string,
  daysBack: number = 90
): Promise<SupabaseVendorRow[]> {

  const fromDate = format(subDays(new Date(), daysBack), "yyyy-MM-dd");
  const allData: SupabaseVendorRow[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("daily_vendor_data")
      .select(
        "record_date, merchant_token, account_name, asin, sales, units_ordered, page_views, buy_box_percentage, conversion_rate, shipped_cogs_amount, shipped_revenue_amount",
      )
      .gte("record_date", fromDate)
      .order("record_date", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (merchantToken) {
      query = query.eq("merchant_token", merchantToken);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) break;
    allData.push(...(data as SupabaseVendorRow[]));

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return allData;
}

export interface SupabaseVendorInventoryRow {
  id: string;
  record_date: string;
  account_name: string;
  account_id: string;
  asin: string | null;
  marketplace_country: string | null;
  sellable_on_hand_units: number | null;
  sellable_on_hand_cost: number | null;
  unsellable_on_hand_units: number | null;
  unhealthy_inventory_units: number | null;
  open_purchase_order_units: number | null;
  unfilled_customer_ordered_units: number | null;
  product_title: string | null;
}

/**
 * Fetch vendor inventory data from Supabase vendor_inventory_data table.
 * Filters by account_id (which stores the merchant token for vendor accounts).
 */
export async function fetchInventoryFromSupabase(merchantToken: string): Promise<SupabaseVendorInventoryRow[]> {

  const { data, error } = await supabase
    .from("vendor_inventory_data")
    .select("*")
    .eq("account_id", merchantToken)
    .order("record_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as SupabaseVendorInventoryRow[];
}
