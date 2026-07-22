CREATE OR REPLACE FUNCTION get_distinct_ppc_sellers()
RETURNS TABLE(sellername TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT DISTINCT str.sellername 
  FROM "NK_SP Search Term Report" str
  WHERE str.sellername IS NOT NULL
  ORDER BY str.sellername;
END;
$$ LANGUAGE plpgsql STABLE;