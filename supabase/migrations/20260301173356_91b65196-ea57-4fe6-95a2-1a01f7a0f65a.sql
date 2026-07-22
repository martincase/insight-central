-- Fix incorrect api_account_name mapping for AirCraft Home
-- It was set to 'A1LAWN' (A1 Lawn's API name) causing data cross-contamination
UPDATE accounts_master 
SET api_account_name = 'AirCraft' 
WHERE account_name = 'AirCraft Home' AND api_account_name = 'A1LAWN';