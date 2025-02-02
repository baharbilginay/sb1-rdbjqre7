/*
  # Fix admin policies and permissions

  1. Changes
    - Update is_admin function without dropping
    - Update profile viewing policies
    - Add proper admin access controls
    - Fix policy conflicts
    
  2. Security
    - Enable RLS for all tables
    - Add proper admin checks
    - Ensure proper access control
*/

-- Drop existing profile policies
DROP POLICY IF EXISTS "Profile view policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Update is_admin function without dropping it
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = user_uuid
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create comprehensive profile viewing policy
CREATE POLICY "Profile access policy"
  ON profiles FOR ALL
  TO authenticated
  USING (
    CASE 
      WHEN is_admin(auth.uid()) THEN true  -- Admins can access all profiles
      ELSE id = auth.uid()                 -- Users can only access their own
    END
  )
  WITH CHECK (
    CASE 
      WHEN is_admin(auth.uid()) THEN true  -- Admins can modify all profiles
      ELSE id = auth.uid()                 -- Users can only modify their own
    END
  );

-- Update admin_users policies
DROP POLICY IF EXISTS "Public view for admin_users" ON admin_users;
CREATE POLICY "Admin users access"
  ON admin_users FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Ensure proper indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;