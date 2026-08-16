-- One conversion basis for the client email and the dashboard behind its button.
--
-- rpc_month_end_dataset — the source of truth for the monthly client email, and
-- deliberately untouched by this migration — converts a month's non-GBP sales at
-- the MEAN of every rate published inside that month (its `fxm` CTE), and reports
-- fx_basis = 'month_average'.
--
-- The dashboard converted through to_gbp(), which reads vw_fx_latest: today's
-- spot, whatever period is on screen. Same sales, two bases. In July 2026 that put
-- ~£2,000 between Portwest's email and the page its button links to, and the gap
-- moved every day as the rate moved — including after the email had been sent.
--
-- The fix is a period-aware conversion, not a change to to_gbp(). to_gbp() is used
-- by views with no period at all (vw_sales_daily_country, vw_metrics_daily_country,
-- vw_ppc_spend_daily_country, vw_vendor_daily_country and the ops pulses), which
-- publish one row per day and cannot know what window a caller will sum. Changing
-- it in place would silently redefine every one of them. It stays as it is, and
-- everything that HAS a period — every rpc_* taking p_start/p_end — moves onto
-- to_gbp_period() below.
--
-- THE RULE FOR A PERIOD, and why.
--
--   The rate for a period is the mean of every rate published inside that period.
--
-- Applied to a whole calendar month that is, row for row, the email's definition:
-- rpc_month_end_dataset averages rate_date >= m0 and < m1; this averages
-- rate_date between p_start and p_end. For July 2026 both see the same 22 ECB
-- publications and return 0.85357666705340259545. "Last Month" and ?month=2026-07
-- therefore reproduce the email exactly.
--
-- Applied to a window that straddles two months — "Last 14 Days" on the 16th of
-- the month — it keeps meaning the same thing: the average rate over the days on
-- screen. The alternatives were worse. Pinning to the calendar month of the
-- period's end converts early-August days at a rate July never saw; blending two
-- month-averages weights them by month rather than by the sales in them. Averaging
-- exactly the days being reported needs no special case, and a period that happens
-- to be a calendar month falls out of it as the email's own number.
--
-- The comparison period is converted at ITS own period's average, not at the
-- current period's. That is deliberate: last month's column then reads the same as
-- last month's email did. Anchoring both to the current rate would hold the
-- comparison FX-neutral but would restate a figure the client has already been
-- sent.
--
-- Where no rate was published inside the window at all — a single-day view landing
-- on a weekend or a bank holiday — it falls back to the last rate published on or
-- before the window's end, and only then to today's spot. Both are labelled as
-- such by rpc_fx_basis so the page can say which it used.

-- Keyed lookup for the per-currency window average. The primary key is
-- (rate_date, quote), which does not serve "one quote across a date range".
-- ANALYZE straight after: without fresh statistics the planner kept the sequential
-- scan of all 945 rows, and the per-row lookup ran 20x slower than it needed to.
create index if not exists fx_rates_quote_date_idx
  on public.fx_rates (quote, rate_date);

analyze public.fx_rates;

-- --------------------------------------------------------------------------
-- The rate itself
--
-- NO `set search_path` on these two, deliberately. A SQL function carrying a SET
-- clause cannot be inlined by the planner, so it is invoked once per row with a
-- full executor setup rather than folding into the surrounding query — 85s
-- instead of 1s on rpc_asin_performance_country. Every object below is
-- schema-qualified and neither function is SECURITY DEFINER, so they run with the
-- caller's own rights and there is no privilege for a hostile search_path to
-- capture. to_gbp() is written the same way for the same reason.
-- --------------------------------------------------------------------------

create or replace function public.fx_period_rate(p_ccy text, p_start date, p_end date)
returns numeric
language sql
stable
as $$
  select case
    when p_ccy is null or upper(p_ccy) in ('GBP', '') then 1::numeric
    else coalesce(
      -- 1. period_average — the email's definition, applied to the window on screen.
      (select avg(f.rate)
         from public.fx_rates f
        where f.base = 'GBP'
          and f.quote = upper(p_ccy)
          and f.rate_date >= p_start
          and f.rate_date <= p_end),
      -- 2. spot_asof — nothing published inside the window (a weekend day).
      (select f.rate
         from public.fx_rates f
        where f.base = 'GBP'
          and f.quote = upper(p_ccy)
          and f.rate_date <= p_end
        order by f.rate_date desc
        limit 1),
      -- 3. latest_spot — nothing on or before the window either. The old behaviour,
      --    and still null for a currency we hold no rate for, so the caller gets
      --    null rather than an unconverted native figure passed off as sterling.
      (select l.rate from public.vw_fx_latest l where l.quote = upper(p_ccy))
    )
  end;
