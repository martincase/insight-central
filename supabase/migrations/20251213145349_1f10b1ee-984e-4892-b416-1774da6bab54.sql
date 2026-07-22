CREATE OR REPLACE VIEW vw_bid_change_history AS
WITH deduplicated_data AS (
  SELECT DISTINCT ON (keyword_id, creationdate::date)
    campaign_id,
    ad_group_id,
    keyword_id,
    keyword_text,
    sellername,
    creationdate::date as snapshot_date,
    bid::numeric as bid_amount
  FROM public."NK_SP Search Term Report"
  WHERE bid IS NOT NULL AND bid != ''
    AND keyword_id IS NOT NULL
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
    LAG(bid_amount) OVER (
      PARTITION BY keyword_id 
      ORDER BY snapshot_date
    ) as previous_bid
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
  bid_amount as new_bid,
  bid_amount - previous_bid as bid_change,
  ROUND((bid_amount - previous_bid) / NULLIF(previous_bid, 0) * 100, 2) as bid_change_pct
FROM bid_snapshots
WHERE previous_bid IS NOT NULL 
  AND previous_bid != bid_amount
ORDER BY snapshot_date DESC, ABS(bid_amount - previous_bid) DESC;