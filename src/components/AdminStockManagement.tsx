import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, RefreshCw, Search, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';
import { formatCurrency } from '../utils/format';

interface Stock {
  symbol: string;
  price: number;
  change_percentage: number;
  volume: number;
  updated_at: string;
  full_name?: string;
  description?: string;
  logo_url?: string;
}

export function AdminStockManagement() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadStocks();
  }, []);

  async function loadStocks() {
    try {
      setError('');
      const { data: stocksData, error: stocksError } = await supabase
        .from('stocks')
        .select('*')
        .eq('is_active', true)
        .eq('is_automated', true)
        .order('symbol');

      if (stocksError) throw stocksError;

      if (!stocksData || stocksData.length === 0) {
        setStocks([]);
        setLoading(false);
        return;
      }

      const { data: pricesData, error: pricesError } = await supabase
        .from('stock_prices')
        .select('*');

      if (pricesError) throw pricesError;

      // Combine stocks and prices data
      const combinedData = stocksData.map(stock => {
        const price = pricesData?.find(p => p.symbol === stock.symbol);
        return {
          ...stock,
          price: price?.price || 0,
          change_percentage: price?.change_percentage || 0,
          volume: price?.volume || 0,
          updated_at: price?.updated_at || new Date().toISOString()
        };
      });

      setStocks(combinedData);
    } catch (err) {
      console.error('Error loading stocks:', err);
      setError('Hisseler yüklenirken bir hata oluştu');
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Hisseler yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (addingStock) return;
    
    setError('');
    const symbol = newSymbol.trim().toUpperCase();

    if (!symbol) {
      setError('Lütfen bir hisse kodu girin');
      return;
    }

    try {
      setAddingStock(true);

      const { data, error } = await supabase.rpc('add_automated_stock', {
        p_symbol: symbol
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Hisse başarıyla eklendi'
      });

      setNewSymbol('');
      await loadStocks();
    } catch (err) {
      console.error('Error adding stock:', err);
      const errorMessage = err instanceof Error ? err.message : 'Hisse eklenirken bir hata oluştu';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: errorMessage
      });
    } finally {
      setAddingStock(false);
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    if (!confirm(`${symbol} hissesini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stocks')
        .update({ is_active: false })
        .eq('symbol', symbol);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Hisse başarıyla silindi'
      });
      
      await loadStocks();
    } catch (err) {
      console.error('Error removing stock:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Hisse silinirken bir hata oluştu'
      });
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await loadStocks();
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Fiyatlar güncellendi'
      });
    } catch (err) {
      console.error('Error refreshing stocks:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fiyatlar güncellenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
            Otomatik Hisse Yönetimi
          </h2>
          <button
            onClick={handleRefresh}
            className="flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Yenile
          </button>
        </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Hisse ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <form onSubmit={handleAddStock} className="flex gap-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Yeni hisse kodu (örn: THYAO)"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={addingStock}
            />
            <button
              type="submit"
              disabled={addingStock}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addingStock ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Logo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sembol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Şirket Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Son Fiyat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Değişim %
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStocks.map((stock) => (
                <tr key={stock.symbol}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stock.logo_url ? (
                      <img
                        src={stock.logo_url}
                        alt={`${stock.symbol} logo`}
                        className="h-10 w-10 rounded-full object-cover bg-white shadow-sm border border-gray-200 dark:border-gray-600 p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${stock.symbol}&background=f3f4f6&color=6b7280&rounded=true&bold=true&size=64`;
                        }}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                        <Image className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {stock.symbol}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 dark:text-white">
                      {stock.full_name || stock.symbol}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(stock.price)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stock.change_percentage >= 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {stock.change_percentage >= 0 ? '+' : ''}
                      {stock.change_percentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleRemoveStock(stock.symbol)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStocks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Hisse bulunamadı
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