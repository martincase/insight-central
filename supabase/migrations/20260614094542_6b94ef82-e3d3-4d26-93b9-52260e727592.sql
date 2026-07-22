
CREATE OR REPLACE FUNCTION public.refresh_demo_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_account_id uuid;
  demo_account_id_text text := 'DEMO-BRAND-GB';
  demo_profile_id bigint := 9000000000000001;
  target_date date := current_date - 1;
  shift_days int;
  sales_inserted int := 0;
  sp_inserted int := 0;
  sb_inserted int := 0;
  sd_inserted int := 0;
BEGIN
  SELECT id INTO demo_account_id FROM accounts_master WHERE account_name = 'Demo Brand' LIMIT 1;

  DELETE FROM amazon_api_campaigns_performance WHERE account_name = 'Demo Brand';
  INSERT INTO amazon_api_campaigns_performance (
    profile_id, campaign_id, campaign_name, campaign_status, campaign_budget,
    impressions, clicks, spend, cpc, ctr,
    orders_7d, sales_7d, acos_7d, roas_7d,
    account_name, account_id, country_code, date
  )
  SELECT
    demo_profile_id, c.cid, c.cname, 'ENABLED', 120,
    (1500 + floor(random()*2500))::bigint,
    (40 + floor(random()*60))::bigint,
    round((80 + random()*60)::numeric, 2),
    round((0.7 + random()*0.5)::numeric, 2),
    round((2 + random()*2)::numeric, 2),
    (3 + floor(random()*6))::bigint,
    round((280 + random()*200)::numeric, 2),
    round((22 + random()*15)::numeric, 2),
    round((3 + random()*2)::numeric, 2),
    'Demo Brand', demo_account_id_text, 'GB', d::date
  FROM generate_series(target_date - 59, target_date, '1 day'::interval) d
  CROSS JOIN (VALUES
    (9000000000000001::bigint, 'Demo - SP Brand Hero'),
    (9000000000000002::bigint, 'Demo - SP Auto Discovery'),
    (9000000000000003::bigint, 'Demo - SP Category Defence')
  ) AS c(cid, cname);
  GET DIAGNOSTICS sp_inserted = ROW_COUNT;

  INSERT INTO perplexity_sales_data (
    record_date, account_id, account_name,
    ordered_product_sales_amount, ordered_product_sales_currency,
    units_ordered, browser_sessions, browser_pageviews,
    buybox_percentage, unit_session_percentage,
    negative_feedback_received, datasource, source
  )
  SELECT
    d::date, demo_account_id, 'Demo Brand',
    round((900 + random()*900)::numeric, 2), 'GBP',
    (30 + floor(random()*40))::int,
    (600 + floor(random()*600))::int,
    (1000 + floor(random()*1000))::int,
    round((92 + random()*7)::numeric, 2),
    round((4 + random()*4)::numeric, 2),
    0, 'demo_seed', 'demo_seed'
  FROM generate_series(target_date - 89, target_date, '1 day'::interval) d
  WHERE NOT EXISTS (
    SELECT 1 FROM perplexity_sales_data
    WHERE account_name = 'Demo Brand' AND record_date = d::date
  );
  GET DIAGNOSTICS sales_inserted = ROW_COUNT;

  DELETE FROM amazon_api_sb_campaigns_performance WHERE account_name = 'Demo Brand';
  INSERT INTO amazon_api_sb_campaigns_performance (
    profile_id, account_name, date,
    campaign_id, campaign_name, campaign_status,
    campaign_budget_amount, campaign_budget_currency_code,
    impressions, clicks, cost, cost_per_click, click_through_rate,
    purchases_14d, sales_14d, units_sold_14d,
    new_to_brand_purchases_14d, new_to_brand_sales_14d, data_source
  )
  SELECT
    demo_profile_id, 'Demo Brand', d::date,
    c.cid, c.cname, 'ENABLED', 50, 'GBP',
    (800 + floor(random()*1200))::int,
    (15 + floor(random()*25))::int,
    round((15 + random()*25)::numeric, 2),
    round((0.6 + random()*0.4)::numeric, 2),
    round((1.5 + random()*1.5)::numeric, 2),
    (1 + floor(random()*3))::int,
    round((40 + random()*80)::numeric, 2),
    (1 + floor(random()*3))::int,
    floor(random()*2)::int,
    round((random()*40)::numeric, 2),
    'demo_seed'
  FROM generate_series(target_date - 59, target_date, '1 day'::interval) d
  CROSS JOIN (VALUES
    (9100000000000001::bigint, 'Demo - SB Brand Defence'),
    (9100000000000002::bigint, 'Demo - SB Category Hero')
  ) AS c(cid, cname);
  GET DIAGNOSTICS sb_inserted = ROW_COUNT;

  DELETE FROM amazon_api_sd_campaigns_performance WHERE account_name = 'Demo Brand';
  INSERT INTO amazon_api_sd_campaigns_performance (
    profile_id, account_name, date,
    campaign_id, campaign_name, campaign_status,
    campaign_budget_amount, campaign_budget_currency_code,
    impressions, clicks, cost, cost_per_click, click_through_rate,
    purchases_14d, sales_14d, units_sold_14d
  )
  SELECT
    demo_profile_id, 'Demo Brand', d::date,
    c.cid, c.cname, 'ENABLED', 40, 'GBP',
    (1500 + floor(random()*2500))::int,
    (10 + floor(random()*20))::int,
    round((10 + random()*20)::numeric, 2),
    round((0.5 + random()*0.4)::numeric, 2),
    round((0.5 + random()*0.8)::numeric, 2),
    floor(random()*3)::int,
    round((20 + random()*60)::numeric, 2),
    floor(random()*3)::int
  FROM generate_series(target_date - 59, target_date, '1 day'::interval) d
  CROSS JOIN (VALUES
    (9200000000000001::bigint, 'Demo - SD Retargeting'),
    (9200000000000002::bigint, 'Demo - SD Audience Views')
  ) AS c(cid, cname);
  GET DIAGNOSTICS sd_inserted = ROW_COUNT;

  -- Rolling shift for sales on subsequent days
  SELECT (target_date - MAX(record_date))::int INTO shift_days
  FROM perplexity_sales_data WHERE account_name = 'Demo Brand';
  IF shift_days IS NOT NULL AND shift_days > 0 THEN
    UPDATE perplexity_sales_data
       SET record_date = record_date + shift_days
     WHERE account_name = 'Demo Brand';
  END IF;

  RETURN jsonb_build_object(
    'sp_inserted', sp_inserted,
    'sales_inserted', sales_inserted,
    'sb_inserted', sb_inserted,
    'sd_inserted', sd_inserted,
    'target_date', target_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_demo_data() TO service_role;

SELECT public.refresh_demo_data();
