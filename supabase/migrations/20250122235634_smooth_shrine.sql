/*
  # Fix admin policies recursion

  1. Changes
    - Remove recursive policies from admin_users table
    - Simplify admin access checks
    - Update profile policies to avoid recursion
    - Add super admin check function

  2. Security
    - Maintain secure access control
    - Prevent infinite recursion in policies
    - Keep RLS enabled on all tables
*/

-- First, drop problematic policies
DROP POLICY IF EXISTS "Admin users access" ON admin_users;
DROP POLICY IF EXISTS "Anyone can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Only super admin can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;

-- Create a function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN user_uuid = '7e1c1778-a8f0-4398-a026-b102d818ff61'::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simpler is_admin function that doesn't cause recursion
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  -- First check if user is super admin
  IF is_super_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  -- Then check admin_users table directly without using policies
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new admin_users policies
CREATE POLICY "View admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Manage admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Create new profile policies
CREATE POLICY "View profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    is_admin(auth.uid())
  );

CREATE POLICY "Manage profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR 
    is_admin(auth.uid())
  )
  WITH CHECK (
    id = auth.uid() OR 
    is_admin(auth.uid())
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;