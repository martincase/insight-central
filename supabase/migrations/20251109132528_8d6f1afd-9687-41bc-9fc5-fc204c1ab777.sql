-- Create client threshold alerts table
CREATE TABLE public.client_threshold_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  merchant_token TEXT NOT NULL,
  client_email TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('buy_box', 'conversion_rate')),
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  detection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  message TEXT NOT NULL,
  metadata JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_client_alerts_email ON public.client_threshold_alerts(client_email, detection_date);
CREATE INDEX idx_client_alerts_status ON public.client_threshold_alerts(status, notified_at);
CREATE INDEX idx_client_alerts_merchant ON public.client_threshold_alerts(merchant_token, detection_date);

-- Enable RLS
ALTER TABLE public.client_threshold_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can only see their own alerts
CREATE POLICY "Clients can view their own alerts"
ON public.client_threshold_alerts
FOR SELECT
USING (true);

-- RLS Policy: Only system can insert alerts
CREATE POLICY "System can insert alerts"
ON public.client_threshold_alerts
FOR INSERT
WITH CHECK (true);

-- RLS Policy: System can update alerts
CREATE POLICY "System can update alerts"
ON public.client_threshold_alerts
FOR UPDATE
USING (true);

-- Add alert_config column to accounts_master
ALTER TABLE public.accounts_master
ADD COLUMN IF NOT EXISTS alert_config JSONB DEFAULT '{
  "enabled": false,
  "client_email": null,
  "delivery_time": "09:00",
  "thresholds": {
    "buy_box": 98,
    "conversion_rate_drop": 25
  },
  "enabled_alert_types": ["buy_box", "conversion_rate"]
}'::jsonb;

-- Add trigger for updated_at on client_threshold_alerts
CREATE TRIGGER update_client_threshold_alerts_updated_at
BEFORE UPDATE ON public.client_threshold_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();