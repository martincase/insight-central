-- Step 2: Create new materialized view based on NK_Sponsored Products Campaigns
-- Fixed: Use REGEXP_REPLACE for ALL numeric columns to strip any non-numeric characters
DROP MATERIALIZED VIEW IF EXISTS mv_bid_change_history_v2;

CREATE MATERIALIZED VIEW mv_bid_change_history_v2 AS
WITH deduplicated_data AS (
  SELECT DISTINCT ON (keyword_id, creationdate::date)
    campaign_id,
    ad_group_id,
    keyword_id,
    keyword_text,
    sellername,
    creationdate::date AS snapshot_date,
    -- Parse all numeric fields safely with REGEXP_REPLACE
    CASE WHEN bid IS NULL OR TRIM(bid) = '' THEN NULL 
         ELSE NULLIF(REGEXP_REPLACE(bid, '[^0-9.]', '', 'g'), '')::numeric END AS bid_amount,
    CASE WHEN impressions IS NULL OR TRIM(impressions) = '' THEN NULL 
         ELSE NULLIF(REGEXP_REPLACE(impressions, '[^0-9.]', '', 'g'), '')::numeric END AS impressions,
    CASE WHEN clicks IS NULL OR TRIM(clicks) = '' THEN NULL 
         ELSE NULLIF(REGEXP_REPLACE(clicks, '[^0-9.]', '', 'g'), '')::numeric END AS clicks,
    CASE WHEN spend IS NULL OR TRIM(spend) = '' THEN NULL 
         ELSE NULLIF(REGEXP_REPLACE(spend, '[^0-9.]', '', 'g'), '')::numeric END AS spend,
    CASE WHEN sales IS NULL OR TRIM(sales) = '' THEN NULL 
         ELSE NULLIF(REGEXP_REPLACE(sales, '[^0-9.]', '', 'g'), '')::numeric END AS sales,
    CASE WHEN acos IS NULL OR TRIM(acos) = '' THEN NULL 
         ELSE NULLIF(REGEXP_REPLACE(acos, '[^0-9.]', '', 'g'), '')::numeric END AS acos
  FROM "NK_Sponsored Products Campaigns"
  WHERE bid IS NOT NULL AND bid != ''
    AND keyword_id IS NOT NULL
    AND creationdate IS NOT NULL
    AND creationdate::date >= CURRENT_DATE - 90
  ORDER BY keyword_id, creationdate::date, pk DESC
),
with_window AS (
  SELECT *,
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
  FROM deduplicated_data
  WINDOW w AS (PARTITION BY keyword_id ORDER BY snapshot_date)
)
SELECT 
  campaign_id,
  ad_group_id,
  keyword_id,
  keyword_text,
  sellername,
  snapshot_date,
  previous_bid,
  bid_amount AS new_bid,
  (bid_amount - previous_bid) AS bid_change,
  ROUND(((bid_amount - previous_bid) / NULLIF(previous_bid, 0)) * 100, 2) AS bid_change_pct,
  before_snapshot_date,
  COALESCE(impressions_before, 0) AS impressions_before,
  COALESCE(clicks_before, 0) AS clicks_before,
  COALESCE(spend_before, 0) AS spend_before,
  COALESCE(sales_before, 0) AS sales_before,
  COALESCE(acos_before, 0) AS acos_before,
  after_snapshot_date,
  impressions_after,
  clicks_after,
  spend_after,
  sales_after,
  acos_after
FROM with_window
WHERE previous_bid IS NOT NULL 
  AND previous_bid != bid_amount;

-- Step 3: Create indexes on the materialized view
CREATE INDEX idx_mv_bid_v2_seller ON mv_bid_change_history_v2 (sellername);
CREATE INDEX idx_mv_bid_v2_date ON mv_bid_change_history_v2 (snapshot_date DESC);
CREATE INDEX idx_mv_bid_v2_keyword ON mv_bid_change_history_v2 (keyword_id);

-- Step 4: Grant permissions
GRANT SELECT ON mv_bid_change_history_v2 TO anon, authenticated;

