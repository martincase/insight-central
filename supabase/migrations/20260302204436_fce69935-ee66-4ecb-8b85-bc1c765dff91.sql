CREATE OR REPLACE FUNCTION get_advertised_product_aggregates(
  p_account_name text,
  p_start_date date
)
RETURNS TABLE (
  advertised_asin text,
  impressions bigint,
  clicks bigint,
  spend numeric,
  orders bigint,
  sales numeric,
  campaign_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.advertised_asin,
    SUM(a.impressions)::bigint,
    SUM(a.clicks)::bigint,
    SUM(a.spend)::numeric,
    SUM(a.orders_7d)::bigint,
    SUM(a.sales_7d)::numeric,
    COUNT(DISTINCT a.campaign_id)::bigint
  FROM amazon_api_advertised_product_performance a
  WHERE a.account_name = p_account_name
    AND a.date >= p_start_date
  GROUP BY a.advertised_asin;
END;
$$ LANGUAGE plpgsql;