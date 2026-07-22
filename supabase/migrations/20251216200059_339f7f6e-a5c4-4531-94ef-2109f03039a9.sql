-- Add ppc_sellername column to accounts_master for mapping dashboard accounts to PPC report seller names
ALTER TABLE accounts_master 
ADD COLUMN ppc_sellername TEXT;

-- Add comment for documentation
COMMENT ON COLUMN accounts_master.ppc_sellername IS 'Maps to sellername field in NK_SP Search Term Report for PPC data linking';