/*
  # Eksik RLS politikaları ve düzeltmeler

  1. Güvenlik Güncellemeleri
    - Eksik RLS politikalarının eklenmesi
    - Portföy öğeleri için CRUD politikaları
    - Admin yetkileri için düzeltmeler

  2. Veri Bütünlüğü
    - TC Kimlik No ve telefon için unique constraint
    - Portföy öğeleri için pozitif değer kontrolleri
    - Cascade silme kuralları
*/

-- Portföy öğeleri için ek politikalar
CREATE POLICY "Users can insert own portfolio items"
  ON portfolio_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio items"
  ON portfolio_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio items"
  ON portfolio_items FOR DELETE
  USING (auth.uid() = user_id);

-- Admin kullanıcıları için ek politikalar
CREATE POLICY "Admins can insert admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admins can delete admin_users"
  ON admin_users FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- TC Kimlik No ve telefon için unique constraint ekle
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_tc_no'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT unique_tc_no UNIQUE (tc_no);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_phone'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT unique_phone UNIQUE (phone);
  END IF;
END $$;

-- Portföy öğeleri için ek kısıtlamalar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positive_quantity'
  ) THEN
    ALTER TABLE portfolio_items
    ADD CONSTRAINT positive_quantity CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positive_price'
  ) THEN
    ALTER TABLE portfolio_items
    ADD CONSTRAINT positive_price CHECK (average_price > 0);
  END IF;
END $$;

-- Cascade silme kuralları
ALTER TABLE portfolio_items
DROP CONSTRAINT IF EXISTS portfolio_items_user_id_fkey,
ADD CONSTRAINT portfolio_items_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;