$$;

comment on function public.fx_period_rate(text, date, date) is
  'GBP conversion rate for a reporting period: the mean of every rate published inside it. Same definition rpc_month_end_dataset uses for a month, so a calendar-month window reproduces the client email exactly. Must stay inlineable - no SET clause.';

create or replace function public.to_gbp_period(amount numeric, ccy text, p_start date, p_end date)
returns numeric
language sql
stable
as $$
  select case
    when amount is null then null
    when ccy is null or upper(ccy) in ('GBP', '') then amount
    else amount * public.fx_period_rate(ccy, p_start, p_end)
  end;
$$;

comment on function public.to_gbp_period(numeric, text, date, date) is
  'Period-aware sibling of to_gbp(). Use wherever a period is known; to_gbp() remains for the daily views, which have none. Must stay inlineable - no SET clause.';

comment on function public.to_gbp(numeric, text) is
  'Latest spot conversion. Correct only where no reporting period is in play — the per-day views and ops pulses. Anything with p_start/p_end must use to_gbp_period() so the page agrees with the month-end client email.';

-- --------------------------------------------------------------------------
-- What the page has to say out loud
-- --------------------------------------------------------------------------

create or replace function public.rpc_fx_basis(p_start date, p_end date, p_quotes text[])
returns table(quote text, rate numeric, rate_date date, basis text, observations integer, source text)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $$
  with wanted as (
    select distinct upper(q) as quote
    from unnest(coalesce(p_quotes, array[]::text[])) q
    where q is not null and upper(q) not in ('GBP', '')
  ),
  win as (
    select w.quote,
           avg(f.rate)      as rate,
           max(f.rate_date) as rate_date,
           count(f.*)::int  as observations,   -- count(*) would be 1 on a no-match left join
           -- Not max(): that is alphabetical. EUR's July window is 21 Frankfurter
           -- publications and one 'seed' backfill row, and 'seed' sorts last, so the
           -- page told the client the rate came from "seed".
           mode() within group (order by f.source) as source
    from wanted w
    left join public.fx_rates f
      on f.quote = w.quote and f.base = 'GBP'
     and f.rate_date >= p_start and f.rate_date <= p_end
    group by w.quote
  )
  select w.quote,
         coalesce(w.rate, b.rate, l.rate),
         coalesce(w.rate_date, b.rate_date, l.rate_date),
         case when w.rate is not null then 'period_average'
              when b.rate is not null then 'spot_asof'
              when l.rate is not null then 'latest_spot'
         end,
         w.observations,
         coalesce(w.source, b.source)
  from win w
  left join lateral (
    select f.rate, f.rate_date, f.source
      from public.fx_rates f
     where f.quote = w.quote and f.base = 'GBP' and f.rate_date <= p_end
     order by f.rate_date desc limit 1
  ) b on w.rate is null
  left join public.vw_fx_latest l
    on l.quote = w.quote and w.rate is null
  order by (w.quote <> 'EUR'), w.quote;
$$;

comment on function public.rpc_fx_basis(date, date, text[]) is
  'The rate, its date, and the basis behind it for the period on screen — what the dashboard prints in its Basis strip, matching the client email footer.';

grant execute on function public.fx_period_rate(text, date, date) to anon, authenticated, service_role;
grant execute on function public.to_gbp_period(numeric, text, date, date) to anon, authenticated, service_role;
grant execute on function public.rpc_fx_basis(date, date, text[]) to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- Everything with a period moves onto it. Bodies are otherwise unchanged.
-- --------------------------------------------------------------------------

