CREATE POLICY "Allow anon read access to daily_asin_data"
  ON public.daily_asin_data
  FOR SELECT
  TO anon
  USING (true);