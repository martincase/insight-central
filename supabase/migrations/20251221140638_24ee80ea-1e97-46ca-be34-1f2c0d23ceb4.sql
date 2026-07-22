
-- Schedule daily client threshold check at 8am UTC
SELECT cron.schedule(
  'daily-client-threshold-check',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://wgrephgnrldsyipbvjco.supabase.co/functions/v1/client-threshold-check',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncmVwaGducmxkc3lpcGJ2amNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MTI4NjcsImV4cCI6MjA2MDI4ODg2N30.aOrOcJQBG6KPUF--6yrZHXmxozb0gVtD0P9tVfCmgGU"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
