'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, userName, isAdmin }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };

    if (dropdownOpen || sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, sidebarOpen]);

  // Fechar sidebar ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        // Forçar recarregamento completo da página para limpar cache
        window.location.href = '/login';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-gray-800 text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-4 text-xl lg:text-2xl font-bold border-b border-gray-700 text-center flex flex-col items-center">
          <Link href={isAdmin ? "/" : "/dashboard"} onClick={() => setSidebarOpen(false)}>
            <Image 
              src="/logo-text-black.svg" 
              alt="Omnis Logo" 
              width={160} 
              height={160} 
              className="w-32 lg:w-56 h-auto"
            />
          </Link>
        </div>
        <nav className="flex-grow p-4">
          <ul>

            {!isAdmin ? (
              <>
                <li className="mb-2">
                  <Link 
                    href="/products" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Image src="/stock-icon.png" alt="Ícone de Estoque" width={20} height={20} className="mr-3 filter brightness-0 invert" />
                    <span className="truncate">Estoque</span>
                  </Link>
                </li>
                <li className="mb-2">
                  <Link 
                    href="/movements" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Image src="/entrada-e-saida.png" alt="Ícone de Entrada e Saída" width={20} height={20} className="mr-3 filter brightness-0 invert" />
                    <span className="truncate">Movimentações</span>
                  </Link>
                </li>
                <li className="mb-2">
                  <Link 
                    href="/accounts" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Image src="/money.png" alt="Ícone de Dinheiro" width={20} height={20} className="mr-3 filter brightness-0 invert" />
                    <span className="truncate">Contas</span>
                  </Link>
                </li>
                <li className="mb-2">
                  <Link 
                    href="/clients" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Image src="/cliente.png" alt="Ícone de Clientes" width={20} height={20} className="mr-3 filter brightness-0 invert" />
                    <span className="truncate">Clientes</span>
                  </Link>
                </li>
                <li className="mb-2">
                  <Link 
                    href="/nfe" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-3">📄</span>
                    <span className="truncate">NFe</span>
                  </Link>
                </li>
                <li className="mb-2">
                  <Link 
                    href="/printers" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-3">🖨️</span>
                    <span className="truncate">Impressoras</span>
                  </Link>
                </li>
                <li className="mb-2">
                  <Link 
                    href="/certificado" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 flex items-center text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-3">🔐</span>
                    <span className="truncate">Certificado Digital</span>
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className="mb-2">
                  <Link 
                    href="/users" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    👥 Usuários
                  </Link>
                </li>
                <li className="mb-2">
                  <Link 
                    href="/backup" 
                    className="block py-3 px-4 rounded hover:bg-gray-700 transition duration-200 text-sm lg:text-base"
                    onClick={() => setSidebarOpen(false)}
                  >
                    🔧 Backup
                  </Link>
                </li>
              </>
            )}

            {/* Add more navigation links here */}
          </ul>
        </nav>
        <div className="p-4 text-xs lg:text-sm text-gray-400 border-t border-gray-700">
          &copy; 2024 Meu Aplicativo
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-md py-8 flex justify-between items-center">
          {/* Menu hambúrguer para mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 ml-4 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="text-lg lg:text-2xl font-semibold text-gray-800 truncate px-4">
            {(() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) return 'Bom dia';
              if (hour >= 12 && hour < 18.5) return 'Boa tarde';
              return 'Boa noite';
            })()},
            {userName ? ` ${userName}` : ' Usuário'}
          </h1>
          {/* User profile or other header elements */}
          <div className="flex items-center space-x-2 lg:space-x-8 pr-4">
            
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-blue-500 text-white flex items-center justify-center focus:outline-none transform transition-all duration-200 hover:scale-110 hover:bg-blue-600 active:scale-95 cursor-pointer"
              >
                <svg xmlns="https://www.freepik.com/icon/box_547031" className={`h-4 w-4 lg:h-6 lg:w-6 transform transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dropdownOpen ? (
                <div className="absolute right-0 mt-2 w-40 lg:w-48 bg-white rounded-md shadow-lg py-1 z-20 transform transition-all duration-200 ease-out animate-in slide-in-from-top-2 fade-in">
                  <Link 
                    href="/profile" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Perfil
                  </Link>
                  {userName ? (
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      Sair
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            
          </div>

        </header>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-3 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;