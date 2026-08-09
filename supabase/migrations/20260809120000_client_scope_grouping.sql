-- =====================================================================
-- Client grouping: show a client's WHOLE business, not one Amazon account
-- =====================================================================
--
-- Two clients are commercially one business spread across two separate
-- Amazon selling accounts:
--
--   S Green & Sons  = vendor amzn1.vg.6672602  +  seller Ooble Home
--   Portwest        = 12 vendor accounts       +  sellers Workwear Depot UK / US
--
-- The month-end client emails already get this right, via month_end_client_map.
-- The dashboard did not: brand_scope_accounts() widened a share link's
-- selling_partner_id to its BRAND, and the two arms of a client carry
-- different brand names (and different spids), so each arm saw only itself.
-- S Green's dashboard showed £79,758 of a £293,014 business.
--
-- This migration makes month_end_client_map the single source of truth for
-- both, by lifting the month-end RPC's own resolution expression
--
--     coalesce(cm.client_name, am.account_name, bm.brand_name)
--
-- into a view that everything scope-related now reads. Dashboard and email
-- cannot drift apart because they resolve the client the same way.
--
-- -------------------------------------------------------------------
-- Scope grammar
-- -------------------------------------------------------------------
-- Grouping arms means two rows can share a country — Portwest has UK·Vendor
-- AND UK·Seller. Summing them into one "UK" would erase a split the client
-- reads in their monthly email, so scope tokens gained an optional arm:
--
--     GB            every arm in GB
--     GB#Vendor     the vendor arm in GB
--     ALL#Vendor    the vendor arm everywhere  (Portwest's 12 vendor markets)
--     ALL           the whole client, every arm, every country
--     ALL_EU        every arm in EU marketplaces
--
-- A bare country / ALL / ALL_EU behaves exactly as before, so every
-- single-arm client is untouched.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Scope token helpers
-- ---------------------------------------------------------------------
create or replace function public.scope_area(p_scope text)
returns text language sql immutable as $$
  select split_part(coalesce(p_scope, ''), '#', 1);
$$;

create or replace function public.scope_arm(p_scope text)
returns text language sql immutable as $$
  select nullif(split_part(coalesce(p_scope, ''), '#', 2), '');
$$;

comment on function public.scope_area(text) is
  'Country / ALL / ALL_EU part of a scope token. scope_area(''GB#Vendor'') = ''GB''.';
comment on function public.scope_arm(text) is
  'Arm part of a scope token, or NULL when the scope spans every arm.';

-- ---------------------------------------------------------------------
-- 2. The registry, resolved to a CLIENT
-- ---------------------------------------------------------------------
-- The join chain is copied verbatim from rpc_month_end_dataset so the two
-- cannot disagree about who a marketplace belongs to.
create or replace view public.vw_client_marketplaces as
select
  coalesce(cm.client_name, am.account_name, bm.brand_name) as client_name,
  cm.arm,
  bm.brand_name,
  bm.selling_partner_id,
  bm.sales_account_key,
  bm.marketplace_id,
  bm.country_code,
  bm.region,
  bm.currency,
  bm.is_primary,
  bm.enabled
from public.brand_marketplaces bm
left join public.accounts_master am
       on am.merchant_token = bm.sales_account_key
left join public.month_end_client_map cm
       on cm.account_name = coalesce(am.account_name, bm.brand_name);

comment on view public.vw_client_marketplaces is
  'brand_marketplaces resolved to a client via month_end_client_map, using the '
  'identical coalesce(cm.client_name, am.account_name, bm.brand_name) expression '
  'as rpc_month_end_dataset. Single source of truth for dashboard scope AND the '
  'month-end emails.';

-- ---------------------------------------------------------------------
-- 3. brand_scope_accounts — now client-wide and arm-aware
-- ---------------------------------------------------------------------
-- Return type gains `arm`, so this has to be dropped rather than replaced.
-- The six dependent RPCs are plain (non-SQL-standard-body) functions, so
-- they hold no catalogue dependency on it and keep working unchanged.
drop function if exists public.brand_scope_accounts(text, text);