create or replace function public.rpc_metrics_daily_country(p_spid text, p_scope text, p_start date, p_end date)
returns table(bucket date, units bigint, sales_native numeric, sales_gbp numeric, page_views numeric, sessions numeric, buy_box_pct numeric, conversion numeric, has_sessions boolean, currency text, units_with_sessions bigint)
language sql
stable security definer
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
           public.to_gbp_period(s.ordered_product_sales_amount,
                         coalesce(nullif(s.ordered_product_sales_currency,''), sc.currency),
                         p_start, p_end) as sales_gbp,
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
           public.to_gbp_period(sum(v.ordered_revenue),
                         coalesce(nullif(max(v.currency),''), max(sc.currency)),
                         p_start, p_end) as sales_gbp,
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
    case when sum(sessions) filter (where sessions is not null) > 0
         then round(100.0 * sum(units) filter (where sessions is not null)
                    / sum(sessions) filter (where sessions is not null), 2)
    end as conversion,
    count(*) filter (where sessions is not null) > 0 as has_sessions,
    case when count(distinct currency) = 1 then max(currency) else null end,
    coalesce(sum(units) filter (where sessions is not null), 0)::bigint as units_with_sessions
  from rows
  group by record_date
  order by record_date;
$function$;

-- The sales views still publish a latest-spot sales_gbp for the period-less
-- callers. These three have a period, so they reconvert from sales_native.
create or replace function public.rpc_sales_timeseries(p_spid text, p_scope text, p_start date, p_end date)
returns table(bucket date, units bigint, sales_gbp numeric, sales_native numeric, currency text)
language sql
stable
as $function$
  select v.record_date,
         sum(v.units)::bigint,
         sum(public.to_gbp_period(v.sales_native, v.currency, p_start, p_end)),
         case when public.scope_area(p_scope) in ('ALL','ALL_EU')
              then null::numeric else sum(v.sales_native) end,
         case when public.scope_area(p_scope) in ('ALL','ALL_EU')
              then null::text    else max(v.currency)     end
  from public.vw_sales_daily_country v
  join public.brand_scope_accounts(p_spid, p_scope) sc
    on sc.brand_name = v.brand_name
   and sc.marketplace_id = v.marketplace_id
  where v.record_date between p_start and p_end
  group by v.record_date
  order by v.record_date;
$function$;

create or replace function public.rpc_sales_timeseries_by_country(p_spid text, p_scope text, p_start date, p_end date)
returns table(bucket date, country_code text, units bigint, sales_gbp numeric)
language sql
stable
as $function$
  select v.record_date, v.country_code, sum(v.units)::bigint,
         sum(public.to_gbp_period(v.sales_native, v.currency, p_start, p_end))
  from public.vw_sales_daily_country v
  join public.brand_scope_accounts(p_spid, p_scope) sc
    on sc.brand_name = v.brand_name
   and sc.marketplace_id = v.marketplace_id
  where v.record_date between p_start and p_end
  group by v.record_date, v.country_code
  order by v.record_date;
$function$;

create or replace function public.rpc_sales_summary(p_spid text, p_scope text, p_start date, p_end date)
returns table(country_code text, marketplace_id text, arm text, currency text, sales_native numeric, units bigint, sales_gbp numeric)
language sql
stable
as $function$
  select v.country_code, v.marketplace_id, sc.arm, max(v.currency),
         sum(v.sales_native), sum(v.units)::bigint,
         sum(public.to_gbp_period(v.sales_native, v.currency, p_start, p_end))
  from public.vw_sales_daily_country v
  join public.brand_scope_accounts(p_spid, p_scope) sc
    on sc.marketplace_id = v.marketplace_id and sc.brand_name = v.brand_name
  where v.record_date between p_start and p_end
  group by v.country_code, v.marketplace_id, sc.arm
  order by 7 desc nulls last;
$function$;

create or replace function public.rpc_agency_summary(p_start date, p_end date)
returns table(spid text, brand_name text, countries integer, units bigint, sales_gbp numeric)
language sql
stable
as $function$
  select v.spid, max(v.brand_name),
         count(distinct v.country_code)::int,
         sum(v.units)::bigint,
         sum(public.to_gbp_period(v.sales_native, v.currency, p_start, p_end))
  from public.vw_sales_daily_country v
  join public.brand_marketplaces bm
    on bm.selling_partner_id = v.spid and bm.marketplace_id = v.marketplace_id and bm.enabled
  where v.record_date between p_start and p_end
  group by v.spid
  order by 5 desc nulls last;
$function$;

