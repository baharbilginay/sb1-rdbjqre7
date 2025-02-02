-- Create withdrawal requests table
CREATE TABLE withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('bank', 'crypto')),
  bank_name text,
  account_holder text,
  iban text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES admin_users(user_id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for withdrawal_requests
CREATE POLICY "Users can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawal requests"
  ON withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update withdrawal requests"
  ON withdrawal_requests FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Function to approve withdrawal request
CREATE OR REPLACE FUNCTION approve_withdrawal(
  request_id uuid,
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

  -- Get request details
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM withdrawal_requests
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;

  -- Update request status
  UPDATE withdrawal_requests
  SET status = 'approved',
      reviewed_by = admin_user_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = request_id;

  -- Update user balance
  UPDATE profiles
  SET balance = balance - v_amount
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- Function to reject withdrawal request
CREATE OR REPLACE FUNCTION reject_withdrawal(
  request_id uuid,
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

  -- Update request status
  UPDATE withdrawal_requests
  SET status = 'rejected',
      rejection_reason = reason,
      reviewed_by = admin_user_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;

  RETURN true;
END;
$$;

-- Add indexes
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created_at ON withdrawal_requests(created_at);

-- Add trigger for updating timestamps
CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();