ALTER TABLE IF EXISTS public.xero_client_payment_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
ON public.xero_client_payment_grades
FOR SELECT USING (true);