create or replace function public.rpc_asin_performance_country(p_spid text, p_scope text, p_start date, p_end date)
returns table(child_asin text, parent_asin text, product_title text, units_sold bigint, sales_native numeric, sales_gbp numeric, page_views numeric, buy_box_percentage numeric, conversion_rate numeric, currency text, latest_date date)
language sql
stable security definer
set search_path to 'public'
as $function$
  -- This one scans Portwest's whole per-ASIN vendor feed — 334,317 rows for a
  -- single July — so the rate is hoisted out of the row loop and joined once per
  -- currency. Same period_average definition; the scalar fx_period_rate() call
  -- survives only as the coalesce fallback, for a currency the window published no
  -- rate for at all, which keeps the ladder intact without paying for it 334k
  -- times. 13.2s, against 20s on the old to_gbp() and 25s with a per-row
  -- to_gbp_period().
  with fxr as (
    select f.quote, avg(f.rate) as rate
    from public.fx_rates f
    where f.base = 'GBP' and f.rate_date >= p_start and f.rate_date <= p_end
    group by f.quote
  ),
  rows as (
    select
      d.child_asin,
      d.parent_asin,
      d.product_title,
      d.record_date,
      coalesce(d.units_sold,0)::numeric        as units,
      coalesce(d.sales,0)::numeric             as sales_native,
      coalesce(d.sales,0)
        * coalesce(fx.rate, public.fx_period_rate(sc.currency, p_start, p_end)) as sales_gbp,
      coalesce(d.page_views,0)::numeric        as page_views,
      coalesce(d.sessions,0)::numeric          as sessions,
      d.buy_box_percentage,
      sc.currency
    from public.daily_asin_data d
    join public.brand_scope_accounts(p_spid, p_scope) sc
      on sc.sales_account_key = d.merchant_token
    left join fxr fx on fx.quote = upper(sc.currency)
    where d.child_asin is not null
      and d.record_date between p_start and p_end

    union all

    -- vendor per-ASIN rows live here, not in daily_asin_data
    select
      v.asin,
      null::text,
      null::text,
      v.record_date,
      coalesce(v.ordered_units,0)::numeric,
      coalesce(v.ordered_revenue,0)::numeric,
      coalesce(v.ordered_revenue,0)
        * coalesce(fx.rate, public.fx_period_rate(coalesce(nullif(v.currency,''), sc.currency), p_start, p_end)),
      coalesce(v.glance_views,0)::numeric,
      0::numeric,                                  -- vendor feed has no sessions
      case when v.lost_featured_offer is null then null
           else round((1 - v.lost_featured_offer) * 100, 2) end,
      coalesce(nullif(v.currency,''), sc.currency)
    from public.vendor_daily_metrics v
    join public.brand_scope_accounts(p_spid, p_scope) sc
      on sc.selling_partner_id = v.selling_partner_id and sc.marketplace_id = v.marketplace_id
    left join fxr fx on fx.quote = upper(coalesce(nullif(v.currency,''), sc.currency))
    where v.view_name = 'manufacturing'
      and v.asin is not null
      and v.record_date between p_start and p_end
  ),
  agg as (
    select
      r.child_asin,
      max(r.parent_asin)                                   as parent_asin,
      (array_agg(r.product_title order by r.record_date desc)
         filter (where r.product_title is not null))[1]    as product_title,
      sum(r.units)::bigint                                 as units_sold,
      sum(r.sales_native)                                  as sales_native,
      sum(r.sales_gbp)                                     as sales_gbp,
      sum(r.page_views)                                    as page_views,
      case when sum(r.page_views) filter (where r.buy_box_percentage is not null) > 0
           then round(sum(r.buy_box_percentage * r.page_views) filter (where r.buy_box_percentage is not null)
                      / sum(r.page_views) filter (where r.buy_box_percentage is not null), 2)
           else avg(r.buy_box_percentage) filter (where r.buy_box_percentage is not null)
      end                                                  as buy_box_percentage,
      case when sum(r.sessions) > 0 then round(100.0 * sum(r.units) / sum(r.sessions), 2) end as conversion_rate,
      case when count(distinct r.currency) = 1 then max(r.currency) else null end as currency,
      max(r.record_date)                                   as latest_date
    from rows r
    group by r.child_asin
    having sum(r.units) > 0 or sum(r.sales_native) <> 0
  )
  select a.child_asin, a.parent_asin,
         coalesce(a.product_title, t.title) as product_title,
         a.units_sold, a.sales_native, a.sales_gbp, a.page_views,
         a.buy_box_percentage, a.conversion_rate, a.currency, a.latest_date
  from agg a
  left join lateral (
    select c.title from public.catalog_content_export c
    where c.asin = a.child_asin and c.title is not null limit 1
  ) t on a.product_title is null
  order by a.sales_gbp desc nulls last;
$function$;

