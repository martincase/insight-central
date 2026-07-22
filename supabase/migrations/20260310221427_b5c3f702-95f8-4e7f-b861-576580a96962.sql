-- Enable RLS on xero_account_mapping
ALTER TABLE public.xero_account_mapping ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
ON public.xero_account_mapping
FOR SELECT
USING (true);

-- Allow public update access (for mapping/unmapping)
CREATE POLICY "Allow public update access"
ON public.xero_account_mapping
FOR UPDATE
USING (true)
WITH CHECK (true);