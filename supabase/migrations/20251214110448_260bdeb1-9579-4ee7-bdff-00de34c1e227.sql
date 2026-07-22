-- Create view for bid change impact analysis
-- Compares performance snapshots before and after each bid change

CREATE OR REPLACE VIEW vw_bid_impact_analysis AS
WITH bid_changes AS (
  SELECT 
    keyword_id,
    keyword_text,
    sellername,
    snapshot_date as bid_change_date,
    previous_bid,
    new_bid,
    bid_change_pct,
    CASE WHEN bid_change > 0 THEN 'increase' ELSE 'decrease' END as change_direction
  FROM mv_bid_change_history
  WHERE keyword_id IS NOT NULL
),
performance_data AS (
  SELECT 
    keyword_id,
    sellername,
    creationdate::date as snapshot_date,
    -- Parse text metrics to numerics
    NULLIF(REPLACE(REPLACE(impressions, ',', ''), ' ', ''), '')::numeric as impressions,
    NULLIF(REPLACE(REPLACE(clicks, ',', ''), ' ', ''), '')::numeric as clicks,
    NULLIF(REPLACE(REPLACE(REPLACE(spend, '£', ''), ',', ''), ' ', ''), '')::numeric as spend,
    NULLIF(REPLACE(REPLACE(REPLACE(sales, '£', ''), ',', ''), ' ', ''), '')::numeric as sales,
    NULLIF(REPLACE(REPLACE(acos, '%', ''), ' ', ''), '')::numeric as acos
  FROM "NK_SP Search Term Report"
  WHERE keyword_id IS NOT NULL
    AND creationdate IS NOT NULL
),
before_snapshots AS (
  SELECT DISTINCT ON (bc.keyword_id, bc.sellername, bc.bid_change_date)
    bc.keyword_id,
    bc.sellername,
    bc.bid_change_date,
    pd.snapshot_date as before_snapshot_date,
    pd.impressions as impressions_before,
    pd.clicks as clicks_before,
    pd.spend as spend_before,
    pd.sales as sales_before,
    pd.acos as acos_before
  FROM bid_changes bc
  JOIN performance_data pd 
    ON bc.keyword_id = pd.keyword_id 
    AND bc.sellername = pd.sellername
    AND pd.snapshot_date < bc.bid_change_date
  ORDER BY bc.keyword_id, bc.sellername, bc.bid_change_date, pd.snapshot_date DESC
),
after_snapshots AS (
  SELECT DISTINCT ON (bc.keyword_id, bc.sellername, bc.bid_change_date)
    bc.keyword_id,
    bc.sellername,
    bc.bid_change_date,
    pd.snapshot_date as after_snapshot_date,
    pd.impressions as impressions_after,
    pd.clicks as clicks_after,
    pd.spend as spend_after,
    pd.sales as sales_after,
    pd.acos as acos_after
  FROM bid_changes bc
  JOIN performance_data pd 
    ON bc.keyword_id = pd.keyword_id 
    AND bc.sellername = pd.sellername
    AND pd.snapshot_date > bc.bid_change_date
  ORDER BY bc.keyword_id, bc.sellername, bc.bid_change_date, pd.snapshot_date DESC
)
SELECT 
  bc.keyword_id,
  bc.keyword_text,
  bc.sellername,
  bc.bid_change_date,
  bc.previous_bid,
  bc.new_bid,
  bc.bid_change_pct,
  bc.change_direction,
  
  -- Before snapshot
  bs.before_snapshot_date,
  COALESCE(bs.impressions_before, 0) as impressions_before,
  COALESCE(bs.clicks_before, 0) as clicks_before,
  COALESCE(bs.spend_before, 0) as spend_before,
  COALESCE(bs.sales_before, 0) as sales_before,
  COALESCE(bs.acos_before, 0) as acos_before,
  
  -- After snapshot
  afs.after_snapshot_date,
  afs.impressions_after,
  afs.clicks_after,
  afs.spend_after,
  afs.sales_after,
  afs.acos_after,
  
  -- Days since change
  CASE 
    WHEN afs.after_snapshot_date IS NOT NULL 
    THEN (afs.after_snapshot_date - bc.bid_change_date)
    ELSE NULL 
  END as days_since_change,
  
  -- Data maturity percentage (how much of 30-day window is post-change)
  CASE 
    WHEN afs.after_snapshot_date IS NOT NULL 
    THEN LEAST((afs.after_snapshot_date - bc.bid_change_date)::numeric / 30.0 * 100, 100)
    ELSE 0 
  END as data_maturity_pct,
  
  -- Delta percentages
  CASE 
    WHEN afs.impressions_after IS NOT NULL AND bs.impressions_before > 0 
    THEN ((afs.impressions_after - bs.impressions_before) / bs.impressions_before * 100)
    ELSE NULL 
  END as impressions_delta_pct,
  
  CASE 
    WHEN afs.clicks_after IS NOT NULL AND bs.clicks_before > 0 
    THEN ((afs.clicks_after - bs.clicks_before) / bs.clicks_before * 100)
    ELSE NULL 
  END as clicks_delta_pct,
  
  CASE 
    WHEN afs.sales_after IS NOT NULL AND bs.sales_before > 0 
    THEN ((afs.sales_after - bs.sales_before) / bs.sales_before * 100)
    ELSE NULL 
  END as sales_delta_pct,
  
  CASE 
    WHEN afs.acos_after IS NOT NULL AND bs.acos_before > 0 
    THEN (afs.acos_after - bs.acos_before)
    ELSE NULL 
  END as acos_delta_pct,
  
  -- Impact verdict
  CASE 
    WHEN afs.after_snapshot_date IS NULL THEN 'no_data'
    WHEN afs.sales_after IS NULL OR bs.sales_before IS NULL THEN 'no_data'
    WHEN afs.sales_after > bs.sales_before AND (afs.acos_after IS NULL OR afs.acos_after <= bs.acos_before) THEN 'positive'
    WHEN afs.sales_after < bs.sales_before OR (afs.acos_after IS NOT NULL AND afs.acos_after > bs.acos_before + 5) THEN 'negative'
    ELSE 'neutral'
  END as impact_verdict

FROM bid_changes bc
LEFT JOIN before_snapshots bs 
  ON bc.keyword_id = bs.keyword_id 
  AND bc.sellername = bs.sellername 
  AND bc.bid_change_date = bs.bid_change_date
LEFT JOIN after_snapshots afs 
  ON bc.keyword_id = afs.keyword_id 
  AND bc.sellername = afs.sellername 
  AND bc.bid_change_date = afs.bid_change_date
ORDER BY bc.bid_change_date DESC;

-- Grant permissions
GRANT SELECT ON vw_bid_impact_analysis TO anon;
GRANT SELECT ON vw_bid_impact_analysis TO authenticated;