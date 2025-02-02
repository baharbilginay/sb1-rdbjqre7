import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Check, X, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { useNotifications } from '../lib/notifications';

interface DepositReceipt {
  id: string;
  user_id: string;
  amount: number;
  account_holder: string;
  receipt_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  user: {
    unique_id: string;
    full_name: string;
    email: string;
  };
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function AdminDeposits() {
  const [receipts, setReceipts] = useState<DepositReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<DepositReceipt | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadReceipts();
  }, []);

  async function loadReceipts() {
    try {
      const { data, error } = await supabase
        .from('deposit_receipts')
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
      setReceipts(data || []);
    } catch (err) {
      console.error('Error loading deposit receipts:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Dekontlar yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (receipt: DepositReceipt) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase.rpc('approve_deposit_receipt', {
        receipt_id: receipt.id,
        admin_user_id: user.id
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Dekont onaylandı'
      });

      await loadReceipts();
    } catch (err) {
      console.error('Error approving receipt:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Dekont onaylanırken bir hata oluştu'
      });
    }
  };

  const handleReject = async (receipt: DepositReceipt) => {
    if (!rejectionReason) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Lütfen red sebebi girin'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase.rpc('reject_deposit_receipt', {
        receipt_id: receipt.id,
        admin_user_id: user.id,
        reason: rejectionReason
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Dekont reddedildi'
      });

      setRejectionReason('');
      setSelectedReceipt(null);
      await loadReceipts();
    } catch (err) {
      console.error('Error rejecting receipt:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Dekont reddedilirken bir hata oluştu'
      });
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.user.unique_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.account_holder.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' || 
      receipt.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Para Yatırma Dekontları
        </h2>
      </div>

      <div className="p-6">
        {/* Arama ve Filtreleme */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Kullanıcı ID, isim veya e-posta ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Filter className="h-4 w-4 mr-2" />
              {filterStatus === 'all' ? 'Tüm Dekontlar' : 
               filterStatus === 'pending' ? 'Bekleyen Dekontlar' :
               filterStatus === 'approved' ? 'Onaylanan Dekontlar' : 'Reddedilen Dekontlar'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {isFilterMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Tüm Dekontlar
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('pending');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Bekleyen Dekontlar
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('approved');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Onaylanan Dekontlar
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('rejected');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Reddedilen Dekontlar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dekontlar Listesi */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hesap Sahibi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {receipt.user.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {receipt.user.unique_id}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {receipt.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {receipt.account_holder}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(receipt.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      receipt.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : receipt.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {receipt.status === 'pending' ? 'Bekliyor' :
                       receipt.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(receipt.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <a
                        href={receipt.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                      {receipt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(receipt)}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setSelectedReceipt(receipt)}
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
              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Dekont bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Red Modalı */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Dekontu Reddet
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Red Sebebi
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Red sebebini yazın..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleReject(selectedReceipt)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Reddet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}