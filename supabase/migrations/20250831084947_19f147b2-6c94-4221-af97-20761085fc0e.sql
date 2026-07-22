-- Update the daily inventory sync cron job to run at 9 AM UTC instead of 2 PM UTC
select cron.unschedule('daily-inventory-sync');

select
cron.schedule(
  'daily-inventory-sync',
  '0 9 * * *', -- 9 AM UTC daily
  $$
  select
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/daily-inventory-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:=concat('{"scheduled_run": true, "time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);