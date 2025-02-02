/*
  # Fix admin policies

  1. Changes
    - Remove recursive admin policies
    - Add new admin check function
    - Update all admin-related policies

  2. Security
    - Maintain security while preventing infinite recursion
    - Keep admin privileges intact
*/

-- Önce eski politikaları kaldır
DROP POLICY IF EXISTS "Only admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all portfolios" ON portfolio_items;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transaction_history;

-- Admin kontrol fonksiyonu
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin tablosu için yeni politikalar
CREATE POLICY "Public view for admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage admin_users"
  ON admin_users FOR ALL
  USING (auth.uid() = '7e1c1778-a8f0-4398-a026-b102d818ff61')
  WITH CHECK (auth.uid() = '7e1c1778-a8f0-4398-a026-b102d818ff61');

-- Profiller için admin politikaları
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Portföy için admin politikaları
CREATE POLICY "Admins can view all portfolios"
  ON portfolio_items FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- İşlem geçmişi için admin politikaları
CREATE POLICY "Admins can view all transactions"
  ON transaction_history FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));