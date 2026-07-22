-- Add advertising_reliance column to daily_sales_ppc_data table
ALTER TABLE public.daily_sales_ppc_data 
ADD COLUMN advertising_reliance numeric DEFAULT 0;

-- Update existing records to calculate advertising reliance
UPDATE public.daily_sales_ppc_data 
SET advertising_reliance = CASE 
  WHEN sales > 0 THEN (ppc_sales / sales) * 100 
  ELSE 0 
END;