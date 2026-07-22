-- Update the get_bid_impact_analysis function to include match_type and campaign_name
DROP FUNCTION IF EXISTS public.get_bid_impact_analysis(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_bid_impact_analysis(p_sellername text, p_limit integer DEFAULT 50, p_days_back integer DEFAULT 90)
 RETURNS TABLE(
   keyword_id text, 
   keyword_text text, 
   match_type text,
   sellername text, 
   ad_group_name text, 
   campaign_name text,
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
 SET search_path TO 'public'
AS $function$
  SELECT 
    mv.keyword_id,
    mv.keyword_text,
    mv.match_type,
    mv.sellername,
    mv.ad_group_name,
    mv.campaign_name,
    mv.snapshot_date AS bid_change_date,
    mv.previous_bid,
    mv.new_bid,
    mv.bid_change_pct,
    CASE WHEN mv.bid_change > 0 THEN 'increase' ELSE 'decrease' END AS change_direction,
    mv.before_snapshot_date,
    COALESCE(mv.impressions_before, 0) AS impressions_before,
    COALESCE(mv.clicks_before, 0) AS clicks_before,
    COALESCE(mv.spend_before, 0) AS spend_before,
    COALESCE(mv.sales_before, 0) AS sales_before,
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
      WHEN mv.after_snapshot_date IS NOT NULL THEN 100
      ELSE 0 
    END AS data_maturity_pct,
    CASE 
      WHEN mv.impressions_after IS NOT NULL AND mv.impressions_before IS NOT NULL AND mv.impressions_before > 0 
      THEN ROUND(((mv.impressions_after - mv.impressions_before) / mv.impressions_before * 100), 1)
      ELSE NULL 
    END AS impressions_delta_pct,
    CASE 
      WHEN mv.clicks_after IS NOT NULL AND mv.clicks_before IS NOT NULL AND mv.clicks_before > 0 
      THEN ROUND(((mv.clicks_after - mv.clicks_before) / mv.clicks_before * 100), 1)
      ELSE NULL 
    END AS clicks_delta_pct,
    CASE 
      WHEN mv.sales_after IS NOT NULL AND mv.sales_before IS NOT NULL AND mv.sales_before > 0 
      THEN ROUND(((mv.sales_after - mv.sales_before) / mv.sales_before * 100), 1)
      ELSE NULL 
    END AS sales_delta_pct,
    CASE 
      WHEN mv.acos_after IS NOT NULL AND mv.acos_before IS NOT NULL AND mv.acos_before > 0
      THEN ROUND((mv.acos_after - mv.acos_before), 1)
      ELSE NULL 
    END AS acos_delta_pct,
    CASE 
      WHEN mv.after_snapshot_date IS NULL THEN 'pending'
      WHEN mv.impressions_after IS NULL OR mv.sales_after IS NULL THEN 'no_data'
      WHEN mv.bid_change > 0 THEN
        CASE
          WHEN mv.sales_after > COALESCE(mv.sales_before, 0) * 1.1 AND (mv.acos_after IS NULL OR mv.acos_after <= COALESCE(mv.acos_before, 100) * 1.1) THEN 'positive'
          WHEN mv.sales_after < COALESCE(mv.sales_before, 0) * 0.9 OR mv.acos_after > COALESCE(mv.acos_before, 0) * 1.2 THEN 'negative'
          ELSE 'neutral'
        END
      WHEN mv.bid_change < 0 THEN
        CASE
          WHEN mv.sales_after >= COALESCE(mv.sales_before, 0) * 0.9 AND mv.acos_after IS NOT NULL AND mv.acos_after < COALESCE(mv.acos_before, 100) THEN 'positive'
          WHEN mv.sales_after < COALESCE(mv.sales_before, 0) * 0.5 THEN 'negative'
          ELSE 'neutral'
        END
      ELSE 'neutral'
    END AS impact_verdict
  FROM mv_bid_change_history_v2 mv
  WHERE mv.sellername = p_sellername
    AND mv.snapshot_date >= CURRENT_DATE - p_days_back
  ORDER BY 
    (mv.after_snapshot_date IS NOT NULL) DESC,
    mv.snapshot_date DESC
  LIMIT p_limit;
$function$;