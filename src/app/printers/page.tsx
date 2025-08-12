'use client';

import React, { useState, useEffect } from 'react';

interface Printer {
  id: number;
  name: string;
  type: 'termica' | 'matricial' | 'laser' | 'jato_tinta';
  connection_type: 'usb' | 'rede' | 'serial' | 'bluetooth';
  ip_address?: string;
  port?: number;
  device_path?: string;
  paper_width: number;
  paper_height?: number;
  characters_per_line?: number;
  font_size?: number;
  is_default: boolean;
  is_active: boolean;
  settings: {
    cut_paper?: boolean;
    open_drawer?: boolean;
    print_logo?: boolean;
    logo_path?: string;
    header_text?: string;
    footer_text?: string;
    encoding?: string;
    baud_rate?: number;
    data_bits?: number;
    stop_bits?: number;
    parity?: string;
  };
  created_at: string;
}

interface PrintLog {
  id: number;
  printer_name: string;
  printer_type: string;
  document_type: string;
  status: string;
  created_at: string;
  content_preview: string;
}

export default function PrintersPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printLogs, setPrintLogs] = useState<PrintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'logs'>('config');
  const [showForm, setShowForm] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);


  const [formData, setFormData] = useState({
    name: '',
    type: 'termica' as 'termica' | 'matricial' | 'laser' | 'jato_tinta',
    connection_type: 'usb' as 'usb' | 'rede' | 'serial' | 'bluetooth',
    ip_address: '',
    port: 9100,
    device_path: '',
    paper_width: 80,
    paper_height: 0,
    characters_per_line: 48,
    font_size: 12,
    is_default: false,
    is_active: true,
    settings: {
      cut_paper: true,
      open_drawer: false,
      print_logo: false,
      header_text: '',
      footer_text: '',
      encoding: 'utf8',
      baud_rate: 9600,
      data_bits: 8,
      stop_bits: 1,
      parity: 'none'
    }
  });

  const [testData, setTestData] = useState({
    printer_id: 0,
    document_type: 'cupom' as 'cupom' | 'nfe' | 'relatorio' | 'etiqueta' | 'custom',
    content: '',
    copies: 1
  });

  useEffect(() => {
    fetchPrinters();
    fetchPrintLogs();
  }, []);

  const fetchPrinters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/printers');
      if (response.ok) {
        const data = await response.json();
        setPrinters(data);
      } else {
        setMessage('Erro ao carregar impressoras');
        setMessageType('error');
      }
    } catch {
      setMessage('Erro ao conectar com o servidor');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrintLogs = async () => {
    try {
      const response = await fetch('/api/print');
      if (response.ok) {
        const data = await response.json();
        setPrintLogs(data);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingPrinter ? '/api/printers' : '/api/printers';
      const method = editingPrinter ? 'PUT' : 'POST';
      const payload = editingPrinter ? { ...formData, id: editingPrinter.id } : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage(editingPrinter ? 'Impressora atualizada com sucesso!' : 'Impressora configurada com sucesso!');
        setMessageType('success');
        setShowForm(false);
        setEditingPrinter(null);
        resetForm();
        fetchPrinters();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Erro ao salvar impressora');
        setMessageType('error');
      }
    } catch {
      setMessage('Erro ao conectar com o servidor');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const testContent = testData.content || getTestContent(testData.document_type);
      
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testData,
          content: testContent
        }),
      });

      if (response.ok) {
        await response.json();
        setMessage('Teste de impressão enviado com sucesso!');
        setMessageType('success');
        fetchPrintLogs();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Erro ao enviar teste de impressão');
        setMessageType('error');
      }
    } catch {
      setMessage('Erro ao conectar com o servidor');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getTestContent = (type: string) => {
    switch (type) {
      case 'cupom':
        return {
          company: {
            name: 'EMPRESA TESTE LTDA',
            cnpj: '00.000.000/0001-00',
            address: 'Rua Teste, 123 - Centro',
            phone: '(11) 1234-5678'
          },
          customer: {
            name: 'Cliente Teste',
            cpf: '000.000.000-00'
          },
          items: [
            {
              description: 'Produto Teste 1',
              quantity: 2,
              price: 10.50,
              total: 21.00
            },
            {
              description: 'Produto Teste 2',
              quantity: 1,
              price: 15.00,
              total: 15.00
            }
          ],
          total: 36.00,
          payment: {
            method: 'Dinheiro',
            change: 4.00
          }
        };
      case 'etiqueta':
        return {
          product: {
            name: 'Produto Teste',
            code: 'PROD001',
            price: '25,90',
            barcode: '7891234567890'
          }
        };
      default:
        return 'Teste de impressão\nData: ' + new Date().toLocaleString('pt-BR') + '\nImpressora funcionando corretamente!';
    }
  };

  const handleEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      type: printer.type,
      connection_type: printer.connection_type,
      ip_address: printer.ip_address || '',
      port: printer.port || 9100,
      device_path: printer.device_path || '',
      paper_width: printer.paper_width,
      paper_height: printer.paper_height || 0,
      characters_per_line: printer.characters_per_line || 48,
      font_size: printer.font_size || 12,
      is_default: printer.is_default,
      is_active: printer.is_active,
      settings: {
        cut_paper: printer.settings.cut_paper ?? true,
        open_drawer: printer.settings.open_drawer ?? false,
        print_logo: printer.settings.print_logo ?? false,
        header_text: printer.settings.header_text ?? '',
        footer_text: printer.settings.footer_text ?? '',
        encoding: printer.settings.encoding ?? 'utf8',
        baud_rate: printer.settings.baud_rate ?? 9600,
        data_bits: printer.settings.data_bits ?? 8,
        stop_bits: printer.settings.stop_bits ?? 1,
        parity: printer.settings.parity ?? 'none'
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta impressora?')) return;

    try {
      const response = await fetch(`/api/printers?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Impressora removida com sucesso!');
        setMessageType('success');
        fetchPrinters();
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Erro ao remover impressora');
        setMessageType('error');
      }
    } catch {
      setMessage('Erro ao conectar com o servidor');
      setMessageType('error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'termica',
      connection_type: 'usb',
      ip_address: '',
      port: 9100,
      device_path: '',
      paper_width: 80,
      paper_height: 0,
      characters_per_line: 48,
      font_size: 12,
      is_default: false,
      is_active: true,
      settings: {
        cut_paper: true,
        open_drawer: false,
        print_logo: false,
        header_text: '',
        footer_text: '',
        encoding: 'utf8',
        baud_rate: 9600,
        data_bits: 8,
        stop_bits: 1,
        parity: 'none'
      }
    });
  };

  if (loading && printers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações de impressoras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🖨️ Configuração de Impressoras</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600">
              Configure e gerencie suas impressoras para diferentes tipos de documentos
            </p>
          </div>

          {message && (
            <div className={`mx-6 mt-4 p-4 rounded-md ${
              messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto px-4 sm:px-6">
              <div className="flex space-x-4 sm:space-x-8 whitespace-nowrap">
                <button
                  onClick={() => setActiveTab('config')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === 'config'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Configurações
                </button>
                <button
                  onClick={() => setActiveTab('test')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === 'test'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Teste de Impressão
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === 'logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Logs de Impressão
                </button>
              </div>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Tab: Configurações */}
            {activeTab === 'config' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-medium text-gray-900">Impressoras Configuradas</h2>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setEditingPrinter(null);
                      resetForm();
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto"
                  >
                    + Nova Impressora
                  </button>
                </div>

                {/* Lista de Impressoras */}
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {printers.map((printer) => (
                    <div key={printer.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{printer.name}</h3>
                        <div className="flex space-x-2">
                          {printer.is_default && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Padrão
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            printer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {printer.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        <p><strong>Tipo:</strong> {printer.type}</p>
                        <p><strong>Conexão:</strong> {printer.connection_type}</p>
                        {printer.ip_address && (
                          <p><strong>IP:</strong> {printer.ip_address}:{printer.port}</p>
                        )}
                        {printer.device_path && (
                          <p><strong>Dispositivo:</strong> {printer.device_path}</p>
                        )}
                        <p><strong>Papel:</strong> {printer.paper_width}mm</p>
                      </div>
                      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:space-x-2">
                        <button
                          onClick={() => handleEdit(printer)}
                          className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm py-1 px-2 border border-blue-200 rounded sm:border-none sm:p-0"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(printer.id)}
                          className="text-red-600 hover:text-red-800 text-xs sm:text-sm py-1 px-2 border border-red-200 rounded sm:border-none sm:p-0"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulário de Configuração */}
                {showForm && (
                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-4 sm:top-20 mx-auto p-3 sm:p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">
                          {editingPrinter ? 'Editar Impressora' : 'Nova Impressora'}
                        </h3>
                        <button
                          onClick={() => {
                            setShowForm(false);
                            setEditingPrinter(null);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                              Nome da Impressora
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                              Tipo de Impressora
                            </label>
                            <select
                              value={formData.type}
                              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'termica' | 'matricial' | 'laser' | 'jato_tinta' })}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="termica">Térmica</option>
                              <option value="matricial">Matricial</option>
                              <option value="laser">Laser</option>
                              <option value="jato_tinta">Jato de Tinta</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo de Conexão
                            </label>
                            <select
                              value={formData.connection_type}
                              onChange={(e) => setFormData({ ...formData, connection_type: e.target.value as 'usb' | 'rede' | 'serial' | 'bluetooth' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="usb">USB</option>
                              <option value="rede">Rede (TCP/IP)</option>
                              <option value="serial">Serial</option>
                              <option value="bluetooth">Bluetooth</option>
                            </select>
                          </div>

                          {formData.connection_type === 'rede' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Endereço IP
                                </label>
                                <input
                                  type="text"
                                  value={formData.ip_address}
                                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                                  placeholder="192.168.1.100"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Porta
                                </label>
                                <input
                                  type="number"
                                  value={formData.port}
                                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </>
                          )}

                          {(formData.connection_type === 'usb' || formData.connection_type === 'serial') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Caminho do Dispositivo
                              </label>
                              <input
                                type="text"
                                value={formData.device_path}
                                onChange={(e) => setFormData({ ...formData, device_path: e.target.value })}
                                placeholder={formData.connection_type === 'usb' ? '/dev/usb/lp0' : '/dev/ttyS0'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Largura do Papel (mm)
                            </label>
                            <input
                              type="number"
                              value={formData.paper_width}
                              onChange={(e) => setFormData({ ...formData, paper_width: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Caracteres por Linha
                            </label>
                            <input
                              type="number"
                              value={formData.characters_per_line}
                              onChange={(e) => setFormData({ ...formData, characters_per_line: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Texto do Cabeçalho
                            </label>
                            <input
                              type="text"
                              value={formData.settings.header_text}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                settings: { ...formData.settings, header_text: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Texto do Rodapé
                            </label>
                            <input
                              type="text"
                              value={formData.settings.footer_text}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                settings: { ...formData.settings, footer_text: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.settings.cut_paper}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                settings: { ...formData.settings, cut_paper: e.target.checked }
                              })}
                              className="mr-2"
                            />
                            Cortar papel automaticamente
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.settings.open_drawer}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                settings: { ...formData.settings, open_drawer: e.target.checked }
                              })}
                              className="mr-2"
                            />
                            Abrir gaveta
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.is_default}
                              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                              className="mr-2"
                            />
                            Impressora padrão
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.is_active}
                              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                              className="mr-2"
                            />
                            Ativa
                          </label>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowForm(false);
                              setEditingPrinter(null);
                            }}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors order-2 sm:order-1"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 order-1 sm:order-2"
                          >
                            {loading ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Teste de Impressão */}
            {activeTab === 'test' && (
              <div>
                <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4 sm:mb-6">Teste de Impressão</h2>
                
                <form onSubmit={handleTestPrint} className="space-y-3 sm:space-y-4 max-w-full sm:max-w-md">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Impressora
                    </label>
                    <select
                      value={testData.printer_id}
                      onChange={(e) => setTestData({ ...testData, printer_id: parseInt(e.target.value) })}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Impressora padrão</option>
                      {printers.filter(p => p.is_active).map((printer) => (
                        <option key={printer.id} value={printer.id}>
                          {printer.name} ({printer.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Tipo de Documento
                    </label>
                    <select
                      value={testData.document_type}
                      onChange={(e) => setTestData({ ...testData, document_type: e.target.value as 'cupom' | 'etiqueta' | 'relatorio' | 'custom' })}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cupom">Cupom Fiscal</option>
                      <option value="etiqueta">Etiqueta</option>
                      <option value="relatorio">Relatório</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Número de Cópias
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={testData.copies}
                      onChange={(e) => setTestData({ ...testData, copies: parseInt(e.target.value) })}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {testData.document_type === 'custom' && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Conteúdo Personalizado
                      </label>
                      <textarea
                        value={testData.content}
                        onChange={(e) => setTestData({ ...testData, content: e.target.value })}
                        rows={4}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Digite o conteúdo que deseja imprimir..."
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? 'Enviando...' : '🖨️ Enviar Teste de Impressão'}
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Logs de Impressão */}
            {activeTab === 'logs' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-medium text-gray-900">Logs de Impressão</h2>
                  <button
                    onClick={fetchPrintLogs}
                    className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm py-1 px-2 border border-blue-200 rounded sm:border-none sm:p-0"
                  >
                    🔄 Atualizar
                  </button>
                </div>

                {/* Layout responsivo para logs */}
                <div className="block sm:hidden">
                  {/* Cards para mobile */}
                  <div className="space-y-3">
                    {printLogs.map((log) => (
                      <div key={log.id} className="bg-gray-50 rounded-lg p-3 border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.status === 'success' 
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.status === 'success' ? 'Sucesso' : log.status === 'error' ? 'Erro' : 'Pendente'}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {log.printer_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div><strong>Tipo:</strong> {log.printer_type}</div>
                          <div><strong>Documento:</strong> {log.document_type}</div>
                          {log.content_preview && (
                            <div><strong>Preview:</strong> {log.content_preview}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {printLogs.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Nenhum log de impressão encontrado
                    </div>
                  )}
                </div>

                {/* Tabela para desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data/Hora
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Impressora
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preview
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {printLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {log.printer_name || 'N/A'}
                            <div className="text-xs text-gray-500">{log.printer_type}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                            {log.document_type}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              log.status === 'success' 
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'error'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.status === 'success' ? 'Sucesso' : log.status === 'error' ? 'Erro' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-xs truncate">
                            {log.content_preview}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {printLogs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum log de impressão encontrado
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}