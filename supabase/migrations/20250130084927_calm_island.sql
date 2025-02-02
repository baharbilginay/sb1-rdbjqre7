-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view welcome screen" ON custom_code;
DROP POLICY IF EXISTS "Public welcome screen access" ON custom_code;

-- Create storage bucket if not exists
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('public', 'public', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Create storage policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public');

CREATE POLICY "Admin Upload Access"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'public' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'public' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public' AND
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Create welcome screen policy
CREATE POLICY "Public welcome screen access"
ON custom_code FOR SELECT
USING (
  type = 'welcome' AND 
  is_active = true
);

-- Ensure welcome screen exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM custom_code 
    WHERE type = 'welcome'
  ) THEN
    INSERT INTO custom_code (
      type,
      name,
      code,
      is_active
    ) VALUES (
      'welcome',
      'Karşılama Ekranı',
      '<div class="text-center pt-0 sm:pt-12 px-3 sm:px-4">
  <h2 class="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
    Borsa İstanbul''da Alım Satım Yapmaya Başlayın
  </h2>
  <p class="text-xs sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
    Hemen ücretsiz hesap oluşturun ve yatırım yapmaya başlayın.
  </p>
  <button onclick="window.registerClick()" class="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
    Hesap Oluştur
  </button>
</div>',
      true
    );
  END IF;
END $$;