create or replace function public.rpc_ppc_summary(p_spid text, p_scope text, p_start date, p_end date)
returns table(country_code text, marketplace_id text, currency text, ad_spend_gbp numeric, ad_spend_source text, ad_sales_gbp numeric, net_sales_gbp numeric, has_ads_perf boolean)
language sql
stable security definer
set search_path to 'public'
as $function$
  with scope as (
    select sc.marketplace_id, sc.country_code, sc.region, sc.currency, sc.selling_partner_id
    from public.brand_scope_accounts(p_spid, p_scope) sc
  ),
  cur as (
    select s.country_code, max(s.currency) as currency, max(s.marketplace_id) as marketplace_id
    from scope s group by s.country_code
  ),
  econ as (
    select m.country_code,
           sum(public.to_gbp_period(coalesce(e.ads_spend,0), coalesce(nullif(e.currency,''), s.currency), p_start, p_end)) ad_spend_gbp,
           sum(public.to_gbp_period(coalesce(e.net_product_sales,0), coalesce(nullif(e.currency,''), s.currency), p_start, p_end)) net_sales_gbp
    from public.fin_seller_economics e
    join scope s on s.marketplace_id = e.marketplace_id and s.selling_partner_id = e.selling_partner_id
    join public.amazon_marketplaces m on m.marketplace_id = e.marketplace_id
    where e.period_end between p_start and p_end
    group by m.country_code
  ),
  ads as (
    select case when upper(a.country_code)='UK' then 'GB' else upper(a.country_code) end cc,
           sum(coalesce(a.spend,0))    feed_spend_native,
           sum(coalesce(a.sales_7d,0)) ad_sales_native
    from public.amazon_api_campaigns_performance a
    where a.account_id in (select distinct selling_partner_id from scope)
      and a.date between p_start and p_end
    group by 1
  )
  select
    c.country_code,
    c.marketplace_id,
    c.currency,
    round(coalesce(public.to_gbp_period(a.feed_spend_native, c.currency, p_start, p_end), e.ad_spend_gbp), 2) as ad_spend_gbp,
    case when a.cc is not null then 'ads_feed' else 'financials' end as ad_spend_source,
    case when coalesce(a.ad_sales_native,0) > 0
         then round(public.to_gbp_period(a.ad_sales_native, c.currency, p_start, p_end), 2)
    end as ad_sales_gbp,
    round(e.net_sales_gbp, 2) as net_sales_gbp,
    coalesce(a.ad_sales_native,0) > 0 as has_ads_perf
  from cur c
  left join econ e on e.country_code = c.country_code
  left join ads  a on a.cc = c.country_code
  where coalesce(public.to_gbp_period(a.feed_spend_native, c.currency, p_start, p_end), e.ad_spend_gbp, 0) > 0
     or coalesce(a.ad_sales_native, 0) > 0
  order by 4 desc nulls last;
$function$;

create or replace function public.rpc_pnl_summary(p_spid text, p_scope text, p_start date, p_end date)
returns table(country_code text, marketplace_id text, currency text, units bigint, sales_native numeric, fees_native numeric, ads_native numeric, tax_native numeric, net_proceeds_native numeric, cogs_native numeric, profit_native numeric, sales_gbp numeric, fees_gbp numeric, ads_gbp numeric, tax_gbp numeric, net_proceeds_gbp numeric, cogs_gbp numeric, profit_gbp numeric)
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
           sum(coalesce(c.cost_price,0) * coalesce(e.net_units,0)) as cogs_gbp
    from public.fin_seller_economics e
    join scope s on s.marketplace_id = e.marketplace_id
    left join public.asin_cost_prices c
      on c.asin = e.asin and c.brand = (select python_brand_name from pbrand)
    where e.selling_partner_id = p_spid and e.period_end between p_start and p_end
    group by e.marketplace_id, coalesce(nullif(e.currency,''), s.currency)
  ),
  bal as (
    select e.*, (e.sales - abs(e.fees) - abs(e.ads) - e.net_proceeds) as tax
    from econ e
  )
  select
    m.country_code, e.marketplace_id, e.currency,
    e.units::bigint,
    e.sales, abs(e.fees), abs(e.ads), e.tax, e.net_proceeds,
    e.cogs_gbp / coalesce(public.to_gbp_period(1, e.currency, p_start, p_end), 1) as cogs_native,
    e.net_proceeds - (e.cogs_gbp / coalesce(public.to_gbp_period(1, e.currency, p_start, p_end), 1))   as profit_native,
    public.to_gbp_period(e.sales, e.currency, p_start, p_end), public.to_gbp_period(abs(e.fees), e.currency, p_start, p_end),
    public.to_gbp_period(abs(e.ads), e.currency, p_start, p_end), public.to_gbp_period(e.tax, e.currency, p_start, p_end),
    public.to_gbp_period(e.net_proceeds, e.currency, p_start, p_end),
    e.cogs_gbp,
    public.to_gbp_period(e.net_proceeds, e.currency, p_start, p_end) - e.cogs_gbp as profit_gbp
  from bal e join public.amazon_marketplaces m on m.marketplace_id = e.marketplace_id
  order by public.to_gbp_period(e.sales, e.currency, p_start, p_end) desc nulls last;
