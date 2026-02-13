-- Enable Realtime for transactions and bank_accounts tables
BEGIN;
  -- Remove existing publications if they exist (to avoid conflicts)
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create publication for all tables or specific ones
  CREATE PUBLICATION supabase_realtime FOR TABLE transactions, bank_accounts;
COMMIT;

-- Ensure that the tables have replica identity set to FULL if you want to see old values on updates/deletes
-- ALTER TABLE transactions REPLICA IDENTITY FULL;
-- ALTER TABLE bank_accounts REPLICA IDENTITY FULL;
