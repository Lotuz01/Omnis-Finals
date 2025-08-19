'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useNotify } from '@/contexts/notifications-context';
import { useConfirmation } from '@/components/ui/confirmation-modal';

interface Client {
  id: number;
  company_name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  contact_person: string;
  created_at: string;
}

const ClientsPage = () => {
  const { notifySuccess, notifyError, notifyInfo } = useNotify();
  const { confirm, ConfirmationComponent } = useConfirmation();
  const [clients, setClients] = useState<Client[]>([]);
  const [newClient, setNewClient] = useState({
    company_name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    contact_person: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      notifyError(
        'Erro ao Carregar Clientes',
        'Não foi possível carregar a lista de clientes. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }, [notifyError, setClients, setLoading]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const isValidCNPJ = (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
    
    // Validar dígitos verificadores
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return digit1 === parseInt(cleanCNPJ[12]) && digit2 === parseInt(cleanCNPJ[13]);
  };

  const validateForm = (client: Partial<Client>) => {
    const errors: { [key: string]: string } = {};

    if (!client.company_name?.trim()) {
      errors.company_name = 'Nome da empresa é obrigatório';
    }

    if (!client.cnpj?.trim()) {
      errors.cnpj = 'CNPJ é obrigatório';
    } else if (!isValidCNPJ(client.cnpj)) {
      errors.cnpj = 'CNPJ inválido';
    }

    if (!client.email?.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      errors.email = 'Email inválido';
    }

    if (!client.phone?.trim()) {
      errors.phone = 'Telefone é obrigatório';
    }

    if (!client.city?.trim()) {
      errors.city = 'Cidade é obrigatória';
    }

    if (!client.state?.trim()) {
      errors.state = 'Estado é obrigatório';
    }

    if (!client.zip_code?.trim()) {
      errors.zip_code = 'CEP é obrigatório';
    }

    if (!client.contact_person?.trim()) {
      errors.contact_person = 'Pessoa de contato é obrigatória';
    }

    return errors;
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatCEP = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const searchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        setFormErrors(prev => ({ ...prev, zip_code: 'CEP não encontrado' }));
        return;
      }

      // Limpar erro de CEP se existir
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.zip_code;
        return newErrors;
      });

      // Preencher os campos automaticamente
      if (editingClient) {
        setEditingClient(prev => prev ? {
          ...prev,
          city: data.localidade || '',
          state: data.uf || ''
        } : prev);
      } else {
        setNewClient(prev => ({
          ...prev,
          city: data.localidade || '',
          state: data.uf || ''
        }));
      }
      
      notifyInfo(
        'CEP Encontrado!',
        `Endereço preenchido automaticamente: ${data.localidade}/${data.uf}`
      );
    } catch {
      setFormErrors(prev => ({ ...prev, zip_code: 'Erro ao buscar CEP' }));
    } finally {
      setCepLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'cnpj') {
      value = formatCNPJ(value);
    }
    
    if (field === 'zip_code') {
      value = formatCEP(value);
    }
    
    if (editingClient) {
      setEditingClient({ ...editingClient, [field]: value });
    } else {
      setNewClient({ ...newClient, [field]: value });
    }
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm(newClient);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Criar endereço completo automaticamente
    const address = [newClient.city, newClient.state, newClient.zip_code]
      .filter(Boolean)
      .join(', ');

    const clientData = {
      ...newClient,
      address: address
    };

    try {
      setLoading(true);
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create client');
      }

      setNewClient({
        company_name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        contact_person: '',
      });
      setFormErrors({});
      notifySuccess(
        'Cliente Criado!',
        `O cliente "${newClient.company_name}" foi adicionado com sucesso.`
      );
      fetchClients();
    } catch (error) {
      console.error('Error creating client:', error);
      notifyError(
        'Erro ao Criar Cliente',
        `Não foi possível criar o cliente "${newClient.company_name}". ${(error as Error).message}`
      );
      setFormErrors({ general: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const errors = validateForm(editingClient);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Criar endereço completo automaticamente
    const address = [editingClient.city, editingClient.state, editingClient.zip_code]
      .filter(Boolean)
      .join(', ');

    const clientData = {
      ...editingClient,
      address: address
    };

    try {
      setLoading(true);
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update client');
      }

      setEditingClient(null);
      setFormErrors({});
      notifySuccess(
        'Cliente Atualizado!',
        `As informações do cliente "${editingClient.company_name}" foram atualizadas com sucesso.`
      );
      fetchClients();
    } catch (error) {
      console.error('Error updating client:', error);
      notifyError(
        'Erro ao Atualizar Cliente',
        `Não foi possível atualizar o cliente "${editingClient.company_name}". ${(error as Error).message}`
      );
      setFormErrors({ general: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: number) => {
    const client = clients.find(c => c.id === id);
    const clientName = client?.company_name || 'Cliente';
    
    const confirmed = await confirm({
      title: 'Excluir Cliente',
      message: `Tem certeza que deseja excluir o cliente "${clientName}"?`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'destructive'
    });
    
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/clients', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete client');
      }

      notifySuccess(
        'Cliente Excluído!',
        `O cliente "${clientName}" foi removido com sucesso.`
      );
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      notifyError(
        'Erro ao Excluir Cliente',
        `Não foi possível excluir o cliente "${clientName}". ${(error as Error).message}`
      );
      setFormErrors({ general: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (client: Client) => {
    setEditingClient(client);
    setFormErrors({});
  };

  const cancelEditing = () => {
    setEditingClient(null);
    setFormErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Gerenciamento de Clientes</h1>
          
          
          
          {formErrors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {formErrors.general}
            </div>
          )}

          <form onSubmit={editingClient ? handleUpdateClient : handleAddClient} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa *</label>
              <input
                type="text"
                value={editingClient ? (editingClient.company_name || '') : newClient.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.company_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nome da empresa"
              />
              {formErrors.company_name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.company_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ *</label>
              <input
                type="text"
                value={editingClient ? (editingClient.cnpj || '') : newClient.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.cnpj ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="XX.XXX.XXX/XXXX-XX"
                maxLength={18}
              />
              {formErrors.cnpj && (
                <p className="text-red-500 text-xs mt-1">{formErrors.cnpj}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={editingClient ? (editingClient.email || '') : newClient.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="email@empresa.com"
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={editingClient ? (editingClient.phone || '') : newClient.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pessoa de Contato</label>
              <input
                type="text"
                value={editingClient ? (editingClient.contact_person || '') : newClient.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do responsável"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                value={editingClient ? (editingClient.city || '') : newClient.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Cidade"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                type="text"
                value={editingClient ? (editingClient.state || '') : newClient.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Estado"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={editingClient ? (editingClient.zip_code || '') : newClient.zip_code}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('zip_code', value);
                    
                    // Buscar endereço automaticamente quando CEP tiver 8 dígitos
                    const cleanCep = value.replace(/\D/g, '');
                    if (cleanCep.length === 8) {
                      searchAddressByCep(value);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.zip_code ? 'border-red-500' : 'border-gray-300'
                  } ${cepLoading ? 'pr-10' : ''}`}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
              {formErrors.zip_code && (
                <p className="text-red-500 text-xs mt-1">{formErrors.zip_code}</p>
              )}
            </div>



            <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Processando...' : editingClient ? 'Atualizar Cliente' : 'Adicionar Cliente'}
              </button>
              
              {editingClient && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Lista de Clientes</h2>
          </div>
          
          {loading && clients.length === 0 ? (
            <div className="p-4 sm:p-6 text-center text-gray-500">Carregando clientes...</div>
          ) : clients.length === 0 ? (
            <div className="p-4 sm:p-6 text-center text-gray-500">Nenhum cliente cadastrado</div>
          ) : (
            <>
              {/* Cards para mobile */}
              <div className="block lg:hidden">
                {clients.map((client) => (
                  <div key={client.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900 text-sm">{client.company_name}</h3>
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => startEditing(client)}
                          className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 border border-blue-300 rounded"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-600 hover:text-red-900 text-xs px-2 py-1 border border-red-300 rounded"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium text-gray-600">CNPJ:</span> <span className="text-gray-900">{client.cnpj}</span></div>
                      <div><span className="font-medium text-gray-600">Email:</span> <span className="text-gray-900">{client.email}</span></div>
                      {client.phone && <div><span className="font-medium text-gray-600">Telefone:</span> <span className="text-gray-900">{client.phone}</span></div>}
                      {client.contact_person && <div><span className="font-medium text-gray-600">Contato:</span> <span className="text-gray-900">{client.contact_person}</span></div>}
                      {client.city && <div><span className="font-medium text-gray-600">Cidade:</span> <span className="text-gray-900">{client.city}</span></div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela para desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNPJ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.company_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.cnpj}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.contact_person || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => startEditing(client)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
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
      </div>
      <ConfirmationComponent />
    </div>
  );
};

export default ClientsPage;