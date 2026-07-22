-- Create daily sync status tracking table
CREATE TABLE public.daily_sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,
  sync_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  records_processed INTEGER DEFAULT 0,
  sales_records INTEGER DEFAULT 0,
  ppc_records INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  execution_time_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sync_type, sync_date)
);

-- Enable RLS
ALTER TABLE public.daily_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all access to daily sync status" 
ON public.daily_sync_status 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_sync_status_updated_at
BEFORE UPDATE ON public.daily_sync_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();