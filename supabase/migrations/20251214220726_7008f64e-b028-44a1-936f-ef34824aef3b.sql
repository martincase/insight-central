-- Drop and recreate the materialized view with match_type and campaign_name
DROP MATERIALIZED VIEW IF EXISTS mv_bid_change_history_v2;

CREATE MATERIALIZED VIEW mv_bid_change_history_v2 AS
WITH parsed_data AS (
  SELECT 
    campaign_id,
    ad_group_id,
    keyword_id,
    keyword_text,
    match_type,
    sellername,
    ad_group_name_informational_only AS ad_group_name,
    campaign_name_informational_only AS campaign_name,
    creationdate::date AS snapshot_date,
    CASE
      WHEN bid IS NULL OR TRIM(bid) = '' THEN NULL
      ELSE NULLIF(regexp_replace(bid, '[^0-9.]', '', 'g'), '')::numeric
    END AS bid_amount,
    CASE
      WHEN impressions IS NULL OR TRIM(impressions) = '' THEN NULL
      ELSE NULLIF(regexp_replace(impressions, '[^0-9.]', '', 'g'), '')::numeric
    END AS impressions,
    CASE
      WHEN clicks IS NULL OR TRIM(clicks) = '' THEN NULL
      ELSE NULLIF(regexp_replace(clicks, '[^0-9.]', '', 'g'), '')::numeric
    END AS clicks,
    CASE
      WHEN spend IS NULL OR TRIM(spend) = '' THEN NULL
      WHEN spend LIKE '%\%%' THEN NULL
      ELSE NULLIF(regexp_replace(spend, '[^0-9.]', '', 'g'), '')::numeric
    END AS spend,
    CASE
      WHEN sales IS NULL OR TRIM(sales) = '' THEN NULL
      ELSE NULLIF(regexp_replace(sales, '[^0-9.]', '', 'g'), '')::numeric
    END AS sales,
    CASE
      WHEN acos IS NULL OR TRIM(acos) = '' THEN NULL
      ELSE NULLIF(regexp_replace(acos, '[^0-9.]', '', 'g'), '')::numeric
    END AS acos
  FROM "NK_Sponsored Products Campaigns"
  WHERE bid IS NOT NULL 
    AND bid <> ''
    AND keyword_id IS NOT NULL 
    AND creationdate IS NOT NULL 
    AND creationdate::date >= CURRENT_DATE - 180
),
aggregated_data AS (
  SELECT 
    campaign_id,
    ad_group_id,
    keyword_id,
    keyword_text,
    match_type,
    sellername,
    snapshot_date,
    ad_group_name,
    campaign_name,
    MAX(bid_amount) AS bid_amount,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SUM(spend) AS spend,
    SUM(sales) AS sales,
    AVG(acos) AS acos
  FROM parsed_data
  GROUP BY campaign_id, ad_group_id, keyword_id, keyword_text, match_type, sellername, snapshot_date, ad_group_name, campaign_name
),
with_window AS (
  SELECT 
    campaign_id,
    ad_group_id,
    keyword_id,
    keyword_text,
    match_type,
    sellername,
    snapshot_date,
    ad_group_name,
    campaign_name,
    bid_amount,
    impressions,
    clicks,
    spend,
    sales,
    acos,
    LAG(bid_amount) OVER w AS previous_bid,
    LAG(snapshot_date) OVER w AS before_snapshot_date,
    LAG(impressions) OVER w AS impressions_before,
    LAG(clicks) OVER w AS clicks_before,
    LAG(spend) OVER w AS spend_before,
    LAG(sales) OVER w AS sales_before,
    LAG(acos) OVER w AS acos_before,
    LEAD(snapshot_date) OVER w AS after_snapshot_date,
    LEAD(impressions) OVER w AS impressions_after,
    LEAD(clicks) OVER w AS clicks_after,
    LEAD(spend) OVER w AS spend_after,
    LEAD(sales) OVER w AS sales_after,
    LEAD(acos) OVER w AS acos_after
  FROM aggregated_data
  WINDOW w AS (PARTITION BY keyword_id, campaign_id, ad_group_id, match_type ORDER BY snapshot_date)
)
SELECT 
  campaign_id,
  ad_group_id,
  keyword_id,
  keyword_text,
  match_type,
  sellername,
  snapshot_date,
  ad_group_name,
  campaign_name,
  bid_amount AS new_bid,
  previous_bid,
  bid_amount - previous_bid AS bid_change,
  CASE
    WHEN previous_bid IS NOT NULL AND previous_bid > 0 
    THEN ROUND((bid_amount - previous_bid) / previous_bid * 100, 2)
    ELSE NULL
  END AS bid_change_pct,
  before_snapshot_date,
  impressions_before,
  clicks_before,
  spend_before,
  sales_before,
  acos_before,
  after_snapshot_date,
  impressions_after,
  clicks_after,
  spend_after,
  sales_after,
  acos_after,
  impressions AS impressions_current,
  clicks AS clicks_current,
  spend AS spend_current,
  sales AS sales_current,
  acos AS acos_current
FROM with_window
WHERE previous_bid IS NOT NULL 
  AND bid_amount IS NOT NULL 
  AND bid_amount <> previous_bid
ORDER BY snapshot_date DESC, keyword_text;

-- Create index for faster queries
CREATE INDEX idx_mv_bid_change_v2_seller_date ON mv_bid_change_history_v2 (sellername, snapshot_date DESC);
CREATE INDEX idx_mv_bid_change_v2_keyword ON mv_bid_change_history_v2 (keyword_id);