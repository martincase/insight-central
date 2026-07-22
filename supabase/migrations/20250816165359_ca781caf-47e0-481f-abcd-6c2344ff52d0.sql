-- Add last_synced_at column to daily_sales_ppc_data table to track sync timestamps
ALTER TABLE public.daily_sales_ppc_data 
ADD COLUMN last_synced_at timestamp with time zone DEFAULT now();

-- Add last_synced_at column to daily_asin_data table
ALTER TABLE public.daily_asin_data 
ADD COLUMN last_synced_at timestamp with time zone DEFAULT now();

-- Add last_synced_at column to daily_campaign_data table  
ALTER TABLE public.daily_campaign_data 
ADD COLUMN last_synced_at timestamp with time zone DEFAULT now();

-- Update existing records to have current timestamp
UPDATE public.daily_sales_ppc_data SET last_synced_at = now() WHERE last_synced_at IS NULL;
UPDATE public.daily_asin_data SET last_synced_at = now() WHERE last_synced_at IS NULL;
UPDATE public.daily_campaign_data SET last_synced_at = now() WHERE last_synced_at IS NULL;