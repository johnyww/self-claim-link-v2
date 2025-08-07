'use client';

import { useState } from 'react';
import { Package, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { ClaimResponse } from '@/lib/types';

export default function Home() {
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClaimResponse | null>(null);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: orderId.trim() }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 text-white rounded-full mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Claim Your Product
            </h1>
            <p className="text-gray-600">
              Enter your order ID to claim your virtual product
            </p>
          </div>

          {/* Claim Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID
                </label>
                <input
                  type="text"
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter your Shopee order ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !orderId.trim()}
                className="w-full bg-primary-500 text-white py-2 px-4 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Claiming...' : 'Claim Product'}
              </button>
            </form>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-4 ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  
                  {result.success && result.product && (
                    <div className="mt-4 space-y-3">
                      <div className="bg-white rounded-md p-3">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {result.product.name}
                        </h3>
                        {result.product.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {result.product.description}
                          </p>
                        )}
                        
                        {result.download_links && result.download_links.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Download Links:</p>
                            {result.download_links.map((link, index) => (
                              <a
                                key={index}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-full bg-primary-500 text-white py-2 px-3 rounded-md hover:bg-primary-600 transition-colors text-sm"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download {result.download_links!.length > 1 ? `#${index + 1}` : ''}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
