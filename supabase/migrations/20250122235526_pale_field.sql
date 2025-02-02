/*
  # Add email column to profiles table

  1. Changes
    - Add email column to profiles table
    - Add email from auth.users
    - Update profile policies

  2. Security
    - Maintain RLS
    - Keep existing permissions
*/

-- Add email column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email text;

-- Update handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, tc_no, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'tc_no',
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles with email from auth.users
UPDATE profiles
SET email = users.email
FROM auth.users
WHERE profiles.id = users.id
AND profiles.email IS NULL;