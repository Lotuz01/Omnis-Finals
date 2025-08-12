'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
  authToken?: string;
  userName?: string;
  isAdmin?: boolean;
}

const OptimizedLayout: React.FC<LayoutProps> = memo(({ children, userName, isAdmin }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Memoizar o título da página baseado na rota atual
  const pageTitle = useMemo(() => {
    const titles: { [key: string]: string } = {
      '/': 'Dashboard',
      '/products': 'Produtos',
      '/users': 'Usuários',
      '/movements': 'Movimentações',
      '/accounts': 'Contas',
      '/clients': 'Clientes',
      '/nfe': 'Nota Fiscal Eletrônica',
      '/printers': 'Configuração de Impressoras',
      '/backup': 'Sistema de Backup'
    };
    return (pathname && titles[pathname]) || 'Sistema PDV';
  }, [pathname]);

  // Otimizar o event listener com useCallback
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen, handleClickOutside]);

  // Otimizar função de logout com useCallback
  const handleLogout = useCallback(async () => {
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
        window.location.href = '/login';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  // Memoizar links de navegação
  const navigationLinks = useMemo(() => [
    { href: '/', label: '🏠 Dashboard', adminOnly: false },
    { href: '/products', label: '📦 Produtos', adminOnly: false },
    { href: '/movements', label: '📊 Movimentações', adminOnly: false },
    { href: '/accounts', label: '💰 Contas', adminOnly: false },
    { href: '/clients', label: '👥 Clientes', adminOnly: false },
    { href: '/nfe', label: '📄 NFe', adminOnly: false },
    { href: '/printers', label: '🖨️ Impressoras', adminOnly: false },
    { href: '/users', label: '👤 Usuários', adminOnly: true },
    { href: '/backup', label: '🔧 Sistema de Backup', adminOnly: true }
  ], []);

  // Filtrar links baseado em permissões
  const visibleLinks = useMemo(() => {
    return navigationLinks.filter(link => !link.adminOnly || isAdmin);
  }, [navigationLinks, isAdmin]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-gray-700">
          Sistema PDV
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {visibleLinks.map((link) => (
              <li key={link.href}>
                <Link 
                  href={link.href} 
                  className={`block py-2 px-4 rounded hover:bg-gray-700 transition duration-200 ${
                    pathname === link.href ? 'bg-gray-700' : ''
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 text-sm text-gray-400 border-t border-gray-700">
          &copy; 2024 Sistema PDV
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            {pageTitle}
          </h1>
          
          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
            >
              <span className="text-sm font-medium">
                {userName || 'Usuário'} {isAdmin && '(Admin)'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
});

OptimizedLayout.displayName = 'OptimizedLayout';

export default OptimizedLayout;