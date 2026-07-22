-- Create alert email configuration table
CREATE TABLE public.alert_email_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_address text NOT NULL,
  notification_preferences jsonb DEFAULT '{"data_gaps": true, "performance_anomalies": true, "severity_threshold": "medium", "frequency": "immediate"}'::jsonb,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_email_config ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since this is an admin system)
CREATE POLICY "Allow all access to alert_email_config" 
ON public.alert_email_config 
FOR ALL 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_alert_email_config_updated_at
BEFORE UPDATE ON public.alert_email_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email addresses
INSERT INTO public.alert_email_config (email_address, notification_preferences) VALUES 
('hello@martincase.co.uk', '{"data_gaps": true, "performance_anomalies": true, "severity_threshold": "low", "frequency": "immediate"}'::jsonb),
('gemma@martincase.co.uk', '{"data_gaps": true, "performance_anomalies": true, "severity_threshold": "low", "frequency": "immediate"}'::jsonb);

-- Add notified_at column to existing alert tables to track email notifications
ALTER TABLE public.data_gap_alerts ADD COLUMN notified_at timestamp with time zone;
ALTER TABLE public.performance_anomaly_alerts ADD COLUMN notified_at timestamp with time zone;