-- Insert the specific magical reporting features from today's conversation
INSERT INTO public.roadmap_items (title, description, priority, status, is_public, created_by) VALUES 
('Automated Data Gap Detection & Alerts', 'Daily at 10 AM UTC - Run the existing DataGapAnalyzer to detect missing data across all accounts, automatically email alerts when high-severity gaps are detected, generate data health reports for account managers', 'high', 'planned', true, 'ai'),

('Performance Anomaly Detection', 'Every 6 hours - Detect sudden spikes/drops in key metrics (sales, ACOS, spend), flag accounts with unusual performance patterns, send real-time alerts for accounts exceeding thresholds', 'high', 'planned', true, 'ai'),

('Daily AI Insights Generator', 'Daily at 8 AM UTC (before business hours) - Generate personalized AI suggestions using existing generateAISuggestions function, email daily optimization recommendations to account managers, create priority action lists based on performance patterns', 'high', 'planned', true, 'ai'),

('Weekly Performance Pulse', 'Monday mornings at 7 AM UTC - Aggregate weekly performance summaries, compare against targets using checkTargets function, generate executive dashboards and email weekly reports', 'medium', 'planned', true, 'ai'),

('Smart Screenshot & Report Delivery', 'Based on client preferences (daily/weekly/monthly) - Enhance existing screenshotEmailService with cron automation, generate beautiful dashboard screenshots, email customized reports to clients automatically', 'high', 'planned', true, 'ai'),

('Monthly Business Reviews', '1st of every month at 9 AM UTC - Generate comprehensive monthly performance reports, create trend analysis and forecasting, integrate with Gamma API for presentation-ready reports', 'medium', 'planned', true, 'ai'),

('Budget Burn Rate Monitor', 'Every 4 hours during business days - Track daily budget consumption vs. targets, predict month-end budget scenarios, alert when accounts are at risk of under/overspending', 'high', 'planned', true, 'ai'),

('Inventory Stock-Out Predictor', 'Daily at 11 AM UTC (after inventory sync) - Analyze inventory trends and velocity, predict potential stock-outs based on sales patterns, send early warning alerts to prevent lost sales', 'high', 'planned', true, 'ai'),

('Competitive Intelligence Alerts', 'Weekly on Fridays - Analyze performance drops that might indicate competitive pressure, flag accounts with declining market share indicators, generate competitive analysis reports', 'low', 'planned', true, 'ai'),

('Data Cleanup & Archival', 'Monthly on the 15th - Archive old data to backup tables (leveraging existing backup infrastructure), clean up temporary data and optimize database performance, generate storage and performance metrics', 'low', 'planned', true, 'ai'),

('Account Health Score Calculator', 'Daily at 6 AM UTC - Calculate comprehensive health scores for each account, track account lifecycle stages (growth, maturity, decline), trigger intervention workflows for at-risk accounts', 'medium', 'planned', true, 'ai'),

('Dynamic Dashboard Themes', 'Daily based on performance - Generate AI-powered visual themes based on account performance, update dashboard aesthetics to reflect account health, create seasonal or performance-based visual variations', 'low', 'planned', true, 'ai');