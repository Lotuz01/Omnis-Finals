'use client';

import { useState, useEffect, useCallback } from 'react';

interface Account {
  id: number;
  type: 'pagar' | 'receber';
  description: string;
  amount: number;
  due_date: string;
  status: 'pendente' | 'pago' | 'vencido' | 'parcialmente_pago';
  payment_date?: string;
  payment_amount?: number;
  category?: string;
  supplier_customer?: string;
  notes?: string;
  user_name: string;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface LinkedProduct {
  product_id: number;
  quantity: number;
  price: number;
}

interface Payment {
  id: number;
  payment_amount: number;
  payment_date: string;
  notes: string;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [linkedProducts, setLinkedProducts] = useState<LinkedProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);

  const [formData, setFormData] = useState({
    type: 'pagar' as 'pagar' | 'receber',
    description: '',
    amount: '',
    due_date: '',
    category: '',
    supplier_customer: '',
    notes: ''
  });

  const [paymentData, setPaymentData] = useState({
    payment_amount: '',
    payment_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchAccounts();
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [accounts, filterType, filterStatus]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
      setAvailableProducts(data.products || []);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const addLinkedProduct = (productId: number, quantity: number, price: number) => {
    const existingIndex = linkedProducts.findIndex(p => p.product_id === productId);
    if (existingIndex >= 0) {
      const newArr = [...linkedProducts];
      newArr[existingIndex].quantity += quantity;
      setLinkedProducts(newArr);
    } else {
      setLinkedProducts([...linkedProducts, { product_id: productId, quantity, price }]);
    }
  };

  const removeLinkedProduct = (index: number) => {
    setLinkedProducts(linkedProducts.filter((_, i) => i !== index));
  };

  const applyFilters = useCallback(() => {
    let filtered = accounts;

    if (filterType !== 'all') {
      filtered = filtered.filter(account => account.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(account => account.status === filterStatus);
    }

    setFilteredAccounts(filtered);
  }, [accounts, filterType, filterStatus]);
  
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
      setAccounts(data.accounts || []);
    } else {
      setError('Erro ao carregar contas');
      }
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          products: linkedProducts
        }),
      });

      if (response.ok) {
        setSuccess('Conta criada com sucesso!');
        setFormData({
          type: 'pagar',
          description: '',
          amount: '',
          due_date: '',
          category: '',
          supplier_customer: '',
          notes: ''
        });
        setLinkedProducts([]);
        setShowForm(false);
        fetchAccounts();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao criar conta');
      }
    } catch {
      setError('Erro ao conectar com o servidor');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/accounts/${selectedAccount.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...paymentData,
          payment_amount: parseFloat(paymentData.payment_amount)
        }),
      });

      if (response.ok) {
        setSuccess('Pagamento registrado com sucesso!');
        setPaymentData({
          payment_amount: '',
          payment_date: '',
          notes: ''
        });
        setShowPaymentModal(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao registrar pagamento');
      }
    } catch {
      setError('Erro ao conectar com o servidor');
    }
  };

  const openPaymentModal = async (account: Account) => {
    setSelectedAccount(account);
    try {
      const response = await fetch(`/api/accounts/${account.id}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de pagamentos:', error);
    }
    const remainingAmount = account.payment_amount ? Number(account.amount) - Number(account.payment_amount) : Number(account.amount);
    setPaymentData({
      payment_amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'text-green-600';
      case 'vencido': return 'text-red-600';
      case 'pendente': return 'text-yellow-600';
      case 'parcialmente_pago': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'pagar' ? 'text-red-600' : 'text-green-600';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Contas a Pagar e Receber</h1>
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Nova Conta
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {showForm && (
        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Nova Conta</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Produtos vinculados</label>
              <div className="flex gap-2 mb-2">
                <select 
                  className="px-2 py-1 border rounded" 
                  defaultValue="" 
                  onChange={e => {
                    const selectedId = Number(e.target.value);
                    const selectedProduct = availableProducts.find(p => p.id === selectedId);
                    if (selectedProduct) {
                      addLinkedProduct(selectedProduct.id, 1, selectedProduct.price);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Selecione um produto</option>
                  {availableProducts.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              <ul>
                {linkedProducts.map((item, idx) => {
                  const product = availableProducts.find(p => p.id === item.product_id);
                  return (
                    <li key={idx} className="flex gap-2 items-center mb-1">
                      <span>{product?.name || `Produto ID: ${item.product_id}`}</span>
                      <span>Qtd:</span>
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={e => {
                          const newArr = [...linkedProducts];
                          newArr[idx].quantity = Number(e.target.value);
                          setLinkedProducts(newArr);
                        }} 
                        className="w-16 px-1 border rounded" 
                      />
                      <span>Preço:</span>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={item.price} 
                        onChange={e => {
                          const newArr = [...linkedProducts];
                          newArr[idx].price = Number(e.target.value);
                          setLinkedProducts(newArr);
                        }} 
                        className="w-20 px-1 border rounded" 
                      />
                      <button 
                        type="button" 
                        onClick={() => removeLinkedProduct(idx)} 
                        className="text-red-500 hover:text-red-700"
                      >
                        Remover
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'pagar' | 'receber' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="pagar">Conta a Pagar</option>
                <option value="receber">Conta a Receber</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Vencimento *</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fornecedor/Cliente</label>
              <input
                type="text"
                value={formData.supplier_customer}
                onChange={(e) => setFormData({ ...formData, supplier_customer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Criar Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setLinkedProducts([]);
                }}
                className="w-full sm:w-auto bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Tipo:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="pagar">Contas a Pagar</option>
            <option value="receber">Contas a Receber</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="vencido">Vencido</option>
            <option value="parcialmente_pago">Parcialmente Pago</option>
          </select>
        </div>
      </div>

      {/* Cards para Mobile */}
      <div className="block md:hidden space-y-4">
        {filteredAccounts.map((account) => (
          <div key={account.id} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${account.type === 'pagar' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {account.type === 'pagar' ? 'Pagar' : 'Receber'}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(account.status)} bg-gray-100`}>
                    {account.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 text-sm mb-1">{account.description}</h3>
                <p className="text-lg font-bold text-gray-900 mb-1">{formatCurrency(account.amount)}</p>
                <p className="text-sm text-gray-600">
                  Vencimento: {new Date(account.due_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            {account.status !== 'pago' && (
              <div className="flex justify-end pt-3 border-t border-gray-200">
                <button
                  onClick={() => openPaymentModal(account)}
                  className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                >
                  Registrar Pagamento
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tabela para Desktop */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className={`px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium ${getTypeColor(account.type)}`}>
                    {account.type === 'pagar' ? 'Pagar' : 'Receber'}
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={account.description}>
                      {account.description}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(account.amount)}</td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(account.due_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className={`px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium ${getStatusColor(account.status)}`}>
                    {account.status.replace('_', ' ').toUpperCase()}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {account.status !== 'pago' && (
                      <button
                        onClick={() => openPaymentModal(account)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && selectedAccount && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full max-w-md sm:w-96 shadow-lg rounded-md bg-white m-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar Pagamento</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Conta: <span className="font-medium">{selectedAccount.description}</span></p>
              <p className="text-sm text-gray-600 mb-1">Valor Total: <span className="font-medium">{formatCurrency(selectedAccount.amount)}</span></p>
              <p className="text-sm text-gray-600 mb-1">Valor Pago: <span className="font-medium">{formatCurrency(selectedAccount.payment_amount || 0)}</span></p>
              <p className="text-sm text-gray-600">Valor Restante: <span className="font-medium">{formatCurrency(selectedAccount.amount - (selectedAccount.payment_amount || 0))}</span></p>
            </div>
            {paymentHistory.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Histórico de Pagamentos</h4>
                <div className="max-h-40 overflow-y-auto">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="border-b py-2 text-sm">
                      <p>Data: {new Date(payment.payment_date).toLocaleDateString('pt-BR')}</p>
                      <p>Valor: {formatCurrency(payment.payment_amount)}</p>
                      <p>Observações: {payment.notes || 'Nenhuma'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={handlePayment}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor do Pagamento *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentData.payment_amount}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  required
                  max={(selectedAccount.amount - (selectedAccount.payment_amount || 0)).toFixed(2)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Data do Pagamento *</label>
                <input
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedAccount(null);
                  }}
                  className="w-full sm:w-auto bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Registrar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}