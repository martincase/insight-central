-- Create a function for bid impact analysis with required seller filtering
-- This is much faster than the view because it filters by seller FIRST

CREATE OR REPLACE FUNCTION get_bid_impact_analysis(p_sellername TEXT)
RETURNS TABLE (
  keyword_id TEXT,
  keyword_text TEXT,
  sellername TEXT,
  bid_change_date DATE,
  previous_bid NUMERIC,
  new_bid NUMERIC,
  bid_change_pct NUMERIC,
  change_direction TEXT,
  before_snapshot_date DATE,
  impressions_before NUMERIC,
  clicks_before NUMERIC,
  spend_before NUMERIC,
  sales_before NUMERIC,
  acos_before NUMERIC,
  after_snapshot_date DATE,
  impressions_after NUMERIC,
  clicks_after NUMERIC,
  spend_after NUMERIC,
  sales_after NUMERIC,
  acos_after NUMERIC,
  days_since_change INTEGER,
  data_maturity_pct NUMERIC,
  impressions_delta_pct NUMERIC,
  clicks_delta_pct NUMERIC,
  sales_delta_pct NUMERIC,
  acos_delta_pct NUMERIC,
  impact_verdict TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH bid_changes AS (
    SELECT 
      bc.keyword_id,
      bc.keyword_text,
      bc.sellername,
      bc.snapshot_date as bid_change_date,
      bc.previous_bid,
      bc.new_bid,
      bc.bid_change_pct,
      CASE WHEN bc.bid_change > 0 THEN 'increase' ELSE 'decrease' END as change_direction
    FROM mv_bid_change_history bc
    WHERE bc.keyword_id IS NOT NULL
      AND bc.sellername = p_sellername
  ),
  performance_data AS (
    SELECT 
      pd.keyword_id,
      pd.sellername,
      pd.creationdate::date as snapshot_date,
      NULLIF(REPLACE(REPLACE(pd.impressions, ',', ''), ' ', ''), '')::numeric as impressions,
      NULLIF(REPLACE(REPLACE(pd.clicks, ',', ''), ' ', ''), '')::numeric as clicks,
      NULLIF(REPLACE(REPLACE(REPLACE(pd.spend, '£', ''), ',', ''), ' ', ''), '')::numeric as spend,
      NULLIF(REPLACE(REPLACE(REPLACE(pd.sales, '£', ''), ',', ''), ' ', ''), '')::numeric as sales,
      NULLIF(REPLACE(REPLACE(pd.acos, '%', ''), ' ', ''), '')::numeric as acos
    FROM "NK_SP Search Term Report" pd
    WHERE pd.keyword_id IS NOT NULL
      AND pd.creationdate IS NOT NULL
      AND pd.sellername = p_sellername
  ),
  before_snapshots AS (
    SELECT DISTINCT ON (bc.keyword_id, bc.bid_change_date)
      bc.keyword_id,
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
      AND pd.snapshot_date < bc.bid_change_date
    ORDER BY bc.keyword_id, bc.bid_change_date, pd.snapshot_date DESC
  ),
  after_snapshots AS (
    SELECT DISTINCT ON (bc.keyword_id, bc.bid_change_date)
      bc.keyword_id,
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
      AND pd.snapshot_date > bc.bid_change_date
    ORDER BY bc.keyword_id, bc.bid_change_date, pd.snapshot_date DESC
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
    
    bs.before_snapshot_date,
    COALESCE(bs.impressions_before, 0) as impressions_before,
    COALESCE(bs.clicks_before, 0) as clicks_before,
    COALESCE(bs.spend_before, 0) as spend_before,
    COALESCE(bs.sales_before, 0) as sales_before,
    COALESCE(bs.acos_before, 0) as acos_before,
    
    afs.after_snapshot_date,
    afs.impressions_after,
    afs.clicks_after,
    afs.spend_after,
    afs.sales_after,
    afs.acos_after,
    
    CASE 
      WHEN afs.after_snapshot_date IS NOT NULL 
      THEN (afs.after_snapshot_date - bc.bid_change_date)::integer
      ELSE NULL 
    END as days_since_change,
    
    CASE 
      WHEN afs.after_snapshot_date IS NOT NULL 
      THEN LEAST((afs.after_snapshot_date - bc.bid_change_date)::numeric / 30.0 * 100, 100)
      ELSE 0 
    END as data_maturity_pct,
    
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
    AND bc.bid_change_date = bs.bid_change_date
  LEFT JOIN after_snapshots afs 
    ON bc.keyword_id = afs.keyword_id 
    AND bc.bid_change_date = afs.bid_change_date
  ORDER BY bc.bid_change_date DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_bid_impact_analysis(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_bid_impact_analysis(TEXT) TO authenticated;