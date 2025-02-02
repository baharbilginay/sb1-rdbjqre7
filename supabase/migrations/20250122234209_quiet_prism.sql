/*
  # Fix ambiguous user_id references

  1. Changes
    - Update all queries to use explicit table references
    - Fix ambiguous column references in policies
    - Maintain existing security model

  2. Security
    - No changes to security model
    - Only clarifying table references
*/

-- Update policies with explicit table references
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

DROP POLICY IF EXISTS "Admins can view all portfolios" ON portfolio_items;
CREATE POLICY "Admins can view all portfolios"
  ON portfolio_items FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all transactions" ON transaction_history;
CREATE POLICY "Admins can view all transactions"
  ON transaction_history FOR SELECT
  USING (is_admin(auth.uid()));

-- Update admin_users policies
DROP POLICY IF EXISTS "Public view for admin_users" ON admin_users;
CREATE POLICY "Public view for admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Super admin can manage admin_users" ON admin_users;
CREATE POLICY "Super admin can manage admin_users"
  ON admin_users FOR ALL
  USING (auth.uid() = admin_users.user_id)
  WITH CHECK (auth.uid() = admin_users.user_id);