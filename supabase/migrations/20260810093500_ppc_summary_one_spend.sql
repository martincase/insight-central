-- Advertising: one definition of ad spend, one currency, nothing dropped.
--
-- The old rpc_ppc_summary handed the UI two different numerators and let it
-- build a headline out of one and a table out of the other:
--
--   * the per-country ACOS used the ads feed's own spend (amazon_api_campaigns_
--     performance.spend), in the marketplace's native currency;
--   * ad_spend_gbp — the number printed in the "Ad spend (GBP)" column and
--     summed into the card — came from fin_seller_economics.ads_spend instead.
--
--   So Portwest showed "Blended ACOS 5.4%" over a country row reading 17.9% on
--   what the client was told was the same spend and the same ad sales.
--
--   * ad_sales was never converted to GBP at all, so a blended ACOS built from
--     a GBP numerator and a native denominator was meaningless the moment a
--     scope left the UK.
--
--   * tacos divided ad spend by fin_seller_economics.net_product_sales, which
--     is neither the ordered-product-sales figure the rest of the page shows
--     nor available for every arm. S Green & Sons: net sales £161,708 against
--     the £293,014 on the Sales card two boxes to the left, so TACOS read 16.1%
--     where the page's own numbers give 8.9%. TACOS is therefore no longer
--     computed here — the panel divides by the sales it is already displaying.
--
--   * econ drove the join, so a market that advertised but had no seller-
--     economics row vanished from the table while still being invisible to the
--     card. A full join keeps it.
--
-- Ad spend now has ONE definition per country: the ads feed where the feed
-- covers that country, financials only as a fallback, labelled either way.
-- There is no currency column on the ads feed, so the marketplace's own
-- currency (from the scope) is used for the conversion.

drop function if exists public.rpc_ppc_summary(text, text, date, date);

create function public.rpc_ppc_summary(p_spid text, p_scope text, p_start date, p_end date)
returns table(
  country_code text,
  marketplace_id text,
  currency text,
  ad_spend_gbp numeric,
  -- 'ads_feed' when the campaign feed covered this country, else 'financials'.
  ad_spend_source text,
  -- NULL, never zero, where no advertised sales are synced for the country.
  ad_sales_gbp numeric,
  net_sales_gbp numeric,
  has_ads_perf boolean
)
language sql
stable
security definer
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
           sum(public.to_gbp(coalesce(e.ads_spend,0), coalesce(nullif(e.currency,''), s.currency))) ad_spend_gbp,
           sum(public.to_gbp(coalesce(e.net_product_sales,0), coalesce(nullif(e.currency,''), s.currency))) net_sales_gbp
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
    -- One numerator, whichever source it came from.
    round(coalesce(public.to_gbp(a.feed_spend_native, c.currency), e.ad_spend_gbp), 2) as ad_spend_gbp,
    case when a.cc is not null then 'ads_feed' else 'financials' end as ad_spend_source,
    case when coalesce(a.ad_sales_native,0) > 0
         then round(public.to_gbp(a.ad_sales_native, c.currency), 2)
    end as ad_sales_gbp,
    round(e.net_sales_gbp, 2) as net_sales_gbp,
    coalesce(a.ad_sales_native,0) > 0 as has_ads_perf
  from cur c
  left join econ e on e.country_code = c.country_code
  left join ads  a on a.cc = c.country_code
  where coalesce(public.to_gbp(a.feed_spend_native, c.currency), e.ad_spend_gbp, 0) > 0
     or coalesce(a.ad_sales_native, 0) > 0
  order by 4 desc nulls last;
$function$;

grant execute on function public.rpc_ppc_summary(text, text, date, date) to anon, authenticated, service_role;
