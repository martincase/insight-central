-- Create cron jobs for data gap detection and performance anomaly detection

-- Data Gap Detection: Run every 6 hours (0, 6, 12, 18 UTC)
select
cron.schedule(
  'data-gap-detection',
  '0 */6 * * *', -- Every 6 hours
  $$
  select
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/data-gap-detection',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:=concat('{"scheduled_run": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Performance Anomaly Detection: Run daily at 10 AM UTC (after daily data sync at 9 AM)
select
cron.schedule(
  'performance-anomaly-detection',
  '0 10 * * *', -- Daily at 10 AM UTC
  $$
  select
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/performance-anomaly-detection',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:=concat('{"scheduled_run": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);