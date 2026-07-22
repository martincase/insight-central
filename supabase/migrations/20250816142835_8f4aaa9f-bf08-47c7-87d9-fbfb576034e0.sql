-- Create backup tables to store weekly snapshots of data

-- Backup table for accounts master data
CREATE TABLE public.accounts_master_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date date NOT NULL DEFAULT CURRENT_DATE,
  original_id uuid NOT NULL,
  account_name text NOT NULL,
  merchant_token text NOT NULL,
  account_type text,
  ppc_account_name text,
  seller_central_link text,
  status text DEFAULT 'active',
  is_starred boolean DEFAULT false,
  original_created_at timestamp with time zone NOT NULL,
  original_updated_at timestamp with time zone NOT NULL,
  backed_up_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Backup table for daily sales PPC data
CREATE TABLE public.daily_sales_ppc_data_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date date NOT NULL DEFAULT CURRENT_DATE,
  original_id uuid NOT NULL,
  record_date date NOT NULL,
  merchant_token text NOT NULL,
  account_name text,
  sales numeric DEFAULT 0,
  ppc_sales numeric DEFAULT 0,
  ppc_spend numeric DEFAULT 0,
  page_views numeric DEFAULT 0,
  units_ordered numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  buy_box_percentage numeric DEFAULT 0,
  advertising_reliance numeric DEFAULT 0,
  tacos numeric DEFAULT 0,
  acos numeric DEFAULT 0,
  original_created_at timestamp with time zone,
  backed_up_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Backup table for daily ASIN data
CREATE TABLE public.daily_asin_data_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date date NOT NULL DEFAULT CURRENT_DATE,
  original_id uuid NOT NULL,
  record_date date NOT NULL,
  merchant_token text NOT NULL,
  account_name text,
  parent_asin text,
  child_asin text,
  product_title text,
  sales numeric DEFAULT 0,
  units_sold numeric DEFAULT 0,
  page_views numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  buy_box_percentage numeric DEFAULT 0,
  original_created_at timestamp with time zone,
  backed_up_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Backup table for daily campaign data
CREATE TABLE public.daily_campaign_data_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date date NOT NULL DEFAULT CURRENT_DATE,
  original_id uuid NOT NULL,
  record_date date NOT NULL,
  merchant_token text NOT NULL,
  account_name text,
  campaign_name text NOT NULL,
  sales numeric DEFAULT 0,
  spend numeric DEFAULT 0,
  acos numeric DEFAULT 0,
  alert_type text,
  alert_message text,
  original_created_at timestamp with time zone,
  backed_up_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on backup tables
ALTER TABLE public.accounts_master_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales_ppc_data_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_asin_data_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_campaign_data_backup ENABLE ROW LEVEL SECURITY;

-- Create policies for backup tables (allow all access)
CREATE POLICY "Allow all access to accounts_master_backup" 
ON public.accounts_master_backup 
FOR ALL 
USING (true);

CREATE POLICY "Allow all access to daily_sales_ppc_data_backup" 
ON public.daily_sales_ppc_data_backup 
FOR ALL 
USING (true);

CREATE POLICY "Allow all access to daily_asin_data_backup" 
ON public.daily_asin_data_backup 
FOR ALL 
USING (true);

CREATE POLICY "Allow all access to daily_campaign_data_backup" 
ON public.daily_campaign_data_backup 
FOR ALL 
USING (true);

-- Create indexes for better performance on backup tables
CREATE INDEX idx_accounts_master_backup_date ON public.accounts_master_backup(backup_date);
CREATE INDEX idx_daily_sales_ppc_data_backup_date ON public.daily_sales_ppc_data_backup(backup_date);
CREATE INDEX idx_daily_asin_data_backup_date ON public.daily_asin_data_backup(backup_date);
CREATE INDEX idx_daily_campaign_data_backup_date ON public.daily_campaign_data_backup(backup_date);

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;