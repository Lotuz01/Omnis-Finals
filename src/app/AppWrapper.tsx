'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ModernLayout from './components/ModernLayout';
import { Toaster } from '@/components/ui/sonner';
import { NotificationsProvider } from '@/contexts/notifications-context';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [userName, setUserName] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          setUserName(userData.name);
          setIsAdmin(userData.isAdmin);
          setIsAuthenticated(true);
        } else {
          // Se a resposta não for ok, redireciona para login
          setIsAuthenticated(false);
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsAuthenticated(false);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    if (!isLoginPage) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [isLoginPage, router]);

  if (loading && !isLoginPage) {
    return <div>Loading...</div>;
  }

  // Se não está na página de login e não está autenticado, não renderiza nada
  // (o redirecionamento já foi feito no useEffect)
  if (!isLoginPage && !isAuthenticated) {
    return <div>Redirecting...</div>;
  }

  return (
    <NotificationsProvider>
      {isLoginPage ? (
        children
      ) : (
        <ModernLayout userName={userName} isAdmin={isAdmin}>
          {children}
        </ModernLayout>
      )}
      <Toaster />
    </NotificationsProvider>
  );
}