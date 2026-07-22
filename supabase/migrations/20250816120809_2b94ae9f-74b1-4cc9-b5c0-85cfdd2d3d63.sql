-- Create sales/ppc daily data table
CREATE TABLE daily_sales_ppc_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  merchant_token TEXT NOT NULL,
  account_name TEXT,
  
  -- Sales metrics
  sales NUMERIC DEFAULT 0,
  units_ordered NUMERIC DEFAULT 0,
  page_views NUMERIC DEFAULT 0,
  buy_box_percentage NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  
  -- PPC metrics
  ppc_spend NUMERIC DEFAULT 0,
  ppc_sales NUMERIC DEFAULT 0,
  acos NUMERIC DEFAULT 0,
  tacos NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(record_date, merchant_token)
);

-- Create ASIN daily data table
CREATE TABLE daily_asin_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  merchant_token TEXT NOT NULL,
  account_name TEXT,
  
  -- ASIN identification
  parent_asin TEXT,
  child_asin TEXT,
  product_title TEXT,
  
  -- ASIN metrics
  sales NUMERIC DEFAULT 0,
  units_sold NUMERIC DEFAULT 0,
  page_views NUMERIC DEFAULT 0,
  buy_box_percentage NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(record_date, merchant_token, child_asin)
);

-- Enable RLS on both tables
ALTER TABLE daily_sales_ppc_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_asin_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all access to daily_sales_ppc_data" 
ON daily_sales_ppc_data 
FOR ALL 
USING (true);

CREATE POLICY "Allow all access to daily_asin_data" 
ON daily_asin_data 
FOR ALL 
USING (true);