-- Add performance indexes for faster queries on historical data
-- These indexes will significantly speed up date range queries on banked data

-- Index for sales data queries by date and merchant token
CREATE INDEX IF NOT EXISTS idx_daily_sales_ppc_data_performance 
ON daily_sales_ppc_data (record_date DESC, merchant_token);

-- Index for PPC data queries by date and merchant token  
CREATE INDEX IF NOT EXISTS idx_daily_ppc_data_performance
ON daily_ppc_data (record_date DESC, merchant_token);

-- Index for ASIN data queries by date and merchant token
CREATE INDEX IF NOT EXISTS idx_daily_asin_data_performance
ON daily_asin_data (record_date DESC, merchant_token);

-- Index for vendor data queries by date and merchant token
CREATE INDEX IF NOT EXISTS idx_daily_vendor_data_performance
ON daily_vendor_data (record_date DESC, merchant_token);

-- Index for inventory data queries by date and merchant token
CREATE INDEX IF NOT EXISTS idx_daily_inventory_data_performance
ON daily_inventory_data (record_date DESC, merchant_token);

-- Composite index for date range queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_daily_sales_date_range
ON daily_sales_ppc_data (record_date DESC) 
WHERE record_date >= CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX IF NOT EXISTS idx_daily_ppc_date_range
ON daily_ppc_data (record_date DESC)
WHERE record_date >= CURRENT_DATE - INTERVAL '90 days';

-- Add index for account lookups
CREATE INDEX IF NOT EXISTS idx_accounts_master_token
ON accounts_master (merchant_token);

-- Comment explaining the optimization
COMMENT ON INDEX idx_daily_sales_ppc_data_performance IS 'Performance index for historical data queries - optimizes 7+ day old data fetching';
COMMENT ON INDEX idx_daily_ppc_data_performance IS 'Performance index for PPC historical data queries';
COMMENT ON INDEX idx_daily_asin_data_performance IS 'Performance index for ASIN historical data queries';
COMMENT ON INDEX idx_daily_vendor_data_performance IS 'Performance index for vendor historical data queries';
COMMENT ON INDEX idx_daily_inventory_data_performance IS 'Performance index for inventory historical data queries';