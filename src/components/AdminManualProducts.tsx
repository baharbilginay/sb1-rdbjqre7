import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Image, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';
import { formatCurrency } from '../utils/format';

interface ManualProduct {
  id: string;
  symbol: string;
  name: string;
  description: string;
  price: number;
  change_percentage: number;
  logo_url: string;
  is_active: boolean;
  created_at: string;
}

interface EditingProduct extends Omit<ManualProduct, 'created_at'> {}

export function AdminManualProducts() {
  const [products, setProducts] = useState<ManualProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    symbol: '',
    name: '',
    description: '',
    price: 0,
    change_percentage: 0,
    logo_url: '',
    is_active: true
  });
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .eq('is_automated', false)
        .order('symbol');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Ürünler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { error } = await supabase
        .from('stocks')
        .insert([{
          ...newProduct,
          is_automated: false
        }]);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Ürün başarıyla eklendi'
      });

      setShowAddForm(false);
      setNewProduct({
        symbol: '',
        name: '',
        description: '',
        price: 0,
        change_percentage: 0,
        logo_url: '',
        is_active: true
      });
      await loadProducts();
    } catch (err) {
      console.error('Error adding product:', err);
      setError('Ürün eklenirken bir hata oluştu');
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('stocks')
        .update({
          name: editingProduct.name,
          description: editingProduct.description,
          logo_url: editingProduct.logo_url,
          is_active: editingProduct.is_active
        })
        .eq('symbol', editingProduct.symbol);

      if (error) throw error;

      // Update price
      const { error: priceError } = await supabase
        .from('stock_prices')
        .upsert({
          symbol: editingProduct.symbol,
          price: editingProduct.price,
          change_percentage: editingProduct.change_percentage
        });

      if (priceError) throw priceError;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Ürün güncellendi'
      });

      setEditingProduct(null);
      await loadProducts();
    } catch (err) {
      console.error('Error updating product:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Ürün güncellenirken bir hata oluştu'
      });
    }
  };

  const handleDeleteProduct = async (symbol: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stocks')
        .delete()
        .eq('symbol', symbol);

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Ürün silindi'
      });

      await loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Ürün silinirken bir hata oluştu'
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manuel Ürün Yönetimi
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ürün Ekle
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/50 border-b border-red-200 dark:border-red-800">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Logo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Sembol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                İsim
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Fiyat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Değişim %
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {products.map((product) => (
              <tr key={product.symbol}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct?.symbol === product.symbol ? (
                    <input
                      type="text"
                      value={editingProduct.logo_url}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        logo_url: e.target.value
                      })}
                      className="w-48 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Logo URL"
                    />
                  ) : product.logo_url ? (
                    <img
                      src={product.logo_url}
                      alt={`${product.symbol} logo`}
                      className="h-10 w-10 rounded-full object-cover bg-white shadow-sm border border-gray-200 dark:border-gray-600 p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${product.symbol}&background=f3f4f6&color=6b7280&rounded=true&bold=true&size=64`;
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      <Image className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {product.symbol}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct?.symbol === product.symbol ? (
                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        name: e.target.value
                      })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  ) : (
                    <span className="text-gray-900 dark:text-white">
                      {product.name}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct?.symbol === product.symbol ? (
                    <input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        price: parseFloat(e.target.value)
                      })}
                      className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(product.price)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct?.symbol === product.symbol ? (
                    <input
                      type="number"
                      value={editingProduct.change_percentage}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        change_percentage: parseFloat(e.target.value)
                      })}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      step="0.01"
                    />
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.change_percentage >= 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {product.change_percentage >= 0 ? '+' : ''}
                      {product.change_percentage.toFixed(2)}%
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct?.symbol === product.symbol ? (
                    <select
                      value={editingProduct.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        is_active: e.target.value === 'active'
                      })}
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Pasif</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {product.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {editingProduct?.symbol === product.symbol ? (
                      <>
                        <button
                          onClick={handleUpdateProduct}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.symbol)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Yeni Ürün Ekle
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sembol
                  </label>
                  <input
                    type="text"
                    value={newProduct.symbol}
                    onChange={(e) => setNewProduct({ ...newProduct, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    İsim
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fiyat
                  </label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Değişim %
                  </label>
                  <input
                    type="number"
                    value={newProduct.change_percentage}
                    onChange={(e) => setNewProduct({ ...newProduct, change_percentage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="text"
                    value={newProduct.logo_url}
                    onChange={(e) => setNewProduct({ ...newProduct, logo_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Durum
                  </label>
                  <select
                    value={newProduct.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setNewProduct({ ...newProduct, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="HTML içeriği yazabilirsiniz"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}