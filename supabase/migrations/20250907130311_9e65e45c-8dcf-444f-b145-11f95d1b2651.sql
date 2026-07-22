-- Update the cron job to run daily at 8 AM instead of hourly
SELECT cron.unschedule('send-alert-notifications-hourly');

-- Create new daily schedule for alerts at 8 AM
SELECT cron.schedule(
  'send-alert-notifications-daily',
  '0 8 * * *', -- Daily at 8:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/send-alert-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);