-- Drop existing table if exists
DROP TABLE IF EXISTS admin_bank_accounts CASCADE;

-- Create admin bank accounts table
CREATE TABLE admin_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  branch_name text,
  iban text NOT NULL,
  account_holder text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_bank_accounts
CREATE POLICY "Anyone can view admin bank accounts"
  ON admin_bank_accounts FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only admins can manage admin bank accounts"
  ON admin_bank_accounts FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add unique constraint for IBAN
ALTER TABLE admin_bank_accounts
ADD CONSTRAINT unique_admin_bank_iban UNIQUE (iban);

-- Add indexes
CREATE INDEX idx_admin_bank_accounts_bank_name ON admin_bank_accounts(bank_name);
CREATE INDEX idx_admin_bank_accounts_is_active ON admin_bank_accounts(is_active);

-- Add trigger for updating timestamps
CREATE TRIGGER update_admin_bank_accounts_updated_at
    BEFORE UPDATE ON admin_bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON admin_bank_accounts TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;