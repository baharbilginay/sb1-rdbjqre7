import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

interface WatchlistButtonProps {
  symbol: string;
  className?: string;
}

export function WatchlistButton({ symbol, className = '' }: WatchlistButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const { addNotification } = useNotifications();

  // Check if stock is in watchlist on mount
  React.useEffect(() => {
    const checkWatchlist = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .maybeSingle();

      setIsWatched(!!data);
    };

    checkWatchlist();

    // Subscribe to watchlist changes
    const channel = supabase
      .channel('watchlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlist'
        },
        () => {
          checkWatchlist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Takip listesini kullanmak için giriş yapmalısınız'
      });
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      if (isWatched) {
        // Remove from watchlist
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('symbol', symbol);

        if (error) throw error;

        addNotification({
          type: 'success',
          title: 'Başarılı',
          message: 'Hisse takip listesinden çıkarıldı'
        });
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from('watchlist')
          .insert({ user_id: user.id, symbol });

        if (error) {
          if (error.code === '23505') {
            addNotification({
              type: 'info',
              title: 'Bilgi',
              message: 'Bu hisse zaten takip listenizde'
            });
            return;
          }
          throw error;
        }

        addNotification({
          type: 'success',
          title: 'Başarılı',
          message: 'Hisse takip listesine eklendi'
        });
      }

      setIsWatched(!isWatched);
    } catch (err) {
      console.error('Error toggling watchlist:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: isWatched ? 
          'Hisse takipten çıkarılırken bir hata oluştu' : 
          'Hisse takip listesine eklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      title={isWatched ? 'Takipten çıkar' : 'Takip et'}
    >
      <Star
        className={`h-4 w-4 ${
          loading ? 'animate-pulse' : ''
        } ${
          isWatched
            ? 'text-yellow-500 dark:text-yellow-400 fill-current'
            : 'text-gray-400 dark:text-gray-500'
        }`}
      />
    </button>
  );
}