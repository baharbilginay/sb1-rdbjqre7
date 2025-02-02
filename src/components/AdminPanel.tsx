import React, { useState, useEffect } from 'react';
import { 
  Users, Settings, LogOut, Activity, Clock, FileText, Bell, UserCheck, Ban as Bank, 
  ArrowDownToLine, Upload, Code, TrendingUp, BarChart2, Home, Package
} from 'lucide-react';
import { AdminPortfolios } from './AdminPortfolios';
import { AdminTransactions } from './AdminTransactions';
import { AdminVerifications } from './AdminVerifications';
import { AdminBankAccounts } from './AdminBankAccounts';
import { AdminWithdrawals } from './AdminWithdrawals';
import { AdminDeposits } from './AdminDeposits';
import { AdminSettings } from './AdminSettings';
import { AdminManualProducts } from './AdminManualProducts';
import { AdminStockManagement } from './AdminStockManagement';
import { AdminReports } from './AdminReports';
import { AdminHomePage } from './AdminHomePage';
import { supabase } from '../lib/supabase';
import { ThemeToggle } from './ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';
import { AdminActiveOrders } from './AdminActiveOrders';

type MenuItem = 'dashboard' | 'users' | 'stocks' | 'transactions' | 'verifications' | 'bank-accounts' | 'withdrawals' | 'deposits' | 'reports' | 'settings' | 'customization' | 'home' | 'manual_products';

export function AdminPanel() {
  const [activeMenu, setActiveMenu] = useState<MenuItem>('dashboard');
  const [notifications] = useState(3);
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdmin();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'home', label: 'Ana Sayfa', icon: Home },
    { id: 'users', label: 'Kullanıcılar', icon: Users },
    { id: 'stocks', label: 'Otomatik Hisseler', icon: TrendingUp },
    { id: 'manual_products', label: 'Manuel Ürünler', icon: Package },
    { id: 'transactions', label: 'İşlemler', icon: Activity },
    { id: 'deposits', label: 'Para Yatırma', icon: Upload },
    { id: 'withdrawals', label: 'Para Çekme', icon: ArrowDownToLine },
    { id: 'verifications', label: 'Kimlik Doğrulama', icon: UserCheck },
    { id: 'bank-accounts', label: 'Banka Hesapları', icon: Bank },
    { id: 'reports', label: 'Raporlar', icon: BarChart2 },
    { id: 'settings', label: 'Ayarlar', icon: Settings }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <AdminActiveOrders />;
      case 'home':
        return <AdminHomePage />;
      case 'users':
        return <AdminPortfolios />;
      case 'stocks':
        return <AdminStockManagement />;
      case 'manual_products':
        return <AdminManualProducts />;
      case 'transactions':
        return <AdminTransactions />;
      case 'verifications':
        return <AdminVerifications />;
      case 'bank-accounts':
        return <AdminBankAccounts />;
      case 'withdrawals':
        return <AdminWithdrawals />;
      case 'deposits':
        return <AdminDeposits />;
      case 'settings':
        return <AdminSettings />;
      case 'reports':
        return <AdminReports />;
      default:
        return (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {menuItems.find(item => item.id === activeMenu)?.label}
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Bu bölüm yapım aşamasındadır.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <BarChart2 className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">BorsaTR Admin</span>
        </div>
        
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id as MenuItem)}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                  activeMenu === item.id
                    ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Navigation */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {menuItems.find(item => item.id === activeMenu)?.label}
          </h1>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />

            <button className="relative p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400">
              <Bell className="h-6 w-6" />
              {notifications > 0 && (
                <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>

            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-1" />
              <span>{new Date().toLocaleTimeString('tr-TR')}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}