import { supabase } from './supabase';

// Veritabanından izlenen hisseleri getir
export async function getWatchedStocks() {
  try {
    const { data, error } = await supabase
      .from('watched_stocks')
      .select('*')
      .order('symbol');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching watched stocks:', error);
    return [];
  }
}

// Yeni hisse ekle
export async function addWatchedStock(symbol: string) {
  try {
    const { error } = await supabase
      .from('watched_stocks')
      .insert([{ symbol: symbol.toUpperCase() }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error adding watched stock:', error);
    throw error;
  }
}

// Hisse sil
export async function removeWatchedStock(symbol: string) {
  try {
    const { error } = await supabase
      .from('watched_stocks')
      .delete()
      .eq('symbol', symbol.toUpperCase());

    if (error) throw error;
  } catch (error) {
    console.error('Error removing watched stock:', error);
    throw error;
  }
}

// Hisse fiyatını güncelle
export async function updateStockPrice(symbol: string, price: number) {
  try {
    const { error } = await supabase
      .from('stock_prices')
      .update({ 
        price,
        updated_at: new Date().toISOString()
      })
      .eq('symbol', symbol);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating stock price:', error);
    throw error;
  }
}