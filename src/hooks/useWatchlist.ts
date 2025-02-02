import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

interface WatchlistItem {
  symbol: string;
  price: number;
  change_percentage: number;
  full_name?: string;
  description?: string;
  logo_url?: string;
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  const loadWatchlist = useCallback(async () => {
    try {
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWatchlist([]);
        setLoading(false);
        return;
      }

      // First get the watchlist items
      const { data: watchlistData, error: watchlistError } = await supabase
        .from('watchlist')
        .select('symbol')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (watchlistError) throw watchlistError;

      if (!watchlistData || watchlistData.length === 0) {
        setWatchlist([]);
        setLoading(false);
        return;
      }

      // Get the symbols
      const symbols = watchlistData.map(item => item.symbol);

      // Then get stock details and prices in a single query
      const { data: stocksData, error: stocksError } = await supabase
        .from('stocks')
        .select(`
          symbol,
          full_name,
          description,
          logo_url,
          stock_prices!inner (
            price,
            change_percentage
          )
        `)
        .in('symbol', symbols)
        .eq('is_active', true);

      if (stocksError) throw stocksError;

      // Transform data into the expected format
      const transformedData = stocksData?.map(stock => ({
        symbol: stock.symbol,
        full_name: stock.full_name,
        description: stock.description,
        logo_url: stock.logo_url,
        price: stock.stock_prices.price,
        change_percentage: stock.stock_prices.change_percentage
      })) || [];

      // Sort by watchlist order
      const sortedData = transformedData.sort((a, b) => {
        const aIndex = symbols.indexOf(a.symbol);
        const bIndex = symbols.indexOf(b.symbol);
        return aIndex - bIndex;
      });

      setWatchlist(sortedData);
    } catch (err) {
      console.error('Error loading watchlist:', err);
      setError('Takip listesi yüklenirken bir hata oluştu');
      setWatchlist([]);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const addToWatchlist = async (symbol: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Oturum açmanız gerekiyor'
        });
        return;
      }

      // Check if stock exists and is active
      const { data: stockData, error: stockError } = await supabase
        .from('stocks')
        .select('symbol')
        .eq('symbol', symbol)
        .eq('is_active', true)
        .single();

      if (stockError || !stockData) {
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Hisse bulunamadı veya aktif değil'
        });
        return;
      }

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

      await loadWatchlist();
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Hisse takip listesine eklenirken bir hata oluştu'
      });
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Oturum açmanız gerekiyor'
        });
        return;
      }

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

      setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Hisse takip listesinden çıkarılırken bir hata oluştu'
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    loadWatchlist();

    // Subscribe to watchlist changes
    const watchlistChannel = supabase
      .channel('watchlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlist',
          filter: `user_id=eq.${supabase.auth.getUser().then(({ data }) => data.user?.id)}`
        },
        () => {
          if (mounted) loadWatchlist();
        }
      )
      .subscribe();

    // Subscribe to price changes
    const priceChannel = supabase
      .channel('price-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stock_prices'
        },
        () => {
          if (mounted) loadWatchlist();
        }
      )
      .subscribe();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (mounted) loadWatchlist();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(watchlistChannel);
      supabase.removeChannel(priceChannel);
    };
  }, [loadWatchlist]);

  return {
    watchlist,
    loading,
    error,
    refresh: loadWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isWatched: useCallback((symbol: string) => 
      watchlist.some(item => item.symbol === symbol), [watchlist])
  };
}