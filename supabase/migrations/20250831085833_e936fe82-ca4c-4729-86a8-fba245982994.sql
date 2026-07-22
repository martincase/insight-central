-- Create alerts and notifications tables for monitoring system

-- Table for storing data gap alerts
CREATE TABLE public.data_gap_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  merchant_token TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('missing_sales_data', 'missing_ppc_data', 'stale_data', 'sync_failure')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  last_data_date DATE,
  hours_since_update INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Table for storing performance anomaly alerts
CREATE TABLE public.performance_anomaly_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  merchant_token TEXT,
  metric_name TEXT NOT NULL CHECK (metric_name IN ('sales', 'acos', 'ppc_spend', 'conversion_rate', 'buy_box_percentage')),
  current_value NUMERIC NOT NULL,
  previous_value NUMERIC NOT NULL,
  threshold_breached NUMERIC NOT NULL,
  percentage_change NUMERIC NOT NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('sudden_drop', 'sudden_spike', 'threshold_breach', 'trending_down')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  detection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Table for tracking system health and monitoring status
CREATE TABLE public.monitoring_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_type TEXT NOT NULL CHECK (monitor_type IN ('data_gap_detection', 'anomaly_detection')),
  last_run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  run_status TEXT NOT NULL CHECK (run_status IN ('success', 'failure', 'partial')),
  accounts_checked INTEGER,
  alerts_generated INTEGER,
  errors_encountered INTEGER,
  execution_time_ms INTEGER,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.data_gap_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_anomaly_alerts ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.monitoring_status ENABLE ROW LEVEL SECURITY;

-- Create policies for alerts (public access for now since no auth system)
CREATE POLICY "Allow public access to data gap alerts" ON public.data_gap_alerts FOR ALL USING (true);
CREATE POLICY "Allow public access to anomaly alerts" ON public.performance_anomaly_alerts FOR ALL USING (true);
CREATE POLICY "Allow public access to monitoring status" ON public.monitoring_status FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_data_gap_alerts_account ON public.data_gap_alerts(account_name, status);
CREATE INDEX idx_data_gap_alerts_created_at ON public.data_gap_alerts(created_at DESC);
CREATE INDEX idx_anomaly_alerts_account ON public.performance_anomaly_alerts(account_name, status);
CREATE INDEX idx_anomaly_alerts_detection_date ON public.performance_anomaly_alerts(detection_date DESC);
CREATE INDEX idx_monitoring_status_type_run ON public.monitoring_status(monitor_type, last_run_at DESC);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at columns and triggers
ALTER TABLE public.data_gap_alerts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE public.performance_anomaly_alerts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE public.monitoring_status ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

CREATE TRIGGER update_data_gap_alerts_updated_at
    BEFORE UPDATE ON public.data_gap_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anomaly_alerts_updated_at
    BEFORE UPDATE ON public.performance_anomaly_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();