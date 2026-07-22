-- Add missing impressions and clicks columns to daily_ppc_data table
ALTER TABLE public.daily_ppc_data 
ADD COLUMN impressions numeric DEFAULT 0,
ADD COLUMN clicks numeric DEFAULT 0;