$function$;

create or replace function public.rpc_pnl_products(p_spid text, p_scope text, p_start date, p_end date)
returns table(asin text, sku text, product_name text, units bigint, sales_gbp numeric, fees_gbp numeric, ads_gbp numeric, tax_gbp numeric, net_proceeds_gbp numeric, cogs_gbp numeric, profit_gbp numeric, has_cost boolean, sales_native numeric, fees_native numeric, ads_native numeric, tax_native numeric, net_proceeds_native numeric, cogs_native numeric, profit_native numeric, currency text)
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
    sum(public.to_gbp_period(coalesce(e.net_product_sales,0), coalesce(nullif(e.currency,''), s.currency), p_start, p_end)) as sales_gbp,
    sum(public.to_gbp_period(abs(coalesce(e.referral_fees,0) + coalesce(e.fba_fulfilment_fees,0)
        + coalesce(e.storage_fees,0) + coalesce(e.other_fees,0)), coalesce(nullif(e.currency,''), s.currency), p_start, p_end)) as fees_gbp,
    sum(public.to_gbp_period(abs(coalesce(e.ads_spend,0)), coalesce(nullif(e.currency,''), s.currency), p_start, p_end)) as ads_gbp,
    sum(public.to_gbp_period(
          coalesce(e.net_product_sales,0)
          - abs(coalesce(e.referral_fees,0) + coalesce(e.fba_fulfilment_fees,0)
                + coalesce(e.storage_fees,0) + coalesce(e.other_fees,0))
          - abs(coalesce(e.ads_spend,0))
          - coalesce(e.net_proceeds_total,0), coalesce(nullif(e.currency,''), s.currency), p_start, p_end)) as tax_gbp,
    sum(public.to_gbp_period(coalesce(e.net_proceeds_total,0), coalesce(nullif(e.currency,''), s.currency), p_start, p_end)) as net_proceeds_gbp,
    sum(coalesce(c.cost_price,0) * coalesce(e.net_units,0)) as cogs_gbp,
    sum(public.to_gbp_period(coalesce(e.net_proceeds_total,0), coalesce(nullif(e.currency,''), s.currency), p_start, p_end))
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
         else sum(coalesce(c.cost_price,0)*coalesce(e.net_units,0)) / nullif(public.to_gbp_period(1, max(coalesce(nullif(e.currency,''), s.currency)), p_start, p_end),0) end as cogs_native,
    case when public.scope_area(p_scope) in ('ALL','ALL_EU') then null
         else sum(coalesce(e.net_proceeds_total,0)) - (sum(coalesce(c.cost_price,0)*coalesce(e.net_units,0)) / nullif(public.to_gbp_period(1, max(coalesce(nullif(e.currency,''), s.currency)), p_start, p_end),0)) end as profit_native,
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

