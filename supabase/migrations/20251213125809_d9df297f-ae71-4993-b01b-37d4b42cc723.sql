CREATE OR REPLACE VIEW vw_top_search_terms AS
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
    WHEN SUM(CAST(NULLIF(impressions, '') AS numeric)) > 0 
    THEN ROUND((SUM(CAST(NULLIF(clicks, '') AS numeric)) / SUM(CAST(NULLIF(impressions, '') AS numeric))) * 100, 2)
    ELSE 0 
  END AS ctr,
  CASE 
    WHEN SUM(CAST(NULLIF(REPLACE(sales, ',', ''), '') AS numeric)) > 0 
    THEN ROUND((SUM(CAST(NULLIF(REPLACE(spend, ',', ''), '') AS numeric)) / SUM(CAST(NULLIF(REPLACE(sales, ',', ''), '') AS numeric))) * 100, 2)
    ELSE 0 
  END AS acos,
  CASE 
    WHEN SUM(CAST(NULLIF(REPLACE(spend, ',', ''), '') AS numeric)) > 0 
    THEN ROUND(SUM(CAST(NULLIF(REPLACE(sales, ',', ''), '') AS numeric)) / SUM(CAST(NULLIF(REPLACE(spend, ',', ''), '') AS numeric)), 2)
    ELSE 0 
  END AS roas
FROM "NK_SP Search Term Report"
WHERE customer_search_term IS NOT NULL 
  AND customer_search_term != ''
GROUP BY customer_search_term, sellername
HAVING SUM(CAST(NULLIF(impressions, '') AS numeric)) >= 10
ORDER BY total_sales DESC;