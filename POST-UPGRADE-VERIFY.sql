-- Post-upgrade verification for wgrephgnrldsyipbvjco (run after the Postgres upgrade).
-- Baseline figures are as at 2026-08-10, immediately before the upgrade.
--
-- ORDER OF WORK:
--   1. Run section A. If anything is off, stop and investigate before touching the apps.
--   2. Run RESTORE-v_daily_asin_sync_health.sql to put the dropped monitoring view back.
--   3. Re-run section A's last query to confirm the view returned.
--   4. Run the 45-endpoint anon smoke test (see POST-UPGRADE-SMOKE.sh notes at the bottom).

-- ============================================================
-- A. Did the security work survive the catalog rebuild?
-- ============================================================
select
  -- expect 0. Was 44 before remediation, 0 after step 3.
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not c.relrowsecurity)            as rls_off_tables_expect_0,

  -- expect 33-34. Was 114 before step 4.
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='v'
      and not coalesce('security_invoker=on' = any(c.reloptions), false))           as definer_views_expect_33,

  -- expect 31 across 28 tables (the evidenced writers only)
  (select count(*) from pg_policies where schemaname='public' and cmd='ALL'
     and qual='true' and roles::text <> '{service_role}')                           as unrestricted_all_expect_31,

  -- expect 62 (the verified browser RPC keep-list)
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and has_function_privilege('anon',p.oid,'EXECUTE'))                           as definer_fns_anon_expect_62,

  -- expect 257 (service_role must never lose execute)
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and has_function_privilege('service_role',p.oid,'EXECUTE'))                   as svc_role_fns_expect_257,

  -- expect 1 (wm_scan_dispatch only)
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and has_function_privilege('anon',p.oid,'EXECUTE')
      and p.provolatile='v' and p.prorettype <> 'pg_catalog.trigger'::regtype
      and p.proname ~ '(fire|dispatch|push|pause|approve|apply|run_)')              as anon_action_fns_expect_1;

-- ============================================================
-- B. Did pg_cron come back intact? (it is dropped/recreated by the upgrade)
-- Baseline captured in public._cron_baseline: 180 jobs, 161 active.
-- ============================================================
select
  (select count(*) from cron.job)                            as jobs_now_expect_180,
  (select count(*) from cron.job where active)               as active_now_expect_161,
  (select count(*) from public._cron_baseline b
     where not exists (select 1 from cron.job j where j.jobid = b.jobid))  as jobs_MISSING_expect_0;

-- Any job that came back but is no longer active:
select b.jobid, b.jobname, b.schedule, b.active as was_active, j.active as is_active
from public._cron_baseline b
join cron.job j on j.jobid = b.jobid
where b.active and not j.active;

-- Jobs present in the baseline but gone entirely (these need recreating):
select b.jobid, b.jobname, b.schedule, b.command
from public._cron_baseline b
where not exists (select 1 from cron.job j where j.jobid = b.jobid);

-- ============================================================
-- C. The helper functions that anon-readable views depend on.
-- These were re-granted after the revoke broke three Ops Wall / IC views.
-- All must be true.
-- ============================================================
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec_must_be_true
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('to_gbp','pp_num','pw_canon_colour','pw_error_class',
                    'pw_style_key','wm_classify_category','wm_parse_size',
                    'fn_ads_retention_start')
order by 1;

-- ============================================================
-- D. Known-unfixed issue: is the SSRF still open?
-- If the upgrade reset extension grants this may have changed either way.
-- ============================================================
select n.nspname||'.'||p.proname as fn,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname in ('http_get','http_post'))
   or (n.nspname='net'    and p.proname in ('http_get','http_post'))
order by 1;

-- ============================================================
-- E. Data sanity — row counts must match the pre-upgrade baseline.
-- ============================================================
select 'amazon_api_targets_performance' t, count(*) c, 8432573 as expected from amazon_api_targets_performance
union all select 'amazon_api_ad_groups_performance', count(*), 2259830 from amazon_api_ad_groups_performance
union all select 'daily_asin_data',                  count(*),  891822 from daily_asin_data
union all select 'amazon_api_campaigns_performance', count(*),  386115 from amazon_api_campaigns_performance
union all select 'competitor_snapshots',             count(*),   41605 from competitor_snapshots
union all select 'stockout_events',                  count(*),   16932 from stockout_events
union all select 'accounts_master',                  count(*),      29 from accounts_master;
-- NOTE: the live feeds append continuously, so counts >= expected is correct.
-- Anything BELOW the expected figure means data loss — stop and investigate.

-- ============================================================
-- F. Cleanup once everything above is verified good
-- ============================================================
-- drop table if exists public._cron_baseline;

-- ============================================================
-- SMOKE TEST (run from the insight-central repo, not here):
-- reads 45 endpoints as anon through the real REST API and reports any that break.
-- See the command in the chat transcript, or re-run the loop over:
--   Ops Wall:  vw_ops_*, ops_wall_notes, fathom_*, account_health_status, xero_sync_log
--   IC:        amazon_api_campaigns_performance, accounts_master, vw_keyword_priority,
--              vw_python_financial_weekly, stockout_events
--   Lovable:   competitor_*, sunshine_*, hugo_*, WM_*, apex_*, lockabox_*, ai_rank_*,
--              bestseller_config, pw_config, sw_*
-- ============================================================
