/*
  # Admin rolü ve yetkilendirme ekleme

  1. Yeni Tablo
    - `admin_users` tablosu oluşturma
  
  2. Güvenlik
    - Admin rolü için RLS politikaları
    - Admin kullanıcıları için özel yetkiler
*/

-- Admin kullanıcıları için tablo
CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS politikaları
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin tablosu için politikalar
CREATE POLICY "Only admins can view admin_users"
  ON admin_users FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Profil tablosu için admin politikaları
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Portföy tablosu için admin politikaları
CREATE POLICY "Admins can view all portfolios"
  ON portfolio_items FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_users));