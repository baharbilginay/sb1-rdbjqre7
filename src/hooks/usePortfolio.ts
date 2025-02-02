import { useState, useEffect, useCallback } from 'react';
import { supabase, channelManager } from '../lib/supabase';

interface PortfolioItem {
  id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPortfolio([]);
        return;
      }

      // Get portfolio items with current prices
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          stock:stocks!inner(
            symbol,
            stock_prices(
              price
            )
          )
        `)
        .eq('user_id', user.id);

      if (portfolioError) throw portfolioError;

      // Calculate portfolio values
      const enrichedPortfolio = portfolioData.map(item => {
        const currentPrice = item.stock.stock_prices?.[0]?.price || item.average_price;
        const currentValue = item.quantity * currentPrice;
        const profitLoss = currentValue - (item.quantity * item.average_price);
        const profitLossPercentage = ((currentPrice - item.average_price) / item.average_price) * 100;

        return {
          id: item.id,
          symbol: item.symbol,
          quantity: item.quantity,
          average_price: item.average_price,
          current_price: currentPrice,
          current_value: currentValue,
          profit_loss: profitLoss,
          profit_loss_percentage: profitLossPercentage
        };
      });

      setPortfolio(enrichedPortfolio);
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError(err instanceof Error ? err.message : 'Portföy yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let userId: string | null = null;

    const setupSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      userId = user.id;
      const subscriptionId = `portfolio-${user.id}`;

      // Portfolio changes
      const portfolioChannel = channelManager.getChannel('portfolio-changes', subscriptionId);
      portfolioChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'portfolio_items',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            if (isMounted) loadPortfolio();
          }
        )
        .subscribe();

      // Price changes
      const pricesChannel = channelManager.getChannel('price-changes', subscriptionId);
      pricesChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stock_prices'
          },
          () => {
            if (isMounted) loadPortfolio();
          }
        )
        .subscribe();
    };

    loadPortfolio();
    setupSubscriptions();

    return () => {
      isMounted = false;
      if (userId) {
        const subscriptionId = `portfolio-${userId}`;
        channelManager.removeSubscription('portfolio-changes', subscriptionId);
        channelManager.removeSubscription('price-changes', subscriptionId);
      }
    };
  }, [loadPortfolio]);

  return { 
    portfolio, 
    isLoading,
    error,
    refresh: loadPortfolio 
  };
}