create or replace function public.rpc_pnl_fee_breakdown(p_spid text, p_scope text, p_start date, p_end date)
returns table(category text, amount_gbp numeric, share numeric)
language sql
stable security definer
set search_path to 'public'
set statement_timeout to '20s'
as $function$
  with scope as (
    select bm.marketplace_id
    from public.brand_marketplaces bm
    where bm.selling_partner_id = p_spid and bm.enabled
      and ( public.scope_area(p_scope)='ALL' or (public.scope_area(p_scope)='ALL_EU' and bm.region='EU') or bm.country_code = public.scope_area(p_scope) )
  ),
  rows as (
    select
      case
        when b.breakdown_type = 'Commission' then 'Referral fee'
        when b.breakdown_type = 'FBAPerUnitFulfillmentFee' then 'FBA fulfilment'
        when b.breakdown_type = 'StorageBillingFee' then 'Storage'
        when b.breakdown_type = 'DigitalServicesFee' and b.parent_breakdown = 'Expenses' then 'Digital Services Fee'
        when b.breakdown_type = 'PromoRebates' and b.parent_breakdown = 'Expenses' then 'Promotions'
        when b.breakdown_type in ('DealParticipationFeeRollup','DealPerformanceFeeRollup') then 'Deal fees'
        when b.breakdown_type = 'ShippingChargeback' then 'Shipping chargeback'
      end as category,
      public.to_gbp_period(b.amount, b.currency, p_start, p_end) as amt
    from public.fin_transaction_breakdowns b
    join public.fin_transactions t
      on t.transaction_id = b.transaction_id and t.selling_partner_id = b.selling_partner_id
    join scope s on s.marketplace_id = t.marketplace_id
    where b.selling_partner_id = p_spid
      and t.posted_date >= p_start and t.posted_date < (p_end + 1)
  ),
  agg as (
    select category, sum(amt) amt from rows where category is not null
    group by category having abs(sum(amt)) > 0.005
  )
  select category, round(amt,2),
         round(amt / nullif(sum(amt) over (), 0), 4)
  from agg order by amt;
$function$;

create or replace function public.rpc_budget_planned_monthly(p_spid text, p_scope text, p_start date, p_end date)
returns table(metric text, period_month date, budget_native numeric, budget_gbp numeric, currency text)
language sql
stable security definer
set search_path to 'public'
as $function$
  with v as (
    select id from budget_versions where selling_partner_id=p_spid and status='active'
  ),
  lines as (
    select bl.metric, bl.period_month, bl.amount, bl.currency, bl.scope_level, bl.country_code, bm.region
    from budget_lines bl
    join v on v.id = bl.version_id
    left join brand_marketplaces bm
      on bm.selling_partner_id = bl.selling_partner_id and bm.country_code = bl.country_code
    where bl.selling_partner_id = p_spid
      and coalesce(bl.grain,'month') = 'month'          -- exclude weekly lines (prevents double-count)
      and bl.period_month between date_trunc('month',p_start)::date and date_trunc('month',p_end)::date
      and ( public.scope_area(p_scope)='ALL'
         or (public.scope_area(p_scope)='ALL_EU' and bl.scope_level='marketplace' and bm.region='EU')
         or (bl.scope_level='marketplace' and bl.country_code = public.scope_area(p_scope)) )
  )
  -- A budget line is dated to its own month, so it converts at that month's rate
  -- rather than the viewing window's — otherwise a 12-month budget view would
  -- restate every month at one rate and stop tying to the month it was set for.
  select metric, period_month,
         case when count(distinct currency)=1 then sum(amount) else null end,
         sum(public.to_gbp_period(amount, currency, period_month,
                                  (period_month + interval '1 month - 1 day')::date)),
         case when count(distinct currency)=1 then max(currency) else 'GBP' end
  from lines group by metric, period_month;
$function$;

create or replace function public.rpc_budget_planned_weekly(p_spid text, p_scope text, p_start date, p_end date)
returns table(metric text, period_start date, budget_native numeric, budget_gbp numeric, currency text)
language sql
stable security definer
set search_path to 'public'
as $function$
  with v as (select id from budget_versions where selling_partner_id=p_spid and status='active'),
  lines as (
    select bl.metric, bl.period_start, bl.amount, bl.currency, bl.scope_level, bl.country_code, bm.region
    from budget_lines bl join v on v.id=bl.version_id
    left join brand_marketplaces bm on bm.selling_partner_id=bl.selling_partner_id and bm.country_code=bl.country_code
    where bl.selling_partner_id=p_spid and bl.grain='week'
      and bl.period_start between p_start and p_end
      and (public.scope_area(p_scope)='ALL' or (public.scope_area(p_scope)='ALL_EU' and bl.scope_level='marketplace' and bm.region='EU')
           or (bl.scope_level='marketplace' and bl.country_code=public.scope_area(p_scope)))
  )
  -- As above: each week converts at its own week's rate.
  select metric, period_start,
    case when count(distinct currency)=1 then sum(amount) else null end,
    sum(public.to_gbp_period(amount, currency, period_start, (period_start + 6))),
    case when count(distinct currency)=1 then max(currency) else 'GBP' end
  from lines group by metric, period_start;
$function$;
