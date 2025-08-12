import React from 'react';

export default function ProfilePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Perfil</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações Pessoais</h2>
        <form>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Nome</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border rounded"
              defaultValue="Nome do Usuário"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              className="w-full px-3 py-2 border rounded"
              defaultValue="usuario@exemplo.com"
            />
          </div>
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Salvar Alterações
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Alterar Senha</h2>
        <form>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Senha Atual</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Nova Senha</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Confirmar Nova Senha</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Alterar Senha
          </button>
        </form>
      </div>
    </div>
  );
}