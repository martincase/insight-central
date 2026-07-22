-- Add unique constraints to prevent duplicate records in data banking tables

-- Add unique constraint to daily_vendor_data table
-- This prevents duplicate vendor records for the same date, merchant_token, and asin
ALTER TABLE public.daily_vendor_data 
ADD CONSTRAINT unique_daily_vendor_data 
UNIQUE (record_date, merchant_token, asin);

-- Add unique constraint to daily_campaign_data table  
-- This prevents duplicate campaign records for the same date, merchant_token, and campaign_name
ALTER TABLE public.daily_campaign_data 
ADD CONSTRAINT unique_daily_campaign_data 
UNIQUE (record_date, merchant_token, campaign_name);

-- Add unique constraint to daily_inventory_data table
-- This prevents duplicate inventory records for the same date, merchant_token, sku, and asin
ALTER TABLE public.daily_inventory_data 
ADD CONSTRAINT unique_daily_inventory_data 
UNIQUE (record_date, merchant_token, sku, asin);

-- Add indexes to improve performance on these constraint checks
CREATE INDEX IF NOT EXISTS idx_daily_vendor_data_unique ON public.daily_vendor_data (record_date, merchant_token, asin);
CREATE INDEX IF NOT EXISTS idx_daily_campaign_data_unique ON public.daily_campaign_data (record_date, merchant_token, campaign_name);
CREATE INDEX IF NOT EXISTS idx_daily_inventory_data_unique ON public.daily_inventory_data (record_date, merchant_token, sku, asin);

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'Added unique constraints to prevent duplicates in daily data tables';
    RAISE NOTICE '- daily_vendor_data: (record_date, merchant_token, asin)';
    RAISE NOTICE '- daily_campaign_data: (record_date, merchant_token, campaign_name)';
    RAISE NOTICE '- daily_inventory_data: (record_date, merchant_token, sku, asin)';
END $$;