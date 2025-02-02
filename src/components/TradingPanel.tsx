import React, { useState } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { useNotifications } from '../lib/notifications';

interface TradingPanelProps {
  symbol: string;
  currentPrice: number;
  changePercentage: number;
  onClose: () => void;
  onSuccess: () => void;
  userBalance: number;
  initialType?: 'buy' | 'sell';
}

function isMarketOpen(): boolean {
  const now = new Date();
  const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const hours = turkeyTime.getHours();
  const minutes = turkeyTime.getMinutes();
  const currentTime = hours * 100 + minutes;

  // Market hours: 09:55 - 18:15 Turkish time
  const marketOpen = 955;  // 09:55
  const marketClose = 1815; // 18:15

  // Check if it's a weekday (0 = Sunday, 6 = Saturday)
  const isWeekday = turkeyTime.getDay() > 0 && turkeyTime.getDay() < 6;

  return isWeekday && currentTime >= marketOpen && currentTime <= marketClose;
}

export function TradingPanel({
  symbol,
  currentPrice,
  changePercentage,
  onClose,
  onSuccess,
  userBalance,
  initialType = 'buy'
}: TradingPanelProps) {
  const [quantity, setQuantity] = useState('1');
  const [type, setType] = useState<'buy' | 'sell'>(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const { addNotification } = useNotifications();

  const totalAmount = Number(quantity) * currentPrice;
  const canAfford = type === 'sell' || totalAmount <= userBalance;
  const marketOpen = isMarketOpen();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);
    setOrderPlaced(false);

    try {
      const numQuantity = Number(quantity);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        throw new Error('Geçerli bir miktar giriniz');
      }

      if (type === 'buy' && totalAmount > userBalance) {
        throw new Error(`Yetersiz bakiye. Mevcut bakiye: ${formatCurrency(userBalance)}`);
      }

      // Create pending order using RPC function
      const { data, error: rpcError } = await supabase.rpc('create_pending_order', {
        p_symbol: symbol,
        p_quantity: numQuantity,
        p_price: currentPrice,
        p_type: type
      });

      if (rpcError) throw rpcError;

      const response = data as { success: boolean; error?: string; data?: { message: string; order_status: string } };
      
      if (!response.success) {
        throw new Error(response.error || 'Emir oluşturulamadı');
      }

      const isCompleted = response.data?.order_status === 'completed';
      
      if (isCompleted) {
        setSuccess(true);
        addNotification({
          type: 'success',
          title: 'İşlem Başarılı',
          message: `${symbol} için ${type === 'buy' ? 'alış' : 'satış'} işlemi gerçekleştirildi.`
        });
      } else {
        setOrderPlaced(true);
        addNotification({
          type: 'success',
          title: 'Emir Verildi',
          message: `${symbol} için ${type === 'buy' ? 'alış' : 'satış'} emri verildi. ${
            marketOpen ? 'İşleme alındı.' : 'Piyasa açıldığında işleme alınacak.'
          }`
        });
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Trading error:', err);
      const errorMessage = err instanceof Error ? err.message : 'İşlem gerçekleştirilemedi';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'İşlem Hatası',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          disabled={success || orderPlaced}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {marketOpen ? 'Hisse İşlemi' : 'Emir Girişi'}
        </h2>

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md flex items-center">
            <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                İşlem Başarılı
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {type === 'buy' ? 'Alım' : 'Satım'} işleminiz gerçekleştirildi.
              </p>
            </div>
          </div>
        )}

        {orderPlaced && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md flex items-center">
            <Check className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Emir Verildi
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {type === 'buy' ? 'Alış' : 'Satış'} emriniz {marketOpen ? 'işleme alındı' : 'kaydedildi. Piyasa açıldığında işleme alınacak'}.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Hata</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hisse</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">{symbol}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Fiyat</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {formatCurrency(currentPrice)}
              </p>
              <span className={`text-sm ${
                changePercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {changePercentage >= 0 ? '+' : ''}{changePercentage.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setType('buy');
                setError('');
              }}
              className={`px-4 py-2 rounded-md flex items-center justify-center ${
                type === 'buy'
                  ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
              disabled={success || orderPlaced}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Al
            </button>
            <button
              type="button"
              onClick={() => {
                setType('sell');
                setError('');
              }}
              className={`px-4 py-2 rounded-md flex items-center justify-center ${
                type === 'sell'
                  ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
              disabled={success || orderPlaced}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sat
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lot Miktarı
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={success || orderPlaced}
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Toplam Tutar</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Mevcut Bakiye</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(userBalance)}
              </span>
            </div>
            {!marketOpen && (
              <div className="flex items-center text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                Piyasa şu anda kapalı. Emirler piyasa açıldığında işleme alınacak.
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !canAfford || success || orderPlaced}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              type === 'buy'
                ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'İşleniyor...' : marketOpen ? (type === 'buy' ? 'Satın Al' : 'Sat') : 'Emir Ver'}
          </button>

          {!canAfford && type === 'buy' && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              Yetersiz bakiye
            </p>
          )}
        </form>
      </div>
    </div>
  );
}