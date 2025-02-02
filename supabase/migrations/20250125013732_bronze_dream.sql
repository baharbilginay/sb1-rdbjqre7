-- Create identity verification table
CREATE TABLE identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  front_image_url text NOT NULL,
  back_image_url text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES admin_users(user_id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add verification status to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Enable RLS
ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for identity_verifications
CREATE POLICY "Users can view own verifications"
  ON identity_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
  ON identity_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications"
  ON identity_verifications FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update verifications"
  ON identity_verifications FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create function to handle verification approval
CREATE OR REPLACE FUNCTION approve_identity_verification(
  verification_id uuid,
  admin_user_id uuid
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

  -- Update verification status
  UPDATE identity_verifications
  SET status = 'approved',
      reviewed_by = admin_user_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = verification_id;

  -- Update user profile
  UPDATE profiles
  SET is_verified = true
  WHERE id = (
    SELECT user_id 
    FROM identity_verifications 
    WHERE id = verification_id
  );

  RETURN true;
END;
$$;

-- Create function to handle verification rejection
CREATE OR REPLACE FUNCTION reject_identity_verification(
  verification_id uuid,
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

  -- Update verification status
  UPDATE identity_verifications
  SET status = 'rejected',
      rejection_reason = reason,
      reviewed_by = admin_user_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = verification_id;

  RETURN true;
END;
$$;

-- Create indexes
CREATE INDEX idx_identity_verifications_user_id ON identity_verifications(user_id);
CREATE INDEX idx_identity_verifications_status ON identity_verifications(status);