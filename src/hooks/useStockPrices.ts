import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface StockPrice {
  symbol: string;
  price: number;
  change_percentage: number;
  volume: number;
  updated_at: string;
}

export function useStockPrices() {
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrices();

    // Her 5 dakikada bir fiyatları güncelle
    const interval = setInterval(loadPrices, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadPrices() {
    try {
      const { data, error } = await supabase
        .from('stock_prices')
        .select('*')
        .order('symbol');

      if (error) throw error;

      setPrices(data);
    } catch (error) {
      console.error('Error loading stock prices:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return { prices, isLoading, refresh: loadPrices };
}