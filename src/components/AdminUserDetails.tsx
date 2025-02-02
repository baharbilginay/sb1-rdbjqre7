import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Edit2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { useNotifications } from '../lib/notifications';

interface UserDetails {
  id: string;
  unique_id: string;
  full_name: string;
  email: string;
  tc_no: string;
  phone: string;
  birth_date: string;
  balance: number;
  is_verified: boolean;
}

interface PortfolioItem {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  profit_loss: number;
  profit_loss_percentage: number;
}

interface Props {
  userId: string;
  onClose: () => void;
}

export function AdminUserDetails({ userId, onClose }: Props) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<{
    symbol: string;
    quantity: number;
    average_price: number;
  } | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      setUser(userData);

      // Get portfolio items with current prices
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select(`
          symbol,
          quantity,
          average_price,
          stocks!inner (
            stock_prices(price)
          )
        `)
        .eq('user_id', userId);

      if (portfolioError) throw portfolioError;

      // Transform portfolio data
      const enrichedPortfolio = portfolioData.map(item => {
        const currentPrice = item.stocks.stock_prices[0]?.price || item.average_price;
        const currentValue = item.quantity * currentPrice;
        const costBasis = item.quantity * item.average_price;
        const profitLoss = currentValue - costBasis;
        const profitLossPercentage = ((currentPrice - item.average_price) / item.average_price) * 100;

        return {
          symbol: item.symbol,
          quantity: item.quantity,
          average_price: item.average_price,
          current_price: currentPrice,
          profit_loss: profitLoss,
          profit_loss_percentage: profitLossPercentage
        };
      });

      setPortfolio(enrichedPortfolio);
    } catch (err) {
      console.error('Error loading user details:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kullanıcı detayları yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePortfolio = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('portfolio_items')
        .update({
          quantity: editingItem.quantity,
          average_price: editingItem.average_price
        })
        .eq('user_id', userId)
        .eq('symbol', editingItem.symbol);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Portföy güncellendi'
      });

      setEditingItem(null);
      await loadUserDetails();
    } catch (err) {
      console.error('Error updating portfolio:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Portföy güncellenirken bir hata oluştu'
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Hata
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>Kullanıcı bulunamadı</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kullanıcı Detayları
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Müşteri Numarası</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user.unique_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ad Soyad</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">E-posta</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">TC Kimlik No</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user.tc_no}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Telefon</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bakiye</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {formatCurrency(user.balance)}
              </p>
            </div>
          </div>

          {/* Portfolio */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Portföy
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Hisse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Miktar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Maliyet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Güncel Fiyat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Kar/Zarar
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {portfolio.map((item) => (
                    <tr key={item.symbol}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.symbol}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingItem?.symbol === item.symbol ? (
                          <input
                            type="number"
                            value={editingItem.quantity}
                            onChange={(e) => setEditingItem({
                              ...editingItem,
                              quantity: parseInt(e.target.value)
                            })}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            min="0"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {item.quantity} Lot
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingItem?.symbol === item.symbol ? (
                          <input
                            type="number"
                            value={editingItem.average_price}
                            onChange={(e) => setEditingItem({
                              ...editingItem,
                              average_price: parseFloat(e.target.value)
                            })}
                            className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatCurrency(item.average_price)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.current_price)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className={`text-sm font-medium ${
                            item.profit_loss >= 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(item.profit_loss)}
                          </span>
                          <span className={`text-xs ml-1 ${
                            item.profit_loss_percentage >= 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            ({item.profit_loss_percentage.toFixed(2)}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {editingItem?.symbol === item.symbol ? (
                            <>
                              <button
                                onClick={handleUpdatePortfolio}
                                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                              >
                                <Check className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setEditingItem({
                                symbol: item.symbol,
                                quantity: item.quantity,
                                average_price: item.average_price
                              })}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {portfolio.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Portföyde hisse bulunmuyor
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}