import React, { useState, useEffect } from 'react';
import { Star, Search, TrendingUp, TrendingDown, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { TradingPanel } from './TradingPanel';
import { WatchlistButton } from './WatchlistButton';

interface WatchlistSectionProps {
  userBalance: number;
  onTradeComplete: () => void;
}

interface WatchlistItem {
  symbol: string;
  price: number;
  change_percentage: number;
  full_name?: string;
  logo_url?: string;
}

export function WatchlistSection({ userBalance, onTradeComplete }: WatchlistSectionProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<WatchlistItem | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadWatchlist = async () => {
      try {
        setError(null);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setWatchlist([]);
          setLoading(false);
          return;
        }

        // Get watchlist items
        const { data: watchlistData, error: watchlistError } = await supabase
          .from('watchlist')
          .select('symbol')
          .eq('user_id', user.id);

        if (watchlistError) throw watchlistError;

        if (!watchlistData || watchlistData.length === 0) {
          setWatchlist([]);
          setLoading(false);
          return;
        }

        // Get stock details
        const { data: stocksData, error: stocksError } = await supabase
          .from('stocks')
          .select('*')
          .in('symbol', watchlistData.map(item => item.symbol))
          .eq('is_active', true);

        if (stocksError) throw stocksError;

        // Get current prices
        const { data: pricesData, error: pricesError } = await supabase
          .from('stock_prices')
          .select('*')
          .in('symbol', watchlistData.map(item => item.symbol));

        if (pricesError) throw pricesError;

        if (mounted) {
          // Combine data
          const watchlistItems = stocksData?.map(stock => {
            const price = pricesData?.find(p => p.symbol === stock.symbol);
            return {
              symbol: stock.symbol,
              full_name: stock.full_name,
              logo_url: stock.logo_url,
              price: price?.price || 0,
              change_percentage: price?.change_percentage || 0
            };
          }) || [];

          setWatchlist(watchlistItems);
        }
      } catch (err) {
        console.error('Error loading watchlist:', err);
        if (mounted) {
          setError('Takip listesi yüklenirken bir hata oluştu');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadWatchlist();

    // Subscribe to watchlist changes
    const watchlistChannel = supabase.channel('watchlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlist'
        },
        () => {
          if (mounted) loadWatchlist();
        }
      )
      .subscribe();

    // Subscribe to price changes
    const priceChannel = supabase.channel('price-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_prices'
        },
        () => {
          if (mounted) loadWatchlist();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(watchlistChannel);
      supabase.removeChannel(priceChannel);
    };
  }, []);

  const filteredStocks = watchlist.filter(stock =>
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

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Yenile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Takip Listesi</h2>
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
            {watchlist.length === 0 ? (
              <>
                <Star className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <p>Henüz takip ettiğiniz hisse yok</p>
                <p className="mt-2 text-sm">Hisseleri takip etmek için yıldız ikonuna tıklayın</p>
              </>
            ) : (
              'Hisse bulunamadı'
            )}
          </div>
        ) : (
          filteredStocks.map((stock) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
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

                  <div>
                    <div className="flex items-center">
                      {stock.change_percentage >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400 mr-2" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{stock.symbol}</span>
                      <WatchlistButton symbol={stock.symbol} className="ml-2" />
                    </div>
                    {stock.full_name && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {stock.full_name}
                      </p>
                    )}
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

      {selectedStock && (
        <TradingPanel
          symbol={selectedStock.symbol}
          currentPrice={selectedStock.price}
          changePercentage={selectedStock.change_percentage}
          onClose={() => setSelectedStock(null)}
          onSuccess={() => {
            onTradeComplete();
            setSelectedStock(null);
          }}
          userBalance={userBalance}
        />
      )}
    </div>
  );
}