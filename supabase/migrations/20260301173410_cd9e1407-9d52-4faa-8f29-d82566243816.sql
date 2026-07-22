-- Fix A1 Lawn's api_account_name which was previously on AirCraft Home's row
UPDATE accounts_master 
SET api_account_name = 'A1LAWN' 
WHERE account_name = 'A1 Lawn' AND api_account_name IS NULL;