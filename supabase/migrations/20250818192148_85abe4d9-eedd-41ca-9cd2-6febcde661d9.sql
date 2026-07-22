-- Create daily inventory data table
CREATE TABLE public.daily_inventory_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_date DATE NOT NULL,
  merchant_token TEXT NOT NULL,
  account_name TEXT,
  sku TEXT NOT NULL,
  asin TEXT NOT NULL,
  product_name TEXT,
  quantity NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  fulfillment_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create backup table
CREATE TABLE public.daily_inventory_data_backup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  backup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  record_date DATE NOT NULL,
  merchant_token TEXT NOT NULL,
  account_name TEXT,
  sku TEXT NOT NULL,
  asin TEXT NOT NULL,
  product_name TEXT,
  quantity NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  fulfillment_type TEXT,
  original_created_at TIMESTAMP WITH TIME ZONE,
  backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_inventory_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inventory_data_backup ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all access to daily_inventory_data" 
ON public.daily_inventory_data 
FOR ALL 
USING (true);

CREATE POLICY "Allow all access to daily_inventory_data_backup" 
ON public.daily_inventory_data_backup 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_daily_inventory_data_record_date ON public.daily_inventory_data(record_date);
CREATE INDEX idx_daily_inventory_data_merchant_token ON public.daily_inventory_data(merchant_token);
CREATE INDEX idx_daily_inventory_data_asin ON public.daily_inventory_data(asin);
CREATE INDEX idx_daily_inventory_data_backup_record_date ON public.daily_inventory_data_backup(record_date);