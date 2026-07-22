-- Create materialized view for search term to keyword mapping
CREATE MATERIALIZED VIEW IF NOT EXISTS vw_search_term_keyword_map AS
WITH latest_dates AS (
  SELECT sellername, MAX(creationdate::date) as max_date
  FROM "NK_SP Search Term Report"
  WHERE sellername IS NOT NULL 
    AND customer_search_term IS NOT NULL 
    AND keyword_text IS NOT NULL
  GROUP BY sellername
)
SELECT 
  r.customer_search_term,
  r.keyword_text,
  r.match_type,
  r.sellername,
  r.campaign_name_informational_only as campaign_name,
  r.ad_group_name_informational_only as ad_group_name,
  COALESCE(SUM(NULLIF(r.impressions, '')::numeric), 0) AS total_impressions,
  COALESCE(SUM(NULLIF(r.clicks, '')::numeric), 0) AS total_clicks,
  COALESCE(SUM(NULLIF(r.spend, '')::numeric), 0) AS total_spend,
  COALESCE(SUM(NULLIF(r.sales, '')::numeric), 0) AS total_sales,
  COALESCE(SUM(NULLIF(r.orders, '')::numeric), 0) AS total_orders,
  CASE 
    WHEN COALESCE(SUM(NULLIF(r.impressions, '')::numeric), 0) > 0 
    THEN ROUND((COALESCE(SUM(NULLIF(r.clicks, '')::numeric), 0) / COALESCE(SUM(NULLIF(r.impressions, '')::numeric), 0)) * 100, 2) 
    ELSE 0 
  END AS ctr,
  CASE 
    WHEN COALESCE(SUM(NULLIF(r.sales, '')::numeric), 0) > 0 
    THEN ROUND((COALESCE(SUM(NULLIF(r.spend, '')::numeric), 0) / COALESCE(SUM(NULLIF(r.sales, '')::numeric), 0)) * 100, 2) 
    ELSE 0 
  END AS acos,
  CASE 
    WHEN COALESCE(SUM(NULLIF(r.sales, '')::numeric), 0) = 0 AND COALESCE(SUM(NULLIF(r.spend, '')::numeric), 0) > 5 
    THEN true 
    ELSE false 
  END AS is_negative_candidate
FROM "NK_SP Search Term Report" r
INNER JOIN latest_dates ld ON r.sellername = ld.sellername AND r.creationdate::date = ld.max_date
WHERE r.customer_search_term IS NOT NULL AND r.keyword_text IS NOT NULL
GROUP BY r.customer_search_term, r.keyword_text, r.match_type, r.sellername, 
         r.campaign_name_informational_only, r.ad_group_name_informational_only;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_search_term_keyword_map_seller ON vw_search_term_keyword_map(sellername);
CREATE INDEX IF NOT EXISTS idx_search_term_keyword_map_negative ON vw_search_term_keyword_map(is_negative_candidate) WHERE is_negative_candidate = true;
CREATE INDEX IF NOT EXISTS idx_search_term_keyword_map_keyword ON vw_search_term_keyword_map(keyword_text);
CREATE INDEX IF NOT EXISTS idx_search_term_keyword_map_search_term ON vw_search_term_keyword_map(customer_search_term);

-- Add RLS policy for the view
ALTER MATERIALIZED VIEW vw_search_term_keyword_map OWNER TO postgres;

-- Grant access
GRANT SELECT ON vw_search_term_keyword_map TO anon, authenticated;