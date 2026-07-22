-- Add unique constraints to prevent duplicate data and enable upsert operations

-- Add unique constraint for Daily Account Snapshots Table
ALTER TABLE "Daily Account Snapshots Table" 
ADD CONSTRAINT unique_daily_account_snapshot 
UNIQUE (record_date, merchant_token);

-- The other tables already have unique constraints from the previous migration
-- daily_asin_data: UNIQUE(record_date, child_asin, merchant_token)  
-- daily_ppc_campaigns: UNIQUE(record_date, account_name, campaign_name)