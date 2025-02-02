-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_unique_id text;
BEGIN
  -- Generate unique ID first
  SELECT generate_unique_user_id() INTO new_unique_id;
  
  -- Validate required fields
  IF new.email IS NULL THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- Handle potentially null metadata fields
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    tc_no,
    phone,
    unique_id,
    balance,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'tc_no', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    new_unique_id,
    0,  -- Initial balance
    false,  -- Initial verification status
    now(),
    now()
  );

  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate TC no or phone
    IF SQLERRM LIKE '%unique_tc_no%' THEN
      RAISE EXCEPTION 'TC kimlik numarası zaten kayıtlı';
    ELSIF SQLERRM LIKE '%unique_phone%' THEN
      RAISE EXCEPTION 'Telefon numarası zaten kayıtlı';
    ELSE
      RAISE EXCEPTION 'Bu bilgilerle kayıtlı bir hesap zaten var';
    END IF;
  WHEN OTHERS THEN
    -- Log error details if needed
    RAISE EXCEPTION 'Kullanıcı profili oluşturulurken bir hata oluştu: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tc_no ON profiles(tc_no) WHERE tc_no IS NOT NULL AND tc_no != '';
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL AND phone != '';