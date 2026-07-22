export interface MonthlyData {
  month: string; // ISO date string like "2025-07-01"
  client_name?: string; // from ppc_monthly_performance
  currency?: string; // e.g. 'GBP', 'USD', 'EUR'
  spend_gbp: number | null;
  ad_sales_gbp: number | null;
  acos: number | null;
  overall_sales_gbp: number | null;
  ad_cost_pct_vs_overall: number | null;
  ad_sales_pct_vs_overall: number | null;
  impressions: number | null;
  clicks: number | null;
  cpc_gbp: number | null;
  ctr: number | null;
}

export interface ColumnConfig {
  key: string; // keyof MonthlyData or extended keys
  label: string;
  tooltip: string;
  format: (value: any) => string;
  sortable: boolean;
  width?: string;
}
