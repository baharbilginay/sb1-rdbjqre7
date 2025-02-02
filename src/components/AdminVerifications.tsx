import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

interface Verification {
  id: string;
  user_id: string;
  front_image_url: string;
  back_image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  user: {
    unique_id: string;
    full_name: string;
    email: string;
  };
}

export function AdminVerifications() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('identity_verifications')
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
      setVerifications(data || []);
    } catch (err) {
      console.error('Error loading verifications:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kimlik doğrulama başvuruları yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (verification: Verification) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase.rpc('approve_identity_verification', {
        admin_user_id: user.id,
        verification_id: verification.id
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Kimlik doğrulama başvurusu onaylandı'
      });

      await loadVerifications();
    } catch (err) {
      console.error('Error approving verification:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kimlik doğrulama başvurusu onaylanırken bir hata oluştu'
      });
    }
  };

  const handleReject = async (verification: Verification) => {
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

      const { error } = await supabase.rpc('reject_identity_verification', {
        admin_user_id: user.id,
        verification_id: verification.id,
        reason: rejectionReason
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Kimlik doğrulama başvurusu reddedildi'
      });

      setRejectionReason('');
      setSelectedVerification(null);
      await loadVerifications();
    } catch (err) {
      console.error('Error rejecting verification:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kimlik doğrulama başvurusu reddedilirken bir hata oluştu'
      });
    }
  };

  const filteredVerifications = verifications.filter(v => 
    v.user.unique_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.user.email.toLowerCase().includes(searchQuery.toLowerCase())
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
            Kimlik Doğrulama Başvuruları
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Kullanıcı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Başvuru Tarihi
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredVerifications.map((verification) => (
              <tr key={verification.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {verification.user.full_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {verification.user.unique_id}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {verification.user.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    verification.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : verification.status === 'approved'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {verification.status === 'pending' ? 'Bekliyor' :
                     verification.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(verification.created_at).toLocaleString('tr-TR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => setSelectedVerification(verification)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {verification.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(verification)}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setSelectedVerification(verification)}
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
            {filteredVerifications.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Kimlik doğrulama başvurusu bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Verification Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Kimlik Doğrulama Detayları
              </h3>
              <button
                onClick={() => {
                  setSelectedVerification(null);
                  setRejectionReason('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kullanıcı Bilgileri
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedVerification.user.full_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedVerification.user.unique_id}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedVerification.user.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ön Yüz
                  </h4>
                  <img
                    src={selectedVerification.front_image_url}
                    alt="Kimlik Ön Yüz"
                    className="w-full rounded-md"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Arka Yüz
                  </h4>
                  <img
                    src={selectedVerification.back_image_url}
                    alt="Kimlik Arka Yüz"
                    className="w-full rounded-md"
                  />
                </div>
              </div>

              {selectedVerification.status === 'pending' && (
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
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => handleApprove(selectedVerification)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => handleReject(selectedVerification)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}