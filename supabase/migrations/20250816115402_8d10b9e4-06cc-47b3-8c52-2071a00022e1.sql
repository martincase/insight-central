-- Delete all tables except accounts_master
DROP TABLE IF EXISTS sheet1_daily_data;
DROP TABLE IF EXISTS asin_sales_daily_data;
DROP TABLE IF EXISTS ppc_campaigns_daily_data;
DROP TABLE IF EXISTS ppc_daily_data;
DROP TABLE IF EXISTS vendor_daily_data;
DROP TABLE IF EXISTS data_banking_logs;

-- Keep only accounts_master table (it's already there)