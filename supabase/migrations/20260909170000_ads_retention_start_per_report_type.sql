-- Amazon Ads report retention is per ad product, not one global date.
--
-- fn_ads_retention_start() returned date_trunc('month', current_date) - 3 months
-- for every report type. Amazon's real limits are rolling windows per ad product,
-- confirmed by its own 400 responses on 2026-09-09:
--   spCampaigns  "retention start date (2026-06-06)"  = current_date - 95
--   sdCampaigns  "retention start date (2026-07-06)"  = current_date - 65
--   sbCampaigns  "retention start date (2026-07-11)"  = current_date - 60
--
-- Because fn_ads_reconcile_wave floored its window at that single optimistic date,
-- every Sunday it asked Amazon for Brands and Display dates it will never serve.
-- Over the 14 days to 2026-09-09 that was 377 of 1128 sbAdGroup requests (33%) and
-- 188 of 1128 sdAdGroup (17%) failing with "startDate must be equal to or after
-- report type data retention start date". No data was lost - those dates are
-- genuinely gone - but it burned rate limit (contributing to 429 throttling on
-- legitimate calls) and filled ads_fetch_log with errors that would mask a real one.
--
-- The single date was also wrong in the other direction: early in a month
-- date_trunc('month') - 3 months is LATER than current_date - 95, so Sponsored
-- Products reconcile was skipping days Amazon would happily have served. Keying
-- off the real rolling window fixes both directions.

-- 1. Per-report-type retention. Prefix decides the ad product: sp / sb / sd.
create or replace function public.fn_ads_retention_start(p_report_type text)
returns date
language sql
stable
as $function$
  select current_date - (
    case lower(left(coalesce(p_report_type, ''), 2))
      when 'sp' then 95   -- Sponsored Products
      when 'sd' then 65   -- Sponsored Display
      when 'sb' then 60   -- Sponsored Brands
      else 60             -- unknown: assume the tightest window rather than error
    end
  )::int
$function$;

comment on function public.fn_ads_retention_start(text) is
  'Earliest date Amazon Ads will serve for a given report type (sp=95d, sd=65d, sb=60d rolling). Pass the reportType, e.g. spCampaigns.';

-- 2. The no-arg form is kept for any caller outside the database, but it was also
--    wrong: on 2026-09-09 it returned 2026-06-01, five days MORE permissive than
--    Sponsored Products actually allows. Delegate to the SP window so it is at
--    least correct for the most permissive product.
create or replace function public.fn_ads_retention_start()
returns date
language sql
stable
as $function$
  select public.fn_ads_retention_start('sp')
$function$;

comment on function public.fn_ads_retention_start() is
  'Deprecated: returns the Sponsored Products window (95d). Call fn_ads_retention_start(report_type) so Brands and Display get their own, tighter limits.';

-- 3. Point the reconcile waves at the typed overload. Patch the stored definition
--    by substitution rather than retyping it, so the function body - including the
--    auth token embedded in its net.http_post call - is preserved byte for byte.
do $$
declare
  v_def text;
  v_new text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'fn_ads_reconcile_wave';

  if v_def is null then
    raise exception 'fn_ads_reconcile_wave not found';
  end if;

  v_new := replace(v_def, 'fn_ads_retention_start()', 'fn_ads_retention_start(p_report_type)');

  if v_new = v_def then
    raise exception 'expected call to fn_ads_retention_start() not found in fn_ads_reconcile_wave';
  end if;

  execute v_new;
end
$$;

-- Verified after applying, on 2026-09-09:
--   fn_ads_retention_start('spCampaigns') = 2026-06-06  (matches Amazon)
--   fn_ads_retention_start('sdCampaigns') = 2026-07-06  (matches Amazon)
--   fn_ads_retention_start('sbCampaigns') = 2026-07-11  (matches Amazon)
-- and simulating the wave window maths: sbAdGroup chunks 2-3 and sdAdGroup chunk 3
-- now skip cleanly instead of being requested and rejected.
