-- Recreate v_daily_asin_sync_health AFTER the Postgres upgrade completes.
--
-- Why it was dropped (2026-08-10): the Supabase in-place upgrade drops and recreates the
-- pg_cron extension, so nothing may depend on cron.* tables. This view reads
-- cron.job_run_details and was the ONLY blocker reported on the Infrastructure page
-- (verified against pg_depend — no other object depends on the cron schema).
--
-- Nothing queries this view from application code; it appears only in generated
-- types.ts dumps. It is an ops monitoring view for the daily ASIN sync (cron jobid 276).
--
-- Run this in the Supabase SQL editor once the upgrade is finished.

create or replace view public.v_daily_asin_sync_health
with (security_invoker = on)
as
 WITH cron_runs AS (
         SELECT job_run_details.jobid,
            job_run_details.status,
            job_run_details.start_time,
            job_run_details.return_message
           FROM cron.job_run_details
          WHERE job_run_details.jobid = 276 AND job_run_details.start_time > (now() - '14 days'::interval)
        ), recent_data AS (
         SELECT daily_asin_data.record_date,
            count(*) AS rows_loaded
           FROM daily_asin_data
          WHERE daily_asin_data.record_date >= (CURRENT_DATE - '14 days'::interval)
          GROUP BY daily_asin_data.record_date
        )
 SELECT CURRENT_DATE - 1 AS expected_date,
    ( SELECT max(daily_asin_data.record_date) AS max
           FROM daily_asin_data) AS latest_record_date,
    CURRENT_DATE - 1 - (( SELECT max(daily_asin_data.record_date) AS max
           FROM daily_asin_data)) AS days_behind,
    ( SELECT count(*) AS count
           FROM cron_runs
          WHERE cron_runs.status = 'succeeded'::text) AS cron_succeeded_14d,
    ( SELECT count(*) AS count
           FROM cron_runs
          WHERE cron_runs.status = 'failed'::text) AS cron_failed_14d,
    ( SELECT max(cron_runs.start_time) AS max
           FROM cron_runs
          WHERE cron_runs.status = 'succeeded'::text) AS last_cron_success,
    ( SELECT cron_runs.status
           FROM cron_runs
          ORDER BY cron_runs.start_time DESC
         LIMIT 1) AS last_cron_status,
    ( SELECT cron_runs.return_message
           FROM cron_runs
          ORDER BY cron_runs.start_time DESC
         LIMIT 1) AS last_cron_msg,
    ( SELECT count(*) AS count
           FROM daily_sync_status
          WHERE daily_sync_status.sync_type = 'asin'::text AND daily_sync_status.sync_date >= (CURRENT_DATE - 14) AND daily_sync_status.status = 'completed'::text AND COALESCE(daily_sync_status.records_processed, 0) = 0) AS zero_record_completions_14d;

-- Original grants (it was security_invoker and anon-readable):
grant select on public.v_daily_asin_sync_health to anon, authenticated;
