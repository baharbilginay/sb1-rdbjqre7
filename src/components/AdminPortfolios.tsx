import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { useNotifications } from '../lib/notifications';

interface Portfolio {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  user: {
    unique_id: string;
    full_name: string;
    email: string;
  };
}

interface EditingPortfolio {
  id: string;
  quantity: number;
  average_price: number;
}

export function AdminPortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPortfolio, setEditingPortfolio] = useState<EditingPortfolio | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
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
      setPortfolios(data || []);
    } catch (err) {
      console.error('Error loading portfolios:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Portföyler yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePortfolio = async () => {
    if (!editingPortfolio) return;

    try {
      const { error } = await supabase
        .from('portfolio_items')
        .update({
          quantity: editingPortfolio.quantity,
          average_price: editingPortfolio.average_price
        })
        .eq('id', editingPortfolio.id);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Portföy güncellendi'
      });

      setEditingPortfolio(null);
      await loadPortfolios();
    } catch (err) {
      console.error('Error updating portfolio:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Portföy güncellenirken bir hata oluştu'
      });
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm('Bu portföy kaydını silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Portföy kaydı silindi'
      });

      await loadPortfolios();
    } catch (err) {
      console.error('Error deleting portfolio:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Portföy kaydı silinirken bir hata oluştu'
      });
    }
  };

  const filteredPortfolios = portfolios.filter(portfolio =>
    portfolio.user.unique_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    portfolio.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    portfolio.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    portfolio.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kullanıcı Portföyleri
          </h2>
          <div className="w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Kullanıcı veya hisse ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Kullanıcı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Hisse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Miktar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ortalama Maliyet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Toplam Değer
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPortfolios.map((portfolio) => (
              <tr key={portfolio.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {portfolio.user.full_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {portfolio.user.unique_id}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {portfolio.user.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {portfolio.symbol}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingPortfolio?.id === portfolio.id ? (
                    <input
                      type="number"
                      value={editingPortfolio.quantity}
                      onChange={(e) => setEditingPortfolio({
                        ...editingPortfolio,
                        quantity: parseInt(e.target.value)
                      })}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      min="0"
                    />
                  ) : (
                    <span className="text-sm text-gray-900 dark:text-white">
                      {portfolio.quantity} Lot
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingPortfolio?.id === portfolio.id ? (
                    <input
                      type="number"
                      value={editingPortfolio.average_price}
                      onChange={(e) => setEditingPortfolio({
                        ...editingPortfolio,
                        average_price: parseFloat(e.target.value)
                      })}
                      className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(portfolio.average_price)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(portfolio.quantity * portfolio.average_price)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {editingPortfolio?.id === portfolio.id ? (
                      <>
                        <button
                          onClick={handleUpdatePortfolio}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingPortfolio(null)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingPortfolio({
                            id: portfolio.id,
                            quantity: portfolio.quantity,
                            average_price: portfolio.average_price
                          })}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePortfolio(portfolio.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredPortfolios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  {portfolios.length === 0 ? 'Henüz portföy kaydı bulunmuyor' : 'Arama kriterlerine uygun portföy bulunamadı'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}