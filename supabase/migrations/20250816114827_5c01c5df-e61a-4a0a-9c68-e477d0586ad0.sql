-- Drop and recreate with ACTUAL Google Sheets structure
DROP TABLE IF EXISTS sheet1_daily_data;

CREATE TABLE sheet1_daily_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  datasource TEXT,
  date_from_sheet TEXT,
  source TEXT,
  account_id TEXT,
  account_name TEXT,
  sales_amount NUMERIC DEFAULT 0,
  currency_code TEXT,
  units_ordered NUMERIC DEFAULT 0,
  browser_sessions NUMERIC DEFAULT 0,
  page_views NUMERIC DEFAULT 0,
  buy_box_percentage NUMERIC DEFAULT 0,
  negative_feedback_received NUMERIC DEFAULT 0,
  unit_session_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE sheet1_daily_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all access to sheet1_daily_data" 
ON sheet1_daily_data 
FOR ALL 
USING (true);