import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, X, Check, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { useNotifications } from '../lib/notifications';

interface Order {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  type: 'buy' | 'sell';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
}

interface EditingOrder {
  id: string;
  quantity: number;
}

export function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<EditingOrder | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadOrders();

    // Subscribe to order changes
    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_orders'
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pending_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Emirler yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Bu emri iptal etmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pending_orders')
        .delete()
        .eq('id', orderId)
        .eq('status', 'pending');

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Emir iptal edildi'
      });

      await loadOrders();
    } catch (err) {
      console.error('Error cancelling order:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Emir iptal edilirken bir hata oluştu'
      });
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;

    try {
      const { error } = await supabase
        .from('pending_orders')
        .update({
          quantity: editingOrder.quantity
        })
        .eq('id', editingOrder.id)
        .eq('status', 'pending');

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Emir güncellendi'
      });

      setEditingOrder(null);
      await loadOrders();
    } catch (err) {
      console.error('Error updating order:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Emir güncellenirken bir hata oluştu'
      });
    }
  };

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Aktif Emirlerim
        </h2>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Aktif emir bulunmuyor
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    {order.type === 'buy' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400 mr-2" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {order.symbol}
                    </span>
                    <span className={`ml-2 text-sm ${
                      order.type === 'buy' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {order.type === 'buy' ? 'Alış' : 'Satış'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {new Date(order.created_at).toLocaleString('tr-TR')}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    {editingOrder?.id === order.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editingOrder.quantity}
                          onChange={(e) => setEditingOrder({
                            ...editingOrder,
                            quantity: parseInt(e.target.value)
                          })}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          min="1"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Lot</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.quantity} Lot
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(order.price)}
                        </div>
                      </>
                    )}
                  </div>
                  {order.status === 'pending' && (
                    <div className="flex items-center space-x-2">
                      {editingOrder?.id === order.id ? (
                        <>
                          <button
                            onClick={handleUpdateOrder}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingOrder(null)}
                            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingOrder({
                              id: order.id,
                              quantity: order.quantity
                            })}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}