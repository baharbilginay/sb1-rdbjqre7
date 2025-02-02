-- First ensure custom_code type allows 'home'
ALTER TABLE custom_code
DROP CONSTRAINT IF EXISTS custom_code_type_check;

ALTER TABLE custom_code
ADD CONSTRAINT custom_code_type_check
CHECK (type IN ('html', 'css', 'js', 'chat', 'home'));

-- Add default content for home page
INSERT INTO custom_code (type, name, code, is_active)
VALUES (
  'home',
  'Ana Sayfa İçeriği',
  '<div class="text-center pt-8">
    <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
      Hoş Geldiniz!
    </h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8">
      Borsa İstanbul''da alım satım yapmaya başlayın.
    </p>
    <button onclick="window.registerClick()" class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
      <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
      Hesap Oluştur
    </button>
  </div>',
  true
) ON CONFLICT (id) DO UPDATE SET 
  code = EXCLUDED.code,
  is_active = EXCLUDED.is_active;