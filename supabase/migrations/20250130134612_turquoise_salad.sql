-- Add birth_date column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS birth_date date;

-- Update handle_new_user function to include birth_date
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

    -- Validate birth date
    IF new.raw_user_meta_data->>'birth_date' IS NULL THEN
      RAISE EXCEPTION 'Doğum tarihi gereklidir';
    END IF;

    -- Calculate age
    IF (CURRENT_DATE - (new.raw_user_meta_data->>'birth_date')::date) < 18 * interval '1 year' THEN
      RAISE EXCEPTION '18 yaşından küçükler kayıt olamaz';
    END IF;

    -- Insert profile with clean data
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
      trim(COALESCE(new.raw_user_meta_data->>'full_name', '')),
      NULLIF(trim(COALESCE(new.raw_user_meta_data->>'tc_no', '')), ''),
      NULLIF(regexp_replace(trim(COALESCE(new.raw_user_meta_data->>'phone', '')), '[^0-9]', '', 'g'), ''),
      (new.raw_user_meta_data->>'birth_date')::date,
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