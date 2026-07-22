-- Create client feature visibility table
CREATE TABLE public.client_feature_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  disabled_message_type TEXT DEFAULT 'coming_soon',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_feature_visibility ENABLE ROW LEVEL SECURITY;

-- Allow public read access (clients need to read this)
CREATE POLICY "Allow public read access" ON public.client_feature_visibility FOR SELECT USING (true);

-- Allow all operations for admin (no auth in this app)
CREATE POLICY "Allow all operations" ON public.client_feature_visibility FOR ALL USING (true);

-- Pre-populate with all 9 dashboard elements
INSERT INTO public.client_feature_visibility (feature_key, feature_name, is_enabled, disabled_message_type) VALUES
  ('sales_heatmap', 'Sales Heatmap', true, 'coming_soon'),
  ('metrics_grid', 'Metrics Grid', true, 'coming_soon'),
  ('monthly_performance_view', 'Monthly Performance Chart', true, 'coming_soon'),
  ('monthly_performance_table', 'Monthly Performance Table', true, 'coming_soon'),
  ('asin_performance', 'ASIN Performance', false, 'coming_soon'),
  ('inventory_table', 'Inventory', false, 'coming_soon'),
  ('top_search_terms', 'Top Search Terms', true, 'coming_soon'),
  ('keyword_themes', 'Keyword Themes', true, 'coming_soon'),
  ('search_term_keyword_map', 'Search Term → Keyword Map', true, 'coming_soon');