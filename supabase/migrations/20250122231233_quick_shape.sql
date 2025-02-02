/*
  # Admin yetkileri ve bakiye işlemleri güncellemesi

  1. Yeni Özellikler
    - Bakiye güncelleme fonksiyonu
    - İşlem geçmişi tablosu
    - Admin işlem logları

  2. Güvenlik
    - Admin yetkileri genişletme
    - İşlem doğrulama kontrolleri
*/

-- İşlem geçmişi tablosu
CREATE TABLE IF NOT EXISTS transaction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  admin_id uuid REFERENCES admin_users(user_id),
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- RLS politikaları
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

-- İşlem geçmişi için politikalar
CREATE POLICY "Users can view own transactions"
  ON transaction_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON transaction_history FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Only admins can insert transactions"
  ON transaction_history FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

-- Bakiye güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_user_balance(
  target_user_id uuid,
  amount numeric,
  transaction_type text,
  description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance numeric;
BEGIN
  -- Admin kontrolü
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Mevcut bakiyeyi al
  SELECT balance INTO current_balance
  FROM profiles
  WHERE id = target_user_id;

  -- Çekim işlemi için bakiye kontrolü
  IF transaction_type = 'withdrawal' AND (current_balance + amount) < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Bakiyeyi güncelle
  UPDATE profiles
  SET balance = balance + amount
  WHERE id = target_user_id;

  -- İşlem kaydı oluştur
  INSERT INTO transaction_history (
    user_id,
    admin_id,
    amount,
    type,
    description
  ) VALUES (
    target_user_id,
    auth.uid(),
    amount,
    transaction_type,
    description
  );

  RETURN true;
END;
$$;