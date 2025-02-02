import React, { useState, useEffect } from 'react';
import { Bell, ArrowUp, ArrowDown, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';
import { formatCurrency } from '../utils/format';

interface PriceAlert {
  id: string;
  symbol: string;
  target_price: number;
  condition: 'above' | 'below';
  is_triggered: boolean;
  created_at: string;
}

export function PriceAlertsList() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadAlerts();
    subscribeToAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error('Error loading alerts:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fiyat alarmları yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel('price-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_alerts'
        },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Fiyat alarmı silindi'
      });

      setAlerts(prev => prev.filter(alert => alert.id !== id));
    } catch (err) {
      console.error('Error deleting alert:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fiyat alarmı silinirken bir hata oluştu'
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <Bell className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Fiyat Alarmı Bulunmuyor
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Henüz fiyat alarmı oluşturmadınız. Hisse detaylarında çan ikonuna tıklayarak alarm ekleyebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Fiyat Alarmları
            </h3>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 ${
                alert.is_triggered
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {alert.symbol}
                    </span>
                    {alert.is_triggered && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Tetiklendi
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center text-sm">
                    {alert.condition === 'above' ? (
                      <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className="text-gray-600 dark:text-gray-400">
                      {alert.condition === 'above' ? 'Yükselince' : 'Düşünce'}{' '}
                      {formatCurrency(alert.target_price)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(alert.id)}
                  className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}