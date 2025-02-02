import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { useProfile } from '../hooks/useProfile';
import { formatCurrency } from '../utils/format';
import { TrendingUp, TrendingDown, RefreshCw, ArrowUpDown, Filter, ChevronDown, History, Clock } from 'lucide-react';
import { TradingPanel } from './TradingPanel';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/format';

interface Trade {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  type: 'buy' | 'sell';
  created_at: string;
}

type SortField = 'symbol' | 'value' | 'profit';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'profit' | 'loss';

export function PortfolioSection() {
  const { portfolio, isLoading, refresh } = usePortfolio();
  const { profile } = useProfile();
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{
    symbol: string;
    price: number;
    change_percentage: number;
  } | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);

  useEffect(() => {
    loadRecentTrades();
  }, []);

  const loadRecentTrades = async () => {
    try {
      setLoadingTrades(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(showAllTrades ? 100 : 5);

      if (error) throw error;
      setRecentTrades(data || []);
    } catch (err) {
      console.error('Error loading trades:', err);
    } finally {
      setLoadingTrades(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleStockClick = (item: typeof portfolio[0]) => {
    setSelectedStock({
      symbol: item.symbol,
      price: item.current_price,
      change_percentage: item.profit_loss_percentage
    });
  };

  const handleTradeComplete = () => {
    refresh();
    loadRecentTrades();
    setSelectedStock(null);
  };

  const handleFilterChange = (type: FilterType) => {
    setFilterType(type);
    setIsFilterMenuOpen(false);
  };

  const filteredPortfolio = portfolio.filter((item) => {
    switch (filterType) {
      case 'profit':
        return item.profit_loss > 0;
      case 'loss':
        return item.profit_loss < 0;
      default:
        return true;
    }
  });

  const sortedPortfolio = [...filteredPortfolio].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'symbol':
        return multiplier * a.symbol.localeCompare(b.symbol);
      case 'value':
        return multiplier * (a.current_value - b.current_value);
      case 'profit':
        return multiplier * (a.profit_loss - b.profit_loss);
      default:
        return 0;
    }
  });

  const summary = {
    totalValue: portfolio.reduce((sum, item) => sum + item.current_value, 0),
    totalProfit: portfolio.reduce((sum, item) => sum + (item.profit_loss > 0 ? item.profit_loss : 0), 0),
    totalLoss: portfolio.reduce((sum, item) => sum + (item.profit_loss < 0 ? item.profit_loss : 0), 0),
    profitCount: portfolio.filter(item => item.profit_loss > 0).length,
    lossCount: portfolio.filter(item => item.profit_loss < 0).length,
    totalAssets: portfolio.reduce((sum, item) => sum + item.current_value, 0) + (profile?.balance || 0),
    totalProfitLoss: portfolio.reduce((sum, item) => sum + item.profit_loss, 0),
    totalProfitLossPercentage: portfolio.reduce((sum, item) => sum + item.profit_loss_percentage, 0)
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center text-xs sm:text-sm font-medium ${
        sortField === field ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 sm:h-4 sm:w-4 ml-1 ${
        sortField === field ? 'text-blue-600' : 'text-gray-400'
      }`} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Market Summary */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Portföy Özeti</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Toplam Varlık</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(summary.totalAssets)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Portföy Değeri</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(summary.totalValue)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nakit Bakiye</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(profile?.balance || 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Toplam Kar/Zarar</p>
                  <p className={`text-sm font-semibold ${
                    summary.totalProfitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(summary.totalProfitLoss)}
                    <span className="text-xs ml-1">
                      ({summary.totalProfitLossPercentage.toFixed(2)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kontroller */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Portföyüm</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="relative">
                  <button
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    {filterType === 'all' ? 'Tümü' : filterType === 'profit' ? 'Kardakiler' : 'Zarardakiler'}
                    <ChevronDown className={`h-4 w-4 ml-1 transform transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isFilterMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleFilterChange('all')}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            filterType === 'all'
                              ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          Tümü
                        </button>
                        <button
                          onClick={() => handleFilterChange('profit')}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            filterType === 'profit'
                              ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          Kardakiler
                        </button>
                        <button
                          onClick={() => handleFilterChange('loss')}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            filterType === 'loss'
                              ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          Zarardakiler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <SortButton field="symbol" label="Hisse" />
                <SortButton field="value" label="Tutar" />
                <SortButton field="profit" label="Kar/Zarar" />
              </div>
              <button
                onClick={refresh}
                className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Güncelle
              </button>
            </div>
          </div>
        </div>

        {/* Portföy Listesi */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {sortedPortfolio.length === 0 ? (
            <div className="px-4 sm:px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              {portfolio.length === 0 
                ? 'Henüz portföyünüzde hisse senedi bulunmuyor.'
                : 'Seçilen filtrelere uygun hisse senedi bulunamadı.'}
            </div>
          ) : (
            sortedPortfolio.map((item) => (
              <div 
                key={item.id} 
                className="px-4 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => handleStockClick(item)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div>
                    <div className="flex items-center">
                      {item.profit_loss >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.symbol}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <span>{item.quantity} Lot</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Ort. {formatCurrency(item.average_price)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Güncel {formatCurrency(item.current_price)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.current_value)}
                    </p>
                    <p className={`text-xs sm:text-sm ${
                      item.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {item.profit_loss >= 0 ? '+' : ''}
                      {formatCurrency(item.profit_loss)} ({item.profit_loss_percentage.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Son İşlemler */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <History className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Son İşlemler
              </h3>
            </div>
            {recentTrades.length > 0 && !showAllTrades && (
              <button
                onClick={() => {
                  setShowAllTrades(true);
                  loadRecentTrades();
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Tümünü Gör
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {loadingTrades ? (
            <div className="p-4">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          ) : recentTrades.length > 0 ? (
            recentTrades.map((trade) => (
              <div key={trade.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {trade.type === 'buy' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {trade.symbol} - {trade.type === 'buy' ? 'Alış' : 'Satış'}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(trade.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {trade.quantity} Lot
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(trade.price)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Henüz işlem geçmişi bulunmuyor
            </div>
          )}
        </div>
      </div>

      {selectedStock && (
        <TradingPanel
          symbol={selectedStock.symbol}
          currentPrice={selectedStock.price}
          changePercentage={selectedStock.change_percentage}
          onClose={() => setSelectedStock(null)}
          onSuccess={handleTradeComplete}
          userBalance={profile?.balance || 0}
          initialType="sell"
        />
      )}
    </div>
  );
}