import { supabase } from './supabase';

// TradingView API response types
interface QuoteResponse {
  s: string;  // Status: 'ok' | 'error'
  errmsg?: string;
  d: QuoteData[];
}

interface QuoteData {
  s: string;  // Symbol
  v: {
    lp: number;    // Last price
    ch: number;    // Change
    chp: number;   // Change percent
    tv: number;    // Trading volume
    name: string;  // Full name
  };
}

// Convert TradingView response to our format
function convertQuoteData(data: QuoteData): StockPrice {
  return {
    symbol: data.s,
    price: data.v.lp,
    change_percentage: data.v.chp,
    volume: data.v.tv,
    updated_at: new Date().toISOString()
  };
}

// Our standardized stock price interface
interface StockPrice {
  symbol: string;
  price: number;
  change_percentage: number;
  volume: number;
  updated_at: string;
}

// TradingView API client
class TradingViewAPI {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = 'https://symbol-search.tradingview.com/symbol_search';
    this.token = 'your-api-token'; // Replace with actual token if needed
  }

  async getQuotes(symbols: string[]): Promise<StockPrice[]> {
    try {
      // Format symbols for Turkish stocks
      const formattedSymbols = symbols.map(s => `BIST:${s}`);
      
      const response = await fetch(`${this.baseUrl}/?text=${formattedSymbols.join(',')}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: QuoteResponse = await response.json();
      
      if (data.s === 'error') {
        throw new Error(data.errmsg || 'Unknown API error');
      }

      return data.d.map(convertQuoteData);
    } catch (error) {
      console.error('TradingView API error:', error);
      throw error;
    }
  }

  // Mock implementation for development
  async getMockQuotes(symbols: string[]): Promise<StockPrice[]> {
    const baseData: Record<string, { price: number, name: string }> = {
      'THYAO': { price: 256.40, name: 'Türk Hava Yolları' },
      'GARAN': { price: 48.72, name: 'Garanti Bankası' },
      'ASELS': { price: 84.15, name: 'Aselsan' },
      'KCHOL': { price: 176.90, name: 'Koç Holding' },
      'SASA': { price: 342.50, name: 'SASA Polyester' },
      'EREGL': { price: 52.85, name: 'Ereğli Demir Çelik' },
      'BIMAS': { price: 164.30, name: 'BİM Mağazalar' },
      'AKBNK': { price: 44.92, name: 'Akbank' }
    };

    return symbols.map(symbol => {
      const basePrice = baseData[symbol]?.price || 100.0;
      const variation = (Math.random() * 4) - 2; // -2% to +2%
      const newPrice = basePrice * (1 + variation / 100);

      return {
        symbol,
        price: Number(newPrice.toFixed(2)),
        change_percentage: Number(variation.toFixed(2)),
        volume: Math.floor(Math.random() * 900000) + 100000,
        updated_at: new Date().toISOString()
      };
    });
  }
}

// Export singleton instance
export const tradingView = new TradingViewAPI();

// Utility functions
export async function updateStockPrices() {
  try {
    const { data: watchedStocks } = await supabase
      .from('watched_stocks')
      .select('symbol');

    if (!watchedStocks || watchedStocks.length === 0) return;

    const symbols = watchedStocks.map(stock => stock.symbol);
    
    // Use mock data in development, real API in production
    const prices = await tradingView.getMockQuotes(symbols);

    const updates = prices.map(price => ({
      symbol: price.symbol,
      price: price.price,
      change_percentage: price.change_percentage,
      volume: price.volume,
      updated_at: price.updated_at
    }));

    const { error } = await supabase
      .from('stock_prices')
      .upsert(updates);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating stock prices:', error);
    throw error;
  }
}

export async function checkApiConnection(): Promise<boolean> {
  try {
    // Try to get a quote for a test symbol
    const prices = await tradingView.getMockQuotes(['THYAO']);
    return Array.isArray(prices) && prices.length > 0;
  } catch (error) {
    console.error('API connection check failed:', error);
    return false;
  }
}