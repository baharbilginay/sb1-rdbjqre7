-- First ensure all required tables exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  tc_no text,
  phone text,
  unique_id text,
  balance numeric DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure constraints exist
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS unique_tc_no;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS unique_phone;

ALTER TABLE public.profiles
ADD CONSTRAINT unique_tc_no UNIQUE (tc_no) DEFERRABLE INITIALLY DEFERRED,
ADD CONSTRAINT unique_phone UNIQUE (phone) DEFERRABLE INITIALLY DEFERRED;

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with transaction handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_unique_id text;
BEGIN
  -- Start transaction
  BEGIN
    -- Generate unique ID first
    SELECT generate_unique_user_id() INTO new_unique_id;
    
    -- Validate required fields
    IF new.email IS NULL THEN
      RAISE EXCEPTION 'Email is required';
    END IF;

    -- Clean and validate TC no and phone
    IF new.raw_user_meta_data->>'tc_no' IS NOT NULL AND length(trim(new.raw_user_meta_data->>'tc_no')) != 11 THEN
      RAISE EXCEPTION 'TC kimlik numarası 11 haneli olmalıdır';
    END IF;

    IF new.raw_user_meta_data->>'phone' IS NOT NULL AND length(regexp_replace(new.raw_user_meta_data->>'phone', '[^0-9]', '', 'g')) != 10 THEN
      RAISE EXCEPTION 'Telefon numarası 10 haneli olmalıdır';
    END IF;

    -- Insert profile with clean data
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
      trim(COALESCE(new.raw_user_meta_data->>'full_name', '')),
      NULLIF(trim(COALESCE(new.raw_user_meta_data->>'tc_no', '')), ''),
      NULLIF(regexp_replace(trim(COALESCE(new.raw_user_meta_data->>'phone', '')), '[^0-9]', '', 'g'), ''),
      new_unique_id,
      0,  -- Initial balance
      false,  -- Initial verification status
      now(),
      now()
    );

    -- If we get here, everything worked
    RETURN new;
  EXCEPTION
    WHEN unique_violation THEN
      -- Handle duplicate TC no or phone with clear messages
      IF SQLERRM LIKE '%unique_tc_no%' THEN
        RAISE EXCEPTION 'Bu TC kimlik numarası ile kayıtlı bir hesap bulunmaktadır';
      ELSIF SQLERRM LIKE '%unique_phone%' THEN
        RAISE EXCEPTION 'Bu telefon numarası ile kayıtlı bir hesap bulunmaktadır';
      ELSE
        RAISE EXCEPTION 'Bu bilgilerle kayıtlı bir hesap bulunmaktadır';
      END IF;
    WHEN check_violation THEN
      RAISE EXCEPTION 'Geçersiz veri formatı';
    WHEN OTHERS THEN
      -- Log error details and return user-friendly message
      RAISE EXCEPTION 'Hesap oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
  END;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tc_no ON profiles(tc_no) WHERE tc_no IS NOT NULL AND tc_no != '';
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL AND phone != '';