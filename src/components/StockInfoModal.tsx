import React from 'react';
import { X } from 'lucide-react';

interface Stock {
  symbol: string;
  full_name?: string;
  description?: string;
}

interface StockInfoModalProps {
  stock: Stock;
  onClose: () => void;
}

export function StockInfoModal({ stock, onClose }: StockInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {stock.symbol}
        </h2>
        
        {stock.full_name && (
          <h3 className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            {stock.full_name}
          </h3>
        )}

        <div className="prose dark:prose-invert max-w-none">
          {stock.description ? (
            <div dangerouslySetInnerHTML={{ __html: stock.description }} />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">
              Bu fon için henüz detaylı bilgi girilmemiş.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}