import React, { useState } from 'react';
import { X, AlertCircle, ArrowDownToLine, Bitcoin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';
import { formatCurrency } from '../utils/format';

interface WithdrawalModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userBalance: number;
}

type WithdrawalMethod = 'bank' | 'crypto';

export function WithdrawalModal({ onClose, onSuccess, userBalance }: WithdrawalModalProps) {
  const [method, setMethod] = useState<WithdrawalMethod>('bank');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Geçerli bir tutar girin'
      });
      return;
    }

    if (numAmount > userBalance) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Yetersiz bakiye'
      });
      return;
    }

    if (method === 'bank') {
      if (!bankName || !accountHolder || !iban) {
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Lütfen tüm banka bilgilerini girin'
        });
        return;
      }
    } else if (method === 'crypto') {
      if (!cryptoAddress) {
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Lütfen USDT-TRC20 adresini girin'
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açmanız gerekiyor');

      const { error } = await supabase
        .from('withdrawal_requests')
        .insert([{
          user_id: user.id,
          amount: numAmount,
          method,
          bank_name: method === 'bank' ? bankName : null,
          account_holder: method === 'bank' ? accountHolder : null,
          iban: method === 'bank' ? iban : null,
          crypto_address: method === 'crypto' ? cryptoAddress : null,
          crypto_network: method === 'crypto' ? 'USDT-TRC20' : null
        }]);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Para çekme talebiniz alındı'
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting withdrawal:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Para çekme talebi oluşturulurken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Para Çek
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mevcut Bakiye</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(userBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setMethod('bank')}
            className={`px-3 py-2 rounded-md flex items-center justify-center text-xs ${
              method === 'bank'
                ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            <ArrowDownToLine className="h-4 w-4 mr-1.5" />
            Havale/EFT
          </button>
          <button
            type="button"
            onClick={() => setMethod('crypto')}
            className={`px-3 py-2 rounded-md flex items-center justify-center text-xs ${
              method === 'crypto'
                ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            <Bitcoin className="h-4 w-4 mr-1.5" />
            USDT-TRC20
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Çekilecek Tutar
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                min="0"
                step="0.01"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-xs text-gray-500 dark:text-gray-400">TL</span>
              </div>
            </div>
          </div>

          {method === 'bank' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Banka Adı
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hesap Sahibi
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                USDT-TRC20 Adresi
              </label>
              <input
                type="text"
                value={cryptoAddress}
                onChange={(e) => setCryptoAddress(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono"
                placeholder="T..."
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lütfen sadece TRC20 ağı üzerinden USDT kabul eden bir cüzdan adresi girin
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <div className="flex">
              <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
              <div className="ml-2">
                <h3 className="text-xs font-medium text-blue-800 dark:text-blue-200">
                  Önemli Bilgi
                </h3>
                <div className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Para çekme talepleriniz inceleme sürecine alınacaktır</li>
                    <li>Onaylanan talepler için ödemeniz yapılacaktır</li>
                    <li>İşlem geçmişinden talebinizin durumunu takip edebilirsiniz</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'İşleniyor...' : 'Para Çekme Talebi Oluştur'}
          </button>
        </form>
      </div>
    </div>
  );
}