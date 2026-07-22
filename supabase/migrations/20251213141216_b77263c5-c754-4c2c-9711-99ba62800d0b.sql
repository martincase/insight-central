-- Create materialized view for keyword theme analysis
CREATE MATERIALIZED VIEW vw_keyword_themes AS
WITH latest_dates AS (
  SELECT sellername, MAX(creationdate) as max_date
  FROM "NK_SP Search Term Report"
  WHERE sellername IS NOT NULL AND keyword_text IS NOT NULL AND keyword_text != ''
  GROUP BY sellername
)
SELECT 
  r.keyword_text,
  r.match_type,
  r.sellername,
  COUNT(DISTINCT r.campaign_id) AS campaign_count,
  COALESCE(SUM(NULLIF(r.impressions, '')::numeric), 0) AS total_impressions,
  COALESCE(SUM(NULLIF(r.clicks, '')::numeric), 0) AS total_clicks,
  COALESCE(SUM(NULLIF(r.spend, '')::numeric), 0) AS total_spend,
  COALESCE(SUM(NULLIF(r.sales, '')::numeric), 0) AS total_sales,
  COALESCE(SUM(NULLIF(r.orders, '')::numeric), 0) AS total_orders,
  CASE 
    WHEN COALESCE(SUM(NULLIF(r.impressions, '')::numeric), 0) > 0 
    THEN ROUND((COALESCE(SUM(NULLIF(r.clicks, '')::numeric), 0) / SUM(NULLIF(r.impressions, '')::numeric)) * 100, 2)
    ELSE 0 
  END AS ctr,
  CASE 
    WHEN COALESCE(SUM(NULLIF(r.sales, '')::numeric), 0) > 0 
    THEN ROUND((COALESCE(SUM(NULLIF(r.spend, '')::numeric), 0) / SUM(NULLIF(r.sales, '')::numeric)) * 100, 2)
    ELSE 0 
  END AS acos
FROM "NK_SP Search Term Report" r
INNER JOIN latest_dates ld ON r.sellername = ld.sellername AND r.creationdate = ld.max_date
WHERE r.keyword_text IS NOT NULL AND r.keyword_text != ''
GROUP BY r.keyword_text, r.match_type, r.sellername;

-- Create index for performance
CREATE INDEX idx_vw_keyword_themes_sellername ON vw_keyword_themes (sellername);
CREATE INDEX idx_vw_keyword_themes_match_type ON vw_keyword_themes (match_type);
CREATE INDEX idx_vw_keyword_themes_sales ON vw_keyword_themes (total_sales DESC);

-- Enable RLS-style access (materialized views don't have RLS, but we can allow select)
GRANT SELECT ON vw_keyword_themes TO anon, authenticated;