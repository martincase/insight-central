-- Drop the existing regular view
DROP VIEW IF EXISTS public.vw_bid_change_history;

-- Create a materialized view instead (pre-computed, much faster queries)
CREATE MATERIALIZED VIEW public.mv_bid_change_history AS
WITH deduplicated_data AS (
  SELECT DISTINCT ON (keyword_id, creationdate::date)
    campaign_id,
    ad_group_id,
    keyword_id,
    keyword_text,
    sellername,
    creationdate::date AS snapshot_date,
    bid::numeric AS bid_amount
  FROM "NK_SP Search Term Report"
  WHERE bid IS NOT NULL 
    AND bid <> '' 
    AND keyword_id IS NOT NULL
    AND creationdate::date >= CURRENT_DATE - INTERVAL '60 days'
  ORDER BY keyword_id, creationdate::date DESC, pk DESC
),
bid_snapshots AS (
  SELECT
    campaign_id,
    ad_group_id,
    keyword_id,
    keyword_text,
    sellername,
    snapshot_date,
    bid_amount,
    LAG(bid_amount) OVER (PARTITION BY keyword_id ORDER BY snapshot_date) AS previous_bid
  FROM deduplicated_data
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
  bid_amount - previous_bid AS bid_change,
  ROUND((bid_amount - previous_bid) / NULLIF(previous_bid, 0) * 100, 2) AS bid_change_pct
FROM bid_snapshots
WHERE previous_bid IS NOT NULL 
  AND previous_bid <> bid_amount;

-- Create indexes on the materialized view for fast queries
CREATE INDEX idx_mv_bid_change_seller ON public.mv_bid_change_history (sellername);
CREATE INDEX idx_mv_bid_change_date ON public.mv_bid_change_history (snapshot_date DESC);
CREATE INDEX idx_mv_bid_change_seller_date ON public.mv_bid_change_history (sellername, snapshot_date DESC);

-- Grant access to anon and authenticated roles
GRANT SELECT ON public.mv_bid_change_history TO anon;
GRANT SELECT ON public.mv_bid_change_history TO authenticated;