import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

interface VerificationStatus {
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  front_image_url?: string;
  back_image_url?: string;
}

export function IdentityVerification() {
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('identity_verifications')
        .select('status, rejection_reason, front_image_url, back_image_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setVerificationStatus(data?.[0] || null);
    } catch (err) {
      console.error('Error loading verification status:', err);
    }
  };

  const handleImageUpload = async (file: File, type: 'front' | 'back') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `public/verifications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error(`Error uploading ${type} image:`, err);
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Lütfen kimlik kartınızın ön ve arka yüzünü yükleyin'
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      const frontImageUrl = await handleImageUpload(frontImage, 'front');
      const backImageUrl = await handleImageUpload(backImage, 'back');

      const { error } = await supabase
        .from('identity_verifications')
        .insert({
          user_id: user.id,
          front_image_url: frontImageUrl,
          back_image_url: backImageUrl,
          status: 'pending'
        });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Kimlik doğrulama başvurunuz alındı'
      });

      setFrontImage(null);
      setBackImage(null);
      await loadVerificationStatus();
    } catch (err) {
      console.error('Error submitting verification:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kimlik doğrulama başvurusu yapılırken bir hata oluştu'
      });
    } finally {
      setUploading(false);
    }
  };

  const renderStatus = () => {
    if (!verificationStatus) return null;

    switch (verificationStatus.status) {
      case 'pending':
        return (
          <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  İnceleme Bekliyor
                </h3>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  Kimlik doğrulama başvurunuz inceleniyor. Bu işlem birkaç gün sürebilir.
                </p>
              </div>
            </div>
          </div>
        );

      case 'approved':
        return (
          <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md p-4">
            <div className="flex">
              <Check className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Onaylandı
                </h3>
                <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                  Kimlik doğrulamanız başarıyla tamamlandı.
                </p>
              </div>
            </div>
          </div>
        );

      case 'rejected':
        return (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <X className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Reddedildi
                </h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {verificationStatus.rejection_reason || 'Kimlik doğrulama başvurunuz reddedildi.'}
                </p>
                <button
                  onClick={() => setVerificationStatus(null)}
                  className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500"
                >
                  Yeniden Başvur
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  if (verificationStatus) {
    return renderStatus();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ön Yüz */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kimlik Kartı (Ön Yüz)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                  <span>Dosya Seç</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={(e) => setFrontImage(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, GIF max 10MB
              </p>
            </div>
          </div>
          {frontImage && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Seçilen dosya: {frontImage.name}
            </p>
          )}
        </div>

        {/* Arka Yüz */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kimlik Kartı (Arka Yüz)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                  <span>Dosya Seç</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={(e) => setBackImage(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, GIF max 10MB
              </p>
            </div>
          </div>
          {backImage && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Seçilen dosya: {backImage.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!frontImage || !backImage || uploading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Yükleniyor...' : 'Gönder'}
        </button>
      </div>
    </div>
  );
}