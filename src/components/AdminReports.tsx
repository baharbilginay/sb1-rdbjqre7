import React, { useState, useEffect } from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, Users, DollarSign, 
  Calendar, ArrowUp, ArrowDown, Clock, Filter, ChevronDown,
  Download, Wallet, LineChart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';

interface DailyStats {
  date: string;
  total_volume: number;
  total_trades: number;
  total_deposits: number;
  total_withdrawals: number;
  new_users: number;
}

interface TopStock {
  symbol: string;
  total_volume: number;
  trade_count: number;
  price_change: number;
}

interface UserStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  total_balance: number;
  avg_balance: number;
}

export function AdminReports() {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topStocks, setTopStocks] = useState<TopStock[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Get date range
      const now = new Date();
      let startDate = new Date();
      if (dateRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else {
        startDate = now;
      }

      // Load daily stats
      const { data: dailyData, error: dailyError } = await supabase
        .from('trade_history')
        .select('created_at, quantity, price, type')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (dailyError) throw dailyError;

      // Process daily stats
      const dailyMap = new Map<string, DailyStats>();
      dailyData?.forEach(trade => {
        const date = new Date(trade.created_at).toLocaleDateString('tr-TR');
        const stats = dailyMap.get(date) || {
          date,
          total_volume: 0,
          total_trades: 0,
          total_deposits: 0,
          total_withdrawals: 0,
          new_users: 0
        };

        stats.total_volume += trade.quantity * trade.price;
        stats.total_trades += 1;
        dailyMap.set(date, stats);
      });

      setDailyStats(Array.from(dailyMap.values()));

      // Load top stocks
      const { data: stockData, error: stockError } = await supabase
        .from('trade_history')
        .select('symbol, quantity, price, type')
        .gte('created_at', startDate.toISOString());

      if (stockError) throw stockError;

      // Process top stocks
      const stockMap = new Map<string, TopStock>();
      stockData?.forEach(trade => {
        const stats = stockMap.get(trade.symbol) || {
          symbol: trade.symbol,
          total_volume: 0,
          trade_count: 0,
          price_change: 0
        };

        stats.total_volume += trade.quantity * trade.price;
        stats.trade_count += 1;
        stockMap.set(trade.symbol, stats);
      });

      // Get current prices for price change calculation
      const { data: prices } = await supabase
        .from('stock_prices')
        .select('symbol, price, change_percentage');

      prices?.forEach(price => {
        const stats = stockMap.get(price.symbol);
        if (stats) {
          stats.price_change = price.change_percentage;
        }
      });

      setTopStocks(Array.from(stockMap.values())
        .sort((a, b) => b.total_volume - a.total_volume)
        .slice(0, 5));

      // Load user stats
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('balance, is_verified');

      if (userError) throw userError;

      const stats = {
        total_users: users?.length || 0,
        active_users: users?.filter(u => u.balance > 0).length || 0,
        verified_users: users?.filter(u => u.is_verified).length || 0,
        total_balance: users?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0,
        avg_balance: users?.length ? 
          (users.reduce((sum, u) => sum + (u.balance || 0), 0) / users.length) : 0
      };

      setUserStats(stats);

    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            İşlem Raporları
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setDateRange('today')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  dateRange === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Bugün
              </button>
              <button
                onClick={() => setDateRange('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  dateRange === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Son 7 Gün
              </button>
              <button
                onClick={() => setDateRange('month')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  dateRange === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Son 30 Gün
              </button>
            </div>
            <button
              onClick={loadStats}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* User Stats */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Kullanıcı</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {userStats.total_users}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Aktif Kullanıcı</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {userStats.active_users}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Bakiye</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(userStats.total_balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <LineChart className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Ortalama Bakiye</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(userStats.avg_balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-teal-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Onaylı Kullanıcı</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {userStats.verified_users}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Stats */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Günlük İstatistikler
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlem Hacmi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlem Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Para Yatırma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Para Çekme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Yeni Kullanıcı
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {dailyStats.map((stat) => (
                <tr key={stat.date}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {stat.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(stat.total_volume)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {stat.total_trades}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                    {formatCurrency(stat.total_deposits)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                    {formatCurrency(stat.total_withdrawals)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {stat.new_users}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Stocks */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          En Çok İşlem Gören Hisseler
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {topStocks.map((stock) => (
            <div key={stock.symbol} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stock.symbol}
                </span>
                <span className={`text-sm font-medium ${
                  stock.price_change >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {stock.price_change >= 0 ? '+' : ''}
                  {stock.price_change.toFixed(2)}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">İşlem Hacmi</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatCurrency(stock.total_volume)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">İşlem Sayısı</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {stock.trade_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}