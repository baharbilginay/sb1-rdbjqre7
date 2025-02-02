/*
  # Fix admin view all users policy

  1. Changes
    - Drop and recreate admin policies for profiles table
    - Simplify admin access policy
    - Add explicit admin check
  
  2. Security
    - Maintain RLS policies
    - Ensure proper admin access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create a single comprehensive policy for profile viewing
CREATE POLICY "Profile view policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN is_admin(auth.uid()) THEN true  -- Admin can see all profiles
      ELSE id = auth.uid()                 -- Regular users can only see their own
    END
  );

-- Ensure proper index exists
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Refresh admin users view permission
GRANT SELECT ON profiles TO authenticated;