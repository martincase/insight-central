-- The per-market breakdown grouped by (country, marketplace) only. Two arms of
-- one client share a marketplace — Portwest has UK·Vendor and UK·Seller — so
-- that grouping silently added them into a single "United Kingdom" line, which
-- is precisely the split the monthly client email keeps separate. The arm now
-- carries through to the panel.
drop function if exists public.rpc_sales_summary(text, text, date, date);

create function public.rpc_sales_summary(p_spid text, p_scope text, p_start date, p_end date)
returns table(
  country_code text,
  marketplace_id text,
  arm text,
  currency text,
  sales_native numeric,
  units bigint,
  sales_gbp numeric
)
language sql
stable
as $function$
  select v.country_code, v.marketplace_id, sc.arm, max(v.currency),
         sum(v.sales_native), sum(v.units)::bigint, sum(v.sales_gbp)
  from public.vw_sales_daily_country v
  join public.brand_scope_accounts(p_spid, p_scope) sc
    on sc.marketplace_id = v.marketplace_id and sc.brand_name = v.brand_name
  where v.record_date between p_start and p_end
  group by v.country_code, v.marketplace_id, sc.arm
  order by sum(v.sales_gbp) desc nulls last;
$function$;

grant execute on function public.rpc_sales_summary(text, text, date, date)
  to anon, authenticated, service_role;
