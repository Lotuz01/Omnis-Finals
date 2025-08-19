'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
}

interface Movement {
  id: number;
  type: 'entrada' | 'saida';
  quantity: number;
  reason: string;
  created_at: string;
  product_name: string;
  user_name: string;
}

const MovementsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [newMovement, setNewMovement] = useState({
    product_id: '',
    type: 'entrada' as 'entrada' | 'saida',
    quantity: '',
    reason: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch products: ${errorMessage}`);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await fetch('/api/movements');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      // A API retorna { movements: [...], pagination: {...} }
      setMovements(result.movements || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch movements: ${errorMessage}`);
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(newMovement.product_id),
          type: newMovement.type,
          quantity: parseInt(newMovement.quantity),
          reason: newMovement.reason
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      setMessage(`Movimentação registrada com sucesso! Novo estoque: ${data.newStock}`);
      setNewMovement({
        product_id: '',
        type: 'entrada',
        quantity: '',
        reason: ''
      });
      fetchProducts();
      fetchMovements();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create movement: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getSelectedProduct = () => {
    return products.find(p => p.id === parseInt(newMovement.product_id));
  };

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center">
        <Image src="/entrada-e-saida.png" alt="Ícone de Entrada e Saída" width={32} height={32} className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" loading="lazy" />
        <span className="hidden sm:inline">Entrada e Saída de Itens</span>
        <span className="sm:hidden">Movimentações</span>
      </h1>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded relative mb-3 sm:mb-4 text-sm sm:text-base" role="alert">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded relative mb-3 sm:mb-4 text-sm sm:text-base" role="alert">
          {error}
        </div>
      )}

      {/* Formulário de Nova Movimentação */}
      <div className="bg-white shadow-md rounded-lg p-3 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Registrar Movimentação</h2>
        <form onSubmit={handleCreateMovement} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="product" className="block text-gray-700 text-sm font-bold mb-2">
                Produto:
              </label>
              <select
                id="product"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newMovement.product_id}
                onChange={(e) => setNewMovement({ ...newMovement, product_id: e.target.value })}
                required
              >
                <option value="">Selecione um produto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (Estoque atual: {product.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-gray-700 text-sm font-bold mb-2">
                Tipo de Movimentação:
              </label>
              <select
                id="type"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newMovement.type}
                onChange={(e) => setNewMovement({ ...newMovement, type: e.target.value as 'entrada' | 'saida' })}
                required
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-gray-700 text-sm font-bold mb-2">
                Quantidade:
              </label>
              <input
                type="number"
                id="quantity"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newMovement.quantity}
                onChange={(e) => setNewMovement({ ...newMovement, quantity: e.target.value })}
                min="1"
                max={newMovement.type === 'saida' ? getSelectedProduct()?.stock : undefined}
                required
              />
              {newMovement.type === 'saida' && getSelectedProduct() && (
                <p className="text-sm text-gray-600 mt-1">
                  Máximo disponível: {getSelectedProduct()?.stock}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reason" className="block text-gray-700 text-sm font-bold mb-2">
                Motivo (opcional):
              </label>
              <input
                type="text"
                id="reason"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newMovement.reason}
                onChange={(e) => setNewMovement({ ...newMovement, reason: e.target.value })}
                placeholder="Ex: Compra, Venda, Ajuste de estoque..."
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
            >
              {loading ? 'Registrando...' : 'Registrar Movimentação'}
            </button>
          </div>
        </form>
      </div>

      {/* Histórico de Movimentações */}
      <div className="bg-white shadow-md rounded-lg p-3 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Histórico de Movimentações</h2>
        {movements.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="block md:hidden space-y-4">
              {movements.map((movement) => (
                <div key={movement.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{movement.product_name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(movement.created_at)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ml-2 ${
                      movement.type === 'entrada' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {movement.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Quantidade:</span>
                      <p className="font-medium text-gray-900">{movement.quantity}</p>
                    </div>

                  </div>
                  
                  {movement.reason && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-gray-500 text-sm">Motivo:</span>
                      <p className="text-gray-900 text-sm mt-1">{movement.reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Data/Hora</th>
                    <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Produto</th>
                    <th className="py-3 px-4 border-b border-gray-200 text-center text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="py-3 px-4 border-b border-gray-200 text-center text-sm font-semibold text-gray-700">Quantidade</th>
                    <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-700">Motivo</th>
  
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 border-b border-gray-200">
                        <div className="text-sm text-gray-900">{formatDate(movement.created_at)}</div>
                      </td>
                      <td className="py-3 px-4 border-b border-gray-200">
                        <div className="font-medium text-gray-900">{movement.product_name}</div>
                      </td>
                      <td className="py-3 px-4 border-b border-gray-200 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          movement.type === 'entrada' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {movement.type === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-b border-gray-200 text-center">
                        <span className="font-semibold text-gray-900">{movement.quantity}</span>
                      </td>
                      <td className="py-3 px-4 border-b border-gray-200">
                        <div className="text-gray-600 max-w-xs truncate">{movement.reason || '-'}</div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MovementsPage;