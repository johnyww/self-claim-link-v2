'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import { Product, Order } from '@/lib/types';

// Utility function to format dates as DD/MM/YYYY
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUsername, setAdminUsername] = useState<string>('');

  const fetchAdminInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdminUsername(data.data?.username || data.username);
        
        // Check if password change is required
        if (data.data?.mustChangePassword) {
          // Redirect back to login for password change
          localStorage.removeItem('adminToken');
          router.push('/admin/login');
          return;
        }
      } else if (response.status === 401) {
        // Token is invalid, redirect to login
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
        return;
      }
    } catch (error) {
      console.error('Failed to fetch admin info:', error);
      localStorage.removeItem('adminToken');
      router.push('/admin/login');
    }
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders')
      ]);
      
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      
      setProducts(productsData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    setIsAuthenticated(true);
    fetchAdminInfo();
    fetchData();
  }, [router, fetchAdminInfo, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-primary-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                {adminUsername && (
                  <p className="text-sm text-gray-600">Welcome, {adminUsername}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShoppingCart className="w-5 h-5 inline mr-2" />
              Orders
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Products
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-5 h-5 inline mr-2" />
              Settings
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'orders' && (
          <OrdersTab orders={orders} products={products} onRefresh={fetchData} />
        )}
        {activeTab === 'products' && (
          <ProductsTab products={products} onRefresh={fetchData} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </div>
    </div>
  );
}

function OrdersTab({ orders, products, onRefresh }: { orders: Order[], products: Product[], onRefresh: () => void }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [formData, setFormData] = useState({
    order_id: '',
    product_ids: [] as number[],
    expiration_days: 7,
    one_time_use: true
  });

  // Fetch settings when component mounts
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      const fetchedSettings = data.settings || {};
      setSettings(fetchedSettings);
      
      // Update form defaults with current settings
      setFormData(prev => ({
        ...prev,
        expiration_days: parseInt(fetchedSettings.default_expiration_days) || 7,
        one_time_use: fetchedSettings.one_time_use_enabled === 'true'
      }));
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const getDefaultFormData = () => ({
    order_id: '',
    product_ids: [] as number[],
    expiration_days: parseInt(settings.default_expiration_days) || 7,
    one_time_use: settings.one_time_use_enabled === 'true'
  });

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowCreateForm(false);
        setFormData(getDefaultFormData());
        onRefresh();
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    
    const requestData = {
      id: editingOrder.id,
      ...formData
    };
    

    
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        setEditingOrder(null);
        setFormData(getDefaultFormData());
        onRefresh();
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const startEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      order_id: order.order_id,
      product_ids: order.products ? order.products.map((p: any) => p.id) : [],
      expiration_days: order.expiration_date ? Math.ceil((new Date(order.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 7,
      one_time_use: Boolean(order.one_time_use) // Convert integer 0/1 to boolean
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Orders</h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </button>
        </div>
      </div>

      {/* Create/Edit Order Form */}
      {(showCreateForm || editingOrder) && (
        <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
            {editingOrder ? `Edit Order: ${editingOrder.order_id}` : 'Create New Order'}
          </h3>
          <form onSubmit={editingOrder ? handleEditOrder : handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order ID
                </label>
                <input
                  type="text"
                  value={formData.order_id}
                  onChange={(e) => setFormData({...formData, order_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Products {products.length === 0 && <span className="text-red-500">(No products available - create products first)</span>}
                </label>
                {products.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    No products available. Please create products first in the Products tab.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
                    {products.map(product => (
                      <label key={product.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.product_ids.includes(product.id)}
                          onChange={(e) => {
                            const productId = product.id;
                            if (e.target.checked) {
                              setFormData({...formData, product_ids: [...formData.product_ids, productId]});
                            } else {
                              setFormData({...formData, product_ids: formData.product_ids.filter(id => id !== productId)});
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900">{product.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {products.length > 0 ? 'Check the products you want to include in this order' : 'Create products in the Products tab first'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration (days)
                </label>
                <input
                  type="number"
                  value={formData.expiration_days}
                  onChange={(e) => setFormData({...formData, expiration_days: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  One-time use
                </label>
                <select
                  value={formData.one_time_use.toString()}
                  onChange={(e) => setFormData({...formData, one_time_use: e.target.value === 'true'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingOrder ? 'Update Order' : 'Create Order'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingOrder(null);
                  setFormData({ order_id: '', product_ids: [], expiration_days: 7, one_time_use: true });
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Products
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Claim Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(orders || []).map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.order_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.products ? order.products.map((p: any) => p.name).join(', ') : 'No products'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.claim_status === 'claimed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.claim_status === 'claimed' ? (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-1" />
                    )}
                    {order.claim_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.claim_count || 0} time{(order.claim_count || 0) !== 1 ? 's' : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.expiration_date 
                    ? formatDate(order.expiration_date)
                    : 'No expiration'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(order)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductsTab({ products, onRefresh }: { products: Product[], onRefresh: () => void }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    download_link: '',
    image_url: ''
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowCreateForm(false);
        setFormData({ name: '', description: '', download_link: '', image_url: '' });
        onRefresh();
      }
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          ...formData
        })
      });
      
      if (response.ok) {
        setEditingProduct(null);
        setFormData({ name: '', description: '', download_link: '', image_url: '' });
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      download_link: product.download_link,
      image_url: product.image_url || ''
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Create/Edit Product Form */}
      {(showCreateForm || editingProduct) && (
        <div className="bg-white rounded-lg shadow-lg border-2 border-green-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 bg-green-50 p-3 rounded-md border-l-4 border-green-500">
            {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
          </h3>
          <form onSubmit={editingProduct ? handleEditProduct : handleCreateProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Download Link
              </label>
              <input
                type="url"
                value={formData.download_link}
                onChange={(e) => setFormData({...formData, download_link: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500"
                placeholder="https://example.com/file.zip"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingProduct(null);
                  setFormData({ name: '', description: '', download_link: '', image_url: '' });
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
            {product.image_url && (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {product.name}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => startEdit(product)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {product.description && (
                <p className="text-gray-600 text-sm mb-4">
                  {product.description}
                </p>
              )}
              <div className="flex items-center text-sm text-gray-500">
                <Package className="w-4 h-4 mr-1" />
                1 download link
              </div>
              <div className="mt-2">
                <a 
                  href={product.download_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 text-sm break-all"
                >
                  {product.download_link}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<any>({});
  const [tempSettings, setTempSettings] = useState<any>({});
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState<number | null>(null);
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data.settings || {});
      setTempSettings(data.settings || {});
      setAdmins(data.admins || []);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTempSettingsChange = (newSettings: any) => {
    setTempSettings({ ...tempSettings, ...newSettings });
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          settings: tempSettings
        })
      });

      if (response.ok) {
        setSettings({ ...tempSettings });
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    setTempSettings({ ...settings });
    setHasUnsavedChanges(false);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_admin',
          username: adminForm.username,
          password: adminForm.password
        })
      });

      if (response.ok) {
        setShowCreateAdmin(false);
        setAdminForm({ username: '', password: '' });
        fetchSettings();
      }
    } catch (error) {
      console.error('Error creating admin:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent, adminId: number) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_admin_password',
          adminId,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setShowPasswordChange(null);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Error updating password:', error);
    }
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (!confirm('Are you sure you want to delete this admin account?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'delete_admin',
          adminId
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // If the user deleted their own account, log them out immediately
        if (result.selfDeletion) {
          alert('You have deleted your own admin account. You will be logged out.');
          localStorage.removeItem('adminToken');
          window.location.href = '/admin/login';
          return;
        }
        
        fetchSettings();
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Default Expiration Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Expiration Period (days)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="1"
                max="365"
                value={tempSettings.default_expiration_days || 7}
                onChange={(e) => {
                  const newValue = e.target.value;
                  handleTempSettingsChange({ default_expiration_days: newValue });
                }}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
              />
              <span className="text-sm text-gray-500">
                Orders will expire after this many days by default
              </span>
            </div>
          </div>

          {/* One-time Use Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              One-time Use Policy
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="one_time_use"
                  checked={tempSettings.one_time_use_enabled === 'true'}
                  onChange={() => handleTempSettingsChange({ one_time_use_enabled: 'true' })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Enabled - Orders can only be claimed once
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="one_time_use"
                  checked={tempSettings.one_time_use_enabled === 'false'}
                  onChange={() => handleTempSettingsChange({ one_time_use_enabled: 'false' })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Disabled - Orders can be claimed multiple times
                </span>
              </label>
            </div>
          </div>

          {/* Save/Reset Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleResetSettings}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Admin Account Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Admin Account Management</h3>
          <button
            onClick={() => setShowCreateAdmin(true)}
            className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Admin
          </button>
        </div>
        <div className="p-6">
          {/* Create Admin Form */}
          {showCreateAdmin && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-md font-medium text-gray-900 mb-4">Create New Admin</h4>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
                  >
                    Create Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAdmin(false);
                      setAdminForm({ username: '', password: '' });
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admin List */}
          <div className="space-y-4">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{admin.username}</h4>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(admin.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowPasswordChange(admin.id)}
                    className="text-blue-600 hover:text-blue-900 px-3 py-1 text-sm border border-blue-300 rounded"
                  >
                    Change Password
                  </button>
                  {admins.length > 1 && (
                    <button
                      onClick={() => handleDeleteAdmin(admin.id)}
                      className="text-red-600 hover:text-red-900 px-3 py-1 text-sm border border-red-300 rounded"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Password Change Form */}
          {showPasswordChange && (
            <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Change Password for {admins.find(admin => admin.id === showPasswordChange)?.username}
              </h4>
              <form onSubmit={(e) => handlePasswordChange(e, showPasswordChange)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600"
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(null);
                      setPasswordForm({ newPassword: '', confirmPassword: '' });
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Information</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Current Settings</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Default Expiration: {settings.default_expiration_days || 7} days</li>
                <li>One-time Use: {settings.one_time_use_enabled === 'true' ? 'Enabled' : 'Disabled'}</li>
                <li>Total Admins: {admins.length}</li>
              </ul>
              {hasUnsavedChanges && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <h5 className="font-medium text-yellow-800 text-sm mb-1">Pending Changes:</h5>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    {tempSettings.default_expiration_days !== settings.default_expiration_days && (
                      <li>• Expiration: {tempSettings.default_expiration_days || 7} days</li>
                    )}
                    {tempSettings.one_time_use_enabled !== settings.one_time_use_enabled && (
                      <li>• One-time Use: {tempSettings.one_time_use_enabled === 'true' ? 'Enabled' : 'Disabled'}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">System Status</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Database: Connected</li>
                <li>API: Operational</li>
                <li>Last Updated: {new Date().toLocaleString()}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Saving settings...
        </div>
      )}
    </div>
  );
}
