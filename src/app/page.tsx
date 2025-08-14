'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          
          // Verificar se o usuário é administrador
          if (userData.isAdmin) {
            // Administrador vai para a página de administração
            router.push('/admin');
          } else {
            // Usuário comum vai para o dashboard
            router.push('/dashboard');
          }
        } else {
          // Usuário não autenticado vai para login
          router.push('/login');
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        // Em caso de erro, redirecionar para login
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [router]);

  if (!loading) {
    return null; // Não mostrar nada após o redirecionamento
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Verificando permissões...</p>
      </div>
    </div>
  );
}
