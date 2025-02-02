import React, { useState, useEffect } from 'react';
import { 
  Search, BarChart2, User, Plus, TrendingUp, X, Eye, Info, Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AuthModal } from '../components/AuthModal';
import { useSettings } from '../lib/settings';
import { StockList } from '../components/StockList';
import { PortfolioSection } from '../components/PortfolioSection';
import { ProfileSection } from '../components/ProfileSection';
import { useProfile } from '../hooks/useProfile';
import { ThemeToggle } from '../components/ThemeToggle';
import { NotificationBell } from '../components/NotificationBell';
import { useNotifications } from '../lib/notifications';
import { formatCurrency } from '../utils/format';
import { TradingPanel } from '../components/TradingPanel';

interface UserAppProps {
  user: SupabaseUser | null;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'login' | 'register';
}

interface Stock {
  symbol: string;
  price: number;
  change_percentage: number;
  description?: string;
  image_url?: string;
}

const StockItem = ({ stock, onSelect, onInfoClick }: { 
  stock: Stock;
  onSelect: () => void;
  onInfoClick: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onSelect}
    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md flex items-center justify-between cursor-pointer"
  >
    <div>
      <div className="flex items-center">
        <p className="font-medium text-gray-900 dark:text-white">
          {stock.symbol}
        </p>
        {(stock.description || stock.image_url) && (
          <button
            onClick={onInfoClick}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {formatCurrency(stock.price)}
      </p>
    </div>
    <span className={`text-sm ${
      stock.change_percentage >= 0 
        ? 'text-green-600 dark:text-green-400' 
        : 'text-red-600 dark:text-red-400'
    }`}>
      {stock.change_percentage >= 0 ? '+' : ''}
      {stock.change_percentage.toFixed(2)}%
    </span>
  </div>
);

export function UserApp({ user, showAuthModal, setShowAuthModal, authMode }: UserAppProps) {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'stocks' | 'portfolio' | 'profile'>('stocks');
  const { settings } = useSettings();
  const { profile, refresh } = useProfile();
  const { addNotification } = useNotifications();
  const [showStockSearch, setShowStockSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [defaultStocks, setDefaultStocks] = useState<Stock[]>([]);
  const [showAllStocks, setShowAllStocks] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);

  useEffect(() => {
    if (showStockSearch) {
      loadDefaultStocks();
    }
  }, [showStockSearch]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearchStocks();
    } else {
      setStocks([]);
    }
  }, [searchQuery]);

  const loadDefaultStocks = async () => {
    try {
      setLoadingStocks(true);
      const { data, error } = await supabase
        .from('stocks')
        .select(`
          symbol,
          full_name,
          description,
          stock_prices (
            price,
            change_percentage
          )
        `)
        .eq('is_active', true)
        .order('symbol')
        .limit(5);

      if (error) throw error;
      
      setDefaultStocks(data.map(stock => ({
        symbol: stock.symbol,
        price: stock.stock_prices?.[0]?.price || 0,
        change_percentage: stock.stock_prices?.[0]?.change_percentage || 0,
        description: stock.description,
        image_url: null
      })) || []);
    } catch (err) {
      console.error('Error loading default stocks:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Hisseler yüklenirken bir hata oluştu'
      });
    } finally {
      setLoadingStocks(false);
    }
  };

  const handleSearchStocks = async () => {
    if (!searchQuery) {
      setStocks([]);
      return;
    }

    try {
      setLoadingStocks(true);
      const { data, error } = await supabase
        .from('stocks')
        .select(`
          symbol,
          full_name,
          description,
          stock_prices (
            price,
            change_percentage
          )
        `)
        .eq('is_active', true)
        .ilike('symbol', `%${searchQuery}%`)
        .order('symbol');

      if (error) throw error;
      
      setStocks(data.map(stock => ({
        symbol: stock.symbol,
        price: stock.stock_prices?.[0]?.price || 0,
        change_percentage: stock.stock_prices?.[0]?.change_percentage || 0,
        description: stock.description,
        image_url: null
      })) || []);
    } catch (err) {
      console.error('Error searching stocks:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Arama yapılırken bir hata oluştu'
      });
    } finally {
      setLoadingStocks(false);
    }
  };

  const handleStockSelect = (stock: Stock) => {
    setSelectedStock(stock);
    setShowStockSearch(false);
    setSearchQuery('');
    setStocks([]);
    setShowAllStocks(false);
  };

  const handleTradeComplete = () => {
    setSelectedStock(null);
    refresh();
  };

  const handleInfoClick = (e: React.MouseEvent, stock: Stock) => {
    e.stopPropagation();
    setSelectedStock(stock);
    setShowInfoModal(true);
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowStockSearch(true);
    setSearchQuery('');
    setStocks([]);
    setShowAllStocks(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
          }

          body {
            background-image: url('https://images.unsplash.com/photo-1640340434855-6084b1f4901c?q=80&w=1964&auto=format&fit=crop');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed;
          }

          .content-wrapper {
            position: relative;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }

          .logo {
            width: 300px;
            height: auto;
            max-width: 100%;
          }

          .button-bg {
            background-color: white;
            padding: 4px;
            border-radius: 8px; 
          }
          @media (max-width: 768px) {
            body {
              background-attachment: scroll;
            }
            .logo {
              width: 200px;
            }
          }
        ` }} />

        <div className="content-wrapper px-4">
          <div className="max-w-md w-full mx-auto text-center">
            <div className="mb-12">
              <img 
                src="https://tauvafqeexmohlefyrdg.supabase.co/storage/v1/object/public/public/public/logo/cropped-st-1-sm.png" 
                alt="Logo" 
                className="logo mx-auto"
              />
            </div>

            <p className="text-xl md:text-2xl text-gray-700 mb-12 platform-text inline-block">
              Profesyonel Yatırım Platformu
            </p>

            <div className="space-y-4">
              <div className="button-bg inline-block">
                <button
                  onClick={() => window.loginClick?.()}
                  className="w-64 py-3 text-black bg-white border-2 font-semibold"
                >
                  <i className="fas fa-user mr-2"></i>Giriş Yap
                </button>
              </div>

              <div className="button-bg inline-block">
                <button
                  onClick={() => window.registerClick?.()}
                  className="w-64 py-3 text-black bg-white border-2 font-semibold"
                >
                  <i className="fas fa-rocket mr-2"></i>Hesap Aç
                </button>
              </div>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-12 sm:h-16">
            {/* Left side - empty on mobile, logo on desktop */}
            <div className="w-20 hidden sm:block">
              {settings.logo_url && (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  style={{
                    width: settings.logo_width,
                    height: settings.logo_height
                  }}
                  className="object-contain"
                />
              )}
            </div>

            {/* Center - logo on mobile */}
            <div className="flex-1 flex items-center justify-center sm:hidden">
              {settings.mobile_logo_url ? (
                <img
                  src={settings.mobile_logo_url}
                  alt="Logo"
                  style={{
                    width: settings.mobile_logo_width || 24,
                    height: settings.mobile_logo_height || 24
                  }}
                  className="object-contain"
                />
              ) : settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  style={{
                    width: settings.mobile_logo_width || 24,
                    height: settings.mobile_logo_height || 24
                  }}
                  className="object-contain"
                />
              ) : (
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-12 sm:pt-16 pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6">
          {activeTab === 'watchlist' && (
            <StockList 
              userBalance={profile?.balance || 0}
              onTradeComplete={refresh}
            />
          )}
          {activeTab === 'stocks' && (
            <StockList 
              userBalance={profile?.balance || 0}
              onTradeComplete={refresh}
            />
          )}
          {activeTab === 'portfolio' && (
            <PortfolioSection />
          )}
          {activeTab === 'profile' && (
            <ProfileSection />
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-around items-center h-14 sm:h-16 relative">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`flex flex-col items-center justify-center w-full py-1.5 ${
                activeTab === 'watchlist' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Star className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">Takip</span>
            </button>

            <button
              onClick={() => setActiveTab('stocks')}
              className={`flex flex-col items-center justify-center w-full py-1.5 ${
                activeTab === 'stocks' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Search className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">Hisseler</span>
            </button>

            <div className="relative flex items-center justify-center w-full -mt-6 sm:-mt-8">
              <button
                onClick={handlePlusClick}
                className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </button>
            </div>

            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex flex-col items-center justify-center w-full py-1.5 ${
                activeTab === 'portfolio' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <BarChart2 className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">Portföy</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center w-full py-1.5 ${
                activeTab === 'profile' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <User className="h-4 w-4 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">Profil</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stock Search Modal */}
      {showStockSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 w-full sm:w-[480px] sm:rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hisse Ara</h3>
              <button
                onClick={() => {
                  setShowStockSearch(false);
                  setSearchQuery('');
                  setStocks([]);
                  setShowAllStocks(false);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hisse adı veya kodu ile arayın..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div className="mt-4 max-h-[60vh] overflow-y-auto">
                {loadingStocks ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-md"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {!searchQuery && !showAllStocks && defaultStocks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Popüler Hisseler
                        </h4>
                        {defaultStocks.map((stock) => (
                          <StockItem
                            key={stock.symbol}
                            stock={stock}
                            onSelect={() => handleStockSelect(stock)}
                            onInfoClick={(e) => handleInfoClick(e, stock)}
                          />
                        ))}
                      </div>
                    )}

                    {(searchQuery || showAllStocks) && (
                      <div>
                        {stocks.map((stock) => (
                          <StockItem
                            key={stock.symbol}
                            stock={stock}
                            onSelect={() => handleStockSelect(stock)}
                            onInfoClick={(e) => handleInfoClick(e, stock)}
                          />
                        ))}
                        
                        {stocks.length === 0 && (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                            Hisse bulunamadı
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Panel */}
      {selectedStock && !showInfoModal && (
        <TradingPanel
          symbol={selectedStock.symbol}
          currentPrice={selectedStock.price}
          changePercentage={selectedStock.change_percentage}
          onClose={() => setSelectedStock(null)}
          onSuccess={handleTradeComplete}
          userBalance={profile?.balance || 0}
        />
      )}
    </div>
  );
}