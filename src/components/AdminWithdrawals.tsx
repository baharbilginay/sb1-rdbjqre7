import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Check, X, AlertCircle, Bitcoin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { useNotifications } from '../lib/notifications';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  method: 'bank' | 'crypto';
  bank_name: string;
  account_holder: string;
  iban: string;
  crypto_address?: string;
  crypto_network?: string;
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

export function AdminWithdrawals() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
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
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading withdrawal requests:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Para çekme talepleri yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (request: WithdrawalRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase.rpc('approve_withdrawal', {
        request_id: request.id,
        admin_user_id: user.id
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Para çekme talebi onaylandı'
      });

      await loadRequests();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Para çekme talebi onaylanırken bir hata oluştu'
      });
    }
  };

  const handleReject = async (request: WithdrawalRequest) => {
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

      const { error } = await supabase.rpc('reject_withdrawal', {
        request_id: request.id,
        admin_user_id: user.id,
        reason: rejectionReason
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Para çekme talebi reddedildi'
      });

      setRejectionReason('');
      setSelectedRequest(null);
      await loadRequests();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Para çekme talebi reddedilirken bir hata oluştu'
      });
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.user.unique_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.method === 'bank' && (
        request.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.account_holder?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.iban?.toLowerCase().includes(searchQuery.toLowerCase())
      )) ||
      (request.method === 'crypto' && 
        request.crypto_address?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesFilter = 
      filterStatus === 'all' || 
      request.status === filterStatus;

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
          Para Çekme Talepleri
        </h2>
      </div>

      <div className="p-6">
        {/* Arama ve Filtreleme */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Kullanıcı ID, isim, e-posta veya hesap bilgisi ara..."
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
              {filterStatus === 'all' ? 'Tüm Talepler' : 
               filterStatus === 'pending' ? 'Bekleyen Talepler' :
               filterStatus === 'approved' ? 'Onaylanan Talepler' : 'Reddedilen Talepler'}
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
                    Tüm Talepler
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('pending');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Bekleyen Talepler
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('approved');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Onaylanan Talepler
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('rejected');
                      setIsFilterMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Reddedilen Talepler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Talepler Listesi */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Yöntem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hesap Bilgileri
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
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.user.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {request.user.unique_id}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {request.user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      request.method === 'bank'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {request.method === 'bank' ? (
                        'Havale/EFT'
                      ) : (
                        <div className="flex items-center">
                          <Bitcoin className="h-3 w-3 mr-1" />
                          USDT-TRC20
                        </div>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {request.method === 'bank' ? (
                        <>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {request.bank_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {request.account_holder}
                          </div>
                          <div className="text-sm font-mono text-gray-900 dark:text-white">
                            {request.iban}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm font-mono text-gray-900 dark:text-white">
                          {request.crypto_address}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(request.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      request.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : request.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {request.status === 'pending' ? 'Bekliyor' :
                       request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(request.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {request.status === 'pending' && (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleApprove(request)}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Para çekme talebi bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Red Modalı */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Para Çekme Talebini Reddet
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
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleReject(selectedRequest)}
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