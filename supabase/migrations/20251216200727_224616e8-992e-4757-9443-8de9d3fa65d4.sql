-- Enable RLS and allow public read access (non-sensitive data)
ALTER TABLE ppc_seller_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to ppc_seller_names"
ON ppc_seller_names FOR SELECT
USING (true);