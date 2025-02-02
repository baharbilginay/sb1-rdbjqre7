import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, TrendingUp, TrendingDown, Edit2, Check, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { useNotifications } from '../lib/notifications';

interface Transaction {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  price: number;
  type: 'buy' | 'sell';
  created_at: string;
  user: {
    unique_id: string;
    full_name: string;
    email: string;
  };
}

interface EditingTransaction {
  id: string;
  quantity: number;
  price: number;
}

type FilterType = 'all' | 'buy' | 'sell';

export function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditingTransaction | null>(null);
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    user_id: '',
    symbol: '',
    quantity: 1,
    price: 0,
    type: 'buy' as 'buy' | 'sell'
  });
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      const { data, error } = await supabase
        .from('trade_history')
        .select(`
          *,
          user:profiles (
            unique_id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('İşlemler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTransaction(id: string) {
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from('trade_history')
        .update({
          quantity: editingTransaction.quantity,
          price: editingTransaction.price
        })
        .eq('id', id);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'İşlem başarıyla güncellendi'
      });

      setEditingTransaction(null);
      await loadTransactions();
    } catch (err) {
      console.error('Error updating transaction:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'İşlem güncellenirken bir hata oluştu'
      });
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trade_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'İşlem başarıyla silindi'
      });

      await loadTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'İşlem silinirken bir hata oluştu'
      });
    }
  }

  async function handleCreateTransaction() {
    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('unique_id', newTransaction.user_id)
        .single();

      if (userError) throw new Error('Kullanıcı bulunamadı');

      const { error: tradeError } = await supabase.rpc('execute_trade', {
        p_symbol: newTransaction.symbol.toUpperCase(),
        p_quantity: newTransaction.type === 'buy' ? newTransaction.quantity : -newTransaction.quantity,
        p_price: newTransaction.price
      });

      if (tradeError) throw tradeError;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'İşlem başarıyla oluşturuldu'
      });

      setShowNewTransactionModal(false);
      setNewTransaction({
        user_id: '',
        symbol: '',
        quantity: 1,
        price: 0,
        type: 'buy'
      });
      await loadTransactions();
    } catch (err) {
      console.error('Error creating transaction:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: err instanceof Error ? err.message : 'İşlem oluşturulurken bir hata oluştu'
      });
    }
  }

  const startEditing = (transaction: Transaction) => {
    setEditingTransaction({
      id: transaction.id,
      quantity: transaction.quantity,
      price: transaction.price
    });
  };

  const cancelEditing = () => {
    setEditingTransaction(null);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.user.unique_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filterType === 'all' || 
      transaction.type === filterType;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">İşlem Geçmişi</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tüm kullanıcıların işlem geçmişini görüntüleyin ve yönetin
            </p>
          </div>
          <button
            onClick={() => setShowNewTransactionModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni İşlem
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Arama ve Filtreleme */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Kullanıcı ID, isim, e-posta veya hisse ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Filter className="h-4 w-4 mr-2" />
              {filterType === 'all' ? 'Tüm İşlemler' : filterType === 'buy' ? 'Alış İşlemleri' : 'Satış İşlemleri'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {isFilterMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Tüm İşlemler
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('buy');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Alış İşlemleri
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('sell');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Satış İşlemleri
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* İşlem Listesi */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hisse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Miktar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fiyat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Toplam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.user.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.user.unique_id}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'buy'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {transaction.type === 'buy' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {transaction.type === 'buy' ? 'Alış' : 'Satış'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.symbol}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingTransaction?.id === transaction.id ? (
                      <input
                        type="number"
                        value={editingTransaction.quantity}
                        onChange={(e) => setEditingTransaction({
                          ...editingTransaction,
                          quantity: parseInt(e.target.value)
                        })}
                        className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        min="1"
                      />
                    ) : (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {transaction.quantity} Lot
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingTransaction?.id === transaction.id ? (
                      <input
                        type="number"
                        value={editingTransaction.price}
                        onChange={(e) => setEditingTransaction({
                          ...editingTransaction,
                          price: parseFloat(e.target.value)
                        })}
                        className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatCurrency(transaction.price)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(transaction.quantity * transaction.price)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(transaction.created_at).toLocaleString('tr-TR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {editingTransaction?.id === transaction.id ? (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleUpdateTransaction(transaction.id)}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => startEditing(transaction)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {transactions.length === 0 ? 'Henüz işlem yapılmamış' : 'Filtrelere uygun işlem bulunamadı'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni İşlem Modalı */}
      {showNewTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Yeni İşlem Oluştur
              </h3>
              <button
                onClick={() => setShowNewTransactionModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Müşteri Numarası
                </label>
                <input
                  type="text"
                  value={newTransaction.user_id}
                  onChange={(e) => setNewTransaction({ ...newTransaction, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="TR-XXXXXX-XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hisse Kodu
                </label>
                <input
                  type="text"
                  value={newTransaction.symbol}
                  onChange={(e) => setNewTransaction({ ...newTransaction, symbol: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="THYAO"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setNewTransaction({ ...newTransaction, type: 'buy' })}
                  className={`px-4 py-2 rounded-md flex items-center justify-center ${
                    newTransaction.type === 'buy'
                      ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Al
                </button>
                <button
                  type="button"
                  onClick={() => setNewTransaction({ ...newTransaction, type: 'sell' })}
                  className={`px-4 py-2 rounded-md flex items-center justify-center ${
                    newTransaction.type === 'sell'
                      ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Sat
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Miktar (Lot)
                </label>
                <input
                  type="number"
                  value={newTransaction.quantity}
                  onChange={(e) => setNewTransaction({ ...newTransaction, quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fiyat
                </label>
                <input
                  type="number"
                  value={newTransaction.price}
                  onChange={(e) => setNewTransaction({ ...newTransaction, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  min="0"
                  step="0.01"
                />
              </div>

              <button
                onClick={handleCreateTransaction}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                İşlemi Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}