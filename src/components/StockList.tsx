import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search, Info, Bell, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { TradingPanel } from './TradingPanel';
import { StockInfoModal } from './StockInfoModal';
import { PriceAlertModal } from './PriceAlertModal';
import { useNotifications } from '../lib/notifications';

interface Stock {
  symbol: string;
  price: number;
  change_percentage: number;
  description?: string;
  logo_url?: string;
  full_name?: string;
}

interface StockListProps {
  userBalance: number;
  onTradeComplete: () => void;
}

export function StockList({ userBalance, onTradeComplete }: StockListProps) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadStocks();

    // Subscribe to stock price changes
    const priceChannel = supabase.channel('stock-prices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_prices'
        },
        () => {
          loadStocks();
        }
      )
      .subscribe();

    // Subscribe to stock changes
    const stockChannel = supabase.channel('stocks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stocks'
        },
        () => {
          loadStocks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(priceChannel);
      supabase.removeChannel(stockChannel);
    };
  }, []);

  async function loadStocks() {
    try {
      const { data: stocksData, error: stocksError } = await supabase
        .from('stocks')
        .select('*')
        .eq('is_active', true)
        .order('symbol');

      if (stocksError) throw stocksError;

      if (!stocksData) {
        setStocks([]);
        return;
      }

      // Get current prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('stock_prices')
        .select('*');

      if (pricesError) throw pricesError;

      // Combine stocks and prices
      const stocksWithPrices = stocksData.map(stock => {
        const price = pricesData?.find(p => p.symbol === stock.symbol);
        return {
          symbol: stock.symbol,
          full_name: stock.full_name,
          description: stock.description,
          logo_url: stock.logo_url,
          price: price?.price || 0,
          change_percentage: price?.change_percentage || 0
        };
      });

      setStocks(stocksWithPrices);
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

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-md"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hisseler</h2>
          <div className="w-64">
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
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {filteredStocks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {stocks.length === 0 
              ? 'Henüz hisse senedi bulunmuyor.'
              : 'Seçilen filtrelere uygun hisse senedi bulunamadı.'}
          </div>
        ) : (
          filteredStocks.map((stock) => (
            <div 
              key={stock.symbol} 
              className="px-4 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => setSelectedStock(stock)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div>
                  <div className="flex items-center">
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
                    <div className="ml-3">
                      <div className="flex items-center">
                        {stock.change_percentage >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400 mr-2" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{stock.symbol}</span>
                        <div className="flex items-center space-x-1 ml-2">
                          {(stock.description || stock.logo_url) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStock(stock);
                                setShowInfoModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                              title="Detaylar"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStock(stock);
                              setShowAlertModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                            title="Fiyat Alarmı"
                          >
                            <Bell className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {stock.full_name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {stock.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(stock.price)}
                  </div>
                  <div className={`text-sm ${
                    stock.change_percentage >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stock.change_percentage >= 0 ? '+' : ''}
                    {stock.change_percentage.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedStock && !showInfoModal && !showAlertModal && (
        <TradingPanel
          symbol={selectedStock.symbol}
          currentPrice={selectedStock.price}
          changePercentage={selectedStock.change_percentage}
          onClose={() => setSelectedStock(null)}
          onSuccess={onTradeComplete}
          userBalance={userBalance}
        />
      )}

      {selectedStock && showInfoModal && (
        <StockInfoModal
          stock={selectedStock}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedStock(null);
          }}
        />
      )}

      {selectedStock && showAlertModal && (
        <PriceAlertModal
          symbol={selectedStock.symbol}
          currentPrice={selectedStock.price}
          onClose={() => {
            setShowAlertModal(false);
            setSelectedStock(null);
          }}
        />
      )}
    </div>
  );
}