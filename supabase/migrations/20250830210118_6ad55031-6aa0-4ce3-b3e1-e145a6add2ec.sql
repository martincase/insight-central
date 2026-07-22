-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run daily inventory sync at 2 PM UTC
-- This will run every day at 14:00 (2 PM) UTC
SELECT cron.schedule(
  'daily-inventory-sync-2pm',
  '0 14 * * *', -- At 2:00 PM every day
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/daily-inventory-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzQwNTQsImV4cCI6MjA3MDkxMDA1NH0.09lGFOFoZtFjriGjFankGZ2qcXJjWpydQTn1jyMyUpo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);