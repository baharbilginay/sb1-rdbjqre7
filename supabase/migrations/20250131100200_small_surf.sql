-- Drop existing function and trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_unique_id text;
BEGIN
  -- Generate unique ID first
  SELECT generate_unique_user_id() INTO new_unique_id;
  
  -- Insert profile with clean data and proper error handling
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      tc_no,
      phone,
      birth_date,
      unique_id,
      balance,
      is_verified,
      created_at,
      updated_at
    )
    VALUES (
      new.id,
      new.email,
      NULLIF(trim(COALESCE(new.raw_user_meta_data->>'full_name', '')), ''),
      NULLIF(trim(COALESCE(new.raw_user_meta_data->>'tc_no', '')), ''),
      NULLIF(regexp_replace(trim(COALESCE(new.raw_user_meta_data->>'phone', '')), '[^0-9]', '', 'g'), ''),
      (new.raw_user_meta_data->>'birth_date')::date,
      new_unique_id,
      0,  -- Initial balance
      false,  -- Initial verification status
      now(),
      now()
    );

    RETURN new;
  EXCEPTION
    WHEN unique_violation THEN
      -- Handle duplicate key violations with clear messages
      IF SQLERRM LIKE '%unique_tc_no%' THEN
        RAISE EXCEPTION 'Bu TC kimlik numarası ile kayıtlı bir hesap bulunmaktadır';
      ELSIF SQLERRM LIKE '%unique_phone%' THEN
        RAISE EXCEPTION 'Bu telefon numarası ile kayıtlı bir hesap bulunmaktadır';
      ELSE
        RAISE EXCEPTION 'Bu bilgilerle kayıtlı bir hesap bulunmaktadır';
      END IF;
    WHEN not_null_violation THEN
      RAISE EXCEPTION 'Lütfen tüm zorunlu alanları doldurun';
    WHEN check_violation THEN
      RAISE EXCEPTION 'Geçersiz veri formatı';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Hesap oluşturulurken bir hata oluştu: %', SQLERRM;
  END;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tc_no ON profiles(tc_no) WHERE tc_no IS NOT NULL AND tc_no != '';
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL AND phone != '';