-- Add performance indexes for faster queries on historical data (simplified)
-- These indexes will significantly speed up date range queries on banked data

-- Composite indexes for the most common query patterns (date DESC with merchant_token)
CREATE INDEX IF NOT EXISTS idx_daily_sales_ppc_data_performance 
ON daily_sales_ppc_data (record_date DESC, merchant_token);

CREATE INDEX IF NOT EXISTS idx_daily_ppc_data_performance
ON daily_ppc_data (record_date DESC, merchant_token);

CREATE INDEX IF NOT EXISTS idx_daily_asin_data_performance
ON daily_asin_data (record_date DESC, merchant_token);

CREATE INDEX IF NOT EXISTS idx_daily_vendor_data_performance
ON daily_vendor_data (record_date DESC, merchant_token);

CREATE INDEX IF NOT EXISTS idx_daily_inventory_data_performance
ON daily_inventory_data (record_date DESC, merchant_token);

-- Single column indexes for date filtering (most common operation)
CREATE INDEX IF NOT EXISTS idx_daily_sales_record_date
ON daily_sales_ppc_data (record_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_ppc_record_date
ON daily_ppc_data (record_date DESC);

-- Account lookup optimization
CREATE INDEX IF NOT EXISTS idx_accounts_master_token
ON accounts_master (merchant_token);

-- Add comments explaining the optimization
COMMENT ON INDEX idx_daily_sales_ppc_data_performance IS 'Optimizes historical data queries for 7+ day old data fetching';
COMMENT ON INDEX idx_daily_ppc_data_performance IS 'Optimizes PPC historical data queries';
COMMENT ON INDEX idx_daily_asin_data_performance IS 'Optimizes ASIN historical data queries';
COMMENT ON INDEX idx_daily_vendor_data_performance IS 'Optimizes vendor historical data queries';
COMMENT ON INDEX idx_daily_inventory_data_performance IS 'Optimizes inventory historical data queries';