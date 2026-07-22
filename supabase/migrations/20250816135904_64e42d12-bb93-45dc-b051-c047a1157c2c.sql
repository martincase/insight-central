-- Create daily_campaign_data table for storing campaign performance data
CREATE TABLE public.daily_campaign_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_date date NOT NULL,
  merchant_token text NOT NULL,
  account_name text,
  campaign_name text NOT NULL,
  spend numeric DEFAULT 0,
  sales numeric DEFAULT 0,
  acos numeric DEFAULT 0,
  alert_type text,
  alert_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_campaign_data ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (matching other tables)
CREATE POLICY "Allow all access to daily_campaign_data" 
ON public.daily_campaign_data 
FOR ALL 
USING (true);

-- Create index for better performance on lookups
CREATE INDEX idx_daily_campaign_data_record_date ON public.daily_campaign_data(record_date);
CREATE INDEX idx_daily_campaign_data_merchant_token ON public.daily_campaign_data(merchant_token);
CREATE INDEX idx_daily_campaign_data_account_name ON public.daily_campaign_data(account_name);