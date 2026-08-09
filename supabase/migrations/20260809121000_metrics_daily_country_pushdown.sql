-- =====================================================================
-- rpc_metrics_daily_country: push the scope filter down to the scan
-- =====================================================================
--
-- Grouping S Green's two arms into one dashboard tipped this RPC over the
-- 15s anon statement timeout, and the client-total view came up as
-- "Could not load the whole business figures". Two causes, both pre-existing
-- and both worth fixing rather than working around:
--
-- 1. brand_scope_accounts is a set-returning function with no ROWS estimate,
--    so the planner assumed the default 1000 rows and picked a merge join.
--    That meant reading EVERY vendor row in the date range (363k for July) and
--    filtering afterwards. The real answer is between 1 and 14 rows. Declaring
--    ROWS 6 gets a nested loop driven off idx_vdm_spid_mkt_date instead.
--
-- 2. The RPC selected from vw_metrics_daily_country and joined the scope on
--    the OUTSIDE. brand_name only exists inside the view, so the account
--    filter could never reach the table scan. Inlining the two branches lets
--    the join sit against perplexity_sales_data.account_name and
--    vendor_daily_metrics(selling_partner_id, marketplace_id), both indexed.
--
-- S Green whole business: 6.4s -> 0.13s. Output verified identical to the
-- view-based version, column for column, for a seller (AirCraft GB) and a
-- twelve-market vendor (Portwest ALL#Vendor).
-- =====================================================================

alter function public.brand_scope_accounts(text, text) rows 6;

create or replace function public.rpc_metrics_daily_country(
  p_spid text, p_scope text, p_start date, p_end date
)
returns table(bucket date, units bigint, sales_native numeric, sales_gbp numeric,
              page_views numeric, sessions numeric, buy_box_pct numeric,
              conversion numeric, has_sessions boolean, currency text)
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
  with sc as (
    select * from public.brand_scope_accounts(p_spid, p_scope)
  ),
  rows as (
    select s.record_date,
           coalesce(nullif(s.ordered_product_sales_currency,''), sc.currency) as currency,
           s.ordered_product_sales_amount as sales_native,
           coalesce(s.units_ordered,0)::bigint as units,
           public.to_gbp(s.ordered_product_sales_amount,
                         coalesce(nullif(s.ordered_product_sales_currency,''), sc.currency)) as sales_gbp,
           coalesce(s.browser_sessions,0)::numeric as sessions,
           coalesce(s.browser_pageviews,0)::numeric as page_views,
           s.buybox_percentage as buy_box_pct,
           true as has_sessions
    from public.perplexity_sales_data s
    join sc on sc.sales_account_key = s.account_name
    where s.record_date between p_start and p_end

    union all

    -- vendor rows are per ASIN; roll them to marketplace × day first
    select v.record_date,
           coalesce(nullif(max(v.currency),''), max(sc.currency)) as currency,
           sum(v.ordered_revenue) as sales_native,
           coalesce(sum(v.ordered_units),0)::bigint as units,
           public.to_gbp(sum(v.ordered_revenue),
                         coalesce(nullif(max(v.currency),''), max(sc.currency))) as sales_gbp,
           null::numeric as sessions,          -- the vendor feed has no sessions
           coalesce(sum(v.glance_views),0)::numeric as page_views,
           case when sum(v.glance_views) filter (where v.lost_featured_offer is not null) > 0
                then round(100 * (1 - sum(v.lost_featured_offer * v.glance_views)
                                        filter (where v.lost_featured_offer is not null)
                                      / sum(v.glance_views) filter (where v.lost_featured_offer is not null)), 2)
           end as buy_box_pct,
           false as has_sessions
    from public.vendor_daily_metrics v
    join sc on sc.selling_partner_id = v.selling_partner_id
           and sc.marketplace_id = v.marketplace_id
    where v.view_name = 'manufacturing'
      and v.record_date between p_start and p_end
    group by sc.selling_partner_id, sc.brand_name, sc.country_code,
             sc.marketplace_id, sc.region, v.record_date
  )
  select
    record_date as bucket,
    sum(units)::bigint,
    sum(sales_native),
    sum(sales_gbp),
    sum(page_views),
    sum(sessions),
    -- page-view weighted so a rollup is not dominated by tiny marketplaces
    case when sum(page_views) filter (where buy_box_pct is not null) > 0
         then round(sum(buy_box_pct * page_views) filter (where buy_box_pct is not null)
                    / sum(page_views) filter (where buy_box_pct is not null), 2)
         else avg(buy_box_pct) filter (where buy_box_pct is not null)
    end,
    case when sum(sessions) > 0
         then round(100.0 * sum(units) / sum(sessions), 2)
    end as conversion,
    -- false as soon as ONE arm has no sessions. A vendor+seller total has no
    -- honest conversion rate: the units come from both, the sessions from one.
    bool_and(has_sessions),
    case when count(distinct currency) = 1 then max(currency) else null end
  from rows
  group by record_date
  order by record_date;
$function$;
