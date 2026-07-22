-- Enhance the existing daily_account_snapshots table and create new tables for comprehensive data banking

-- First, let's ensure the existing table has all needed columns and indexes
CREATE INDEX IF NOT EXISTS idx_daily_account_snapshots_date ON daily_account_snapshots(record_date);
CREATE INDEX IF NOT EXISTS idx_daily_account_snapshots_merchant_token ON daily_account_snapshots(merchant_token);
CREATE INDEX IF NOT EXISTS idx_daily_account_snapshots_date_merchant ON daily_account_snapshots(record_date, merchant_token);

-- Create table for daily ASIN data
CREATE TABLE IF NOT EXISTS daily_asin_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_date DATE NOT NULL,
  child_asin TEXT NOT NULL,
  sales NUMERIC DEFAULT 0,
  units_sold NUMERIC DEFAULT 0,
  page_views NUMERIC DEFAULT 0,
  buy_box_percentage NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  account_name TEXT,
  merchant_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure no duplicate ASIN data per date per account
  UNIQUE(record_date, child_asin, merchant_token)
);

-- Create indexes for daily_asin_data
CREATE INDEX idx_daily_asin_data_date ON daily_asin_data(record_date);
CREATE INDEX idx_daily_asin_data_merchant_token ON daily_asin_data(merchant_token);
CREATE INDEX idx_daily_asin_data_asin ON daily_asin_data(child_asin);
CREATE INDEX idx_daily_asin_data_date_merchant ON daily_asin_data(record_date, merchant_token);

-- Create table for daily PPC campaign data
CREATE TABLE IF NOT EXISTS daily_ppc_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_date DATE NOT NULL,
  account_name TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  spend NUMERIC DEFAULT 0,
  sales NUMERIC DEFAULT 0,
  acos NUMERIC DEFAULT 0,
  impressions NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  merchant_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure no duplicate campaign data per date
  UNIQUE(record_date, account_name, campaign_name)
);

-- Create indexes for daily_ppc_campaigns
CREATE INDEX idx_daily_ppc_campaigns_date ON daily_ppc_campaigns(record_date);
CREATE INDEX idx_daily_ppc_campaigns_account ON daily_ppc_campaigns(account_name);
CREATE INDEX idx_daily_ppc_campaigns_date_account ON daily_ppc_campaigns(record_date, account_name);

-- Create table for data banking logs
CREATE TABLE IF NOT EXISTS data_banking_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banking_date DATE NOT NULL,
  data_type TEXT NOT NULL, -- 'accounts', 'asin', 'campaigns'
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'error'
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for data_banking_logs
CREATE INDEX idx_data_banking_logs_date ON data_banking_logs(banking_date);
CREATE INDEX idx_data_banking_logs_status ON data_banking_logs(status);
CREATE INDEX idx_data_banking_logs_type ON data_banking_logs(data_type);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE daily_account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_asin_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_ppc_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_banking_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (since this is a business dashboard without user auth yet)
CREATE POLICY "Allow all access to daily_account_snapshots" ON daily_account_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all access to daily_asin_data" ON daily_asin_data FOR ALL USING (true);
CREATE POLICY "Allow all access to daily_ppc_campaigns" ON daily_ppc_campaigns FOR ALL USING (true);
CREATE POLICY "Allow all access to data_banking_logs" ON data_banking_logs FOR ALL USING (true);