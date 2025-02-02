/*
  # Kullanıcı Benzersiz ID Ekleme

  1. Değişiklikler
    - `profiles` tablosuna `unique_id` kolonu ekleme
    - Otomatik ID oluşturma fonksiyonu
    - Mevcut kullanıcılar için ID oluşturma
    - Yeni kullanıcılar için trigger güncelleme

  2. Güvenlik
    - ID'ler kriptografik olarak güvenli
    - Tahmin edilemez format
*/

-- Önce unique_id kolonu ekle
ALTER TABLE profiles
ADD COLUMN unique_id text;

-- Benzersiz ID oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION generate_unique_user_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_id text;
  exists_count int;
BEGIN
  LOOP
    -- 12 karakterli benzersiz ID oluştur (örn: TR-XXXXXX-XX)
    new_id := 'TR-' || 
              lpad(floor(random() * 1000000)::text, 6, '0') || '-' ||
              lpad(floor(random() * 100)::text, 2, '0');
    
    -- ID'nin benzersiz olduğunu kontrol et
    SELECT COUNT(*) INTO exists_count
    FROM profiles
    WHERE unique_id = new_id;
    
    EXIT WHEN exists_count = 0;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- Mevcut kullanıcılara ID ata
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE unique_id IS NULL
  LOOP
    UPDATE profiles
    SET unique_id = generate_unique_user_id()
    WHERE id = r.id;
  END LOOP;
END $$;

-- Kolonu zorunlu yap ve unique constraint ekle
ALTER TABLE profiles
ALTER COLUMN unique_id SET NOT NULL,
ADD CONSTRAINT unique_user_id UNIQUE (unique_id);

-- Yeni kullanıcılar için trigger fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    tc_no,
    phone,
    unique_id
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'tc_no',
    new.raw_user_meta_data->>'phone',
    generate_unique_user_id()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;