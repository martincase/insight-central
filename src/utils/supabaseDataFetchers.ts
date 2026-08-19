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
 * Fetch vendor data from Supabase vw_daily_vendor_data table.
 * Fetches last 90 days by default.
 */
/**
 * Amazon marketplace id per country. `vw_daily_vendor_data` exposes the base
 * table's own selling_partner_id/marketplace_id alongside the joined
 * merchant_token, and filtering on those two is what makes the query fast —
 * see the comment in fetchVendorDataFromSupabase.
 */
const MARKETPLACE_BY_COUNTRY: Record<string, string> = {
  GB: 'A1F83G8C2ARO7P', UK: 'A1F83G8C2ARO7P', US: 'ATVPDKIKX0DER',
  DE: 'A1PA6795UKMFR9', FR: 'A13V1IB3VIYZZH', IT: 'APJ6JRA9NG5V4',
  ES: 'A1RKKUPIHCS9HS', NL: 'A1805IZSGTT6HS', BE: 'AMEN7PMS3EDWL',
  IE: 'A28R8C7NBKEWEA', SE: 'A2NODRKZP88ZB9', PL: 'A1C3SOZRARQ6R3',
  AU: 'A39IBJ37TRP1C6', CA: 'A2EUQ1WTGCTBG2', MX: 'A1AM78C64UM0Y8',
  BR: 'A2Q3Y263D00KWC', JP: 'A1VC38T7YXB528', IN: 'A21TJRUUN4KGV',
  TR: 'A33AVAJ2PDY3EV', AE: 'A2VIGQ35RCS4UG', SG: 'A19VAU5U5O7RUS',
  SA: 'A17E79C6D8DWNP', EG: 'ARBP9OOSHTCHU',
};

export async function fetchVendorDataFromSupabase(
  merchantToken?: string,
  daysBack: number = 90
): Promise<SupabaseVendorRow[]> {

  const fromDate = format(subDays(new Date(), daysBack), "yyyy-MM-dd");
  const allData: SupabaseVendorRow[] = [];
  let offset = 0;
  const pageSize = 1000;

  // merchant_token is NOT a column of vendor_daily_metrics: in this view it is
  // brand_marketplaces.sales_account_key, reached by a join. Filtering on it
  // therefore constrains the DIMENSION table, so selling_partner_id and
  // marketplace_id arrive at the 9.7M-row fact table as join VARIABLES rather
  // than constants. The planner can still use idx_vdm_spid_mkt_date to look
  // rows up, but it cannot use it to satisfy ORDER BY record_date DESC — so it
  // fetched all 283,986 matching rows and top-N sorted them for every single
  // page. 6,968ms per page against anon's 15s statement timeout.
  //
  // The view also exposes the fact table's own keys. Filtering on those gives
  // the planner its constants back, it walks the index backwards and stops at
  // 1,000 rows: the same request measured 4.56ms. Same data, same index.
  const sep = merchantToken ? merchantToken.lastIndexOf('-') : -1;
  const spid = sep > 0 ? merchantToken!.slice(0, sep) : undefined;
  const marketplaceId = sep > 0
    ? MARKETPLACE_BY_COUNTRY[merchantToken!.slice(sep + 1).toUpperCase()]
    : undefined;

  while (true) {
    let query = supabase
      .from("vw_daily_vendor_data")
      .select(
        "record_date, merchant_token, account_name, asin, sales, units_ordered, page_views, buy_box_percentage, conversion_rate, shipped_cogs_amount, shipped_revenue_amount",
      )
      .gte("record_date", fromDate)
      .order("record_date", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (spid && marketplaceId) {
      query = query.eq("selling_partner_id", spid).eq("marketplace_id", marketplaceId);
    } else if (merchantToken) {
      // Unknown country suffix — fall back to the slow-but-correct filter rather
      // than silently widening the query to every vendor account.
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
