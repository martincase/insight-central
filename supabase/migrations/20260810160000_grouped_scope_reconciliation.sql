-- Grouped clients: one vendor definition, and a conversion rate that survives
-- a scope spanning two selling arms.
--
-- ---------------------------------------------------------------------------
-- 1. vw_sales_daily_country — the vendor tail was gated on a GLOBAL watermark
-- ---------------------------------------------------------------------------
-- The view rebuilds vendor sales as mv_vendor_daily_totals plus a "live tail"
-- of vendor_daily_metrics rows newer than the materialised view. The tail was
-- selected with
--
--     live.record_date > (select max(record_date) from mv_vendor_daily_totals)
--
-- — ONE watermark for THIRTEEN vendor accounts, whose feeds do not land
-- together. Once any account's rows for a date reach the MV, the watermark
-- moves past that date for everybody, and every other account's live rows for
-- that same date are excluded: not in the MV, and not > the MV's max either.
-- They reappear at the next MV refresh, so the loss is invisible except while
-- it is happening.
--
-- S Green & Sons, 27 Jul – 9 Aug: the whole-business headline read £132,322
-- from rpc_metrics_daily_country, which reads vendor_daily_metrics directly,
-- against £130,016 on the Sales card and the TACOS note, which read this view.
-- The £2,306.80 difference was the vendor arm's 7 August — present in the feed,
-- swallowed by the watermark. July reconciled exactly, because a closed month
-- is entirely inside the MV.
--
-- Replaced with a per-key test: take the live row for any
-- (selling_partner_id, marketplace_id, record_date) the MV does not already
-- carry. That is the same set the old expression meant to select, without one
-- account's ingest timing deciding another's totals.
--
-- The scalar date bound stays, because it is what lets the index prune the live
-- scan — dropping it for a bare NOT EXISTS took Portwest's whole-business month
-- from 51ms to 21 SECONDS by anti-joining 363k live rows. It is now the MINIMUM
-- of the per-account MV coverage: the earliest date any account still needs the
-- live tail for. The NOT EXISTS then removes the double count for accounts
-- already covered past that point.
create or replace view public.vw_sales_daily_country as
 select bm.selling_partner_id as spid,
    bm.brand_name,
    bm.country_code,
    bm.marketplace_id,
    bm.region,
    s.record_date,
    coalesce(nullif(s.ordered_product_sales_currency, ''::text), bm.currency) as currency,
    s.ordered_product_sales_amount as sales_native,
    coalesce(s.units_ordered, 0)::bigint as units,
    public.to_gbp(s.ordered_product_sales_amount,
                  coalesce(nullif(s.ordered_product_sales_currency, ''::text), bm.currency)) as sales_gbp
   from public.perplexity_sales_data s
     join public.brand_marketplaces bm on bm.sales_account_key = s.account_name
union all
 select bm.selling_partner_id as spid,
    bm.brand_name,
    bm.country_code,
    bm.marketplace_id,
    bm.region,
    v.record_date,
    bm.currency,
    v.ordered_revenue as sales_native,
    coalesce(v.ordered_units, 0::numeric)::bigint as units,
    public.to_gbp(v.ordered_revenue, bm.currency) as sales_gbp
   from public.mv_vendor_daily_totals v
     join public.brand_marketplaces bm on bm.selling_partner_id = v.selling_partner_id
                                      and bm.marketplace_id = v.marketplace_id
union all
 select bm.selling_partner_id as spid,
    bm.brand_name,
    bm.country_code,
    bm.marketplace_id,
    bm.region,
    live.record_date,
    bm.currency,
    sum(live.ordered_revenue) as sales_native,
    coalesce(sum(live.ordered_units), 0::numeric)::bigint as units,
    public.to_gbp(sum(live.ordered_revenue), bm.currency) as sales_gbp
   from public.vendor_daily_metrics live
     join public.brand_marketplaces bm on bm.selling_partner_id = live.selling_partner_id
                                      and bm.marketplace_id = live.marketplace_id
  where live.view_name = 'manufacturing'::text
    and live.record_date > coalesce(
      (select min(w.mx) from (
         select max(m.record_date) as mx
         from public.mv_vendor_daily_totals m
         group by m.selling_partner_id, m.marketplace_id) w),
      '1900-01-01'::date)
    and not exists (
      select 1
      from public.mv_vendor_daily_totals m2
      where m2.selling_partner_id = live.selling_partner_id
        and m2.marketplace_id = live.marketplace_id
        and m2.record_date = live.record_date
    )
  group by bm.selling_partner_id, bm.brand_name, bm.country_code, bm.marketplace_id,
           bm.region, live.record_date, bm.currency;


-- ---------------------------------------------------------------------------
-- 2. rpc_metrics_daily_country — conversion across two arms
-- ---------------------------------------------------------------------------
-- has_sessions was bool_and() over the day's rows. A seller row carries true, a
-- vendor row false, so ANY day on which both arms reported collapsed to false —
-- and the hook drops days without sessions from the conversion ratio entirely.
--
-- For S Green & Sons whole business over 27 Jul – 9 Aug that left exactly one
-- qualifying day: 8 August, the one day the vendor feed had not yet delivered.
-- The headline read "3.4% — 404 units ÷ 12,060 sessions" — a single Saturday
-- presented as a fortnight, beside a Units Ordered card reading 10,078.
--
-- has_sessions is now what the hook actually needs: does this day carry a
-- recoverable session denominator at all. A day that mixes arms keeps its
-- seller-side denominator instead of being thrown away.
--
-- units_with_sessions is returned explicitly. It is the numerator that belongs
-- over `sessions` — the units on rows that HAVE a denominator, which on a mixed
-- scope is the seller arm only. The hook used to recover it by multiplying the
-- rounded `conversion` back out by `sessions`, and the daily Conversion % cells
-- divided the day's TOTAL units (vendor included) by the seller's sessions:
-- 6.6% on 27 July against the 4.3% the same day showed on the seller scope.
-- One numerator now serves the cells and the headline.
drop function if exists public.rpc_metrics_daily_country(text, text, date, date);

create function public.rpc_metrics_daily_country(
  p_spid text, p_scope text, p_start date, p_end date
)
returns table(
  bucket date, units bigint, sales_native numeric, sales_gbp numeric,
  page_views numeric, sessions numeric, buy_box_pct numeric, conversion numeric,
  has_sessions boolean, currency text, units_with_sessions bigint
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
           s.buybox_percentage as buy_box_pct
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
           end as buy_box_pct
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
    -- "Does this day have a denominator", not "did every arm report one".
    count(*) filter (where sessions is not null) > 0 as has_sessions,
    case when count(distinct currency) = 1 then max(currency) else null end,
    coalesce(sum(units) filter (where sessions is not null), 0)::bigint as units_with_sessions
  from rows
  group by record_date
  order by record_date;
$function$;

grant execute on function public.rpc_metrics_daily_country(text, text, date, date)
  to anon, authenticated, service_role;
