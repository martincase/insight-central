-- Drop the existing slow dynamic view
DROP VIEW IF EXISTS vw_top_search_terms;

-- Create a materialized view (pre-computed aggregations)
CREATE MATERIALIZED VIEW vw_top_search_terms AS
SELECT 
  customer_search_term,
  sellername,
  COUNT(DISTINCT campaign_id) AS campaign_count,
  COALESCE(SUM(CAST(NULLIF(impressions, '') AS numeric)), 0) AS total_impressions,
  COALESCE(SUM(CAST(NULLIF(clicks, '') AS numeric)), 0) AS total_clicks,
  COALESCE(SUM(CAST(NULLIF(REPLACE(spend, ',', ''), '') AS numeric)), 0) AS total_spend,
  COALESCE(SUM(CAST(NULLIF(REPLACE(sales, ',', ''), '') AS numeric)), 0) AS total_sales,
  COALESCE(SUM(CAST(NULLIF(orders, '') AS numeric)), 0) AS total_orders,
  CASE 
    WHEN COALESCE(SUM(CAST(NULLIF(impressions, '') AS numeric)), 0) > 0 
    THEN ROUND((COALESCE(SUM(CAST(NULLIF(clicks, '') AS numeric)), 0) / COALESCE(SUM(CAST(NULLIF(impressions, '') AS numeric)), 0)) * 100, 2)
    ELSE 0 
  END AS ctr,
  CASE 
    WHEN COALESCE(SUM(CAST(NULLIF(REPLACE(sales, ',', ''), '') AS numeric)), 0) > 0 
    THEN ROUND((COALESCE(SUM(CAST(NULLIF(REPLACE(spend, ',', ''), '') AS numeric)), 0) / COALESCE(SUM(CAST(NULLIF(REPLACE(sales, ',', ''), '') AS numeric)), 0)) * 100, 2)
    ELSE 0 
  END AS acos,
  CASE 
    WHEN COALESCE(SUM(CAST(NULLIF(REPLACE(spend, ',', ''), '') AS numeric)), 0) > 0 
    THEN ROUND(COALESCE(SUM(CAST(NULLIF(REPLACE(sales, ',', ''), '') AS numeric)), 0) / COALESCE(SUM(CAST(NULLIF(REPLACE(spend, ',', ''), '') AS numeric)), 0), 2)
    ELSE 0 
  END AS roas
FROM "NK_SP Search Term Report"
WHERE customer_search_term IS NOT NULL 
  AND customer_search_term != ''
  AND sellername IS NOT NULL
GROUP BY customer_search_term, sellername
HAVING COALESCE(SUM(CAST(NULLIF(impressions, '') AS numeric)), 0) >= 10;

-- Create indexes for fast queries
CREATE INDEX idx_vw_top_search_terms_seller ON vw_top_search_terms (sellername);
CREATE INDEX idx_vw_top_search_terms_sales ON vw_top_search_terms (total_sales DESC);
CREATE INDEX idx_vw_top_search_terms_impressions ON vw_top_search_terms (total_impressions DESC);

-- Grant permissions
GRANT SELECT ON vw_top_search_terms TO anon, authenticated;