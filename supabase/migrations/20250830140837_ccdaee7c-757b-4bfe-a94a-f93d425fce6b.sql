-- Create daily_vendor_data table for vendor sales data
CREATE TABLE public.daily_vendor_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_date DATE NOT NULL,
  merchant_token TEXT NOT NULL,
  account_name TEXT,
  sales NUMERIC DEFAULT 0,
  units_ordered NUMERIC DEFAULT 0,
  page_views NUMERIC DEFAULT 0,
  buy_box_percentage NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  asin TEXT,
  shipped_cogs_amount NUMERIC DEFAULT 0,
  shipped_revenue_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_vendor_data ENABLE ROW LEVEL SECURITY;

-- Create policy for full access
CREATE POLICY "Allow all access to daily_vendor_data" 
ON public.daily_vendor_data 
FOR ALL 
USING (true);

-- Create daily_vendor_data_backup table
CREATE TABLE public.daily_vendor_data_backup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  backup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  record_date DATE NOT NULL,
  merchant_token TEXT NOT NULL,
  account_name TEXT,
  sales NUMERIC DEFAULT 0,
  units_ordered NUMERIC DEFAULT 0,
  page_views NUMERIC DEFAULT 0,
  buy_box_percentage NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  asin TEXT,
  shipped_cogs_amount NUMERIC DEFAULT 0,
  shipped_revenue_amount NUMERIC DEFAULT 0,
  original_created_at TIMESTAMP WITH TIME ZONE,
  backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_vendor_data_backup ENABLE ROW LEVEL SECURITY;

-- Create policy for full access
CREATE POLICY "Allow all access to daily_vendor_data_backup" 
ON public.daily_vendor_data_backup 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_daily_vendor_data_record_date ON public.daily_vendor_data(record_date);
CREATE INDEX idx_daily_vendor_data_merchant_token ON public.daily_vendor_data(merchant_token);
CREATE INDEX idx_daily_vendor_data_account_name ON public.daily_vendor_data(account_name);

CREATE INDEX idx_daily_vendor_data_backup_record_date ON public.daily_vendor_data_backup(record_date);
CREATE INDEX idx_daily_vendor_data_backup_merchant_token ON public.daily_vendor_data_backup(merchant_token);
CREATE INDEX idx_daily_vendor_data_backup_backup_date ON public.daily_vendor_data_backup(backup_date);