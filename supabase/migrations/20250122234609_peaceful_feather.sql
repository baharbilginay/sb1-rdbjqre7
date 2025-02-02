/*
  # Fix admin policies for user listing

  1. Changes
    - Drop and recreate admin policies for profiles table
    - Add explicit admin access for user listing
    - Ensure proper security checks
  
  2. Security
    - Maintain RLS policies
    - Update admin access controls
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new admin policies with proper access
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid()) OR 
    id = auth.uid()
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid()) OR 
    id = auth.uid()
  )
  WITH CHECK (
    is_admin(auth.uid()) OR 
    id = auth.uid()
  );

-- Ensure admin users table has proper policies
DROP POLICY IF EXISTS "Public view for admin_users" ON admin_users;
CREATE POLICY "Public view for admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

-- Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);