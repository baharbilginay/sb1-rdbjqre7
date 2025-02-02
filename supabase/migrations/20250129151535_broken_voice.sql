-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view welcome screen" ON custom_code;

-- Create new policy that allows public access to welcome screen
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