import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, AlertCircle, ToggleLeft, ToggleRight, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

interface BankAccount {
  id: string;
  bank_name: string;
  iban: string;
  account_holder: string;
  is_active: boolean;
  logo_url?: string;
  created_at: string;
}

export function AdminBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [newAccount, setNewAccount] = useState({
    bank_name: '',
    iban: '',
    account_holder: '',
    logo_url: ''
  });
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const { data, error } = await supabase
        .from('admin_bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error loading bank accounts:', err);
      setError('Banka hesapları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newAccount.bank_name || !newAccount.iban || !newAccount.account_holder) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_bank_accounts')
        .insert([{
          ...newAccount,
          is_active: true
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Bu IBAN numarası zaten kayıtlı');
        }
        throw error;
      }

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Banka hesabı başarıyla eklendi'
      });

      setNewAccount({
        bank_name: '',
        iban: '',
        account_holder: '',
        logo_url: ''
      });
      await loadAccounts();
    } catch (err) {
      console.error('Error adding bank account:', err);
      setError(err instanceof Error ? err.message : 'Banka hesabı eklenirken bir hata oluştu');
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    try {
      const { error } = await supabase
        .from('admin_bank_accounts')
        .update({
          bank_name: editingAccount.bank_name,
          iban: editingAccount.iban,
          account_holder: editingAccount.account_holder,
          logo_url: editingAccount.logo_url
        })
        .eq('id', editingAccount.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Bu IBAN numarası zaten kayıtlı');
        }
        throw error;
      }

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Banka hesabı güncellendi'
      });

      setEditingAccount(null);
      await loadAccounts();
    } catch (err) {
      console.error('Error updating bank account:', err);
      setError(err instanceof Error ? err.message : 'Banka hesabı güncellenirken bir hata oluştu');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_bank_accounts')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: `Banka hesabı ${!currentStatus ? 'aktif' : 'pasif'} duruma getirildi`
      });

      await loadAccounts();
    } catch (err) {
      console.error('Error toggling bank account status:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Hesap durumu güncellenirken bir hata oluştu'
      });
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Banka hesabı silindi'
      });

      await loadAccounts();
    } catch (err) {
      console.error('Error deleting bank account:', err);
      setError('Banka hesabı silinirken bir hata oluştu');
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
          Banka Hesapları
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Para yatırma işlemleri için kullanılacak banka hesaplarını yönetin
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Hata</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleAddAccount} className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Banka Adı
              </label>
              <input
                type="text"
                value={newAccount.bank_name}
                onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Örn: Ziraat Bankası"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                IBAN
              </label>
              <input
                type="text"
                value={newAccount.iban}
                onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hesap Adı
              </label>
              <input
                type="text"
                value={newAccount.account_holder}
                onChange={(e) => setNewAccount({ ...newAccount, account_holder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Ad Soyad"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Logo URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAccount.logo_url}
                  onChange={(e) => setNewAccount({ ...newAccount, logo_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com/logo.png"
                />
                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Logo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Banka
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  IBAN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hesap Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {account.logo_url ? (
                      <img
                        src={account.logo_url}
                        alt={`${account.bank_name} logo`}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32?text=?';
                        }}
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                        <Image className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingAccount?.id === account.id ? (
                      <input
                        type="text"
                        value={editingAccount.bank_name}
                        onChange={(e) => setEditingAccount({
                          ...editingAccount,
                          bank_name: e.target.value
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {account.bank_name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingAccount?.id === account.id ? (
                      <input
                        type="text"
                        value={editingAccount.iban}
                        onChange={(e) => setEditingAccount({
                          ...editingAccount,
                          iban: e.target.value.toUpperCase()
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {account.iban}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingAccount?.id === account.id ? (
                      <input
                        type="text"
                        value={editingAccount.account_holder}
                        onChange={(e) => setEditingAccount({
                          ...editingAccount,
                          account_holder: e.target.value
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {account.account_holder}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(account.id, account.is_active)}
                      className={`flex items-center text-sm ${
                        account.is_active 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {account.is_active ? (
                        <>
                          <ToggleRight className="h-5 w-5 mr-1" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-5 w-5 mr-1" />
                          Pasif
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {editingAccount?.id === account.id ? (
                        <>
                          <button
                            onClick={handleUpdateAccount}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setEditingAccount(null)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingAccount(account)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Henüz banka hesabı eklenmemiş
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}