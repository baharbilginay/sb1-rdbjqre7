import React, { useState } from 'react';
import { X, Bell, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';
import { formatCurrency } from '../utils/format';

interface PriceAlertModalProps {
  symbol: string;
  currentPrice: number;
  onClose: () => void;
}

export function PriceAlertModal({ symbol, currentPrice, onClose }: PriceAlertModalProps) {
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Geçerli bir fiyat girin'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('price_alerts')
        .insert({
          symbol,
          target_price: price,
          condition
        });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Fiyat alarmı oluşturuldu'
      });

      onClose();
    } catch (err) {
      console.error('Error creating price alert:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fiyat alarmı oluşturulurken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fiyat Alarmı Ekle
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hisse</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">{symbol}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Güncel Fiyat</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {formatCurrency(currentPrice)}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setCondition('above')}
              className={`px-4 py-2 rounded-md flex items-center justify-center ${
                condition === 'above'
                  ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Yükselince
            </button>
            <button
              type="button"
              onClick={() => setCondition('below')}
              className={`px-4 py-2 rounded-md flex items-center justify-center ${
                condition === 'below'
                  ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              <ArrowDown className="h-4 w-4 mr-2" />
              Düşünce
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hedef Fiyat
            </label>
            <div className="relative">
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Bell className="h-4 w-4 mr-2" />
            {loading ? 'Oluşturuluyor...' : 'Alarm Oluştur'}
          </button>
        </form>
      </div>
    </div>
  );
}