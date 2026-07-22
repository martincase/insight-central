-- Enable SELECT access for PPC search term data used by bid history
ALTER TABLE "public"."NK_SP Search Term Report" ENABLE ROW LEVEL SECURITY;

-- Allow read access (no writes are changed here)
CREATE POLICY "Allow public read access to NK_SP Search Term Report"
ON "public"."NK_SP Search Term Report"
FOR SELECT
USING (true);