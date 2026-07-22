-- Create a simple lookup table for PPC seller names
CREATE TABLE IF NOT EXISTS ppc_seller_names (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sellername TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Populate with known sellers from the search term report (one-time)
INSERT INTO ppc_seller_names (sellername)
SELECT DISTINCT sellername 
FROM "NK_SP Search Term Report" 
WHERE sellername IS NOT NULL
ON CONFLICT (sellername) DO NOTHING;

-- Drop the slow function
DROP FUNCTION IF EXISTS get_distinct_ppc_sellers();