create function public.brand_scope_accounts(p_spid text, p_scope text)
returns table(
  brand_name text,
  selling_partner_id text,
  sales_account_key text,
  marketplace_id text,
  country_code text,
  region text,
  currency text,
  arm text
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  with me as (
    select distinct v.client_name
    from public.vw_client_marketplaces v
    where v.selling_partner_id = p_spid
      and v.enabled
  )
  select v.brand_name, v.selling_partner_id, v.sales_account_key,
         v.marketplace_id, v.country_code, v.region, v.currency, v.arm
  from public.vw_client_marketplaces v
  where v.enabled
    and v.client_name in (select client_name from me)
    -- country / rollup part
    and ( public.scope_area(p_scope) = 'ALL'
          or (public.scope_area(p_scope) = 'ALL_EU' and v.region = 'EU')
          or v.country_code = public.scope_area(p_scope) )
    -- arm part: absent ⇒ every arm
    and ( public.scope_arm(p_scope) is null
          or v.arm = public.scope_arm(p_scope) );
$function$;

comment on function public.brand_scope_accounts(text, text) is
  'Marketplaces in scope for the CLIENT that owns p_spid. Widened by client '
  '(month_end_client_map), not by brand — a vendor arm and a seller arm carry '
  'different brand names and different spids but are one business. p_scope '
  'accepts GB / ALL / ALL_EU, optionally suffixed #Vendor or #Seller.';

grant execute on function public.brand_scope_accounts(text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. rpc_client_scope — what the country switcher is built from
-- ---------------------------------------------------------------------
-- The dashboard used to assemble the country list itself from
-- brand_marketplaces. It cannot do the client resolution client-side
-- (month_end_client_map is not exposed to anon), and duplicating the rule in
-- TypeScript is exactly how the dashboard and the emails drifted apart in the
-- first place. One SECURITY DEFINER call, returning only the caller's own
-- client, keeps a single rule.
create or replace function public.rpc_client_scope(p_spid text)
returns table(
  client_name text,
  arm text,
  brand_name text,
  selling_partner_id text,
  sales_account_key text,
  marketplace_id text,
  country_code text,
  country_name text,
  region text,
  currency text,
  is_primary boolean,
  sort_order integer
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  with me as (
    select distinct v.client_name
    from public.vw_client_marketplaces v
    where v.selling_partner_id = p_spid
      and v.enabled
  )
  select v.client_name, v.arm, v.brand_name, v.selling_partner_id,
         v.sales_account_key, v.marketplace_id, v.country_code,
         coalesce(m.country_name, v.country_code) as country_name,
         v.region, v.currency, v.is_primary,
         coalesce(m.sort_order, 999)::int as sort_order
  from public.vw_client_marketplaces v
  left join public.amazon_marketplaces m on m.marketplace_id = v.marketplace_id
  where v.enabled
    and v.client_name in (select client_name from me)
  order by coalesce(m.sort_order, 999), v.country_code, v.arm nulls first;
$function$;

comment on function public.rpc_client_scope(text) is
  'Every enabled marketplace belonging to the client that owns p_spid, with its '
  'arm (Vendor / Seller / NULL). Drives the country switcher.';

grant execute on function public.rpc_client_scope(text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. The two timeseries RPCs re-based onto brand_scope_accounts
-- ---------------------------------------------------------------------
-- These had their own inline copy of the brand-widening rule, so the sales
-- trend card would have kept showing one arm while the KPIs beneath it showed
-- both. Same helper, same answer.
create or replace function public.rpc_sales_timeseries(
  p_spid text, p_scope text, p_start date, p_end date
)
returns table(bucket date, units bigint, sales_gbp numeric, sales_native numeric, currency text)
language sql
stable
as $function$
  select v.record_date,
         sum(v.units)::bigint,
         sum(v.sales_gbp),
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

create or replace function public.rpc_sales_timeseries_by_country(
  p_spid text, p_scope text, p_start date, p_end date
)
returns table(bucket date, country_code text, units bigint, sales_gbp numeric)
language sql
stable
as $function$
  select v.record_date, v.country_code, sum(v.units)::bigint, sum(v.sales_gbp)
  from public.vw_sales_daily_country v
  join public.brand_scope_accounts(p_spid, p_scope) sc
    on sc.brand_name = v.brand_name
   and sc.marketplace_id = v.marketplace_id
  where v.record_date between p_start and p_end
  group by v.record_date, v.country_code
  order by v.record_date;
$function$;

-- ---------------------------------------------------------------------
-- 6. Rollup detection inside the scoped RPCs
-- ---------------------------------------------------------------------
-- rpc_sales_summary_country decided "is this a single-currency scope?" with a
-- literal p_scope IN ('ALL','ALL_EU'). 'ALL#Vendor' passes that test as a
-- single country and would have printed a twelve-currency total under one
-- currency symbol.
create or replace function public.rpc_sales_summary_country(
  p_spid text, p_scope text, p_start date, p_end date
)
returns table(units bigint, sales_native numeric, sales_gbp numeric, currency text, is_native boolean)
language sql
stable
as $function$
  select
    coalesce(sum(v.units),0)::bigint as units,
    -- a native total is only meaningful inside one marketplace
    case when public.scope_area(p_scope) not in ('ALL','ALL_EU')
         then coalesce(sum(v.sales_native),0) end as sales_native,
    coalesce(sum(v.sales_gbp),0) as sales_gbp,
    case when public.scope_area(p_scope) not in ('ALL','ALL_EU')
         then max(v.currency) else 'GBP' end as currency,
    (public.scope_area(p_scope) not in ('ALL','ALL_EU')) as is_native
  from public.vw_sales_daily_country v
  join public.brand_scope_accounts(p_spid, p_scope) sc
    on sc.marketplace_id = v.marketplace_id and sc.brand_name = v.brand_name
  where v.record_date between p_start and p_end;
$function$;
