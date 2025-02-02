import React, { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

interface DepositReceiptModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function DepositReceiptModal({ onClose, onSuccess }: DepositReceiptModalProps) {
  const [amount, setAmount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { addNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receipt) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Lütfen dekont yükleyin'
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Geçerli bir tutar girin'
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      // Upload receipt
      const fileExt = receipt.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `public/receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, receipt, {
          cacheControl: '3600',
          upsert: true,
          contentType: receipt.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      // Create receipt record
      const { error: insertError } = await supabase
        .from('deposit_receipts')
        .insert([{
          user_id: user.id,
          amount: numAmount,
          account_holder: accountHolder,
          receipt_url: publicUrl
        }]);

      if (insertError) throw insertError;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Dekont başarıyla yüklendi'
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error uploading receipt:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Dekont yüklenirken bir hata oluştu'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dekont Yükle
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Yatırılan Tutar
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="0"
                step="0.01"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400">TL</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gönderen Hesap Adı
            </label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dekont
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
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PDF, JPG veya PNG (max 10MB)
                </p>
              </div>
            </div>
            {receipt && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Seçilen dosya: {receipt.name}
              </p>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Önemli Bilgi
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Dekont yüklendikten sonra inceleme sürecine alınacaktır</li>
                    <li>Onaylanan dekontlar için bakiyeniz otomatik olarak güncellenecektir</li>
                    <li>İşlem geçmişinden dekont durumunu takip edebilirsiniz</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Yükleniyor...' : 'Dekont Yükle'}
          </button>
        </form>
      </div>
    </div>
  );
}