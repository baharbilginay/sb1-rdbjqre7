/*
  # Update admin function and policies

  1. Changes
    - Drop and recreate is_admin function with explicit parameter name
    - Update all policies to use explicit table references
    - Recreate admin policies with proper checks
  
  2. Security
    - Maintain RLS policies for all tables
    - Update admin access controls
*/

-- First drop all dependent policies that use is_admin
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all portfolios" ON portfolio_items;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transaction_history;
DROP POLICY IF EXISTS "Only admins can manage watched stocks" ON watched_stocks;
DROP POLICY IF EXISTS "Only admins can update stock prices" ON stock_prices;

-- Drop existing is_admin function
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Create new is_admin function with explicit parameter name
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE admin_users.user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user policies with explicit table references
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = profiles.id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = profiles.id);

DROP POLICY IF EXISTS "Users can view own portfolio" ON portfolio_items;
CREATE POLICY "Users can view own portfolio"
  ON portfolio_items FOR SELECT
  USING (auth.uid() = portfolio_items.user_id);

DROP POLICY IF EXISTS "Users can manage own portfolio" ON portfolio_items;
CREATE POLICY "Users can manage own portfolio"
  ON portfolio_items FOR ALL
  USING (auth.uid() = portfolio_items.user_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON transaction_history;
CREATE POLICY "Users can view own transactions"
  ON transaction_history FOR SELECT
  USING (auth.uid() = transaction_history.user_id);

-- Recreate admin policies
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all portfolios"
  ON portfolio_items FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all transactions"
  ON transaction_history FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can manage watched stocks"
  ON watched_stocks FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update stock prices"
  ON stock_prices FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));