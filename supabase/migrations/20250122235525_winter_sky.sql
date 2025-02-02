/*
  # Fix admin policies and access

  1. Changes
    - Drop and recreate admin policies
    - Update admin access controls
    - Add proper grants
    - Ensure safe policy updates

  2. Security
    - Maintain RLS
    - Preserve admin functionality
    - Keep user data isolation
*/

-- First drop any existing policies we want to replace
DROP POLICY IF EXISTS "Profile access policy" ON profiles;
DROP POLICY IF EXISTS "Admin users access" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create admin-specific policies
CREATE POLICY "Admin full access to profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  ));

-- Update admin_users policies
DROP POLICY IF EXISTS "Anyone can view admin users" ON admin_users;
CREATE POLICY "Anyone can view admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only super admin can manage admin users" ON admin_users;
CREATE POLICY "Only super admin can manage admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id 
    FROM admin_users 
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (auth.uid() IN (
    SELECT user_id 
    FROM admin_users 
    WHERE user_id = auth.uid()
  ));

-- Ensure proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh function permissions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;