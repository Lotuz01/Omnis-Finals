'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  name: string;
  isAdmin: boolean;
  password?: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', password: '', name: '', isAdmin: false });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch users: ${errorMessage}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMessage(`User created successfully: ${data.userId}`);
      setNewUser({ username: '', password: '', name: '', isAdmin: false });
      fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create user: ${errorMessage}`);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!editingUser) return;

    try {
      const updateData: Partial<User> & { password?: string } = { username: editingUser.username, name: editingUser.name, isAdmin: editingUser.isAdmin };
      if (newPassword.trim()) {
        updateData.password = newPassword;
      }
      
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setMessage('User updated successfully');
      setEditingUser(null);
      setNewPassword('');
      fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update user: ${errorMessage}`);
    }
  };

  const handleDeleteUser = async (id: number) => {
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setMessage('User deleted successfully');
      fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to delete user: ${errorMessage}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Gerenciamento de Usuários</h1>

      {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{message}</div>}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      {/* Create User Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Criar Novo Usuário</h2>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label htmlFor="newUsername" className="block text-gray-700 text-sm font-bold mb-2">Usuário:</label>
            <input
              type="text"
              id="newUsername"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newUser.username || ''}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">Senha:</label>
            <input
              type="password"
              id="newPassword"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newUser.password || ''}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="newName" className="block text-gray-700 text-sm font-bold mb-2">Nome:</label>
            <input
              type="text"
              id="newName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newUser.name || ''}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="newIsAdmin"
              className="mr-2 leading-tight"
              checked={newUser.isAdmin || false}
              onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
            />
            <label htmlFor="newIsAdmin" className="text-sm text-gray-700">É Administrador</label>
          </div>
          <div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Criar Usuário
            </button>
          </div>
        </form>
      </div>

      {/* User List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Lista de Usuários</h2>
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">ID</th>
              <th className="py-2 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Usuário</th>
              <th className="py-2 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Nome</th>
              <th className="py-2 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Admin</th>
              <th className="py-2 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="py-2 px-4 border-b border-gray-200">{user.id}</td>
                <td className="py-2 px-4 border-b border-gray-200">{user.username}</td>
                <td className="py-2 px-4 border-b border-gray-200">{user.name}</td>
                <td className="py-2 px-4 border-b border-gray-200">{user.isAdmin ? 'Sim' : 'Não'}</td>
                <td className="py-2 px-4 border-b border-gray-200">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded text-xs mr-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Edit User Form */}
        {editingUser && (
          <div className="bg-white shadow-md rounded-lg p-6 mt-8">
            <h2 className="text-2xl font-semibold mb-4">Editar Usuário</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label htmlFor="editUsername" className="block text-gray-700 text-sm font-bold mb-2">Usuário:</label>
                <input
                  type="text"
                  id="editUsername"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="editName" className="block text-gray-700 text-sm font-bold mb-2">Nome:</label>
                <input
                  type="text"
                  id="editName"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="editPassword" className="block text-gray-700 text-sm font-bold mb-2">Nova Senha (deixe em branco para manter a atual):</label>
                <input
                  type="password"
                  id="editPassword"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={newPassword || ''}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsAdmin"
                  className="mr-2 leading-tight"
                  checked={editingUser.isAdmin || false}
                  onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })}
                />
                <label htmlFor="editIsAdmin" className="text-sm text-gray-700">É Administrador</label>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setNewPassword('');
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;