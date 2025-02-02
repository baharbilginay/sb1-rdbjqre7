import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

export function AdminHomePage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_code')
        .select('code')
        .eq('type', 'home')
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No content found, use default
          setContent(getDefaultContent());
        } else {
          throw error;
        }
      } else {
        setContent(data?.code || getDefaultContent());
      }
    } catch (err) {
      console.error('Error loading home content:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'İçerik yüklenirken bir hata oluştu'
      });
      setContent(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `<div class="text-center pt-8">
  <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
    Hoş Geldiniz!
  </h1>
  <p class="text-gray-600 dark:text-gray-400 mb-8">
    Borsa İstanbul'da alım satım yapmaya başlayın.
  </p>
  <button onclick="window.registerClick()" class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
    <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
    Hesap Oluştur
  </button>
</div>`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // First get existing home content
      const { data: existingData } = await supabase
        .from('custom_code')
        .select('id')
        .eq('type', 'home')
        .eq('is_active', true)
        .maybeSingle();

      if (existingData) {
        // Update existing content
        const { error: updateError } = await supabase
          .from('custom_code')
          .update({
            code: content,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);

        if (updateError) throw updateError;
      } else {
        // Insert new content
        const { error: insertError } = await supabase
          .from('custom_code')
          .insert([{
            type: 'home',
            name: 'Ana Sayfa İçeriği',
            code: content,
            is_active: true
          }]);

        if (insertError) throw insertError;
      }

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Ana sayfa içeriği güncellendi'
      });
    } catch (err) {
      console.error('Error saving home content:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'İçerik kaydedilirken bir hata oluştu'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Ana Sayfa İçeriği
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ana sayfada görüntülenecek içeriği düzenleyin
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              HTML İçeriği
            </label>
            <button
              type="button"
              onClick={() => setContent(getDefaultContent())}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Varsayılana Döndür
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
            placeholder="<!-- Ana sayfa HTML içeriği -->"
          />
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Önizleme
          </h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}