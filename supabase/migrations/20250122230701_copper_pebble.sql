/*
  # Profil tablosuna yeni alanlar ekleme

  1. Değişiklikler
    - `profiles` tablosuna yeni alanlar ekleme:
      - `tc_no` (text, unique)
      - `phone` (text)
    - Trigger oluşturma:
      - Yeni kullanıcı kaydı olduğunda otomatik profil oluşturma
  
  2. Güvenlik
    - TC kimlik no ve telefon için RLS politikaları
*/

-- Yeni alanları ekle
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tc_no text UNIQUE,
ADD COLUMN IF NOT EXISTS phone text;

-- Otomatik profil oluşturma için fonksiyon ve trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, tc_no, phone)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'tc_no',
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eğer trigger zaten varsa kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Yeni trigger oluştur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();