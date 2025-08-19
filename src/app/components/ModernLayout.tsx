'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Package,
  Users,
  CreditCard,
  FileText,
  Printer,
  Settings,
  LogOut,
  Menu,
  User,
  Shield,
  Database,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationsDropdown } from '@/components/notifications-dropdown';

interface ModernLayoutProps {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({ children, userName, isAdmin }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const navigationItems = [
    {
      title: 'Dashboard',
      href: isAdmin ? '/' : '/dashboard',
      icon: Home,
      description: 'Visão geral do sistema'
    },
    {
      title: 'Produtos',
      href: '/products',
      icon: Package,
      description: 'Gerenciar produtos'
    },
    {
      title: 'Clientes',
      href: '/clients',
      icon: Users,
      description: 'Gerenciar clientes'
    },
    {
      title: 'Contas',
      href: '/accounts',
      icon: CreditCard,
      description: 'Contas a pagar/receber'
    },
    {
      title: 'Movimentações',
      href: '/movements',
      icon: FileText,
      description: 'Histórico de movimentações'
    },
    {
      title: 'NFe',
      href: '/nfe',
      icon: FileText,
      description: 'Notas fiscais eletrônicas'
    },
    {
      title: 'Impressoras',
      href: '/printers',
      icon: Printer,
      description: 'Configurar impressoras'
    },
    {
      title: 'Certificado',
      href: '/certificado',
      icon: Shield,
      description: 'Certificado digital'
    }
  ];

  const adminItems = [
    {
      title: 'Usuários',
      href: '/users',
      icon: Users,
      description: 'Gerenciar usuários'
    },
    {
      title: 'Backup',
      href: '/backup',
      icon: Database,
      description: 'Backup do sistema'
    }
  ];

  const visibleItems = isAdmin ? adminItems : navigationItems;

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b px-6">
        <Link href={isAdmin ? '/' : '/dashboard'} className="flex items-center space-x-2">
          <Image
            src="/logo-text-black.svg"
            alt="Omnis Logo"
            width={120}
            height={40}
            className="h-8 w-auto"
            loading="lazy"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Icon className="mr-3 h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          © 2024 Sistema de Gestão
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-auto">
        {/* Header */}
        <header className="flex h-(--header-height) items-center justify-between border-b bg-white px-4 lg:px-6">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>

            {/* Greeting */}
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold">
                {getGreeting()}, {userName || 'Usuário'}!
              </h1>
              <p className="text-sm text-muted-foreground">
                Bem-vindo ao sistema de gestão
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10"
              />
            </div>

            {/* Notifications - Only for non-admin users */}
            {!isAdmin && <NotificationsDropdown />}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={userName || 'Usuário'} />
                    <AvatarFallback>
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userName || 'Usuário'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isAdmin ? 'Administrador' : 'Usuário'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 bg-muted/50 p-3 lg:p-4">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModernLayout;