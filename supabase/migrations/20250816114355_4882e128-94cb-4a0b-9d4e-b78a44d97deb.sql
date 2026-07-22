-- Drop the existing table and recreate with correct structure
DROP TABLE IF EXISTS sheet1_daily_data;

-- Create the table with the ACTUAL Google Sheets structure
CREATE TABLE sheet1_daily_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE sheet1_daily_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all access to sheet1_daily_data" 
ON sheet1_daily_data 
FOR ALL 
USING (true);