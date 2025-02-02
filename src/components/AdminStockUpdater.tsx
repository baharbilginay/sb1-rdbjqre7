import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Check, X, AlertCircle, RefreshCw, Plus, Trash2, ArrowUpDown, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDateTime } from '../utils/format';
import { useNotifications } from '../lib/notifications';

interface Stock {
  symbol: string;
  price: number;
  change_percentage: number;
  volume: number;
  updated_at: string;
}

interface YahooQuote {
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
}

type SortField = 'symbol' | 'price' | 'change_percentage' | 'volume' | 'updated_at';
type SortOrder = 'asc' | 'desc';

export function AdminStockUpdater() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadStocks();
    // Auto refresh every 60 seconds during market hours
    const interval = setInterval(() => {
      if (isMarketOpen()) {
        loadStocks();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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

  async function getStockPrice(symbol: string): Promise<YahooQuote | null> {
    try {
      const corsProxy = 'https://corsproxy.io/';
      const baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
      
      // Always use .IS suffix for Turkish stocks
      const url = `${corsProxy}?${encodeURIComponent(`${baseUrl}${symbol}.IS?interval=1d&range=1d`)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.chart?.result?.[0]) {
        throw new Error('Invalid response structure');
      }

      const { meta, indicators } = data.chart.result[0];
      
      // Get the latest price and calculate change percentage
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose;
      const changePercent = ((currentPrice - previousClose) / previousClose) * 100;

      // Get the latest volume
      const volumes = indicators?.quote?.[0]?.volume || [];
      const latestVolume = volumes[volumes.length - 1] || 0;
      
      return {
        regularMarketPrice: currentPrice || 0,
        regularMarketChangePercent: changePercent || 0,
        regularMarketVolume: latestVolume
      };
    } catch (err) {
      console.error(`Error fetching price for ${symbol}:`, err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }

  async function loadStocks() {
    try {
      setLoading(true);
      const { data: automatedStocks, error: stocksError } = await supabase
        .from('stocks')
        .select('symbol')
        .eq('is_automated', true)
        .eq('is_active', true);

      if (stocksError) throw stocksError;

      if (!automatedStocks || automatedStocks.length === 0) {
        setStocks([]);
        setLoading(false);
        return;
      }

      // Get current prices from database
      const { data: currentPrices } = await supabase
        .from('stock_prices')
        .select('*')
        .in('symbol', automatedStocks.map(s => s.symbol));

      const priceMap = new Map(currentPrices?.map(p => [p.symbol, p]) || []);

      // Only update prices during market hours
      const isMarketOpenNow = isMarketOpen();

      // Update prices for each stock
      const updatedStocks = await Promise.all(
        automatedStocks.map(async (stock) => {
          try {
            if (isMarketOpenNow) {
              // Get real price data during market hours
              const priceData = await getStockPrice(stock.symbol);
              
              if (priceData) {
                const newPrice = {
                  symbol: stock.symbol,
                  price: priceData.regularMarketPrice,
                  change_percentage: priceData.regularMarketChangePercent,
                  volume: priceData.regularMarketVolume,
                  updated_at: new Date().toISOString()
                };

                // Update price in database
                await supabase
                  .from('stock_prices')
                  .upsert(newPrice);

                return newPrice;
              }
            }
            
            // Use last known price if market is closed or price fetch fails
            const lastPrice = priceMap.get(stock.symbol);
            if (lastPrice) {
              return lastPrice;
            }

            // Return default price if no data is available
            return {
              symbol: stock.symbol,
              price: 0,
              change_percentage: 0,
              volume: 0,
              updated_at: new Date().toISOString()
            };
          } catch (err) {
            console.error(`Error updating ${stock.symbol}:`, err instanceof Error ? err.message : 'Unknown error');
            
            // Return last known price if available
            const lastPrice = priceMap.get(stock.symbol);
            if (lastPrice) {
              return lastPrice;
            }
            
            return {
              symbol: stock.symbol,
              price: 0,
              change_percentage: 0,
              volume: 0,
              updated_at: new Date().toISOString()
            };
          }
        })
      );

      const validStocks = updatedStocks.filter(Boolean) as Stock[];
      setStocks(validStocks);

      if (!isMarketOpenNow) {
        setError('Borsa şu anda kapalı. Son bilinen fiyatlar gösteriliyor.');
      } else {
        setError('');
      }

    } catch (err) {
      console.error('Error loading stocks:', err);
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

      // Try to get initial price data
      const priceData = await getStockPrice(symbol);
      
      // Add stock to automated_stocks
      const { data, error } = await supabase.rpc('add_automated_stock', {
        p_symbol: symbol
      });

      if (error) throw error;

      // If we got price data, update it immediately
      if (priceData) {
        await supabase
          .from('stock_prices')
          .upsert({
            symbol,
            price: priceData.regularMarketPrice,
            change_percentage: priceData.regularMarketChangePercent,
            volume: priceData.regularMarketVolume,
            updated_at: new Date().toISOString()
          });
      }

      setNewSymbol('');
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Hisse başarıyla eklendi'
      });
      
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
      
      setStocks(stocks.filter(stock => stock.symbol !== symbol));
      
    } catch (err) {
      console.error('Error removing stock:', err);
      const errorMessage = err instanceof Error ? err.message : 'Hisse silinirken bir hata oluştu';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: errorMessage
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'symbol':
        return multiplier * a.symbol.localeCompare(b.symbol);
      case 'price':
        return multiplier * (a.price - b.price);
      case 'change_percentage':
        return multiplier * (a.change_percentage - b.change_percentage);
      case 'volume':
        return multiplier * (a.volume - b.volume);
      case 'updated_at':
        return multiplier * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
      default:
        return 0;
    }
  });

  const filteredStocks = sortedStocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center text-xs font-medium ${
        sortField === field ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 ml-1" />
    </button>
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
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Otomatik Fiyat Takibi</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Otomatik fiyat güncellemesi yapılacak hisseleri yönetin
            </p>
          </div>
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
                <th className="px-6 py-3 text-left">
                  <SortButton field="symbol" label="Sembol" />
                </th>
                <th className="px-6 py-3 text-left">
                  <SortButton field="price" label="Son Fiyat" />
                </th>
                <th className="px-6 py-3 text-left">
                  <SortButton field="change_percentage" label="Değişim %" />
                </th>
                <th className="px-6 py-3 text-left">
                  <SortButton field="volume" label="Hacim" />
                </th>
                <th className="px-6 py-3 text-left">
                  <SortButton field="updated_at" label="Son Güncelleme" />
                </th>
                <th className="px-6 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStocks.map((stock) => (
                <tr key={stock.symbol}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900 dark:text-white">{stock.symbol}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 dark:text-white">{formatCurrency(stock.price)}</span>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatCurrency(stock.volume)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(stock.updated_at)}
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