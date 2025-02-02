-- Add logo_url column to admin_bank_accounts if it doesn't exist
ALTER TABLE admin_bank_accounts
ADD COLUMN IF NOT EXISTS logo_url text;

-- Add is_active column if it doesn't exist
ALTER TABLE admin_bank_accounts
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;