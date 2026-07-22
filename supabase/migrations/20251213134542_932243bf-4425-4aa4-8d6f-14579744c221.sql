-- Drop and recreate materialized view to only use latest date per seller
DROP MATERIALIZED VIEW IF EXISTS vw_top_search_terms;

CREATE MATERIALIZED VIEW vw_top_search_terms AS
WITH latest_dates AS (
  SELECT sellername, MAX(creationdate) as max_date
  FROM "NK_SP Search Term Report"
  WHERE sellername IS NOT NULL
  GROUP BY sellername
)
SELECT 
  r.customer_search_term,
  r.sellername,
  COUNT(DISTINCT r.campaign_id) AS campaign_count,
  COALESCE(SUM(CAST(NULLIF(r.impressions, '') AS numeric)), 0) AS total_impressions,
  COALESCE(SUM(CAST(NULLIF(r.clicks, '') AS numeric)), 0) AS total_clicks,
  COALESCE(SUM(CAST(NULLIF(REPLACE(r.spend, ',', ''), '') AS numeric)), 0) AS total_spend,
  COALESCE(SUM(CAST(NULLIF(REPLACE(r.sales, ',', ''), '') AS numeric)), 0) AS total_sales,
  COALESCE(SUM(CAST(NULLIF(r.orders, '') AS numeric)), 0) AS total_orders,
  -- CTR calculation
  CASE 
    WHEN COALESCE(SUM(CAST(NULLIF(r.impressions, '') AS numeric)), 0) > 0 
    THEN ROUND((COALESCE(SUM(CAST(NULLIF(r.clicks, '') AS numeric)), 0) / 
                COALESCE(SUM(CAST(NULLIF(r.impressions, '') AS numeric)), 0)) * 100, 2)
    ELSE 0 
  END AS ctr,
  -- ACOS calculation (Spend / Sales)
  CASE 
    WHEN COALESCE(SUM(CAST(NULLIF(REPLACE(r.sales, ',', ''), '') AS numeric)), 0) > 0 
    THEN ROUND((COALESCE(SUM(CAST(NULLIF(REPLACE(r.spend, ',', ''), '') AS numeric)), 0) / 
                COALESCE(SUM(CAST(NULLIF(REPLACE(r.sales, ',', ''), '') AS numeric)), 0)) * 100, 2)
    ELSE 0 
  END AS acos,
  -- ROAS calculation
  CASE 
    WHEN COALESCE(SUM(CAST(NULLIF(REPLACE(r.spend, ',', ''), '') AS numeric)), 0) > 0 
    THEN ROUND(COALESCE(SUM(CAST(NULLIF(REPLACE(r.sales, ',', ''), '') AS numeric)), 0) / 
               COALESCE(SUM(CAST(NULLIF(REPLACE(r.spend, ',', ''), '') AS numeric)), 0), 2)
    ELSE 0 
  END AS roas
FROM "NK_SP Search Term Report" r
INNER JOIN latest_dates ld 
  ON r.sellername = ld.sellername 
  AND r.creationdate = ld.max_date
WHERE r.customer_search_term IS NOT NULL 
  AND r.customer_search_term != ''
GROUP BY r.customer_search_term, r.sellername
HAVING COALESCE(SUM(CAST(NULLIF(r.impressions, '') AS numeric)), 0) >= 10;

-- Recreate indexes
CREATE INDEX idx_vw_top_search_terms_seller ON vw_top_search_terms (sellername);
CREATE INDEX idx_vw_top_search_terms_sales ON vw_top_search_terms (total_sales DESC);
CREATE INDEX idx_vw_top_search_terms_impressions ON vw_top_search_terms (total_impressions DESC);

-- Grant permissions
GRANT SELECT ON vw_top_search_terms TO anon, authenticated;