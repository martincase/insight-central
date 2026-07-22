-- Enable pg_cron and pg_net extensions for scheduled functions
SELECT cron.schedule(
  'daily-accounts-sync',
  '0 7 * * *', -- 7:00 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/daily-accounts-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'daily-campaign-sync',
  '30 7 * * *', -- 7:30 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/daily-campaign-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'daily-sales-ppc-sync',
  '0 8 * * *', -- 8:00 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/daily-sales-ppc-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'daily-asin-sync',
  '30 8 * * *', -- 8:30 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/daily-asin-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'daily-vendor-sync',
  '45 8 * * *', -- 8:45 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/daily-vendor-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);