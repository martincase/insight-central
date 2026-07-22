-- Add ppc_account_name column to daily_sales_ppc_data table
ALTER TABLE public.daily_sales_ppc_data 
ADD COLUMN ppc_account_name text;