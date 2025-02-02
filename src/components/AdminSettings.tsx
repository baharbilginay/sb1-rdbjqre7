import React, { useState } from 'react';
import { AlertCircle, Save, X, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';
import { useSettings } from '../lib/settings';

interface Settings {
  logo_url: string;
  logo_width: number;
  logo_height: number;
  mobile_logo_url: string;
  mobile_logo_width: number;
  mobile_logo_height: number;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function AdminSettings() {
  const { settings: allSettings, updateSettings } = useSettings();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [mobileLogo, setMobileLogo] = useState<File | null>(null);
  const [mobileLogoPreview, setMobileLogoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Dosya boyutu 2MB\'dan küçük olmalıdır'
      });
      return false;
    }

    if (!file.type.startsWith('image/')) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Sadece resim dosyaları yüklenebilir'
      });
      return false;
    }

    return true;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, isMobile: boolean = false) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      if (isMobile) {
        setMobileLogo(file);
      } else {
        setLogoFile(file);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (isMobile) {
          setMobileLogoPreview(reader.result as string);
        } else {
          setLogoPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLogo = async (isMobile: boolean = false) => {
    try {
      setLoading(true);
      
      // Extract file path from URL
      const url = isMobile ? allSettings.mobile_logo_url : allSettings.logo_url;
      if (!url) return;
      
      const filePath = url.split('/').slice(-2).join('/'); // Get last two segments
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('public')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update settings
      const updates = isMobile ? 
        { mobile_logo_url: '' } : 
        { logo_url: '' };
      
      updateSettings(updates);

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: `${isMobile ? 'Mobil logo' : 'Logo'} silindi`
      });

      // Clear previews
      if (isMobile) {
        setMobileLogoPreview('');
        setMobileLogo(null);
      } else {
        setLogoPreview('');
        setLogoFile(null);
      }
    } catch (err) {
      console.error('Error deleting logo:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: `${isMobile ? 'Mobil logo' : 'Logo'} silinirken bir hata oluştu`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const uploadLogo = async (file: File | null, isMobile: boolean = false) => {
        if (!file) return null;
        
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${isMobile ? 'mobile_' : ''}logo_${Date.now()}.${fileExt}`;
          const filePath = `public/logo/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('public')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('public')
            .getPublicUrl(filePath);

          return publicUrl;
        } catch (err) {
          console.error(`Error uploading ${isMobile ? 'mobile ' : ''}logo:`, err);
          throw new Error(`${isMobile ? 'Mobil logo' : 'Logo'} yüklenirken bir hata oluştu`);
        }
      };

      const updates: Partial<typeof allSettings> = {};

      if (logoFile) {
        const logoUrl = await uploadLogo(logoFile);
        if (logoUrl) {
          updates.logo_url = logoUrl;
        }
      }

      if (mobileLogo) {
        const mobileLogoUrl = await uploadLogo(mobileLogo, true);
        if (mobileLogoUrl) {
          updates.mobile_logo_url = mobileLogoUrl;
        }
      }

      // Update settings
      updateSettings(updates);

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Ayarlar kaydedildi'
      });

      // Clear file inputs
      setLogoFile(null);
      setMobileLogo(null);
      setLogoPreview('');
      setMobileLogoPreview('');
    } catch (err) {
      console.error('Error saving settings:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: err instanceof Error ? err.message : 'Ayarlar kaydedilirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get current width/height with defaults
  const currentWidth = typeof allSettings.logo_width === 'number' ? allSettings.logo_width : 32;
  const currentHeight = typeof allSettings.logo_height === 'number' ? allSettings.logo_height : 32;
  const currentMobileWidth = typeof allSettings.mobile_logo_width === 'number' ? allSettings.mobile_logo_width : 24;
  const currentMobileHeight = typeof allSettings.mobile_logo_height === 'number' ? allSettings.mobile_logo_height : 24;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Logo Ayarları
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Desktop Logo Settings */}
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
            Masaüstü Logo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Logo Genişliği (px)
              </label>
              <input
                type="number"
                value={currentWidth}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 16 && value <= 1024) {
                    updateSettings({
                      logo_width: value
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="16"
                max="1024"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Logo Yüksekliği (px)
              </label>
              <input
                type="number"
                value={currentHeight}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 16 && value <= 1024) {
                    updateSettings({
                      logo_height: value
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="16"
                max="1024"
                step="1"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo Yükle
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                    <span>Logo Seç</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={(e) => handleLogoChange(e)}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG (max. 2MB)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Logo Settings */}
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
            Mobil Logo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Logo Genişliği (px)
              </label>
              <input
                type="number"
                value={currentMobileWidth}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 16 && value <= 1024) {
                    updateSettings({
                      mobile_logo_width: value
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="16"
                max="1024"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Logo Yüksekliği (px)
              </label>
              <input
                type="number"
                value={currentMobileHeight}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 16 && value <= 1024) {
                    updateSettings({
                      mobile_logo_height: value
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="16"
                max="1024"
                step="1"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mobil Logo Yükle
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                    <span>Logo Seç</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={(e) => handleLogoChange(e, true)}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG (max. 2MB)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logo Preview */}
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
            Önizleme
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Masaüstü</h4>
                {(logoPreview || allSettings.logo_url) && (
                  <button
                    onClick={() => handleDeleteLogo(false)}
                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Logoyu sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center h-16 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 px-4">
                {(logoPreview || allSettings.logo_url) ? (
                  <img
                    src={logoPreview || allSettings.logo_url}
                    alt="Logo önizleme"
                    style={{
                      width: `${currentWidth}px`,
                      height: `${currentHeight}px`
                    }}
                    className="object-contain"
                  />
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Logo yüklenmedi
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobil</h4>
                {(mobileLogoPreview || allSettings.mobile_logo_url) && (
                  <button
                    onClick={() => handleDeleteLogo(true)}
                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Logoyu sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center h-16 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 px-4">
                {(mobileLogoPreview || allSettings.mobile_logo_url) ? (
                  <img
                    src={mobileLogoPreview || allSettings.mobile_logo_url}
                    alt="Mobil logo önizleme"
                    style={{
                      width: `${currentMobileWidth}px`,
                      height: `${currentMobileHeight}px`
                    }}
                    className="object-contain"
                  />
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Mobil logo yüklenmedi
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}