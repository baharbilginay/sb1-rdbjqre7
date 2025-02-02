import React, { useState, useEffect } from 'react';
import { 
  Check, AlertCircle, Wallet, ArrowDownToLine, X, Copy, Upload, 
  TrendingUp, TrendingDown, History, Clock, LogOut 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/format';
import { IdentityVerification } from './IdentityVerification';
import { DepositReceiptModal } from './DepositReceiptModal';
import { WithdrawalModal } from './WithdrawalModal';
import { useNotifications } from '../lib/notifications';
import { useProfile } from '../hooks/useProfile';
import { PriceAlertsList } from './PriceAlertsList';

interface BankAccount {
  id: string;
  bank_name: string;
  iban: string;
  account_holder: string;
  logo_url?: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

export function ProfileSection() {
  const navigate = useNavigate();
  const [showVerification, setShowVerification] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showDepositInfo, setShowDepositInfo] = useState(false);
  const [showDepositReceipt, setShowDepositReceipt] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const { addNotification } = useNotifications();
  const { profile, refresh } = useProfile();

  useEffect(() => {
    loadBankAccounts();
    loadTransactions();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Çıkış yapılırken bir hata oluştu'
      });
    }
  };

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (err) {
      console.error('Error loading bank accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get deposit receipts
      const { data: receipts, error: receiptsError } = await supabase
        .from('deposit_receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (receiptsError) throw receiptsError;

      // Get withdrawal requests
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      // Combine and format transactions
      const allTransactions: Transaction[] = [
        ...(receipts || []).map(receipt => ({
          id: receipt.id,
          amount: receipt.amount,
          type: 'deposit' as const,
          description: 'Dekont yüklendi',
          status: receipt.status,
          rejection_reason: receipt.rejection_reason,
          created_at: receipt.created_at
        })),
        ...(withdrawals || []).map(withdrawal => ({
          id: withdrawal.id,
          amount: withdrawal.amount,
          type: 'withdrawal' as const,
          description: withdrawal.method === 'bank' ? `${withdrawal.bank_name} - ${withdrawal.account_holder}` : 'Kripto para çekme',
          status: withdrawal.status,
          rejection_reason: withdrawal.rejection_reason,
          created_at: withdrawal.created_at
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleCopy = (text: string, type: 'iban' | 'account_holder') => {
    navigator.clipboard.writeText(text).then(() => {
      addNotification({
        type: 'success',
        title: 'Kopyalandı',
        message: type === 'iban' ? 'IBAN kopyalandı' : 'Hesap adı kopyalandı'
      });
    }).catch(() => {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kopyalama işlemi başarısız oldu'
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Para Yatır/Çek Butonları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-4">
          <button
            onClick={() => setShowDepositInfo(true)}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Para Yatır
          </button>
          <button
            onClick={() => setShowDepositReceipt(true)}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Dekont Yükle
          </button>
        </div>
        <div className="h-full">
          <button
            onClick={() => setShowWithdrawalModal(true)}
            className="w-full h-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Para Çek
          </button>
        </div>
      </div>

      {/* Profil Bilgileri */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Profil Bilgileri
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Müşteri Numarası
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {profile?.unique_id || '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ad Soyad
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {profile?.full_name || '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-posta
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {profile?.email || '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                TC Kimlik No
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {profile?.tc_no || '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefon
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {profile?.phone || '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Doğum Tarihi
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('tr-TR') : '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bakiye
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatCurrency(profile?.balance || 0)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Hesap Durumu
              </label>
              <p className="mt-1">
                {profile?.is_verified ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Check className="h-3 w-3 mr-1" />
                    Onaylı Hesap
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Onaysız Hesap
                  </span>
                )}
              </p>
            </div>

            {/* Add logout button */}
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>

        {/* Fiyat Alarmları */}
        <PriceAlertsList />

        {/* Para Yatırma/Çekme Geçmişi */}
        <div>
          <div className="flex items-center mb-4">
            <History className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Para Yatırma/Çekme Geçmişi
            </h3>
          </div>

          {loadingTransactions ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    {transaction.type === 'deposit' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.type === 'deposit' ? 'Para Yatırma' : 'Para Çekme'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(transaction.created_at).toLocaleString('tr-TR')}
                      </p>
                      {transaction.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      transaction.type === 'deposit' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'deposit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.status === 'pending'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : transaction.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {transaction.status === 'pending' ? (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          İnceleniyor
                        </>
                      ) : transaction.status === 'approved' ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Onaylandı
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Reddedildi
                          {transaction.rejection_reason && (
                            <span className="ml-1">({transaction.rejection_reason})</span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              Henüz işlem geçmişi bulunmuyor
            </p>
          )}
        </div>

        {!profile?.is_verified && !showVerification && (
          <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Kimlik Doğrulama Gerekli
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Para yatırma ve çekme işlemleri için kimlik doğrulaması yapmanız gerekmektedir.
                  </p>
                  <button
                    onClick={() => setShowVerification(true)}
                    className="mt-3 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-600"
                  >
                    Kimlik Doğrulama Başvurusu Yap
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showVerification && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Kimlik Doğrulama
            </h3>
            <IdentityVerification />
          </div>
        )}
      </div>

      {/* Para Yatırma Bilgileri Modalı */}
      {showDepositInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Para Yatırma Bilgileri
              </h3>
              <button
                onClick={() => setShowDepositInfo(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="prose dark:prose-invert max-w-none flex-1 overflow-hidden">
              <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Havale / EFT Bilgileri
                    </h4>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Açıklama kısmına adınızı ve soyadınızı yazmayı unutmayın</li>
                        <li>Sadece kendi adınıza kayıtlı hesaplardan transfer yapabilirsiniz</li>
                        <li>Transferi gerçekleştirdikten sonra Dekont Yükle butonundan dekontunuzu göndermeniz gerekiyor</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[50vh] pr-2 space-y-3">
                {loadingAccounts ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded"></div>
                    ))}
                  </div>
                ) : bankAccounts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {bankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                      >
                        <div className="flex items-center mb-2">
                          {account.logo_url ? (
                            <img
                              src={account.logo_url}
                              alt={`${account.bank_name} logo`}
                              className="h-6 w-6 object-contain mr-2"
                            />
                          ) : null}
                          <h4 className="text-base font-medium text-gray-900 dark:text-white">
                            {account.bank_name}
                          </h4>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="font-medium">Hesap Adı:</span>
                              <span className="ml-2">{account.account_holder}</span>
                            </div>
                            <button
                              onClick={() => handleCopy(account.account_holder, 'account_holder')}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="font-medium">IBAN:</span>
                              <span className="ml-2 font-mono text-xs">{account.iban}</span>
                            </div>
                            <button
                              onClick={() => handleCopy(account.iban, 'iban')}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Henüz banka hesabı eklenmemiş
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dekont Yükleme Modalı */}
      {showDepositReceipt && (
        <DepositReceiptModal
          onClose={() => setShowDepositReceipt(false)}
          onSuccess={() => {
            setShowDepositReceipt(false);
            refresh();
            loadTransactions();
          }}
        />
      )}

      {/* Para Çekme Modalı */}
      {showWithdrawalModal && (
        <WithdrawalModal
          onClose={() => setShowWithdrawalModal(false)}
          onSuccess={() => {
            setShowWithdrawalModal(false);
            refresh();
            loadTransactions();
          }}
          userBalance={profile?.balance || 0}
        />
      )}
    </div>
  );
}