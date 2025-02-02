/*
  # Kullanıcı Profili ve Portföy Tabloları

  1. Yeni Tablolar
    - `profiles`
      - `id` (uuid, primary key) - Auth kullanıcı ID'si ile eşleşir
      - `full_name` (text) - Kullanıcının tam adı
      - `balance` (numeric) - Kullanıcının bakiyesi
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `portfolio_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Kullanıcı referansı
      - `symbol` (text) - Hisse senedi sembolü
      - `quantity` (numeric) - Lot miktarı
      - `average_price` (numeric) - Ortalama alış fiyatı
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Güvenlik
    - Her iki tablo için RLS politikaları
    - Kullanıcılar sadece kendi verilerini görebilir ve düzenleyebilir
*/

-- Profiller tablosu
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    full_name text,
    balance numeric DEFAULT 0 CHECK (balance >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Portföy tablosu
CREATE TABLE portfolio_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) NOT NULL,
    symbol text NOT NULL,
    quantity numeric NOT NULL CHECK (quantity >= 0),
    average_price numeric NOT NULL CHECK (average_price >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Politikaları
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Profiller için politikalar
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Portföy için politikalar
CREATE POLICY "Users can view own portfolio"
    ON portfolio_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own portfolio"
    ON portfolio_items FOR ALL
    USING (auth.uid() = user_id);

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at
    BEFORE UPDATE ON portfolio_items
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();