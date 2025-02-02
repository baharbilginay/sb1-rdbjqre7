import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Code, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

interface CustomCode {
  id: string;
  type: 'html' | 'css' | 'js' | 'chat';
  name: string;
  code: string;
  is_active: boolean;
}

export default function AdminCustomization() {
  const [customCodes, setCustomCodes] = useState<CustomCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'html' | 'css' | 'js' | 'chat'>('html');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadCustomCodes();
  }, []);

  const loadCustomCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_code')
        .select('*')
        .in('type', ['html', 'css', 'js', 'chat'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomCodes(data || []);
    } catch (err) {
      console.error('Error loading custom codes:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Özel kodlar yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('custom_code')
          .update({
            name,
            code,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;

        addNotification({
          type: 'success',
          title: 'Başarılı',
          message: 'Kod güncellendi'
        });
      } else {
        const { error } = await supabase
          .from('custom_code')
          .insert([{
            type: selectedType,
            name,
            code,
            is_active: isActive
          }]);

        if (error) throw error;

        addNotification({
          type: 'success',
          title: 'Başarılı',
          message: 'Yeni kod eklendi'
        });
      }

      setName('');
      setCode('');
      setIsActive(true);
      setEditingId(null);
      await loadCustomCodes();
    } catch (err) {
      console.error('Error saving custom code:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kod kaydedilirken bir hata oluştu'
      });
    }
  };

  const handleEdit = (code: CustomCode) => {
    setSelectedType(code.type);
    setName(code.name);
    setCode(code.code);
    setIsActive(code.is_active);
    setEditingId(code.id);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_code')
        .delete()
        .eq('id', id);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Kod silindi'
      });

      await loadCustomCodes();
    } catch (err) {
      console.error('Error deleting custom code:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kod silinirken bir hata oluştu'
      });
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
          Özelleştirme
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Özel kodları yönetin
        </p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tür
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="js">JavaScript</option>
                <option value="chat">Canlı Destek</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                İsim
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Örn: Özel Stil"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kod
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
              placeholder={
                selectedType === 'chat' ? 
                '<!-- Tawk.to, Crisp, vb. canlı destek kodunu buraya yapıştırın -->' :
                selectedType === 'css' ?
                '/* CSS kodunuzu buraya yazın */' :
                selectedType === 'js' ?
                '// JavaScript kodunuzu buraya yazın' :
                '<!-- HTML kodunuzu buraya yazın -->'
              }
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900 dark:text-white">
              Aktif
            </label>
          </div>

          <div className="flex justify-end">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setCode('');
                  setIsActive(true);
                }}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                İptal
              </button>
            )}
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingId ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Mevcut Kodlar
          </h3>

          <div className="space-y-4">
            {customCodes.map((customCode) => (
              <div
                key={customCode.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {customCode.type === 'html' && <Code className="h-5 w-5 text-orange-500 mr-2" />}
                    {customCode.type === 'css' && <Code className="h-5 w-5 text-blue-500 mr-2" />}
                    {customCode.type === 'js' && <Code className="h-5 w-5 text-yellow-500 mr-2" />}
                    {customCode.type === 'chat' && <MessageSquare className="h-5 w-5 text-green-500 mr-2" />}
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {customCode.name}
                    </h4>
                    {!customCode.is_active && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full">
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(customCode)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(customCode.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs font-mono overflow-x-auto">
                  {customCode.code}
                </pre>
              </div>
            ))}
            {customCodes.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                Henüz özel kod eklenmemiş
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}