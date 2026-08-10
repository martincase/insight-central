-- Conversion rate: one denominator, and the honest one.
--
-- perplexity_sales_data.browser_sessions is Amazon's BROWSER-ONLY session count.
-- Mobile-app sessions are not in it. Dividing total units ordered by it therefore
-- produces a number that is roughly 2.4x the real conversion rate, and for
-- Dragonfly (4,390 units / 1,896 browser sessions) it produced 231.5% — a
-- "conversion rate" above 100%, which the UI could only withhold.
--
-- Meanwhile the daily heatmap plots unit_session_percentage, which IS Amazon's
-- own rate over TOTAL sessions. So the headline and the cells under it were
-- answering two different questions:
--
--   Cottam July  headline 57.1%   daily cells 12.1% - 39.8%
--   THEYE  July  headline 73.0%   daily cells 17.9% - 30.6%
--   Mahi   July  headline 75.4%   daily cells 16.8% - 45.2%
--
-- Total sessions are recoverable exactly, because unit_session_percentage is
-- units / sessions: sessions = units * 100 / unit_session_percentage. That is
-- Amazon's own denominator, not an estimate. Verified against Cottam 1 Jul:
-- 49 units, 39.84% -> 123 sessions, against 53 browser sessions.
--
-- Days where unit_session_percentage is 0 carry no recoverable denominator, so
-- sessions is NULL for them and BOTH sides of the ratio skip the day. Measured
-- across every account for July 2026 that costs at most 0.5pp, and leaving the
-- units in with no denominator would be the same like-for-unlike mistake.
--
-- Re-stated with total sessions, every headline now lands inside the range of
-- its own daily cells:
--   Cottam 22.5%  THEYE 24.1%  A1 Lawn 14.0%  Mahi 29.2%
--   AirCraft 7.2%  Dragonfly 73.2% (printable at last)  Suu Balm AU 17.9%
--
-- page_views stays browser page views — there is no equivalent identity to
-- recover total page views from, so the UI labels it for what it is.

create or replace function public.rpc_metrics_daily_country(
  p_spid text, p_scope text, p_start date, p_end date
)
returns table(
  bucket date, units bigint, sales_native numeric, sales_gbp numeric,
  page_views numeric, sessions numeric, buy_box_pct numeric, conversion numeric,
  has_sessions boolean, currency text
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
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
           -- Total sessions, recovered from Amazon's own unit_session_percentage.
           -- NULL, never 0, when the day carries no usable denominator.
           case when s.unit_session_percentage > 0
                then round(coalesce(s.units_ordered,0) * 100.0 / s.unit_session_percentage)
           end as sessions,
           coalesce(s.browser_pageviews,0)::numeric as page_views,
           s.buybox_percentage as buy_box_pct,
           true as has_sessions
    from public.perplexity_sales_data s
    join sc on sc.sales_account_key = s.account_name
    where s.record_date between p_start and p_end

    union all

    select v.record_date,
           coalesce(nullif(max(v.currency),''), max(sc.currency)) as currency,
           sum(v.ordered_revenue) as sales_native,
           coalesce(sum(v.ordered_units),0)::bigint as units,
           public.to_gbp(sum(v.ordered_revenue),
                         coalesce(nullif(max(v.currency),''), max(sc.currency))) as sales_gbp,
           null::numeric as sessions,
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
    sum(sessions) filter (where sessions is not null),
    case when sum(page_views) filter (where buy_box_pct is not null) > 0
         then round(sum(buy_box_pct * page_views) filter (where buy_box_pct is not null)
                    / sum(page_views) filter (where buy_box_pct is not null), 2)
         else avg(buy_box_pct) filter (where buy_box_pct is not null)
    end,
    -- Numerator restricted to the same rows as the denominator.
    case when sum(sessions) filter (where sessions is not null) > 0
         then round(100.0 * sum(units) filter (where sessions is not null)
                    / sum(sessions) filter (where sessions is not null), 2)
    end as conversion,
    bool_and(has_sessions),
    case when count(distinct currency) = 1 then max(currency) else null end
  from rows
  group by record_date
  order by record_date;
$function$;
