'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useNotify } from '@/contexts/notifications-context';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    stock_quantity: 0,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotify();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      const productsWithParsedPrice = data.products.map((product: Product) => ({
        ...product,
        price: parseFloat(product.price.toString()),
      }));
      setProducts(productsWithParsedPrice);
      
      // Verificar produtos com estoque baixo
      const lowStockProducts = productsWithParsedPrice.filter((product: Product) => product.stock_quantity <= 5 && product.stock_quantity > 0);
  const outOfStockProducts = productsWithParsedPrice.filter((product: Product) => product.stock_quantity === 0);
      
      if (outOfStockProducts.length > 0) {
        notifyWarning(
          'Produtos Sem Estoque!',
          `${outOfStockProducts.length} produto(s) estão sem estoque: ${outOfStockProducts.map((p: Product) => p.name).join(', ')}.`,
          {
            label: 'Ver Produtos',
            onClick: () => {
              const element = document.getElementById('products-list');
              element?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        );
      } else if (lowStockProducts.length > 0) {
        notifyInfo(
          'Estoque Baixo',
          `${lowStockProducts.length} produto(s) com estoque baixo (≤5 unidades): ${lowStockProducts.map((p: Product) => p.name).join(', ')}.`,
          {
            label: 'Ver Produtos',
            onClick: () => {
              const element = document.getElementById('products-list');
              element?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      notifyError(
        'Erro ao Carregar Produtos',
        'Não foi possível carregar a lista de produtos. Verifique sua conexão e tente novamente.'
      );
    }
  }, [notifyError, notifyWarning, notifyInfo]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { [key: string]: string } = {};
    if (!newProduct.name) {
      errors.name = 'O nome do produto é obrigatório.';
    }
    if (newProduct.price <= 0 || isNaN(newProduct.price)) {
      errors.price = 'O preço deve ser um número positivo.';
    }
    if (newProduct.stock_quantity < 0 || isNaN(newProduct.stock_quantity)) {
      errors.stock_quantity = 'O estoque deve ser um número não negativo.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({}); // Clear previous errors
    setSuccessMessage(''); // Clear previous success messages

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const responseData = await res.json();
      
      if (responseData.message === 'Product stock updated') {
        notifySuccess(
          'Estoque Atualizado!',
          `Produto "${newProduct.name}" teve seu estoque aumentado de ${responseData.previousStock} para ${responseData.newStock} (+${responseData.addedStock} unidades).`
        );
      } else {
        notifySuccess(
          'Produto Adicionado!',
          `Produto "${newProduct.name}" foi adicionado com sucesso ao catálogo.`,
          {
            label: 'Ver Produtos',
            onClick: () => window.location.reload()
          }
        );
      }
      
      setNewProduct({ name: '', description: '', price: 0, stock_quantity: 0 });
      fetchProducts();
    } catch (error: unknown) {
      console.error('Failed to add product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
      notifyError(
        'Erro ao Adicionar Produto',
        `Não foi possível adicionar o produto "${newProduct.name}". ${errorMessage}`
      );
      setFormErrors({ api: errorMessage });
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingProduct),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      notifySuccess(
        'Produto Atualizado!',
        `As informações do produto "${editingProduct.name}" foram atualizadas com sucesso.`
      );
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
      notifyError(
        'Erro ao Atualizar Produto',
        `Não foi possível atualizar o produto "${editingProduct.name}". Tente novamente.`
      );
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const product = products.find(p => p.id === id);
    const productName = product?.name || 'Produto';
    
    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      notifySuccess(
        'Produto Removido!',
        `O produto "${productName}" foi removido do catálogo.`
      );
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      notifyError(
        'Erro ao Remover Produto',
        `Não foi possível remover o produto "${productName}". Tente novamente.`
      );
    }
  };

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center">
          <Image src="/stock-icon.png" alt="Ícone de Estoque" className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3" width={32} height={32} loading="lazy" />
          Estoque
        </h1>

      {/* Add New Product Section */}
      <section className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Adicionar Novo Produto</h2>
        <div className="bg-white shadow rounded-lg p-3 sm:p-4">
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome
              </label>
              <input
                type="text"
                id="name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descrição
              </label>
              <textarea
                id="description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              ></textarea>
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Preço
              </label>
              <input
                type="number"
                id="price"
                value={newProduct.price || ''}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                step="0.01"
                required
              />
              {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
            </div>
            <div>
              <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">
                Estoque
              </label>
              <input
                type="number"
                id="stock_quantity"
                value={newProduct.stock_quantity || ''}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    stock_quantity: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
              {formErrors.stock_quantity && <p className="text-red-500 text-xs mt-1">{formErrors.stock_quantity}</p>}
            </div>
            {formErrors.api && <p className="text-red-500 text-xs mt-1">{formErrors.api}</p>}
            {successMessage && <p className="text-green-600 text-sm mt-2 p-2 bg-green-50 border border-green-200 rounded">{successMessage}</p>}
            <button
              type="submit"
              className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              Adicionar Produto
            </button>
          </form>
        </div>
      </section>

      {/* Product Listing Section */}
      <section id="products-list" className="mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Lista de Produtos</h2>
        <div className="bg-white shadow rounded-lg p-2 sm:p-4">
          {products.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Nenhum produto disponível ainda.</p>
          ) : (
            <>
              {/* Mobile View - Cards */}
              <div className="block md:hidden space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg text-gray-900 flex-1 mr-2">{product.name}</h3>
                      <span className="text-lg font-bold text-green-600 whitespace-nowrap">
                        R$ {product.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    
                    {product.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">
                        Estoque: <span className="font-medium text-gray-900">{product.stock_quantity}</span>
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(product)}
                        className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Nome</th>
                      <th className="py-3 px-4 border-b text-left font-semibold text-gray-700">Descrição</th>
                      <th className="py-3 px-4 border-b text-center font-semibold text-gray-700">Preço</th>
                      <th className="py-3 px-4 border-b text-center font-semibold text-gray-700">Estoque</th>
                      <th className="py-3 px-4 border-b text-center font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 border-b">
                          <div className="font-medium text-gray-900">{product.name}</div>
                        </td>
                        <td className="py-3 px-4 border-b">
                          <div className="text-gray-600 max-w-xs truncate">{product.description}</div>
                        </td>
                        <td className="py-3 px-4 border-b text-center">
                          <span className="font-semibold text-green-600">
                            R$ {product.price.toFixed(2).replace('.', ',')}
                          </span>
                        </td>
                        <td className="py-3 px-4 border-b text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {product.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 border-b text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(product)}
                              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Edit Product Section (Modal/Form) */}
      {editingProduct && (
        <section className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center p-4">
          <div className="bg-white p-4 sm:p-8 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Editar Produto</h2>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={editingProduct.name || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  id="edit-description"
                  value={editingProduct.description || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                ></textarea>
              </div>
              <div>
                <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700">
                  Preço
                </label>
                <input
                  type="number"
                  id="edit-price"
                  value={editingProduct.price || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-stock_quantity" className="block text-sm font-medium text-gray-700">
                  Estoque
                </label>
                <input
                  type="number"
                  id="edit-stock_quantity"
                  value={editingProduct.stock_quantity || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock_quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="w-full sm:w-auto bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Atualizar Produto
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductsPage;