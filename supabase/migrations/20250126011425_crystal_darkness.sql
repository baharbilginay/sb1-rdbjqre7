-- Create deposit receipts table
CREATE TABLE deposit_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  account_holder text NOT NULL,
  receipt_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES admin_users(user_id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE deposit_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for deposit_receipts
CREATE POLICY "Users can view own deposit receipts"
  ON deposit_receipts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deposit receipts"
  ON deposit_receipts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposit receipts"
  ON deposit_receipts FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update deposit receipts"
  ON deposit_receipts FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Function to approve deposit receipt
CREATE OR REPLACE FUNCTION approve_deposit_receipt(
  receipt_id uuid,
  admin_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
BEGIN
  -- Check if admin
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get receipt details
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM deposit_receipts
  WHERE id = receipt_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid receipt';
  END IF;

  -- Update receipt status
  UPDATE deposit_receipts
  SET status = 'approved',
      reviewed_by = admin_user_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = receipt_id;

  -- Update user balance
  UPDATE profiles
  SET balance = balance + v_amount
  WHERE id = v_user_id;

  -- Record transaction
  INSERT INTO transaction_history (
    user_id,
    amount,
    type,
    description
  ) VALUES (
    v_user_id,
    v_amount,
    'deposit',
    'Dekont onaylandı'
  );

  RETURN true;
END;
$$;

-- Function to reject deposit receipt
CREATE OR REPLACE FUNCTION reject_deposit_receipt(
  receipt_id uuid,
  admin_user_id uuid,
  reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if admin
  IF NOT is_admin(admin_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update receipt status
  UPDATE deposit_receipts
  SET status = 'rejected',
      rejection_reason = reason,
      reviewed_by = admin_user_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = receipt_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid receipt';
  END IF;

  RETURN true;
END;
$$;

-- Add indexes
CREATE INDEX idx_deposit_receipts_user_id ON deposit_receipts(user_id);
CREATE INDEX idx_deposit_receipts_status ON deposit_receipts(status);
CREATE INDEX idx_deposit_receipts_created_at ON deposit_receipts(created_at);

-- Add trigger for updating timestamps
CREATE TRIGGER update_deposit_receipts_updated_at
    BEFORE UPDATE ON deposit_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();