-- Drop old tables
DROP TABLE IF EXISTS "Daily Account Snapshots Table";
DROP TABLE IF EXISTS "daily_account_snapshots";
DROP TABLE IF EXISTS "daily_asin_data";
DROP TABLE IF EXISTS "daily_ppc_campaigns";

-- Create tables that exactly match Google Sheets structure

-- 1. Sheet1 (Main daily account performance data)
CREATE TABLE public.sheet1_daily_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    record_date DATE NOT NULL,
    account_name TEXT,
    merchant_token TEXT,
    ppc_account_name TEXT,
    account_type TEXT,
    sales NUMERIC DEFAULT 0,
    ppc_spend NUMERIC DEFAULT 0,
    ppc_sales NUMERIC DEFAULT 0,
    acos NUMERIC DEFAULT 0,
    tacos NUMERIC DEFAULT 0,
    units_ordered NUMERIC DEFAULT 0,
    page_views NUMERIC DEFAULT 0,
    buy_box_percentage NUMERIC DEFAULT 0,
    conversion_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(record_date, merchant_token)
);

-- 2. PPC daily data
CREATE TABLE public.ppc_daily_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    record_date DATE NOT NULL,
    account_name TEXT,
    merchant_token TEXT,
    ppc_account_name TEXT,
    spend NUMERIC DEFAULT 0,
    sales NUMERIC DEFAULT 0,
    acos NUMERIC DEFAULT 0,
    impressions NUMERIC DEFAULT 0,
    clicks NUMERIC DEFAULT 0,
    ctr NUMERIC DEFAULT 0,
    cpc NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(record_date, merchant_token, ppc_account_name)
);

-- 3. PPC Campaigns daily data
CREATE TABLE public.ppc_campaigns_daily_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    record_date DATE NOT NULL,
    account_name TEXT,
    merchant_token TEXT,
    ppc_account_name TEXT,
    campaign_name TEXT,
    campaign_type TEXT,
    spend NUMERIC DEFAULT 0,
    sales NUMERIC DEFAULT 0,
    acos NUMERIC DEFAULT 0,
    impressions NUMERIC DEFAULT 0,
    clicks NUMERIC DEFAULT 0,
    ctr NUMERIC DEFAULT 0,
    cpc NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(record_date, merchant_token, campaign_name)
);

-- 4. ASIN Sales daily data
CREATE TABLE public.asin_sales_daily_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    record_date DATE NOT NULL,
    account_name TEXT,
    merchant_token TEXT,
    parent_asin TEXT,
    child_asin TEXT,
    product_title TEXT,
    sales NUMERIC DEFAULT 0,
    units_sold NUMERIC DEFAULT 0,
    page_views NUMERIC DEFAULT 0,
    buy_box_percentage NUMERIC DEFAULT 0,
    conversion_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(record_date, merchant_token, child_asin)
);

-- 5. Accounts master data (reference table)
CREATE TABLE public.accounts_master (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    account_name TEXT NOT NULL,
    merchant_token TEXT NOT NULL UNIQUE,
    ppc_account_name TEXT,
    account_type TEXT,
    seller_central_link TEXT,
    status TEXT DEFAULT 'active',
    is_starred BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Vendor daily data
CREATE TABLE public.vendor_daily_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    record_date DATE NOT NULL,
    account_name TEXT,
    merchant_token TEXT,
    vendor_code TEXT,
    sales NUMERIC DEFAULT 0,
    units_ordered NUMERIC DEFAULT 0,
    inventory_level NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(record_date, merchant_token, vendor_code)
);

-- Enable Row Level Security on all new tables
ALTER TABLE public.sheet1_daily_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppc_daily_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppc_campaigns_daily_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asin_sales_daily_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_daily_data ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all access (adjust as needed for your security requirements)
CREATE POLICY "Allow all access to sheet1_daily_data" ON public.sheet1_daily_data FOR ALL USING (true);
CREATE POLICY "Allow all access to ppc_daily_data" ON public.ppc_daily_data FOR ALL USING (true);
CREATE POLICY "Allow all access to ppc_campaigns_daily_data" ON public.ppc_campaigns_daily_data FOR ALL USING (true);
CREATE POLICY "Allow all access to asin_sales_daily_data" ON public.asin_sales_daily_data FOR ALL USING (true);
CREATE POLICY "Allow all access to accounts_master" ON public.accounts_master FOR ALL USING (true);
CREATE POLICY "Allow all access to vendor_daily_data" ON public.vendor_daily_data FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_sheet1_record_date ON public.sheet1_daily_data(record_date);
CREATE INDEX idx_sheet1_merchant_token ON public.sheet1_daily_data(merchant_token);
CREATE INDEX idx_ppc_record_date ON public.ppc_daily_data(record_date);
CREATE INDEX idx_ppc_merchant_token ON public.ppc_daily_data(merchant_token);
CREATE INDEX idx_campaigns_record_date ON public.ppc_campaigns_daily_data(record_date);
CREATE INDEX idx_campaigns_merchant_token ON public.ppc_campaigns_daily_data(merchant_token);
CREATE INDEX idx_asin_record_date ON public.asin_sales_daily_data(record_date);
CREATE INDEX idx_asin_merchant_token ON public.asin_sales_daily_data(merchant_token);
CREATE INDEX idx_vendor_record_date ON public.vendor_daily_data(record_date);
CREATE INDEX idx_vendor_merchant_token ON public.vendor_daily_data(merchant_token);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for accounts_master
CREATE TRIGGER update_accounts_master_updated_at
    BEFORE UPDATE ON public.accounts_master
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();