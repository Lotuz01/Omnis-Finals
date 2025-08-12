'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Backup {
  filename: string;
  size: string;
  created: string;
  path: string;
}



export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const loadBackups = useCallback(async () => {
    try {
      const response = await fetch('/api/backup');
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups);
      } else {
        showMessage('Erro ao carregar backups', 'error');
      }
    } catch {
      showMessage('Erro ao carregar backups', 'error');
    }
  }, []);

  // Verificar se é administrador
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          if (userData.isAdmin) {
            setIsAdmin(true);
            loadBackups();
          } else {
            router.push('/');
          }
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };

    checkAdmin();
  }, [router, loadBackups]);

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const createBackup = async () => {
    setLoading(true);
    console.log('📦 [WEB] Iniciando criação de backup...');
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create' }),
      });
      console.log('📦 [WEB] POST request sent:', { action: 'create' });
      console.log('📦 [WEB] Status da resposta:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        showMessage(`Backup criado com sucesso: ${data.filename}`, 'success');
        loadBackups();
      } else {
        const error = await response.json();
        showMessage(error.message || 'Erro ao criar backup', 'error');
      }
    } catch {
      showMessage('Erro ao criar backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (filename: string) => {
    if (!confirm(`Tem certeza que deseja restaurar o backup "${filename}"? Todos os dados atuais serão substituídos!`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restore', filename }),
      });

      if (response.ok) {
        await response.json();
        showMessage('Backup restaurado com sucesso!', 'success');
      } else {
        const error = await response.json();
        showMessage(error.message || 'Erro ao restaurar backup', 'error');
      }
    } catch {
      showMessage('Erro ao restaurar backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (filename: string) => {
    console.log('🗑️ [WEB] deleteBackup chamado para:', filename);
    if (!confirm(`Tem certeza que deseja deletar o backup "${filename}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/backup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      if (response.ok) {
        showMessage('Backup deletado com sucesso!', 'success');
        loadBackups();
      } else {
        const error = await response.json();
        showMessage(error.message || 'Erro ao deletar backup', 'error');
      }
    } catch {
      showMessage('Erro ao deletar backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">🔧 Sistema de Backup</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Voltar
            </button>
          </div>

          {/* Mensagem de status */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              messageType === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Botão para criar backup */}
          <div className="mb-6">
            <button
              onClick={createBackup}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processando...
                </>
              ) : (
                <>
                  💾 Criar Novo Backup
                </>
              )}
            </button>
          </div>

          {/* Lista de backups */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📁 Backups Disponíveis</h2>
            
            {backups.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Nenhum backup encontrado.</p>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div key={backup.filename} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{backup.filename}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="mr-4">📅 {formatDate(backup.created)}</span>
                          <span>📊 {backup.size}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => restoreBackup(backup.filename)}
                          disabled={loading}
                          className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          🔄 Restaurar
                        </button>
                        <button
                          onClick={() => deleteBackup(backup.filename)}
                          disabled={loading}
                          className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          🗑️ Deletar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Informações importantes */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Informações Importantes</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Os backups incluem todas as tabelas: usuários, produtos, movimentações e contas</li>
              <li>• Ao restaurar um backup, todos os dados atuais serão substituídos</li>
              <li>• Apenas administradores podem criar, restaurar e deletar backups</li>
              <li>• Recomenda-se fazer backups regulares para evitar perda de dados</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}