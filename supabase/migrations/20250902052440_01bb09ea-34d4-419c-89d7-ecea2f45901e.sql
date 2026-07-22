-- Create table for historical monthly performance data
CREATE TABLE public.historical_monthly_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_token TEXT NOT NULL,
  account_name TEXT NOT NULL,
  month_year DATE NOT NULL, -- First day of the month (e.g., 2024-01-01 for January 2024)
  
  -- Advertising metrics
  advertising_spend_gbp NUMERIC DEFAULT 0,
  advertising_sales_gbp NUMERIC DEFAULT 0,
  acos NUMERIC DEFAULT 0,
  
  -- Overall sales metrics
  overall_sales_gbp NUMERIC DEFAULT 0,
  ad_cost_pct_vs_overall NUMERIC DEFAULT 0,
  ad_sales_pct_vs_overall NUMERIC DEFAULT 0,
  
  -- Performance metrics
  impressions NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  cost_per_click_gbp NUMERIC DEFAULT 0,
  click_through_rate NUMERIC DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.historical_monthly_data ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Allow all access to historical monthly data" 
ON public.historical_monthly_data 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_historical_monthly_data_merchant_token ON public.historical_monthly_data(merchant_token);
CREATE INDEX idx_historical_monthly_data_month_year ON public.historical_monthly_data(month_year);
CREATE INDEX idx_historical_monthly_data_account_name ON public.historical_monthly_data(account_name);

-- Create unique constraint to prevent duplicate records for same account/month
CREATE UNIQUE INDEX unique_historical_monthly_data 
ON public.historical_monthly_data(merchant_token, account_name, month_year);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_historical_monthly_data_updated_at
BEFORE UPDATE ON public.historical_monthly_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();