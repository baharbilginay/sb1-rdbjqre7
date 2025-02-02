import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { addWatchedStock, removeWatchedStock } from '../lib/stocks';

interface StockManagementProps {
  watchedStocks: Array<{ symbol: string; }>;
  onStocksChange: () => void;
}

export function StockManagement({ watchedStocks, onStocksChange }: StockManagementProps) {
  const [newSymbol, setNewSymbol] = useState('');
  const [error, setError] = useState('');

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newSymbol) {
      setError('Lütfen bir fon kodu girin');
      return;
    }

    try {
      await addWatchedStock(newSymbol);
      setNewSymbol('');
      onStocksChange();
    } catch (err) {
      setError('Fon eklenirken bir hata oluştu');
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    try {
      await removeWatchedStock(symbol);
      onStocksChange();
    } catch (err) {
      setError('Fon silinirken bir hata oluştu');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">İzlenen Fonlar</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleAddStock} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="Fon kodu"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ekle
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {watchedStocks.map((stock) => (
          <div
            key={stock.symbol}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
          >
            <span className="font-medium">{stock.symbol}</span>
            <button
              onClick={() => handleRemoveStock(stock.symbol)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {watchedStocks.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Henüz izlenen fon bulunmuyor
          </p>
        )}
      </div>
    </div>
  );
}