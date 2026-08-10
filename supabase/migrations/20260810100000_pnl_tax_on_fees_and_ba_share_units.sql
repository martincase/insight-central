-- Two client-facing arithmetic fixes.
--
-- 1. P&L did not add up.
--    fin_seller_economics.net_proceeds_total is Amazon's own figure and is net of
--    "taxes on fees" (VAT/GST charged on Amazon's selling fees — 20% in the UK).
--    The Data Kiosk ingest only stores the fee amount itself, so
--      sales - fees - ads  >  net_proceeds
--    by roughly 20% of the fee total on UK accounts. The gap was silently absorbed
--    and never shown. Both P&L RPCs now return that amount explicitly as tax_native /
--    tax_gbp, derived as the balance between Amazon's net proceeds and the itemised
--    lines, so the statement resolves exactly.
--
-- 2. Brand Analytics shares exceeded 100%.
--    ba_search_query_performance.purchases_brand_share is a PERCENTAGE (0-100,
--    Amazon's asinPurchaseShare). rpc_ba_search_queries treated it as a fraction,
--    so purchase_share came out 100x too big (5% rendered as 500.0%) and
--    brand_purchases came out 100x too big (1 purchase rendered as "100").
--    Scaled to a fraction, and any share that still resolves above 100% is
--    withheld (NULL) rather than printed.

-- ---------------------------------------------------------------------------
-- 1a. rpc_pnl_summary
-- ---------------------------------------------------------------------------
drop function if exists public.rpc_pnl_summary(text, text, date, date);

create function public.rpc_pnl_summary(p_spid text, p_scope text, p_start date, p_end date)
returns table(
  country_code text, marketplace_id text, currency text, units bigint,
  sales_native numeric, fees_native numeric, ads_native numeric, tax_native numeric,
  net_proceeds_native numeric, cogs_native numeric, profit_native numeric,
  sales_gbp numeric, fees_gbp numeric, ads_gbp numeric, tax_gbp numeric,
  net_proceeds_gbp numeric, cogs_gbp numeric, profit_gbp numeric
)
language sql
stable security definer
set search_path to 'public'
set statement_timeout to '20s'
as $function$
  with pbrand as (
    select python_brand_name from public.accounts_master
    where merchant_token like p_spid || '-%' and python_brand_name is not null limit 1
  ),
  scope as (
    select bm.marketplace_id, bm.country_code, bm.region, bm.currency
    from public.brand_marketplaces bm
    where bm.selling_partner_id = p_spid and bm.enabled
      and ( public.scope_area(p_scope)='ALL' or (public.scope_area(p_scope)='ALL_EU' and bm.region='EU') or bm.country_code = public.scope_area(p_scope) )
  ),
  econ as (
    select e.marketplace_id,
           coalesce(nullif(e.currency,''), s.currency) as currency,
           sum(coalesce(e.net_units,0))          as units,
           sum(coalesce(e.net_product_sales,0))  as sales,
           sum(coalesce(e.referral_fees,0) + coalesce(e.fba_fulfilment_fees,0)
               + coalesce(e.storage_fees,0) + coalesce(e.other_fees,0)) as fees,
           sum(coalesce(e.ads_spend,0))          as ads,
           sum(coalesce(e.net_proceeds_total,0)) as net_proceeds,
           sum(coalesce(c.cost_price,0) * coalesce(e.net_units,0)) as cogs_gbp  -- cost is GBP
    from public.fin_seller_economics e
    join scope s on s.marketplace_id = e.marketplace_id
    left join public.asin_cost_prices c
      on c.asin = e.asin and c.brand = (select python_brand_name from pbrand)
    where e.selling_partner_id = p_spid and e.period_end between p_start and p_end
    group by e.marketplace_id, coalesce(nullif(e.currency,''), s.currency)
  ),
  bal as (
    -- Everything Amazon deducted between net sales and net proceeds that is not in
    -- the fee or ads totals above. In practice this is Amazon's "taxes on fees".
    select e.*, (e.sales - abs(e.fees) - abs(e.ads) - e.net_proceeds) as tax
    from econ e
  )
  select
    m.country_code, e.marketplace_id, e.currency,
    e.units::bigint,
    e.sales, abs(e.fees), abs(e.ads), e.tax, e.net_proceeds,
    e.cogs_gbp / coalesce(public.to_gbp(1, e.currency), 1) as cogs_native,      -- GBP -> native
    e.net_proceeds - (e.cogs_gbp / coalesce(public.to_gbp(1, e.currency), 1))   as profit_native,
    public.to_gbp(e.sales, e.currency), public.to_gbp(abs(e.fees), e.currency),
    public.to_gbp(abs(e.ads), e.currency), public.to_gbp(e.tax, e.currency),
    public.to_gbp(e.net_proceeds, e.currency),
    e.cogs_gbp,
    public.to_gbp(e.net_proceeds, e.currency) - e.cogs_gbp as profit_gbp
  from bal e join public.amazon_marketplaces m on m.marketplace_id = e.marketplace_id
  order by public.to_gbp(e.sales, e.currency) desc nulls last;
$function$;

-- ---------------------------------------------------------------------------
-- 1b. rpc_pnl_products — same balancing line, per product
-- ---------------------------------------------------------------------------
drop function if exists public.rpc_pnl_products(text, text, date, date);

create function public.rpc_pnl_products(p_spid text, p_scope text, p_start date, p_end date)
returns table(
  asin text, sku text, product_name text, units bigint,
  sales_gbp numeric, fees_gbp numeric, ads_gbp numeric, tax_gbp numeric,
  net_proceeds_gbp numeric, cogs_gbp numeric, profit_gbp numeric, has_cost boolean,
  sales_native numeric, fees_native numeric, ads_native numeric, tax_native numeric,
  net_proceeds_native numeric, cogs_native numeric, profit_native numeric, currency text
)
language sql
stable security definer
set search_path to 'public'
set statement_timeout to '20s'
as $function$
  with pbrand as (
    select python_brand_name from public.accounts_master
    where merchant_token like p_spid || '-%' and python_brand_name is not null limit 1
  ),
  scope as (
    select bm.marketplace_id, bm.currency
    from public.brand_marketplaces bm
    where bm.selling_partner_id = p_spid and bm.enabled
      and ( public.scope_area(p_scope)='ALL' or (public.scope_area(p_scope)='ALL_EU' and bm.region='EU') or bm.country_code = public.scope_area(p_scope) )
  )
  select
    e.asin,
    max(e.sku) as sku,
    (select l.item_name from public.perplexity_all_listings_stockprice_data l
      where l.asin = e.asin and l.item_name is not null
      order by l.record_date desc limit 1) as product_name,
    sum(coalesce(e.net_units,0))::bigint as units,
    sum(public.to_gbp(coalesce(e.net_product_sales,0), coalesce(nullif(e.currency,''), s.currency))) as sales_gbp,
    sum(public.to_gbp(abs(coalesce(e.referral_fees,0) + coalesce(e.fba_fulfilment_fees,0)
        + coalesce(e.storage_fees,0) + coalesce(e.other_fees,0)), coalesce(nullif(e.currency,''), s.currency))) as fees_gbp,
    sum(public.to_gbp(abs(coalesce(e.ads_spend,0)), coalesce(nullif(e.currency,''), s.currency))) as ads_gbp,
    sum(public.to_gbp(
          coalesce(e.net_product_sales,0)
          - abs(coalesce(e.referral_fees,0) + coalesce(e.fba_fulfilment_fees,0)
                + coalesce(e.storage_fees,0) + coalesce(e.other_fees,0))
          - abs(coalesce(e.ads_spend,0))
          - coalesce(e.net_proceeds_total,0), coalesce(nullif(e.currency,''), s.currency))) as tax_gbp,
    sum(public.to_gbp(coalesce(e.net_proceeds_total,0), coalesce(nullif(e.currency,''), s.currency))) as net_proceeds_gbp,
    sum(coalesce(c.cost_price,0) * coalesce(e.net_units,0)) as cogs_gbp,
    sum(public.to_gbp(coalesce(e.net_proceeds_total,0), coalesce(nullif(e.currency,''), s.currency)))
      - sum(coalesce(c.cost_price,0) * coalesce(e.net_units,0)) as profit_gbp,
    bool_or(c.cost_price is not null and c.cost_price > 0) as has_cost,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null else sum(coalesce(e.net_product_sales,0)) end as sales_native,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null else sum(abs(coalesce(e.referral_fees,0) + coalesce(e.fba_fulfilment_fees,0) + coalesce(e.storage_fees,0) + coalesce(e.other_fees,0))) end as fees_native,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null else sum(abs(coalesce(e.ads_spend,0))) end as ads_native,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null
         else sum(coalesce(e.net_product_sales,0)
                  - abs(coalesce(e.referral_fees,0) + coalesce(e.fba_fulfilment_fees,0)
                        + coalesce(e.storage_fees,0) + coalesce(e.other_fees,0))
                  - abs(coalesce(e.ads_spend,0))
                  - coalesce(e.net_proceeds_total,0)) end as tax_native,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null else sum(coalesce(e.net_proceeds_total,0)) end as net_proceeds_native,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null
         else sum(coalesce(c.cost_price,0)*coalesce(e.net_units,0)) / nullif(public.to_gbp(1, max(coalesce(nullif(e.currency,''), s.currency))),0) end as cogs_native,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null
         else sum(coalesce(e.net_proceeds_total,0)) - (sum(coalesce(c.cost_price,0)*coalesce(e.net_units,0)) / nullif(public.to_gbp(1, max(coalesce(nullif(e.currency,''), s.currency))),0)) end as profit_native,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null else max(coalesce(nullif(e.currency,''), s.currency)) end as currency
  from public.fin_seller_economics e
  join scope s on s.marketplace_id = e.marketplace_id
  left join public.asin_cost_prices c
    on c.asin = e.asin and c.brand = (select python_brand_name from pbrand)
  where e.selling_partner_id = p_spid and e.period_end between p_start and p_end
  group by e.asin
  having sum(coalesce(e.net_units,0)) <> 0 or sum(coalesce(e.net_product_sales,0)) <> 0
  order by sales_gbp desc nulls last;
$function$;

-- ---------------------------------------------------------------------------
-- 2. rpc_ba_search_queries — purchases_brand_share is a percentage, not a fraction
-- ---------------------------------------------------------------------------
create or replace function public.rpc_ba_search_queries(p_spid text, p_scope text, p_limit integer default 100)
returns table(search_query text, search_volume bigint, brand_impressions bigint, brand_clicks bigint,
              brand_purchases numeric, impression_share numeric, click_share numeric,
              purchase_share numeric, marketplaces integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  with scope as (
    select bm.marketplace_id from public.brand_marketplaces bm
    where bm.selling_partner_id = p_spid and bm.enabled
      and ( public.scope_area(p_scope)='ALL' or (public.scope_area(p_scope)='ALL_EU' and bm.region='EU') or bm.country_code = public.scope_area(p_scope) )
  ),
  latest as (
    select b.marketplace_id, max(b.period_end) pe
    from public.ba_search_query_performance b
    join scope s on s.marketplace_id = b.marketplace_id
    where b.selling_partner_id = p_spid group by b.marketplace_id
  ),
  per_mkt as (
    select b.marketplace_id, b.search_query,
      max(b.search_query_volume) vol,
      max(b.impressions_total) imp_total, sum(coalesce(b.impressions_brand_count,0)) imp_brand,
      max(b.clicks_total) clk_total, sum(coalesce(b.clicks_brand_count,0)) clk_brand,
      max(b.purchases_total) buy_total,
      -- purchases_brand_share is Amazon's asinPurchaseShare: a PERCENTAGE (0-100).
      -- Convert to a fraction before it is multiplied by the query's purchase total.
      -- sum() (not sum(coalesce(...))) so a query Amazon never reported stays NULL
      -- rather than being asserted as zero.
      sum(b.purchases_brand_share) / 100.0 buy_share_sum
    from public.ba_search_query_performance b
    join latest l on l.marketplace_id = b.marketplace_id and b.period_end = l.pe
    where b.selling_partner_id = p_spid and b.search_query is not null
    group by b.marketplace_id, b.search_query
  ),
  agg as (
    select search_query, sum(vol) vol,
      sum(imp_total) imp_total, sum(imp_brand) imp_brand,
      sum(clk_total) clk_total, sum(clk_brand) clk_brand,
      sum(buy_total) buy_total, sum(buy_share_sum * buy_total) buy_weighted,
      count(distinct marketplace_id) mkts
    from per_mkt group by search_query
  ),
  calc as (
    select search_query, vol, buy_weighted, mkts, imp_brand, clk_brand,
      imp_brand / nullif(imp_total,0) as imp_share,
      clk_brand / nullif(clk_total,0) as clk_share,
      buy_weighted / nullif(buy_total,0) as buy_share
    from agg
  )
  select search_query, vol::bigint,
    imp_brand::bigint, clk_brand::bigint,
    round(buy_weighted, 1),
    -- A share of anything cannot exceed 100%. If it still does, the input is not
    -- trustworthy: withhold it rather than print an impossible number.
    case when imp_share > 1.0001 then null else round(imp_share, 4) end,
    case when clk_share > 1.0001 then null else round(clk_share, 4) end,
    case when buy_share > 1.0001 then null else round(buy_share, 4) end,
    mkts::int
  from calc order by vol desc nulls last limit p_limit;
$function$;

-- Re-grant execute on the two recreated functions (DROP loses the ACL).
-- This restores exactly the grants that were in place before, no wider.
grant execute on function public.rpc_pnl_summary(text, text, date, date) to anon, authenticated, service_role;
grant execute on function public.rpc_pnl_products(text, text, date, date) to anon, authenticated, service_role;