-- Step 5: Replace the get_bid_impact_analysis function
DROP FUNCTION IF EXISTS get_bid_impact_analysis(text);
DROP FUNCTION IF EXISTS get_bid_impact_analysis(text, integer, integer);

CREATE OR REPLACE FUNCTION get_bid_impact_analysis(
  p_sellername text,
  p_limit integer DEFAULT 50,
  p_days_back integer DEFAULT 90
)
RETURNS TABLE(
  keyword_id text,
  keyword_text text,
  sellername text,
  bid_change_date date,
  previous_bid numeric,
  new_bid numeric,
  bid_change_pct numeric,
  change_direction text,
  before_snapshot_date date,
  impressions_before numeric,
  clicks_before numeric,
  spend_before numeric,
  sales_before numeric,
  acos_before numeric,
  after_snapshot_date date,
  impressions_after numeric,
  clicks_after numeric,
  spend_after numeric,
  sales_after numeric,
  acos_after numeric,
  days_since_change integer,
  data_maturity_pct numeric,
  impressions_delta_pct numeric,
  clicks_delta_pct numeric,
  sales_delta_pct numeric,
  acos_delta_pct numeric,
  impact_verdict text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mv.keyword_id,
    mv.keyword_text,
    mv.sellername,
    mv.snapshot_date AS bid_change_date,
    mv.previous_bid,
    mv.new_bid,
    mv.bid_change_pct,
    CASE WHEN mv.bid_change > 0 THEN 'increase' ELSE 'decrease' END AS change_direction,
    mv.before_snapshot_date,
    mv.impressions_before,
    mv.clicks_before,
    mv.spend_before,
    mv.sales_before,
    mv.acos_before,
    mv.after_snapshot_date,
    mv.impressions_after,
    mv.clicks_after,
    mv.spend_after,
    mv.sales_after,
    mv.acos_after,
    CASE 
      WHEN mv.after_snapshot_date IS NOT NULL 
      THEN (mv.after_snapshot_date - mv.snapshot_date)::integer
      ELSE NULL 
    END AS days_since_change,
    CASE 
      WHEN mv.after_snapshot_date IS NOT NULL 
      THEN LEAST((mv.after_snapshot_date - mv.snapshot_date)::numeric / 30.0 * 100, 100)
      ELSE 0 
    END AS data_maturity_pct,
    CASE 
      WHEN mv.impressions_after IS NOT NULL AND mv.impressions_before > 0 
      THEN ROUND(((mv.impressions_after - mv.impressions_before) / mv.impressions_before * 100), 2)
      ELSE NULL 
    END AS impressions_delta_pct,
    CASE 
      WHEN mv.clicks_after IS NOT NULL AND mv.clicks_before > 0 
      THEN ROUND(((mv.clicks_after - mv.clicks_before) / mv.clicks_before * 100), 2)
      ELSE NULL 
    END AS clicks_delta_pct,
    CASE 
      WHEN mv.sales_after IS NOT NULL AND mv.sales_before > 0 
      THEN ROUND(((mv.sales_after - mv.sales_before) / mv.sales_before * 100), 2)
      ELSE NULL 
    END AS sales_delta_pct,
    CASE 
      WHEN mv.acos_after IS NOT NULL AND mv.acos_before > 0 
      THEN ROUND((mv.acos_after - mv.acos_before), 2)
      ELSE NULL 
    END AS acos_delta_pct,
    CASE 
      WHEN mv.after_snapshot_date IS NULL THEN 'no_data'
      WHEN mv.sales_after IS NULL OR mv.sales_before IS NULL THEN 'no_data'
      WHEN mv.sales_after > mv.sales_before AND (mv.acos_after IS NULL OR mv.acos_after <= mv.acos_before) THEN 'positive'
      WHEN mv.sales_after < mv.sales_before OR (mv.acos_after IS NOT NULL AND mv.acos_after > mv.acos_before + 5) THEN 'negative'
      ELSE 'neutral'
    END AS impact_verdict
  FROM mv_bid_change_history_v2 mv
  WHERE mv.sellername = p_sellername
    AND mv.snapshot_date >= CURRENT_DATE - p_days_back
  ORDER BY mv.snapshot_date DESC
  LIMIT p_limit;
$$;