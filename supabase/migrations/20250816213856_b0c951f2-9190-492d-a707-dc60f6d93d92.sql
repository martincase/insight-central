-- Create new daily_ppc_data table for PPC-specific data
CREATE TABLE public.daily_ppc_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_date date NOT NULL,
  ppc_account_name text NOT NULL,
  merchant_token text NOT NULL,
  account_name text,
  ppc_spend numeric DEFAULT 0,
  ppc_sales numeric DEFAULT 0,
  acos numeric DEFAULT 0,
  tacos numeric DEFAULT 0,
  advertising_reliance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  last_synced_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.daily_ppc_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the new table
CREATE POLICY "Allow all access to daily_ppc_data" 
ON public.daily_ppc_data 
FOR ALL 
USING (true);

-- Migrate existing PPC data to the new table
INSERT INTO public.daily_ppc_data (
  record_date, 
  ppc_account_name, 
  merchant_token, 
  account_name,
  ppc_spend, 
  ppc_sales, 
  acos, 
  tacos, 
  advertising_reliance,
  created_at,
  last_synced_at
)
SELECT 
  record_date,
  ppc_account_name,
  merchant_token,
  account_name,
  ppc_spend,
  ppc_sales,
  acos,
  tacos,
  advertising_reliance,
  created_at,
  last_synced_at
FROM public.daily_sales_ppc_data 
WHERE ppc_account_name IS NOT NULL 
  AND (ppc_spend > 0 OR ppc_sales > 0 OR acos > 0 OR tacos > 0 OR advertising_reliance > 0);

-- Remove PPC fields from daily_sales_ppc_data (now just daily sales data)
ALTER TABLE public.daily_sales_ppc_data 
  DROP COLUMN ppc_spend,
  DROP COLUMN ppc_sales,
  DROP COLUMN acos,
  DROP COLUMN tacos,
  DROP COLUMN advertising_reliance,
  DROP COLUMN ppc_account_name;

-- Create indexes for better performance
CREATE INDEX idx_daily_ppc_data_date_account ON public.daily_ppc_data(record_date, ppc_account_name);
CREATE INDEX idx_daily_ppc_data_merchant_token ON public.daily_ppc_data(merchant_token);
CREATE INDEX idx_daily_sales_ppc_data_date_merchant ON public.daily_sales_ppc_data(record_date, merchant_token);