-- Set up cron job for automated 7-day banking (daily at 10:00 AM)
SELECT cron.schedule(
  'daily-7day-banking',
  '0 10 * * *', -- Daily at 10:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/daily-7day-banking',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Set up cron job for automated alert email notifications (every hour)
SELECT cron.schedule(
  'send-alert-notifications-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/send-alert-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);