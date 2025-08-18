'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Client {
  id: number;
  company_name: string;
  cnpj: string;
  email: string;
  city: string;
  state: string;
}

interface NFEItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cfop: string;
  ncm: string;
  unit: string;
}

interface NFE {
  id: number;
  client_id: number;
  company_name: string;
  cnpj: string;
  nfe_number: string;
  access_key: string;
  total_amount: number;
  operation_type: string;
  status: string;
  created_at: string;
  pdf_url?: string;
}

export default function NFEPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [nfes, setNfes] = useState<NFE[]>([]);
  const [selectedClient, setSelectedClient] = useState<number>(0);
  const [operationType, setOperationType] = useState('Venda');
  const [items, setItems] = useState<NFEItem[]>([{
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    cfop: '5102', // CFOP padrão para venda
    ncm: '',
    unit: 'UN'
  }]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'emit' | 'list'>('emit');
  const [printLoading, setPrintLoading] = useState<number | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const router = useRouter();

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchNFEs = async () => {
    try {
      const response = await fetch('/api/nfe');
      if (response.ok) {
        const data = await response.json();
        setNfes(data);
      }
    } catch (error) {
      console.error('Erro ao buscar NFes:', error);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchNFEs();
  }, []);

  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      cfop: '5102',
      ncm: '',
      unit: 'UN'
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof NFEItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calcular total do item automaticamente
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    
    setItems(updatedItems);
  };

  const getTotalAmount = () => {
    return items.reduce((total, item) => total + item.total_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient) {
      setMessage('Selecione um cliente');
      setMessageType('error');
      return;
    }

    if (items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
      setMessage('Preencha todos os campos dos itens corretamente');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/nfe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedClient,
          items,
          total_amount: getTotalAmount(),
          operation_type: operationType,
          notes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`NFe emitida com sucesso! Número: ${data.nfe_number}`);
        setMessageType('success');
        
        // Impressão automática se habilitada
        if (autoPrint && data.nfe) {
          try {
            const printResponse = await fetch('/api/print', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                document_type: 'nfe',
                content: {
                  nfe_number: data.nfe.nfe_number,
                  client_name: data.nfe.company_name,
                  cnpj: data.nfe.cnpj,
                  total_amount: data.nfe.total_amount,
                  status: data.nfe.status,
                  created_at: data.nfe.created_at,
                  access_key: data.nfe.access_key,
                  operation_type: data.nfe.operation_type
                },
                copies: 1
              }),
            });
            
            const printResult = await printResponse.json();
            if (printResult.success) {
              setMessage(`NFe emitida e enviada para impressão! Número: ${data.nfe_number}`);
            } else {
              setMessage(`NFe emitida com sucesso! Número: ${data.nfe_number}. Erro na impressão: ${printResult.message}`);
            }
          } catch (printError) {
            console.error('Erro na impressão automática:', printError);
            setMessage(`NFe emitida com sucesso! Número: ${data.nfe_number}. Erro na impressão automática.`);
          }
        }
        
        // Limpar formulário
        setSelectedClient(0);
        setItems([{
          description: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          cfop: '5102',
          ncm: '',
          unit: 'UN'
        }]);
        setNotes('');
        setAutoPrint(false);
        
        // Atualizar lista de NFes
        fetchNFEs();
        
        // Mudar para aba de listagem
        setActiveTab('list');
      } else {
        setMessage(data.message || 'Erro ao emitir NFe');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Erro ao emitir NFe');
      setMessageType('error');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrintNFe = async (nfe: NFE) => {
    setPrintLoading(nfe.id);
    try {
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_type: 'nfe',
          content: {
            nfe_number: nfe.nfe_number,
            client_name: nfe.company_name,
            cnpj: nfe.cnpj,
            total_amount: nfe.total_amount,
            status: nfe.status,
            created_at: nfe.created_at,
            access_key: nfe.access_key,
            operation_type: nfe.operation_type
          },
          copies: 1
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('NFe enviada para impressão com sucesso!');
        setMessageType('success');
      } else {
        setMessage(result.message || 'Erro ao imprimir NFe');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Erro ao imprimir NFe:', error);
      setMessage('Erro ao conectar com o serviço de impressão');
      setMessageType('error');
    } finally {
      setPrintLoading(null);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
            <Image src="/nfe-icon.svg" alt="Ícone NFe" width={24} height={24} className="mr-2" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
            Nota Fiscal Eletrônica
          </h1>

          {/* Abas */}
          <div className="flex mb-4 sm:mb-6 border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('emit')}
              className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${activeTab === 'emit'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Emitir NFe
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base ml-2 sm:ml-4 whitespace-nowrap ${activeTab === 'list'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              NFes Emitidas ({nfes.length})
            </button>
          </div>

          {/* Mensagens */}
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Aba de Emissão */}
          {activeTab === 'emit' && (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Seleção de Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value={0}>Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name} - {client.cnpj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Operação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Operação *
                </label>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="Venda">Venda</option>
                  <option value="Remessa">Remessa</option>
                  <option value="Devolução">Devolução</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </div>

              {/* Itens da NFe */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Itens da NFe *
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    + Adicionar Item
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-700">Item {index + 1}</h4>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️ Remover
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Descrição *
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Descrição do produto/serviço"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Quantidade *
                          </label>
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Valor Unitário *
                          </label>
                          <input
                            type="number"
                            value={item.unit_price || ''}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            step="0.01"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Unidade
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="UN">Unidade</option>
                            <option value="KG">Quilograma</option>
                            <option value="MT">Metro</option>
                            <option value="LT">Litro</option>
                            <option value="PC">Peça</option>
                            <option value="CX">Caixa</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            CFOP
                          </label>
                          <input
                            type="text"
                            value={item.cfop}
                            onChange={(e) => updateItem(index, 'cfop', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="5102"
                            maxLength={4}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            NCM
                          </label>
                          <input
                            type="text"
                            value={item.ncm}
                            onChange={(e) => updateItem(index, 'ncm', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="00000000"
                            maxLength={8}
                          />
                        </div>

                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Total do Item
                          </label>
                          <div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-medium">
                            {formatCurrency(item.total_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Observações adicionais (opcional)"
                />
              </div>

              {/* Opções de Impressão */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Opções de Impressão</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoPrint"
                    checked={autoPrint}
                    onChange={(e) => setAutoPrint(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoPrint" className="ml-2 text-sm text-gray-700">
                    Imprimir automaticamente após emissão
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  A NFe será enviada automaticamente para a impressora padrão após ser emitida com sucesso.
                </p>
              </div>

              {/* Total Geral */}
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">Total Geral:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(getTotalAmount())}
                  </span>
                </div>
              </div>

              {/* Botão de Submissão */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full sm:w-auto px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Emitindo...' : 'Emitir NFe'}
                </button>
              </div>
            </form>
          )}

          {/* Aba de Listagem */}
          {activeTab === 'list' && (
            <div>
              {nfes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma NFe emitida ainda.</p>
                  <button
                    onClick={() => setActiveTab('emit')}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Emitir primeira NFe
                  </button>
                </div>
              ) : (
                <>
                  {/* Layout Mobile - Cards */}
                  <div className="block lg:hidden space-y-4">
                    {nfes.map((nfe) => (
                      <div key={nfe.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              NFe: {nfe.nfe_number || 'Processando...'}
                            </h3>
                            <p className="text-sm text-gray-500">{nfe.company_name}</p>
                            <p className="text-xs text-gray-400">{nfe.cnpj}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            nfe.status === 'emitida' ? 'bg-green-100 text-green-800' :
                            nfe.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {nfe.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Valor</p>
                            <p className="font-medium text-gray-900">{formatCurrency(nfe.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Data</p>
                            <p className="text-sm text-gray-900">{formatDate(nfe.created_at)}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {nfe.pdf_url && (
                            <a
                              href={nfe.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                            >
                              📄 PDF
                            </a>
                          )}
                          <button 
                            onClick={() => handlePrintNFe(nfe)}
                            disabled={printLoading === nfe.id}
                            className="flex-1 text-center bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {printLoading === nfe.id ? '⏳ Imprimindo...' : '🖨️ Imprimir'}
                          </button>
                          <button className="flex-1 text-center bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors">
                            👁️ Detalhes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Layout Desktop - Tabela */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Número
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {nfes.map((nfe) => (
                          <tr key={nfe.id} className="hover:bg-gray-50">
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {nfe.nfe_number || 'Processando...'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                <div className="font-medium">{nfe.company_name}</div>
                                <div className="text-gray-400">{nfe.cnpj}</div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(nfe.total_amount)}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                nfe.status === 'emitida' ? 'bg-green-100 text-green-800' :
                                nfe.status === 'cancelada' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {nfe.status}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(nfe.created_at)}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {nfe.pdf_url && (
                                <a
                                  href={nfe.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  📄 PDF
                                </a>
                              )}
                              <button 
                                onClick={() => handlePrintNFe(nfe)}
                                disabled={printLoading === nfe.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed mr-3"
                              >
                                {printLoading === nfe.id ? '⏳' : '🖨️'} Imprimir
                              </button>
                              <button className="text-gray-600 hover:text-gray-900">
                                👁️ Detalhes
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}