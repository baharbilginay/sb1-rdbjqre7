-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS approve_identity_verification(uuid, uuid);
DROP FUNCTION IF EXISTS reject_identity_verification(uuid, uuid, text);

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